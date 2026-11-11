"""Image upload, animated crops, and lightweight chat responses."""

import base64
import io
import secrets

import pytest
from aiohttp.test_utils import TestClient, TestServer
from PIL import Image

from sonix.web.__main__ import create_app


def data_image(image, format="PNG", **options):
    output = io.BytesIO()
    image.save(output, format=format, **options)
    return "data:image/" + format.lower() + ";base64," + base64.b64encode(output.getvalue()).decode()


@pytest.mark.asyncio
async def test_large_profile_image_and_animated_crop(tmp_path):
    database = tmp_path / "images.db"
    async with TestClient(TestServer(create_app(database))) as client:
        async def post(action, **values):
            response = await client.post("/api/" + action, json=values)
            body = await response.json()
            assert response.status == 200, body
            return body
        await post("register", name="Image user", email="image@example.test", password="long-test-password")
        image = Image.frombytes("RGB", (1200, 600), secrets.token_bytes(1200 * 600 * 3))
        avatar = data_image(image)
        assert len(avatar) > 2_000_000
        first = Image.new("RGB", (900, 500), "red")
        second = Image.new("RGB", (900, 500), "green")
        source = data_image(first, "GIF", save_all=True, append_images=[second], duration=[100,200], loop=0)
        crop = await post("crop-banner", source=source, banner_position=25, banner_horizontal=75, banner_zoom=1.5)
        await post("profile", name="Image user", bio="", theme="red", language="en", avatar=avatar, **crop)
        profile = await (await client.get("/api/me")).json()
        assert profile["avatar"].startswith("/media/") and profile["banner_source"].startswith("/media/")
        response = await client.get(profile["banner"])
        assert response.headers["Cache-Control"].endswith("immutable")
        banner = Image.open(io.BytesIO(await response.read()))
        assert banner.size == (600,240) and banner.n_frames == 2
        assert banner.info["loop"] == 0
        await post("message", space="overdrive", channel="general", body="A compact message.")
        response = await client.get("/api/messages?space=overdrive&channel=general")
        etag = response.headers["ETag"]
        payload = await response.json()
        assert payload[0]["avatar"].startswith("/media/") and len(str(payload)) < 1500
        unchanged = await client.get("/api/messages?space=overdrive&channel=general", headers={"If-None-Match":etag})
        assert unchanged.status == 304
        await post("message", space="overdrive", channel="general", body="Another message.")
        changed = await client.get("/api/messages?space=overdrive&channel=general", headers={"If-None-Match":etag})
        assert changed.status == 200 and changed.headers["ETag"] != etag
        await post("delete-account", password="long-test-password")
        assert (await client.get(profile["avatar"])).status == 404
        assert (await client.get(profile["banner"])).status == 404
        assert (await client.get(profile["banner_source"])).status == 404


@pytest.mark.asyncio
async def test_server_banner_and_legacy_image_migration(tmp_path):
    database = tmp_path / "migration.db"
    avatar = data_image(Image.new("RGB",(100,100),"purple"))
    async with TestClient(TestServer(create_app(database))) as client:
        response = await client.post("/api/register", json={
            "name":"Legacy", "email":"legacy@example.test", "password":"long-test-password",
        })
        assert response.status == 200
    import sqlite3
    with sqlite3.connect(database) as db:
        db.execute("UPDATE accounts SET avatar=?", (avatar,))
    async with TestClient(TestServer(create_app(database))) as client:
        await client.post("/api/login", json={"email":"legacy@example.test","password":"long-test-password"})
        profile = await (await client.get("/api/me")).json()
        assert profile["avatar"].startswith("/media/")
        response = await client.post("/api/crop-banner",json={
            "source":avatar,"banner_zoom":4,"banner_position":100,"banner_horizontal":0,
        })
        crop = await response.json()
        assert response.status == 200
        response = await client.post("/api/space",json={"name":"New server",**crop})
        result = await response.json()
        assert response.status == 200, result
        spaces = await (await client.get("/api/spaces")).json()
        space = next(item for item in spaces if item["id"] == result["space"])
        assert space["banner_source"] == crop["banner_source"] and space["banner_zoom"] == 4
        for value in (-1,0,5,"large"):
            invalid = await client.post("/api/crop-banner",json={"source":avatar,"banner_zoom":value})
            assert invalid.status == 400
