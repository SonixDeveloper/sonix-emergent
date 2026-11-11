"""Serve the Sonix browser client and its SQLite-backed API."""

import argparse
import asyncio
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path

from aiohttp import ClientError, ClientSession, ClientTimeout, web
from nacl.exceptions import InvalidkeyError
from nacl.pwhash import argon2id

from sonix.web.auth_security import AuthSecurity
from sonix.web.media import ImageStore

ASSETS = Path(__file__).parent / "assets"
COMMUNITY = "overdrive"
DEVELOPERS = "sonix-developers"
SESSION_LIFETIME = 365 * 24 * 60 * 60
PUBLIC_SPACES = {
    COMMUNITY: ["general", "announcements", "introductions", "off-topic", "clips", "game-night"],
    DEVELOPERS: ["general", "announcements", "app-development", "bot-development", "feedback"],
}
PERMISSIONS = {"channels", "invites", "emoji", "moderate", "apps"}
BOTS = {
    "Pulse": ("ping", "Pong! I'm online."),
    "Welcome": ("welcome", "Welcome to the server! Introduce yourself when you're ready."),
    "Quest": ("quest", "Your next quest: share something you made this week."),
    "Focus": ("focus", "Focus session started. Set a 25-minute timer and pick one task."),
    "Rules": ("rules", "Be kind, protect your privacy, and keep channels on topic."),
    "Dice": ("roll", lambda: f"You rolled a {secrets.randbelow(6) + 1}."),
    "Coin": ("flip", lambda: secrets.choice(["Heads!", "Tails!"])),
    "Break": ("break", "Take five minutes away from your screen. Stretch or get some water."),
    "Icebreaker": ("icebreaker", "What game or hobby would you recommend to a newcomer?"),
    "Studio": ("prompt", "Make something using only two colors, then share how you made it."),
    "Spotlight": ("shoutout", "Share something a community member made and tell us what you liked about it."),
    "Eight Ball": ("eightball", lambda: secrets.choice(["Yes.", "Ask again later.", "Probably not.", "Looks promising."])),
    "Number Draw": ("draw", lambda: f"Your number is {secrets.randbelow(100) + 1}."),
    "Party": ("party", "Game night check-in! Reply with what you want to play."),
    "Gratitude": ("thanks", "Name one person or moment that made your day better."),
    "Standup": ("standup", "What did you finish, what are you working on, and what is blocking you?"),
    "Retro": ("retro", "Share one thing that worked, one thing to improve, and one next step."),
    "Checklist": ("checklist", "Before posting an event: include the time zone, meeting link, and how to join."),
    "Safety": ("safety", "Keep passwords and recovery codes private. Ask a moderator if you need help."),
    "Guide": ("help", "Open Apps and commands in the composer to see the commands installed on this server."),
}


CHANNEL_TYPES = {"text", "poll", "voice", "category"}
DISCORD_TYPES = {0: "text", 2: "voice", 4: "category", 5: "text", 13: "voice", 15: "text", 16: "text"}


def channel_records(value):
    return [
        {"id": item, "name": item, "type": "text", "parent": ""} if isinstance(item, str) else item
        for item in value
    ]


def template_channels(snapshot):
    source = sorted(snapshot["channels"], key=lambda item: item.get("position", 0))
    ids = {str(item["id"]): secrets.token_urlsafe(9) for item in source if item["type"] in DISCORD_TYPES}
    return [
        {"id": ids[str(item["id"])], "name": field(item, "name", 100),
         "type": DISCORD_TYPES[item["type"]], "parent": ids.get(str(item.get("parent_id")), "")}
        for item in source if str(item["id"]) in ids
    ][:500]


def crop_position(data, axis="banner_position"):
    position = data.get(axis, 50)
    if type(position) is not int or not 0 <= position <= 100:
        raise ValueError("Choose a banner crop between 0 and 100.")
    return position


def fail(message, status=400):
    return web.json_response({"error": message}, status=status)


def field(data, key, limit=100):
    value = data.get(key, "")
    return value.strip()[:limit] if isinstance(value, str) else ""


def token_hash(value):
    return hashlib.sha256(value.encode()).hexdigest()


