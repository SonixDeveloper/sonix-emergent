"""Tests for core functionality."""
import pytest

from sonix.core.crypto import CryptoManager, hash_password, verify_password
from sonix.core.events import EventBus, NewMessageEvent
from sonix.core.models import MessageType, User
from sonix.core.plugins import ExamplePlugin, PluginManager


def test_user_model():
    user = User(username="testuser", email="test@example.com", hashed_password="hash")
    assert user.username == "testuser"
    assert user.email == "test@example.com"


def test_message_type_enum():
    assert MessageType.TEXT == "text"
    assert MessageType.IMAGE == "image"


def test_crypto_manager():
    crypto = CryptoManager()
    pub_key = crypto.public_key_b64
    assert len(pub_key) > 0

    # Test encrypt/decrypt
    plaintext = b"Hello, World!"
    ciphertext = crypto.encrypt_for(pub_key, plaintext)
    decrypted = crypto.decrypt_from(pub_key, ciphertext)
    assert decrypted == plaintext


def test_password_hashing():
    password = "secure_password_123"
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)


@pytest.mark.asyncio
async def test_event_bus():
    bus = EventBus()
    received = []

    async def handler(event: NewMessageEvent):
        received.append(event)

    bus.subscribe(NewMessageEvent, handler)
    event = NewMessageEvent(message_id=1, channel_id=1, author_id=1, content="test")
    await bus.publish(event)

    assert len(received) == 1
    assert received[0].content == "test"


def test_plugin_manager():
    pm = PluginManager()
    plugin = ExamplePlugin()
    pm.load_plugin(plugin)

    commands = pm.get_all_commands()
    assert "hello" in commands