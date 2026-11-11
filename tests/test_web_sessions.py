"""Persistent sign-in and server artwork regressions."""

import base64
import io
import sqlite3
import time

import pytest
from aiohttp.test_utils import TestClient, TestServer
from PIL import Image

from sonix.web.__main__ import SESSION_LIFETIME, create_app


@pytest.mark.asyncio
async def test_persistent_cookie_renewal_and_explicit_logout(tmp_path):
    database = tmp_path / "sessions.db"
    async with TestClient(TestServer(create_app(database))) as client:
        response = await client.post("/api/register", json={
            "name":"Remembered", "email":"remember@example.test", "password":"long-test-password",
        })
        assert response.status == 200
        cookie = response.cookies["sonix_session"]
        token = cookie.value
        assert int(cookie["max-age"]) == SESSION_LIFETIME
        assert cookie["httponly"] and cookie["samesite"] == "Strict"
    # The same cookie works after both the client and the server restart.
    with sqlite3.connect(database) as db:
        db.execute("UPDATE sessions SET expires=?", (int(time.time()) + 3600,))
    async with TestClient(TestServer(create_app(database))) as reopened:
        reopened.session.cookie_jar.update_cookies({"sonix_session":token})
        response = await reopened.get("/api/me")
        assert (await response.json())["name"] == "Remembered"
        assert int(response.cookies["sonix_session"]["max-age"]) == SESSION_LIFETIME
        assert response.cookies["sonix_session"].value == token
        with sqlite3.connect(database) as db:
            assert db.execute("SELECT expires FROM sessions").fetchone()[0] > time.time() + SESSION_LIFETIME - 60
        await reopened.post("/api/logout",json={})
        assert await (await reopened.get("/api/me")).json() is None


@pytest.mark.asyncio
async def test_server_logo_persists_with_banner_and_can_be_removed():
    async with TestClient(TestServer(create_app(":memory:"))) as client:
        async def post(action, **values):
            response = await client.post("/api/"+action,json=values)
            result = await response.json()
            assert response.status == 200, result
            return result
        await post("register",name="Owner",email="owner@example.test",password="long-test-password")
        buffer=io.BytesIO()
        Image.new("RGB",(900,900),"purple").save(buffer,format="PNG")
        icon="data:image/png;base64,"+base64.b64encode(buffer.getvalue()).decode()
        banner=await post("crop-banner",source=icon,banner_zoom=1.5)
        space=(await post("space",name="Artwork",icon=icon,**banner))["space"]
        saved=next(item for item in await (await client.get("/api/spaces")).json() if item["id"]==space)
        assert saved["icon"].startswith("/media/") and saved["banner"]==banner["banner"]
        image=Image.open(io.BytesIO(await (await client.get(saved["icon"])).read()))
        assert max(image.size)<=512
        await post("space",space=space,name="Artwork",icon="",**banner)
        updated=next(item for item in await (await client.get("/api/spaces")).json() if item["id"]==space)
        assert updated["icon"]=="" and updated["banner_source"]==banner["banner_source"]
