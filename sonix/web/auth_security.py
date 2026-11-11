"""Authenticator setup and approved, short-lived QR sign-in."""

import asyncio
import base64
import hashlib
import io
import json
import os
import re
import secrets
import time
from collections import defaultdict, deque
from pathlib import Path
from urllib.parse import urlencode

import pyotp
import qrcode
import qrcode.image.svg
from aiohttp import web
from nacl.exceptions import InvalidkeyError
from nacl.pwhash import argon2id
from nacl.secret import SecretBox


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def qr_image(value):
    result = qrcode.make(value, image_factory=qrcode.image.svg.SvgPathFillImage)
    buffer = io.BytesIO()
    result.save(buffer)
    return "data:image/svg+xml;base64," + base64.b64encode(buffer.getvalue()).decode()


def error(message, status=400):
    return web.json_response({"error": message}, status=status)


class AuthSecurity:
    def __init__(self, db, database):
        self.db = db
        columns = {row["name"] for row in db.execute("PRAGMA table_info(accounts)")}
        for name, definition in (
            ("totp_secret", "BLOB"), ("totp_step", "INTEGER NOT NULL DEFAULT -1"),
            ("mfa_version", "INTEGER NOT NULL DEFAULT 0"), ("recovery_hashes", "TEXT NOT NULL DEFAULT '[]'"),
        ):
            if name not in columns:
                db.execute(f"ALTER TABLE accounts ADD COLUMN {name} {definition}")
        self.database = str(database)
        self.box = None
        self.pending = {}
        self.logins = {}
        self.qr_logins = {}
        self.attempts = defaultdict(deque)

    def encryption(self):
        if self.box:
            return self.box
        configured = os.environ.get("SONIX_MFA_KEY")
        if configured:
            key = base64.b64decode(configured, validate=True)
        elif self.database == ":memory:":
            key = secrets.token_bytes(SecretBox.KEY_SIZE)
        else:
            path = Path(self.database + ".mfa-key")
            if not path.exists() and self.db.execute("SELECT 1 FROM accounts WHERE totp_secret IS NOT NULL LIMIT 1").fetchone():
                raise RuntimeError("Restore the Sonix MFA encryption key before using authenticator codes.")
            try:
                descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            except FileExistsError:
                key = path.read_bytes()
            else:
                key = secrets.token_bytes(SecretBox.KEY_SIZE)
                with os.fdopen(descriptor, "wb") as file:
                    file.write(key)
                    file.flush()
                    os.fsync(file.fileno())
        if len(key) != SecretBox.KEY_SIZE:
            raise RuntimeError("Sonix MFA encryption key must contain 32 bytes.")
        self.box = SecretBox(key)
        return self.box

    def throttle(self, identity):
        now = time.monotonic()
        bucket = self.attempts[identity]
        while bucket and now - bucket[0] > 300:
            bucket.popleft()
        if len(bucket) >= 10:
            return False
        bucket.append(now)
        return True

    def prune(self):
        now = time.time()
        for mapping in (self.pending, self.logins, self.qr_logins):
            for key in list(mapping):
                if mapping[key]["expires"] <= now:
                    mapping.pop(key, None)
        for key in list(self.attempts):
            bucket = self.attempts[key]
            if not bucket or time.monotonic() - bucket[-1] > 300:
                self.attempts.pop(key, None)

    def current(self, user):
        return self.db.execute("SELECT * FROM accounts WHERE id=?", (user,)).fetchone()

    async def password_check(self, row, password):
        if not isinstance(password, str) or not 1 <= len(password) <= 256:
            return False
        try:
            valid = await asyncio.to_thread(argon2id.verify, row["password"], password.encode())
        except InvalidkeyError:
            return False
        current = self.current(row["id"])
        return bool(valid and current and current["password"] == row["password"]
                    and current["mfa_version"] == row["mfa_version"])

    @staticmethod
    def totp_step(secret, code, last=-1):
        if not isinstance(code, str) or not re.fullmatch(r"\d{6}", code):
            return None
        step = int(time.time()) // 30
        totp = pyotp.TOTP(secret)
        for candidate in (step, step - 1, step + 1):
            if candidate > last and secrets.compare_digest(totp.at(candidate * 30), code):
                return candidate
        return None

    def consume_factor(self, row, code):
        if not row["totp_secret"]:
            return True
        if not isinstance(code, str):
            return False
        normalized = re.sub(r"[-\s]", "", code).upper()
        if re.fullmatch(r"[A-F0-9]{20}", normalized):
            wanted = digest(normalized)
            hashes = json.loads(row["recovery_hashes"])
            remaining = [item for item in hashes if not secrets.compare_digest(item, wanted)]
            if len(remaining) == len(hashes):
                return False
            result = self.db.execute(
                "UPDATE accounts SET recovery_hashes=? WHERE id=? AND recovery_hashes=? AND mfa_version=?",
                (json.dumps(remaining), row["id"], row["recovery_hashes"], row["mfa_version"]),
            )
            self.db.commit()
            return result.rowcount == 1
        secret = self.encryption().decrypt(row["totp_secret"]).decode()
        step = self.totp_step(secret, code.strip(), row["totp_step"])
        if step is None:
            return False
        result = self.db.execute(
            "UPDATE accounts SET totp_step=? WHERE id=? AND mfa_version=? AND totp_step<?",
            (step, row["id"], row["mfa_version"], step),
        )
        self.db.commit()
        return result.rowcount == 1

    def challenge_login(self, row):
        if not row["totp_secret"]:
            return None
        self.prune()
        token = secrets.token_urlsafe(32)
        self.logins[digest(token)] = {
            "account": row["id"], "version": row["mfa_version"], "password": row["password"],
            "expires": time.time() + 300, "attempts": 0,
        }
        return web.json_response({"mfa_required": True, "challenge": token})

    def invalidate(self, user):
        self.pending.pop(user, None)
        for mapping in (self.logins, self.qr_logins):
            for key, item in list(mapping.items()):
                if item.get("account") == user:
                    mapping.pop(key, None)

    async def handle(self, action, request, data, row, issue_session):
        actions = {"mfa-start", "mfa-enable", "mfa-disable", "mfa-login",
                   "qr-create", "qr-poll", "qr-info", "qr-approve", "qr-cancel"}
        if action not in actions:
            return None
        self.prune()
        if action == "mfa-login":
            token = data.get("challenge")
            if not isinstance(token, str) or len(token) > 128:
                return error("Sign in again.", 400)
            key = digest(token)
            challenge = self.logins.get(key)
            if not challenge:
                return error("This sign-in expired. Enter your password again.", 400)
            current = self.current(challenge["account"])
            if (not current or not current["totp_secret"] or current["mfa_version"] != challenge["version"]
                    or current["password"] != challenge["password"]):
                self.logins.pop(key, None)
                return error("Sign in again.", 400)
            challenge["attempts"] += 1
            if challenge["attempts"] > 5 or not self.throttle(current["id"]):
                self.logins.pop(key, None)
                return error("Too many attempts. Try again in five minutes.", 429)
            if not self.consume_factor(current, data.get("code")):
                return error("Incorrect or already used code. Use a new authenticator code or a recovery code.", 400)
            self.logins.pop(key, None)
            return issue_session(web.json_response({"ok": True}), current["id"])

        if action == "qr-create":
            if len(self.qr_logins) >= 200:
                return error("Too many QR sign-ins. Try again shortly.", 429)
            identifier, poll = secrets.token_urlsafe(24), secrets.token_urlsafe(32)
            match = secrets.token_hex(3).upper()
            self.qr_logins[identifier] = {
                "poll": digest(poll), "expires": time.time() + 120, "match": match,
                "account": None, "device": request.headers.get("User-Agent", "Browser")[:180],
            }
            url = f"{request.scheme}://{request.host}/?" + urlencode({"login-qr": identifier})
            # TLS terminates at the trusted preview tunnel. Its public hostname
            # is HTTPS even though the loopback connection is HTTP.
            if request.host.endswith(".trycloudflare.com"):
                url = "https://" + request.host + "/?" + urlencode({"login-qr": identifier})
            return web.json_response({"id": identifier, "poll": poll, "qr": qr_image(url),
                                      "match": match, "expires": 120})

        if action in ("qr-poll", "qr-cancel"):
            identifier, poll = data.get("id"), data.get("poll")
            if not isinstance(identifier, str) or not isinstance(poll, str) or len(poll) > 128:
                return error("QR sign-in unavailable.", 400)
            challenge = self.qr_logins.get(identifier)
            if not challenge or not secrets.compare_digest(challenge["poll"], digest(poll)):
                return error("QR sign-in expired. Generate another code.", 400)
            if action == "qr-cancel":
                self.qr_logins.pop(identifier, None)
                return web.json_response({"ok": True})
            if not challenge["account"]:
                return web.json_response({"pending": True})
            current = self.current(challenge["account"])
            if (not current or current["mfa_version"] != challenge["version"]
                    or current["password"] != challenge["password"]):
                self.qr_logins.pop(identifier, None)
                return error("QR approval expired. Generate another code.", 400)
            self.qr_logins.pop(identifier, None)
            return issue_session(web.json_response({"ok": True}), current["id"])

        if not row:
            return error("Sign in on your phone to approve the login.", 401)

        if action in ("qr-info", "qr-approve"):
            identifier = data.get("id")
            if not isinstance(identifier, str):
                return error("Invalid QR login.", 400)
            challenge = self.qr_logins.get(identifier)
            if not challenge or challenge["account"]:
                return error("This QR login expired or has already been approved.", 400)
            if action == "qr-info":
                return web.json_response({"match": challenge["match"], "device": challenge["device"],
                                          "expires": max(0, int(challenge["expires"] - time.time()))})
            if not self.throttle(row["id"]):
                return error("Too many attempts. Try again in five minutes.", 429)
            if not self.consume_factor(self.current(row["id"]), data.get("code")):
                return error("Enter a new authenticator code or an unused recovery code.", 400)
            challenge.update(account=row["id"], password=row["password"], version=row["mfa_version"])
            return web.json_response({"ok": True})

        if not self.throttle(row["id"]):
            return error("Too many attempts. Try again in five minutes.", 429)
        if action in ("mfa-start", "mfa-disable") and not await self.password_check(row, data.get("password")):
            return error("Incorrect password or your account security changed. Try again.", 403)
        if action == "mfa-start":
            if row["totp_secret"]:
                return error("Two-factor authentication is already enabled.", 409)
            secret = pyotp.random_base32()
            self.pending[row["id"]] = {
                "secret": self.encryption().encrypt(secret.encode()),
                "session": digest(request.cookies.get("sonix_session", "")),
                "version": row["mfa_version"], "expires": time.time() + 600,
            }
            uri = pyotp.TOTP(secret).provisioning_uri(name=row["email"], issuer_name="Sonix")
            return web.json_response({"secret": secret, "qr": qr_image(uri)})

        if action == "mfa-enable":
            pending = self.pending.get(row["id"])
            if (not pending or pending["session"] != digest(request.cookies.get("sonix_session", ""))
                    or row["totp_secret"] or pending["version"] != row["mfa_version"]):
                return error("Authenticator setup expired. Start again.", 400)
            secret = self.encryption().decrypt(pending["secret"]).decode()
            step = self.totp_step(secret, data.get("code"))
            if step is None:
                return error("Enter the six-digit code from your authenticator.", 400)
            raw_codes = [secrets.token_hex(10).upper() for _ in range(10)]
            self.db.execute(
                "UPDATE accounts SET totp_secret=?,totp_step=?,recovery_hashes=?,mfa_version=mfa_version+1 WHERE id=?",
                (pending["secret"], step, json.dumps([digest(code) for code in raw_codes]), row["id"]),
            )
            self.invalidate(row["id"])
            self.db.execute("DELETE FROM sessions WHERE account=?", (row["id"],))
            self.db.commit()
            codes = ["-".join(code[index:index + 5] for index in range(0, 20, 5)) for code in raw_codes]
            return issue_session(web.json_response({"ok": True, "recovery": codes}), row["id"])

        if not row["totp_secret"]:
            return error("Two-factor authentication is already disabled.", 409)
        current = self.current(row["id"])
        if not self.consume_factor(current, data.get("code")):
            return error("Enter a new authenticator code or an unused recovery code.", 400)
        self.db.execute(
            "UPDATE accounts SET totp_secret=NULL,totp_step=-1,recovery_hashes='[]',mfa_version=mfa_version+1 WHERE id=?",
            (row["id"],),
        )
        self.invalidate(row["id"])
        self.db.execute("DELETE FROM sessions WHERE account=?", (row["id"],))
        self.db.commit()
        return issue_session(web.json_response({"ok": True}), row["id"])
