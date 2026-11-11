"""Tests for network layer."""
from unittest.mock import AsyncMock

import pytest

from sonix.core.events import EventBus, NewMessageEvent
from sonix.infrastructure.network.client import WSClient


@pytest.mark.asyncio
async def test_ws_client_send_message():
    bus = EventBus()
    client = WSClient("ws://localhost:8765", bus)

    # Mock websocket
    mock_ws = AsyncMock()
    client._ws = mock_ws

    await client.send_message(1, "Hello")
    mock_ws.send.assert_called_once()
    sent_data = mock_ws.send.call_args[0][0]
    assert "send_message" in sent_data
    assert "channel_id" in sent_data


@pytest.mark.asyncio
async def test_ws_client_typing():
    bus = EventBus()
    client = WSClient("ws://localhost:8765", bus)
    mock_ws = AsyncMock()
    client._ws = mock_ws

    await client.send_typing(1, True)
    mock_ws.send.assert_called_once()

    await client.send_typing(1, False)
    assert mock_ws.send.call_count == 2


@pytest.mark.asyncio
async def test_event_publishing():
    bus = EventBus()
    received = []

    async def handler(event: NewMessageEvent):
        received.append(event)

    bus.subscribe(NewMessageEvent, handler)

    # Simulate incoming message
    import json
    raw = json.dumps({
        "type": "new_message",
        "payload": {
            "message_id": 42,
            "channel_id": 1,
            "author_id": 2,
            "content": "Test message",
            "message_type": "text"
        }
    })

    # This would normally be called by _handle_message
    await bus.publish(NewMessageEvent(**json.loads(raw)["payload"]))

    assert len(received) == 1
    assert received[0].message_id == 42
    assert received[0].content == "Test message"