def create_app(database, secure=False):
    db = sqlite3.connect(database)
    if str(database) != ":memory:":
        Path(database).chmod(0o600)
    db.row_factory = sqlite3.Row
    db.executescript("""
        PRAGMA journal_mode=WAL;
        PRAGMA secure_delete=ON;
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY, email TEXT UNIQUE, password BLOB, name TEXT,
            bio TEXT DEFAULT '', avatar TEXT DEFAULT '', banner TEXT DEFAULT '',
            theme TEXT DEFAULT 'red', language TEXT DEFAULT 'en'
        );
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, account TEXT, expires INTEGER);
        CREATE TABLE IF NOT EXISTS spaces (
            id TEXT PRIMARY KEY, owner TEXT, name TEXT, description TEXT,
            channels TEXT, banner TEXT DEFAULT '', bots TEXT DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS members (space TEXT, account TEXT, PRIMARY KEY(space, account));
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY, space TEXT, channel TEXT, author TEXT, body TEXT,
            created TEXT, bot TEXT DEFAULT ''
        );
    """)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY, space TEXT, channel TEXT, question TEXT, choices TEXT
        );
        CREATE TABLE IF NOT EXISTS votes (
            poll INTEGER, account TEXT, choice INTEGER, PRIMARY KEY(poll, account)
        );
        CREATE TABLE IF NOT EXISTS custom_bots (
            space TEXT, command TEXT, name TEXT, reply TEXT, PRIMARY KEY(space, command)
        );
    """)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS space_invites (code TEXT PRIMARY KEY, space TEXT, expires INTEGER);
        CREATE TABLE IF NOT EXISTS space_roles (id TEXT PRIMARY KEY, space TEXT, name TEXT, permissions TEXT);
        CREATE TABLE IF NOT EXISTS role_members (role TEXT, account TEXT, PRIMARY KEY(role,account));
        CREATE TABLE IF NOT EXISTS space_emojis (space TEXT, name TEXT, image TEXT, PRIMARY KEY(space,name));
        CREATE TABLE IF NOT EXISTS space_bans (space TEXT, account TEXT, PRIMARY KEY(space,account));
        CREATE TABLE IF NOT EXISTS space_logs (id INTEGER PRIMARY KEY, space TEXT, actor TEXT, action TEXT, created TEXT);
        CREATE TABLE IF NOT EXISTS friendships (
            sender TEXT, recipient TEXT, accepted INTEGER DEFAULT 0, PRIMARY KEY(sender,recipient)
        );
    """)
    if "author" not in {column["name"] for column in db.execute("PRAGMA table_info(polls)")}:
        db.execute("ALTER TABLE polls ADD COLUMN author TEXT")
    columns = {column["name"] for column in db.execute("PRAGMA table_info(spaces)")}
    for column, default in (("protected", 0), ("group_chat", 0)):
        if column not in columns:
            db.execute(f"ALTER TABLE spaces ADD COLUMN {column} INTEGER NOT NULL DEFAULT {default}")
    for table in ("accounts", "spaces"):
        columns = {column["name"] for column in db.execute(f"PRAGMA table_info({table})")}
        for column in ("banner_position", "banner_horizontal"):
            if column not in columns:
                db.execute(f"ALTER TABLE {table} ADD COLUMN {column} INTEGER NOT NULL DEFAULT 50")
    account_columns = {column["name"] for column in db.execute("PRAGMA table_info(accounts)")}
    if "presence" not in account_columns:
        db.execute("ALTER TABLE accounts ADD COLUMN presence TEXT NOT NULL DEFAULT 'online'")
    if "status_text" not in account_columns:
        db.execute("ALTER TABLE accounts ADD COLUMN status_text TEXT NOT NULL DEFAULT ''")
    if "last_active" not in account_columns:
        db.execute("ALTER TABLE accounts ADD COLUMN last_active REAL NOT NULL DEFAULT 0")
    for table in ("accounts", "spaces"):
        columns = {column["name"] for column in db.execute(f"PRAGMA table_info({table})")}
        if "banner_source" not in columns:
            db.execute(f"ALTER TABLE {table} ADD COLUMN banner_source TEXT NOT NULL DEFAULT ''")
        if "banner_zoom" not in columns:
            db.execute(f"ALTER TABLE {table} ADD COLUMN banner_zoom REAL NOT NULL DEFAULT 1")
    db.execute("CREATE TABLE IF NOT EXISTS media_uploads (account TEXT, url TEXT, PRIMARY KEY(account,url))")
    if "icon" not in {column["name"] for column in db.execute("PRAGMA table_info(spaces)")}:
        db.execute("ALTER TABLE spaces ADD COLUMN icon TEXT NOT NULL DEFAULT ''")
    images = ImageStore(database)

    def image(data, key):
        return images.store(data.get(key, ""), 512 if key in ("avatar","icon") else 1600)

    def remove_unused_media(candidates):
        for value in set(candidates):
            path = images.path(value)
            if not path:
                continue
            used = any(db.execute(f"SELECT 1 FROM {table} WHERE {column}=? LIMIT 1", (value,)).fetchone()
                       for table, columns in (
                           ("accounts", ("avatar","banner","banner_source")),
                           ("spaces", ("icon","banner","banner_source")), ("space_emojis", ("image",)),
                           ("media_uploads", ("url",)),
                       ) for column in columns)
            if not used:
                path.unlink(missing_ok=True)

    def zoom(data):
        value = data.get("banner_zoom", 1)
        if type(value) not in (int, float) or not 1 <= value <= 4:
            raise ValueError("Choose a banner zoom between 1 and 4.")
        return value

    # Existing accounts also use compact immutable URLs, so avatars no longer
    # travel as base64 image files in every message response.
    for table, columns in (("accounts", ("avatar", "banner", "banner_source")), ("spaces", ("icon", "banner", "banner_source")),
                           ("space_emojis", ("image",))):
        for column in columns:
            for item in list(db.execute(f"SELECT rowid,{column} FROM {table} WHERE {column} LIKE 'data:image/%'")):
                try:
                    url = images.store(item[column], 512 if column == "avatar" else 1600)
                except ValueError:
                    continue
                db.execute(f"UPDATE {table} SET {column}=? WHERE rowid=?", (url, item["rowid"]))
    db.commit()
    security = AuthSecurity(db, database)
    db.execute("CREATE INDEX IF NOT EXISTS message_channel_order ON messages(space,channel,id)")
    db.execute("CREATE INDEX IF NOT EXISTS poll_channel_order ON polls(space,channel,id)")
    db.commit()
    attempts = defaultdict(deque)
    voice_rooms = {}
    shadow_model = os.getenv("SONIX_SHADOW_MODEL", "")
    shadow_lock = asyncio.Lock()
    price_lock = asyncio.Lock()
    prices = {"USD": 20}
    price_refresh = 0

    def account(request):
        token = token_hash(request.cookies.get("sonix_session", ""))
        row = db.execute(
            "SELECT accounts.*,sessions.expires AS session_expires FROM sessions JOIN accounts ON account=accounts.id "
            "WHERE token=? AND expires>?", (token, time.time()),
        ).fetchone()
        if row and row["session_expires"] < time.time() + SESSION_LIFETIME / 2:
            db.execute("UPDATE sessions SET expires=? WHERE token=?", (time.time() + SESSION_LIFETIME, token))
            db.commit()
            request["renew_session"] = request.cookies["sonix_session"]
        return row

    def profile(row):
        return {"two_factor_enabled": bool(row["totp_secret"]), **{key: row[key] for key in ("id", "email", "name", "bio", "avatar", "banner", "theme", "language", "banner_position", "banner_horizontal", "presence", "status_text", "banner_source", "banner_zoom")}}

    def session(response, user):
        token = secrets.token_urlsafe(32)
        db.execute("DELETE FROM sessions WHERE expires<=?", (time.time(),))
        db.execute("INSERT INTO sessions VALUES (?,?,?)", (token_hash(token), user, time.time() + SESSION_LIFETIME))
        db.commit()
        response.set_cookie("sonix_session", token, httponly=True, secure=secure, samesite="Strict", max_age=SESSION_LIFETIME)
        return response

    def space_access(space, user):
        if space in PUBLIC_SPACES:
            if db.execute("SELECT 1 FROM space_bans WHERE space=? AND account=?", (space, user)).fetchone():
                return None
            stored = db.execute("SELECT * FROM spaces WHERE id=?", (space,)).fetchone()
            return stored if stored else {
                "channels": json.dumps(PUBLIC_SPACES[space]), "bots": '["Pulse"]',
                "owner": None, "protected": 0, "group_chat": 0,
            }
        return db.execute(
            "SELECT spaces.* FROM spaces JOIN members ON spaces.id=members.space "
            "WHERE spaces.id=? AND account=?", (space, user),
        ).fetchone()

    def can_manage(access, space, user, permission):
        if not access or access["group_chat"]:
            return False
        if access["owner"] == user:
            return True
        return any(permission in json.loads(item["permissions"]) for item in db.execute(
            "SELECT permissions FROM space_roles JOIN role_members ON space_roles.id=role_members.role "
            "WHERE space=? AND account=?", (space, user),
        ))

    def audit(space, user, action):
        db.execute("INSERT INTO space_logs(space,actor,action,created) VALUES (?,?,?,?)",
                   (space, user, action, datetime.now(timezone.utc).isoformat()))

    def friends(user):
        return db.execute(
            "SELECT accounts.id,accounts.name,accounts.avatar,accepted,sender FROM friendships "
            "JOIN accounts ON accounts.id=CASE WHEN sender=? THEN recipient ELSE sender END "
            "WHERE sender=? OR recipient=? ORDER BY accounts.name", (user, user, user)
        ).fetchall()

    def find_channel(access, channel):
        if not access:
            return None
        return next((item for item in channel_records(json.loads(access["channels"])) if item["id"] == channel), None)

    def add_message(space, channel, author, body, bot=""):
        db.execute(
            "INSERT INTO messages(space,channel,author,body,created,bot) VALUES (?,?,?,?,?,?)",
            (space, channel, author, body, datetime.now(timezone.utc).isoformat(), bot),
        )

    @web.middleware
    async def safety(request, handler):
        if request.method == "POST" and request.content_type != "application/json":
            return fail("Send a JSON request.", 415)
        try:
            response = await handler(request)
        except ValueError as error:
            response = fail(str(error))
        if request.get("renew_session") and "sonix_session" not in response.cookies and response.status < 400:
            response.set_cookie("sonix_session", request["renew_session"], httponly=True,
                                secure=secure, samesite="Strict", max_age=SESSION_LIFETIME)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';"
            " font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        )
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        elif request.path.startswith("/media/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    async def rings_prices():
        nonlocal prices, price_refresh
        async with price_lock:
            if time.time() < price_refresh:
                return prices
            price_refresh = time.time() + 300
            try:
                async with ClientSession(timeout=ClientTimeout(total=6)) as client:
                    async with client.get("https://open.er-api.com/v6/latest/USD", allow_redirects=False) as response:
                        response.raise_for_status()
                        result = await response.json()
                if result["result"] != "success" or result["base_code"] != "USD":
                    return prices
                prices = {code: round(20 * rate, 4) for code, rate in result["rates"].items()
                          if re.fullmatch(r"[A-Z]{3}", code) and type(rate) in (float, int) and 0 < rate < 1e10}
                prices["USD"] = 20
                price_refresh = time.time() + 86400
            except (ClientError, TimeoutError, ValueError, KeyError, TypeError, AttributeError):
                pass
            return prices

    async def api(request):
        action = request.match_info["action"]
        row = account(request)
        user = row["id"] if row else None
        try:
            data = await request.json() if request.method == "POST" else {}
        except (ValueError, UnicodeError):
            return fail("Send valid JSON.")
        if not isinstance(data, dict):
            return fail("Send a JSON object.")

        if request.method == "POST":
            auth_result = await security.handle(action, request, data, row, session)
            if auth_result is not None:
                return auth_result
        if request.method == "GET":
            if action == "me":
                return web.json_response(profile(row) if row else None)
            if action == "rings-prices":
                if not row:
                    return fail("Sign in to continue.", 401)
                return web.json_response(await rings_prices())
            if action == "shadow":
                return web.json_response({"generation": bool(shadow_model)})
            if action == "spaces":
                spaces = db.execute(
                    "SELECT spaces.* FROM spaces WHERE id IN (?,?) OR id IN (SELECT space FROM members WHERE account=?)",
                    (COMMUNITY, DEVELOPERS, user),
                )
                return web.json_response([
                    {**dict(item), "channels": channel_records(json.loads(item["channels"])), "bots": json.loads(item["bots"])}
                    for item in spaces
                ])
            if action == "export-data":
                if not row:
                    return fail("Sign in to continue.", 401)
                return web.json_response({
                    "profile": profile(row),
                    "messages": [dict(item) for item in db.execute(
                        "SELECT id,space,channel,body,created FROM messages WHERE author=? ORDER BY id", (user,))],
                    "polls": [dict(item) for item in db.execute(
                        "SELECT id,space,channel,question,choices FROM polls WHERE author=?", (user,))],
                    "votes": [dict(item) for item in db.execute("SELECT poll,choice FROM votes WHERE account=?", (user,))],
                    "memberships": [dict(item) for item in db.execute(
                        "SELECT spaces.id,spaces.name,spaces.owner FROM spaces JOIN members ON spaces.id=members.space WHERE account=?", (user,))],
                    "friendships": [dict(item) for item in db.execute(
                        "SELECT sender,recipient,accepted FROM friendships WHERE sender=? OR recipient=?", (user,user))],
                }, headers={"Content-Disposition": 'attachment; filename="sonix-data.json"'})
            if action == "friends" and user:
                return web.json_response([dict(item) for item in friends(user)])
            if action == "user-profile" and user:
                target = request.query.get("account", "")
                shared = db.execute(
                    "SELECT 1 FROM members mine JOIN members theirs ON mine.space=theirs.space "
                    "WHERE mine.account=? AND theirs.account=? LIMIT 1", (user, target),
                ).fetchone()
                linked = db.execute(
                    "SELECT 1 FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",
                    (user, target, target, user),
                ).fetchone()
                account_row = db.execute("SELECT * FROM accounts WHERE id=?", (target,)).fetchone()
                if not account_row or (target != user and not shared and not linked):
                    return fail("That profile is not available.", 404)
                result = profile(account_row)
                result.pop("email", None)
                result["friendship"] = None
                if linked:
                    relation = db.execute(
                        "SELECT sender,accepted FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",
                        (user, target, target, user),
                    ).fetchone()
                    result["friendship"] = "friend" if relation["accepted"] else ("sent" if relation["sender"] == user else "received")
                return web.json_response(result)
            if action == "server-data" and user:
                space = request.query.get("space", "")
                access = space_access(space, user)
                if not access:
                    return fail("Server unavailable.", 404)
                if space in PUBLIC_SPACES:
                    db.execute("INSERT OR IGNORE INTO members(space,account) VALUES (?,?)", (space,user))
                    db.commit()
                members = [dict(item) for item in db.execute(
                    "SELECT id,name,avatar,presence,last_active FROM accounts JOIN members ON id=account WHERE space=? ORDER BY name", (space,))]
                if access["owner"] and not any(item["id"] == access["owner"] for item in members):
                    owner = db.execute("SELECT id,name,avatar,presence,last_active FROM accounts WHERE id=?", (access["owner"],)).fetchone()
                    if owner:
                        members.append(dict(owner))
                for member in members:
                    if member["presence"] == "invisible" or member["last_active"] < time.time() - 90:
                        member["presence"] = "offline"
                    member["roles"] = [item["name"] for item in db.execute(
                        "SELECT space_roles.name FROM role_members JOIN space_roles ON id=role "
                        "WHERE space_roles.space=? AND role_members.account=? ORDER BY space_roles.name", (space, member["id"]))]
                emojis = db.execute("SELECT name,image FROM space_emojis WHERE space=? ORDER BY name", (space,))
                result = {"owner": access["owner"], "members": members,
                          "message_count": db.execute("SELECT COUNT(*) FROM messages WHERE space=?", (space,)).fetchone()[0],
                          "emojis": [dict(item) for item in emojis],
                          "permissions": [permission for permission in sorted(PERMISSIONS) if can_manage(access, space, user, permission)]}
                if can_manage(access, space, user, "invites"):
                    result["invites"] = [dict(item) for item in db.execute(
                        "SELECT code,expires FROM space_invites WHERE space=? AND expires>? ORDER BY expires DESC", (space,time.time()))]
                if can_manage(access, space, user, "moderate"):
                    result["bans"] = [dict(item) for item in db.execute(
                        "SELECT id,name FROM accounts JOIN space_bans ON id=account WHERE space=? ORDER BY name", (space,))]
                    result["logs"] = [dict(item) for item in db.execute(
                        "SELECT action,created,name FROM space_logs LEFT JOIN accounts ON actor=accounts.id "
                        "WHERE space=? ORDER BY space_logs.id DESC LIMIT 100", (space,))]
                if access["owner"] == user:
                    result["roles"] = [{**dict(item), "permissions": json.loads(item["permissions"]),
                                        "members": [member["account"] for member in db.execute("SELECT account FROM role_members WHERE role=?", (item["id"],))]}
                                       for item in db.execute("SELECT id,name,permissions FROM space_roles WHERE space=? ORDER BY name", (space,))]
                return web.json_response(result)
            if action == "polls":
                space, channel = request.query.get("space", ""), request.query.get("channel", "")
                selected = find_channel(space_access(space, user), channel)
                if not selected or selected["type"] != "poll":
                    return fail("Poll channel unavailable.", 404)
                result = []
                for poll in db.execute("SELECT * FROM polls WHERE space=? AND channel=? ORDER BY id DESC LIMIT 50", (space, channel)):
                    choices = json.loads(poll["choices"])
                    counts = [0] * len(choices)
                    selected_vote = None
                    for vote in db.execute("SELECT account,choice FROM votes WHERE poll=?", (poll["id"],)):
                        counts[vote["choice"]] += 1
                        if vote["account"] == user:
                            selected_vote = vote["choice"]
                    result.append({"id": poll["id"], "question": poll["question"], "choices": choices,
                                   "counts": counts, "vote": selected_vote})
                return web.json_response(result)
            if action == "messages":
                space = request.query.get("space", "")
                channel = request.query.get("channel", "")
                access = space_access(space, user)
                selected = find_channel(access, channel)
                if not selected or selected["type"] != "text":
                    return fail("Text channel unavailable.", 404)
                messages = db.execute(
                    "SELECT messages.*, accounts.id AS account_id, accounts.name, accounts.avatar FROM messages "
                    "LEFT JOIN accounts ON author=accounts.id WHERE space=? AND channel=? "
                    "ORDER BY messages.id DESC LIMIT 100", (space, channel),
                )
                payload = [
                    {**dict(message), "owner_rank": bool(message["author"] and message["author"] == access["owner"])}
                    for message in reversed(list(messages))
                ]
                body = json.dumps(payload).encode()
                etag = '"' + hashlib.sha256(body).hexdigest() + '"'
                if request.headers.get("If-None-Match") == etag:
                    return web.Response(status=304, headers={"ETag":etag})
                return web.Response(body=body, content_type="application/json", headers={"ETag":etag})
            return fail("Unknown action.", 404)

        if action in ("register", "login"):
            now = time.monotonic()
            bucket = attempts[request.remote]
            while bucket and now - bucket[0] > 300:
                bucket.popleft()
            if len(bucket) >= 12:
                return fail("Too many attempts. Try again in a few minutes.", 429)
            bucket.append(now)
            email = field(data, "email", 254).lower()
            password = data.get("password")
            if not isinstance(password, str) or not 1 <= len(password) <= 256:
                return fail("Enter a valid password.")
            if action == "register":
                name = field(data, "name", 32)
                if not name or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(password) < 12:
                    return fail("Enter a name, a valid email and a password of at least 12 characters.")
                user = secrets.token_urlsafe(12)
                hashed = await asyncio.to_thread(argon2id.str, password.encode())
                try:
                    with db:
                        db.execute("INSERT INTO accounts(id,email,password,name) VALUES (?,?,?,?)", (user, email, hashed, name))
                except sqlite3.IntegrityError:
                    return fail("An account already uses this email.", 409)
                return session(web.json_response({"ok": True}), user)
            target = db.execute("SELECT * FROM accounts WHERE email=?", (email,)).fetchone()
            try:
                valid = target and await asyncio.to_thread(argon2id.verify, target["password"], password.encode())
            except InvalidkeyError:
                valid = False
            if not valid:
                return fail("Incorrect email or password.", 401)
            current = db.execute("SELECT * FROM accounts WHERE id=?", (target["id"],)).fetchone()
            if not current or current["password"] != target["password"]:
                return fail("Incorrect email or password.", 401)
            second_factor = security.challenge_login(current)
            if second_factor is not None:
                return second_factor
            return session(web.json_response({"ok": True}), target["id"])

        if not row:
            return fail("Sign in to continue.", 401)
        response = web.json_response({"ok": True})
        if action == "logout":
            db.execute("DELETE FROM sessions WHERE token=?", (token_hash(request.cookies["sonix_session"]),))
            response.del_cookie("sonix_session")
        elif action == "password":
            old = data.get("current")
            new = data.get("password")
            if not isinstance(old, str) or len(old) > 256 or not isinstance(new, str) or not 12 <= len(new) <= 256:
                return fail("Enter your current password and a new password of at least 12 characters.")
            try:
                await asyncio.to_thread(argon2id.verify, row["password"], old.encode())
            except InvalidkeyError:
                return fail("Incorrect current password.", 403)
            current = security.current(user)
            if not current or current["mfa_version"] != row["mfa_version"]:
                return fail("Your account security changed. Try again.", 409)
            if not security.throttle(user) or not security.consume_factor(current, data.get("code")):
                return fail("Enter a new authenticator code or recovery code.", 400)
            hashed = await asyncio.to_thread(argon2id.str, new.encode())
            with db:
                cursor = db.execute("UPDATE accounts SET password=? WHERE id=? AND password=? AND mfa_version=?", (hashed, user, row["password"], row["mfa_version"]))
                if cursor.rowcount != 1:
                    return fail("Your password changed. Sign in again.", 409)
                db.execute("DELETE FROM sessions WHERE account=?", (user,))
            return session(response, user)
        elif action == "delete-account":
            password = data.get("password")
            if not isinstance(password, str) or not 1 <= len(password) <= 256:
                return fail("Enter your password.")
            try:
                await asyncio.to_thread(argon2id.verify, row["password"], password.encode())
            except InvalidkeyError:
                return fail("Incorrect password.", 403)
            if not account(request) or account(request)["password"] != row["password"]:
                return fail("Sign in again to delete your account.", 401)
            current = security.current(user)
            if current["mfa_version"] != row["mfa_version"]:
                return fail("Your account security changed. Try again.", 409)
            if not security.throttle(user) or not security.consume_factor(current, data.get("code")):
                return fail("Enter a new authenticator code or recovery code.", 400)
            # Ownership is checked again after password verification, so a
            # concurrent transfer cannot leave a shared server without an owner.
            owned = list(db.execute("SELECT id,name FROM spaces WHERE owner=?", (user,)))
            shared = [space["name"] for space in owned if space["id"] in PUBLIC_SPACES or db.execute(
                "SELECT 1 FROM members WHERE space=? AND account<>?", (space["id"],user)).fetchone()]
            if shared:
                return fail("Transfer ownership of these servers before deleting your account: " + ", ".join(shared), 409)
            uploaded = [item["url"] for item in db.execute("SELECT url FROM media_uploads WHERE account=?", (user,))]
            owned_media = [item[column] for space in owned
                           for item in db.execute("SELECT icon,banner,banner_source FROM spaces WHERE id=?", (space["id"],))
                           for column in ("icon","banner","banner_source")]
            with db:
                for space in owned:
                    sid = space["id"]
                    db.execute("DELETE FROM votes WHERE poll IN (SELECT id FROM polls WHERE space=?)", (sid,))
                    db.execute("DELETE FROM role_members WHERE role IN (SELECT id FROM space_roles WHERE space=?)", (sid,))
                    for table in ("messages","polls","members","custom_bots","space_invites","space_roles","space_emojis","space_bans","space_logs"):
                        db.execute(f"DELETE FROM {table} WHERE space=?", (sid,))
                    db.execute("DELETE FROM spaces WHERE id=?", (sid,))
                db.execute("DELETE FROM votes WHERE poll IN (SELECT id FROM polls WHERE author=?)", (user,))
                db.execute("DELETE FROM polls WHERE author=?", (user,))
                db.execute("DELETE FROM messages WHERE author=?", (user,))
                for table in ("sessions","members","votes","role_members","space_bans"):
                    db.execute(f"DELETE FROM {table} WHERE account=?", (user,))
                db.execute("DELETE FROM friendships WHERE sender=? OR recipient=?", (user,user))
                db.execute("UPDATE space_logs SET actor=NULL WHERE actor=?", (user,))
                db.execute("DELETE FROM media_uploads WHERE account=?", (user,))
                db.execute("DELETE FROM accounts WHERE id=?", (user,))
            for room in list(voice_rooms.values()):
                for socket in list(room.values()):
                    if getattr(socket, "_sonix_account", None) == user:
                        await socket.close()
            remove_unused_media([row["avatar"],row["banner"],row["banner_source"],*uploaded,*owned_media])
            security.invalidate(user)
            db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            response.del_cookie("sonix_session")
        elif action == "crop-banner":
            horizontal, vertical = crop_position(data, "banner_horizontal"), crop_position(data)
            result = await asyncio.to_thread(images.crop, data.get("source"), horizontal, vertical, zoom(data))
            if not account(request):
                remove_unused_media([result["banner"],result["banner_source"]])
                return fail("Sign in again to upload a banner.", 401)
            with db:
                db.executemany("INSERT OR IGNORE INTO media_uploads VALUES (?,?)",
                               [(user,result["banner"]),(user,result["banner_source"])])
            return web.json_response(result)
        elif action == "heartbeat":
            db.execute("UPDATE accounts SET last_active=? WHERE id=?", (time.time(),user))
        elif action == "presence":
            presence = field(data, "presence")
            if presence not in ("online", "away", "busy", "invisible"):
                return fail("Choose a valid presence.")
            db.execute("UPDATE accounts SET presence=?,status_text=?,last_active=? WHERE id=?",
                       (presence,field(data, "status_text", 80),time.time(),user))
        elif action == "profile":
            name = field(data, "name", 32)
            theme, language = field(data, "theme"), field(data, "language")
            if not name or theme not in ("red", "purple", "cyan", "green") or language not in ("en", "es", "fr", "de", "pl", "it", "pt", "ja"):
                return fail("Check your profile settings.")
            db.execute(
                "UPDATE accounts SET name=?,bio=?,avatar=?,banner=?,theme=?,language=?,banner_position=?,banner_horizontal=?,banner_source=?,banner_zoom=? WHERE id=?",
                (name, field(data, "bio", 240), image(data, "avatar"), image(data, "banner"), theme, language, crop_position(data), crop_position(data, "banner_horizontal"), image(data,"banner_source"), zoom(data), user),
            )
        elif action == "friend":
            target = field(data, "account")
            if data.get("accept") is True:
                cursor = db.execute("UPDATE friendships SET accepted=1 WHERE sender=? AND recipient=? AND accepted=0", (target,user))
                if not cursor.rowcount:
                    return fail("Friend request unavailable.", 404)
            else:
                target = db.execute("SELECT id FROM accounts WHERE id=?", (target,)).fetchone() if target else None
                if not target:
                    target = db.execute("SELECT id FROM accounts WHERE email=?", (field(data, "email", 254).lower(),)).fetchone()
                if not target or target["id"] == user:
                    return fail("That Sonix account could not be added.", 404)
                target = target["id"]
                if db.execute("SELECT 1 FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",
                              (user,target,target,user)).fetchone():
                    return fail("A friendship or request already exists.", 409)
                db.execute("INSERT INTO friendships(sender,recipient) VALUES (?,?)", (user,target))
        elif action == "group":
            existing = field(data, "space")
            name, requested = field(data, "name", 50), data.get("accounts")
            access = space_access(existing, user) if existing else None
            if existing and (not access or existing in PUBLIC_SPACES or not access["group_chat"] or access["owner"] != user):
                return fail("Only the group owner can add participants.", 403)
            if existing:
                name = access["name"]
            allowed = {item["id"] for item in friends(user) if item["accepted"]}
            if not name or not isinstance(requested,list) or not 1 <= len(requested) <= 20 or not all(
                isinstance(item,str) and item in allowed for item in requested
            ):
                return fail("Enter a name and select one to twenty accepted friends.")
            space = existing or secrets.token_urlsafe(12)
            with db:
                if not existing:
                    db.execute("INSERT INTO spaces(id,owner,name,description,channels,group_chat,protected) VALUES (?,?,?,?,?,1,1)",
                               (space,user,name,"Group chat",'["general"]'))
                participants = {member["account"] for member in db.execute("SELECT account FROM members WHERE space=?", (space,))}
                participants.update({user,*requested})
                if len(participants) > 21:
                    return fail("Group chats support up to 21 people.")
                db.executemany("INSERT OR IGNORE INTO members VALUES (?,?)", ((space,item) for item in participants))
            return web.json_response({"space":space})
        elif action == "server-admin":
            space, operation = field(data, "space"), field(data, "operation")
            access = space_access(space, user)
            if not access or access["group_chat"]:
                return fail("Server settings unavailable.", 404)
            permission = {"invite":"invites","revoke":"invites","emoji":"emoji","remove-emoji":"emoji",
                          "ban":"moderate","unban":"moderate"}.get(operation)
            if (permission and not can_manage(access, space, user, permission)) or (not permission and access["owner"] != user):
                return fail("You do not have permission for this action.", 403)
            label = operation
            target = field(data, "account")
            if operation == "invite":
                if db.execute("SELECT COUNT(*) FROM space_invites WHERE space=? AND expires>?", (space,time.time())).fetchone()[0] >= 100:
                    return fail("Revoke an existing invite before creating another.")
                code = secrets.token_urlsafe(18)
                db.execute("DELETE FROM space_invites WHERE space=? AND expires<=?", (space,time.time()))
                db.execute("INSERT INTO space_invites VALUES (?,?,?)", (code,space,int(time.time())+604800))
                response = web.json_response({"code":code})
            elif operation == "revoke":
                db.execute("DELETE FROM space_invites WHERE space=? AND code=?", (space,field(data,"code")))
            elif operation == "transfer":
                if target == user or not db.execute("SELECT 1 FROM members WHERE space=? AND account=?", (space,target)).fetchone():
                    return fail("Choose another server member.")
                db.execute("UPDATE spaces SET owner=? WHERE id=?", (target,space))
                label = "Transferred server ownership"
            elif operation == "protection":
                if not isinstance(data.get("enabled"), bool):
                    return fail("Choose a protection setting.")
                db.execute("UPDATE spaces SET protected=? WHERE id=?", (data["enabled"],space))
                label = "Enabled invite-only protection" if data["enabled"] else "Disabled invite-only protection"
            elif operation == "role":
                name, permissions = field(data,"name",40), data.get("permissions")
                if not name or not isinstance(permissions,list) or not all(isinstance(item,str) and item in PERMISSIONS for item in permissions):
                    return fail("Enter a role name and valid permissions.")
                db.execute("INSERT INTO space_roles VALUES (?,?,?,?)", (secrets.token_urlsafe(9),space,name,json.dumps(sorted(set(permissions)))))
                label = "Created role " + name
            elif operation in ("assign", "unassign"):
                role = field(data, "role")
                if not db.execute("SELECT 1 FROM space_roles WHERE id=? AND space=?", (role,space)).fetchone() or not space_access(space,target):
                    return fail("Choose a role and server member.")
                if operation == "assign":
                    db.execute("INSERT OR IGNORE INTO role_members VALUES (?,?)", (role,target))
                else:
                    db.execute("DELETE FROM role_members WHERE role=? AND account=?", (role,target))
            elif operation in ("emoji", "remove-emoji"):
                name = field(data,"name",24)
                if not re.fullmatch(r"[a-z0-9_-]{1,24}", name):
                    return fail("Use lowercase letters, digits, dashes or underscores for the emoji name.")
                if operation == "emoji":
                    picture = image(data,"image")
                    if not picture or len(picture)>350000:
                        return fail("Choose an emoji image under 250 KB.")
                    if db.execute("SELECT COUNT(*) FROM space_emojis WHERE space=?", (space,)).fetchone()[0]>=25 and not db.execute(
                        "SELECT 1 FROM space_emojis WHERE space=? AND name=?", (space,name)).fetchone():
                        return fail("Remove an emoji before adding another.")
                    db.execute("INSERT OR REPLACE INTO space_emojis VALUES (?,?,?)", (space,name,picture))
                else:
                    db.execute("DELETE FROM space_emojis WHERE space=? AND name=?", (space,name))
                label = operation + " :" + name + ":"
            elif operation in ("ban", "unban"):
                if operation == "ban":
                    if target == access["owner"] or target == user or not space_access(space,target):
                        return fail("Choose another server member.")
                    with db:
                        db.execute("INSERT OR IGNORE INTO space_bans VALUES (?,?)", (space,target))
                        db.execute("DELETE FROM members WHERE space=? AND account=?", (space,target))
                        db.execute("DELETE FROM role_members WHERE account=? AND role IN (SELECT id FROM space_roles WHERE space=?)", (target,space))
                else:
                    db.execute("DELETE FROM space_bans WHERE space=? AND account=?", (space,target))
                for key, room in list(voice_rooms.items()):
                    if key[0] == space:
                        for socket in list(room.values()):
                            if getattr(socket, "_sonix_account", None) == target:
                                await socket.close()
            else:
                return fail("Unknown settings action.", 404)
            audit(space, user, label)
        elif action in ("shadow-generate", "shadow-install"):
            space = field(data, "space")
            access = space_access(space, user)
            if not access or access["owner"] != user:
                return fail("Choose a server you own.", 403)
            name = field(data, "name", 40)
            if not name:
                return fail("Enter a bot name.")
            if action == "shadow-generate":
                if not shadow_model:
                    return fail("AI generation is unavailable on this Sonix instance.", 503)
                purpose = field(data, "purpose", 1000)
                if not purpose:
                    return fail("Describe what the bot should do.")
                if shadow_lock.locked():
                    return fail("Shadow Bot is already generating a draft. Try again shortly.", 429)
                schema = {"type": "object", "properties": {"command": {"type": "string"}, "reply": {"type": "string"}},
                          "required": ["command", "reply"]}
                try:
                    async with shadow_lock, ClientSession(timeout=ClientTimeout(total=60)) as client:
                        async with client.post("http://127.0.0.1:11434/api/chat", json={
                            "model": shadow_model, "stream": False, "format": schema, "options": {"num_predict": 300},
                            "messages": [
                                {"role": "system", "content": "Draft one Sonix chat bot command. Return JSON with a lowercase command, no slash, and a short static chat reply. Use letters, digits and hyphens in the command. Output plain text values and no executable code."},
                                {"role": "user", "content": f"Bot name: {name}\nPurpose: {purpose}"},
                            ],
                        }, allow_redirects=False) as upstream:
                            upstream.raise_for_status()
                            result = json.loads((await upstream.json())["message"]["content"])
                    command, reply = field(result, "command", 24), field(result, "reply", 600)
                    if not re.fullmatch(r"[a-z][a-z0-9-]{0,23}", command) or not reply:
                        raise ValueError("Invalid command draft.")
                except (ClientError, TimeoutError, ValueError, KeyError, TypeError, AttributeError):
                    return fail("Shadow Bot could not generate a draft. Check the model and try again.", 502)
                return web.json_response({"command": command, "reply": reply})
            command, reply = field(data, "command", 24), field(data, "reply", 600)
            if not re.fullmatch(r"[a-z][a-z0-9-]{0,23}", command) or not reply:
                return fail("Enter a lowercase command and a reply.")
            if command in {value[0] for value in BOTS.values()}:
                return fail("This command is reserved for a built-in bot.")
            with db:
                if db.execute("SELECT COUNT(*) FROM custom_bots WHERE space=?", (space,)).fetchone()[0] >= 25:
                    return fail("This server already has 25 custom bot commands.")
                cursor = db.execute("INSERT OR IGNORE INTO custom_bots VALUES (?,?,?,?)", (space, command, name, reply))
                if cursor.rowcount == 0:
                    return fail("This server already uses that command.", 409)
        elif action == "discord-template":
            code = field(data, "code", 80)
            if not re.fullmatch(r"[A-Za-z0-9_-]{2,64}", code):
                return fail("Enter a valid Discord template link or code.")
            try:
                async with ClientSession(timeout=ClientTimeout(total=10)) as client:
                    async with client.get(
                        f"https://discord.com/api/v10/guilds/templates/{code}", allow_redirects=False
                    ) as upstream:
                        if upstream.status == 404:
                            return fail("Discord could not find that template.", 404)
                        if upstream.status != 200:
                            return fail("Discord could not load that template right now.", 502)
                        template = await upstream.json()
                snapshot = template["serialized_source_guild"]
                channels = template_channels(snapshot)
                name = field(snapshot, "name", 50) or field(template, "name", 50)
            except (ClientError, TimeoutError, ValueError, KeyError, TypeError, AttributeError):
                return fail("Could not read the Discord template.", 502)
            if not channels or not name:
                return fail("This template has no supported channels.")
            space = secrets.token_urlsafe(12)
            with db:
                db.execute("INSERT INTO spaces(id,owner,name,description,channels,protected) VALUES (?,?,?,?,?,1)",
                           (space, user, name, field(template, "description", 240), json.dumps(channels)))
                db.execute("INSERT INTO members VALUES (?,?)", (space, user))
            return web.json_response({"space": space})
        elif action in ("channel", "poll", "vote"):
            space = field(data, "space")
            access = space_access(space, user)
            channel = field(data, "channel")
            selected = find_channel(access, channel)
            if action == "channel":
                if not can_manage(access, space, user, "channels"):
                    return fail("You do not have permission to manage channels.", 403)
                channels = channel_records(json.loads(access["channels"]))
                with db:
                    if data.get("delete") is True:
                        if not selected:
                            return fail("Channel unavailable.", 404)
                        channels = [item for item in channels if item["id"] != channel]
                        for item in channels:
                            if item["parent"] == channel:
                                item["parent"] = ""
                        db.execute("DELETE FROM messages WHERE space=? AND channel=?", (space, channel))
                        db.execute("DELETE FROM votes WHERE poll IN (SELECT id FROM polls WHERE space=? AND channel=?)", (space, channel))
                        db.execute("DELETE FROM polls WHERE space=? AND channel=?", (space, channel))
                    else:
                        name, kind, parent = field(data, "name", 100), field(data, "type"), field(data, "parent")
                        category = find_channel(access, parent)
                        if not name or kind not in CHANNEL_TYPES or len(channels) >= 500:
                            return fail("Choose a channel name and type. Servers can have up to 500 channels and categories.")
                        if parent and (not category or category["type"] != "category" or kind == "category"):
                            return fail("Choose a valid category.")
                        channel = secrets.token_urlsafe(9)
                        channels.append({"id": channel, "name": name, "type": kind, "parent": parent})
                    db.execute("UPDATE spaces SET channels=? WHERE id=?", (json.dumps(channels), space))
                    audit(space, user, ("Deleted channel " + selected["name"]) if data.get("delete") is True else "Created channel " + name)
                if data.get("delete") is True:
                    for socket in list(voice_rooms.get((space, channel), {}).values()):
                        await socket.close()
                return web.json_response({"channel": channel})
            if not selected or selected["type"] != "poll":
                return fail("Poll channel unavailable.", 404)
            if action == "poll":
                question, choices = field(data, "question", 200), data.get("choices")
                if not question or not isinstance(choices, list) or not 2 <= len(choices) <= 8 or not all(
                    isinstance(choice, str) and 1 <= len(choice.strip()) <= 100 for choice in choices
                ):
                    return fail("Enter a question and two to eight choices.")
                db.execute("INSERT INTO polls(space,channel,question,choices,author) VALUES (?,?,?,?,?)",
                           (space, channel, question, json.dumps([choice.strip() for choice in choices]), user))
            else:
                poll_id, choice = data.get("poll"), data.get("choice")
                if type(poll_id) is not int or not 0 < poll_id < 2**63 or type(choice) is not int:
                    return fail("Choose an answer.")
                poll = db.execute("SELECT choices FROM polls WHERE id=? AND space=? AND channel=?",
                                  (poll_id, space, channel)).fetchone()
                if not poll or not 0 <= choice < len(json.loads(poll["choices"])):
                    return fail("Choose an answer.")
                db.execute("INSERT OR REPLACE INTO votes VALUES (?,?,?)", (poll_id, user, choice))
        elif action in ("space", "join", "bot", "message"):
            space = field(data, "space")
            access = space_access(space, user)
            if action == "join":
                invite = db.execute("SELECT space FROM space_invites WHERE code=? AND expires>?", (space,time.time())).fetchone()
                if invite:
                    space = invite["space"]
                destination = db.execute("SELECT protected,group_chat FROM spaces WHERE id=?", (space,)).fetchone()
                if space in PUBLIC_SPACES and not destination:
                    return web.json_response({"space":space})
                if not destination or destination["group_chat"] or (destination["protected"] and not invite):
                    return fail("Invalid or expired invite code.", 404)
                if db.execute("SELECT 1 FROM space_bans WHERE space=? AND account=?", (space,user)).fetchone():
                    return fail("You cannot join this server.", 403)
                db.execute("INSERT OR IGNORE INTO members VALUES (?,?)", (space, user))
                response = web.json_response({"space":space})
            elif action == "space":
                name = field(data, "name", 50)
                channels = data.get("channels")
                if not name:
                    return fail("Enter a server name.")
                values = (name, field(data, "description", 240), image(data, "banner"), crop_position(data), crop_position(data, "banner_horizontal"), image(data,"banner_source"), zoom(data), image(data,"icon"))
                if space:
                    if not access or access["owner"] != user:
                        return fail("Only the server owner can change settings.", 403)
                    db.execute("UPDATE spaces SET name=?,description=?,banner=?,banner_position=?,banner_horizontal=?,banner_source=?,banner_zoom=?,icon=? WHERE id=?", (*values, space))
                    audit(space, user, "Updated server profile")
                else:
                    if channels is None:
                        channels = ["general"]
                    if not isinstance(channels, list) or not 1 <= len(channels) <= 500 or not all(
                        isinstance(channel, str) and re.fullmatch(r"[\w-]{1,100}", channel) for channel in channels
                    ):
                        return fail("Enter up to 500 valid text channel names.")
                    space = secrets.token_urlsafe(12)
                    with db:
                        db.execute("INSERT INTO spaces(id,owner,name,description,banner,banner_position,banner_horizontal,banner_source,banner_zoom,icon,channels,protected) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)",
                                   (space, user, *values, json.dumps(list(dict.fromkeys(channels)))))
                        db.execute("INSERT INTO members VALUES (?,?)", (space, user))
                response = web.json_response({"space": space})
            elif action == "bot":
                bot = field(data, "bot")
                if not can_manage(access, space, user, "apps"):
                    return fail("You do not have permission to manage apps.", 403)
                if bot not in BOTS or not isinstance(data.get("enabled"), bool):
                    return fail("Choose a valid app and action.")
                enabled = set(json.loads(access["bots"]))
                if data["enabled"]:
                    enabled.add(bot)
                else:
                    enabled.discard(bot)
                db.execute("UPDATE spaces SET bots=? WHERE id=?", (json.dumps(sorted(enabled)), space))
                audit(space, user, ("Installed bot " if data["enabled"] else "Removed bot ") + bot)
            else:
                channel, body = field(data, "channel"), field(data, "body", 2000)
                selected = find_channel(access, channel)
                if not selected or selected["type"] != "text":
                    return fail("Text channel unavailable.", 404)
                if not body:
                    return fail("Enter a message.")
                if space in PUBLIC_SPACES:
                    db.execute("INSERT OR IGNORE INTO members SELECT id,? FROM spaces WHERE id=?", (user,space))
                add_message(space, channel, user, body)
                for bot in json.loads(access["bots"]):
                    command, reply = BOTS[bot]
                    if body == "/" + command:
                        add_message(space, channel, None, reply() if callable(reply) else reply, bot)
                if body.startswith("/"):
                    custom = db.execute("SELECT name,reply FROM custom_bots WHERE space=? AND command=?",
                                        (space, body[1:])).fetchone()
                    if custom:
                        add_message(space, channel, None, custom["reply"], custom["name"])
        else:
            return fail("Unknown action.", 404)
        db.commit()
        return response

    async def voice(request):
        origin = request.headers.get("Origin", "")
        if origin not in (f"http://{request.host}", f"https://{request.host}"):
            raise web.HTTPForbidden()
        row = account(request)
        space, channel = request.query.get("space", ""), request.query.get("channel", "")
        selected = find_channel(space_access(space, row["id"]), channel) if row else None
        if not selected or selected["type"] != "voice":
            raise web.HTTPForbidden()
        key = (space, channel)
        room = voice_rooms.setdefault(key, {})
        if len(room) >= 8:
            raise web.HTTPServiceUnavailable(text="Voice room is full.")
        socket = web.WebSocketResponse(heartbeat=25, max_msg_size=24_000)
        socket._sonix_account = row["id"]
        peer = secrets.token_urlsafe(9)
        room[peer] = socket
        try:
            await socket.prepare(request)
            existing = [other for other, connection in room.items()
                        if getattr(connection, "_sonix_ready", False) and not connection.closed]
            socket._sonix_ready = True
            await socket.send_json({"peers": existing})
            for other in existing:
                if other in room and not room[other].closed:
                    await room[other].send_json({"joined": peer})
            async for message in socket:
                if message.type.name != "TEXT":
                    continue
                try:
                    data = message.json()
                except ValueError:
                    continue
                if not isinstance(data, dict) or not isinstance(data.get("to"), str):
                    continue
                target = room.get(data["to"])
                if target and target.prepared and not target.closed:
                    await target.send_json({"from": peer, "signal": data.get("signal")})
        except (ConnectionError, RuntimeError):
            pass
        finally:
            room.pop(peer, None)
            if not room:
                voice_rooms.pop(key, None)
            for other in list(room.values()):
                if other.prepared and not other.closed:
                    try:
                        await other.send_json({"left": peer})
                    except ConnectionError:
                        pass
        return socket

    async def index(request):
        return web.FileResponse(ASSETS / "index.html", headers={"Cache-Control": "no-cache"})

    async def health(request):
        return web.json_response({"status": "ok"})

    async def privacy_page(request):
        return web.FileResponse(ASSETS / "privacy.html", headers={"Cache-Control": "no-cache"})

    async def service_worker(request):
        return web.FileResponse(ASSETS / "sw.js", headers={"Cache-Control": "no-cache"})

    async def close_voice(app):
        sockets = [socket for room in voice_rooms.values() for socket in room.values() if socket.prepared]
        await asyncio.gather(*(socket.close(code=1001, message=b"Sonix is shutting down") for socket in sockets),
                             return_exceptions=True)

    async def cleanup(app):
        db.close()
        if images.temporary:
            images.temporary.cleanup()

    app = web.Application(middlewares=[safety], client_max_size=68 * 1024 * 1024)
    app.router.add_get("/", index)
    app.router.add_get("/healthz", health)
    app.router.add_get("/sw.js", service_worker)
    app.router.add_get("/privacy", privacy_page)
    app.router.add_get("/voice", voice)
    app.router.add_get("/api/{action}", api)
    app.router.add_post("/api/{action}", api)
    app.router.add_static("/assets", ASSETS)
    app.router.add_static("/media", images.root)
    app.on_shutdown.append(close_voice)
    app.on_cleanup.append(cleanup)
    return app


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Sonix web app")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--database", default=os.environ.get("SONIX_WEB_DATABASE", "sonix-web.db"))
    parser.add_argument("--secure-cookie", action="store_true", help="Require HTTPS for session cookies")
    options = parser.parse_args()
    web.run_app(create_app(options.database, options.secure_cookie), host=options.host, port=options.port, access_log=None)
