"""Regression checks for authenticator and mobile-approved QR sign-in."""

import json
import sqlite3
import time
from unittest.mock import patch

import pyotp
import pytest
from aiohttp.test_utils import TestClient, TestServer

from sonix.web.__main__ import create_app


async def post(client, action, expected=200, **values):
    response = await client.post("/api/" + action, json=values)
    body = await response.json()
    assert response.status == expected, body
    return body


async def identity(client):
    return await (await client.get("/api/me")).json()


@pytest.mark.asyncio
async def test_authenticator_enrollment_recovery_replay_and_disable(tmp_path):
    database = tmp_path / "accounts.db"
    server = TestServer(create_app(database))
    async with TestClient(server) as account, TestClient(server) as browser:
        credentials = {"email": "owner@example.test", "password": "long-test-password"}
        await post(account, "register", name="Owner", **credentials)
        await post(browser, "login", **credentials)
        await post(account, "mfa-start", 403, password="incorrect")
        setup = await post(account, "mfa-start", password=credentials["password"])
        assert setup["qr"].startswith("data:image/svg+xml;base64,")
        assert not (await identity(account))["two_factor_enabled"]
        current_code = pyotp.TOTP(setup["secret"]).now()
        enabled = await post(account, "mfa-enable", code=current_code)
        assert len(enabled["recovery"]) == 10
        assert (await identity(account))["two_factor_enabled"]
        assert await identity(browser) is None
        with sqlite3.connect(database) as db:
            secret, hashes = db.execute("SELECT totp_secret,recovery_hashes FROM accounts").fetchone()
            assert setup["secret"].encode() not in secret
            assert enabled["recovery"][0].replace("-", "") not in hashes
        assert (database.with_name(database.name + ".mfa-key").stat().st_mode & 0o777) == 0o600
        challenge = await post(browser, "login", **credentials)
        assert challenge["mfa_required"] and await identity(browser) is None
        await post(browser, "mfa-login", 400, challenge=challenge["challenge"], code=current_code)
        await post(browser, "mfa-login", challenge=challenge["challenge"], code=enabled["recovery"][0])
        assert await identity(browser)
        await post(browser, "mfa-login", 400, challenge=challenge["challenge"], code=enabled["recovery"][1])
        await post(browser, "logout")
        challenge = await post(browser, "login", **credentials)
        await post(browser, "mfa-login", 400, challenge=challenge["challenge"], code=enabled["recovery"][0])
        future_code = pyotp.TOTP(setup["secret"]).at(time.time() + 30)
        await post(browser, "mfa-login", challenge=challenge["challenge"], code=future_code)
        await post(account, "mfa-disable", 400, password=credentials["password"], code=enabled["recovery"][0])
        await post(account, "mfa-disable", password=credentials["password"], code=enabled["recovery"][1])
        assert not (await identity(account))["two_factor_enabled"]
        assert await identity(browser) is None
        await post(browser, "login", **credentials)
        assert await identity(browser)


@pytest.mark.asyncio
async def test_qr_approval_poll_secret_expiry_and_second_factor():
    server = TestServer(create_app(":memory:"))
    async with TestClient(server) as phone, TestClient(server) as browser, TestClient(server) as outsider:
        password = "long-test-password"
        await post(phone, "register", name="Phone user", email="phone@example.test", password=password)
        qr = await post(browser, "qr-create")
        assert (await post(browser, "qr-poll", id=qr["id"], poll=qr["poll"]))["pending"]
        await post(outsider, "qr-approve", 401, id=qr["id"])
        await post(outsider, "qr-poll", 400, id=qr["id"], poll="incorrect")
        info = await post(phone, "qr-info", id=qr["id"])
        assert info["match"] == qr["match"]
        await post(phone, "qr-approve", id=qr["id"])
        await post(phone, "qr-approve", 400, id=qr["id"])
        await post(browser, "qr-poll", id=qr["id"], poll=qr["poll"])
        assert (await identity(browser))["id"] == (await identity(phone))["id"]
        await post(browser, "qr-poll", 400, id=qr["id"], poll=qr["poll"])
        await post(browser, "logout")
        expired = await post(browser, "qr-create")
        with patch("sonix.web.auth_security.time.time", return_value=time.time() + 121):
            await post(phone, "qr-approve", 400, id=expired["id"])
            await post(browser, "qr-poll", 400, id=expired["id"], poll=expired["poll"])
        cancelled = await post(browser, "qr-create")
        await post(browser, "qr-cancel", id=cancelled["id"], poll=cancelled["poll"])
        await post(phone, "qr-approve", 400, id=cancelled["id"])
        setup = await post(phone, "mfa-start", password=password)
        codes = (await post(phone, "mfa-enable", code=pyotp.TOTP(setup["secret"]).now()))["recovery"]
        protected = await post(browser, "qr-create")
        await post(phone, "qr-approve", 400, id=protected["id"])
        await post(phone, "qr-approve", id=protected["id"], code=codes[0])
        await post(browser, "qr-poll", id=protected["id"], poll=protected["poll"])
        assert (await identity(browser))["two_factor_enabled"]
        await post(browser, "password", 400, current=password, password="new-test-password")
        await post(browser, "delete-account", 400, password=password)
        await post(browser, "delete-account", password=password, code=codes[1])
        assert await identity(phone) is None


@pytest.mark.asyncio
async def test_authenticator_challenge_attempt_limit():
    server = TestServer(create_app(":memory:"))
    async with TestClient(server) as phone, TestClient(server) as browser:
        credentials = {"email": "phone@example.test", "password": "long-test-password"}
        await post(phone, "register", name="Phone", **credentials)
        setup = await post(phone, "mfa-start", password=credentials["password"])
        await post(phone, "mfa-enable", code=pyotp.TOTP(setup["secret"]).now())
        challenge = await post(browser, "login", **credentials)
        for _ in range(5):
            await post(browser, "mfa-login", 400, challenge=challenge["challenge"], code="not-a-code")
        await post(browser, "mfa-login", 429, challenge=challenge["challenge"], code="not-a-code")
        assert await identity(browser) is None
