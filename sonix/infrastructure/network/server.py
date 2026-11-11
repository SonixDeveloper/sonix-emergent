"""WebSocket server for real-time communication."""
from __future__ import annotations

import asyncio
import json
import logging

import websockets

from sonix.core.events import EventBus, NewMessageEvent, UserJoinedEvent
from sonix.core.models import Message, UserRead
from sonix.infrastructure.database import (
    MessageRepository,
    UserRepository,
    get_session,
)

logger = logging.getLogger(__name__)

# In-memory connection registry (replace with Redis for scaling)
class ConnectionManager:
    def __init__(self):
        self._channels: dict[int, set[websockets.WebSocketServerProtocol]] = {}
        self._user_ws: dict[int, websockets.WebSocketServerProtocol] = {}

    async def connect(self, user_id: int, ws: websockets.WebSocketServerProtocol):
        self._user_ws[user_id] = ws

    def disconnect(self, user_id: int):
        self._user_ws.pop(user_id, None)
        for channel_users in self._channels.values():
            channel_users.discard(self._user_ws.get(user_id))

    async def join_channel(self, channel_id: int, ws: websockets.WebSocketServerProtocol):
        if channel_id not in self._channels:
            self._channels[channel_id] = set()
        self._channels[channel_id].add(ws)

    async def leave_channel(self, channel_id: int, ws: websockets.WebSocketServerProtocol):
        if channel_id in self._channels:
            self._channels[channel_id].discard(ws)

    async def broadcast_to_channel(self, channel_id: int, message: dict, exclude: websockets.WebSocketServerProtocol | None = None):
        if channel_id in self._channels:
            dead = set()
            for ws in self._channels[channel_id]:
                if ws != exclude:
                    try:
                        await ws.send(json.dumps(message))
                    except websockets.ConnectionClosed:
                        dead.add(ws)
            for ws in dead:
                self._channels[channel_id].discard(ws)

    async def send_to_user(self, user_id: int, message: dict):
        ws = self._user_ws.get(user_id)
        if ws:
            try:
                await ws.send(json.dumps(message))
            except websockets.ConnectionClosed:
                self.disconnect(user_id)


manager = ConnectionManager()
bus = EventBus()


async def authenticate(ws: websockets.WebSocketServerProtocol) -> UserRead | None:
    """Authenticate WebSocket connection via token in first message."""
    try:
        raw = await ws.recv()
        data = json.loads(raw)
        if data.get("type") != "auth":
            await ws.send(json.dumps({"type": "error", "payload": {"message": "Expected auth"}}))
            return None

        token = data.get("payload", {}).get("token")
        if not token:
            await ws.send(json.dumps({"type": "error", "payload": {"message": "Token required"}}))
            return None

        # In production, validate JWT token here
        # For now, token format: "user_id:username"
        try:
            user_id_str, username = token.split(":", 1)
            user_id = int(user_id_str)
        except ValueError:
            await ws.send(json.dumps({"type": "error", "payload": {"message": "Invalid token"}}))
            return None

        async with get_session() as session:
            repo = UserRepository(session)
            user = await repo.get_by_id(user_id)
            if not user or user.username != username:
                await ws.send(json.dumps({"type": "error", "payload": {"message": "User not found"}}))
                return None

        return UserRead.model_validate(user)
    except (ValueError, TypeError, AttributeError) as e:
        logger.error("Auth error: %s", e)
        return None


async def handle_client(ws: websockets.WebSocketServerProtocol):
    """Main WebSocket handler."""
    user = await authenticate(ws)
    if not user:
        await ws.close()
        return

    await manager.connect(user.id, ws)
    logger.info("User %s connected", user.username)

    try:
        async for raw in ws:
            await handle_message(ws, user, raw)
    except websockets.ConnectionClosed:
        pass
    finally:
        manager.disconnect(user.id)
        logger.info("User %s disconnected", user.username)


async def handle_message(ws: websockets.WebSocketServerProtocol, user: UserRead, raw: str):
    """Process incoming message."""
    try:
        data = json.loads(raw)
        msg_type = data.get("type")
        payload = data.get("payload", {})

        if msg_type == "send_message":
            await handle_send_message(user, payload)
        elif msg_type == "join_channel":
            await handle_join_channel(ws, user, payload)
        elif msg_type == "leave_channel":
            await handle_leave_channel(ws, user, payload)
        elif msg_type == "typing":
            await handle_typing(user, payload, True)
        elif msg_type == "typing_stop":
            await handle_typing(user, payload, False)
        else:
            await ws.send(json.dumps({"type": "error", "payload": {"message": f"Unknown type: {msg_type}"}}))
    except json.JSONDecodeError:
        await ws.send(json.dumps({"type": "error", "payload": {"message": "Invalid JSON"}}))
    except (ValueError, TypeError, KeyError) as e:
        logger.error("Handle message error: %s", e)
        await ws.send(json.dumps({"type": "error", "payload": {"message": "Internal error"}}))


async def handle_send_message(user: UserRead, payload: dict):
    channel_id = payload.get("channel_id")
    content = payload.get("content", "")
    msg_type = payload.get("message_type", "text")

    if not channel_id or not content:
        return

    async with get_session() as session:
        msg_repo = MessageRepository(session)
        message = await msg_repo.create(
            Message(
                author_id=user.id,
                channel_id=channel_id,
                content=content,
                type=msg_type,
            )
        )

    # Broadcast to channel
    event_data = {
        "type": "new_message",
        "payload": {
            "message_id": message.id,
            "channel_id": channel_id,
            "author_id": user.id,
            "content": content,
            "message_type": msg_type,
        },
    }
    await manager.broadcast_to_channel(channel_id, event_data)

    # Publish to event bus for plugins
    await bus.publish(NewMessageEvent(**event_data["payload"]))


async def handle_join_channel(ws: websockets.WebSocketServerProtocol, user: UserRead, payload: dict):
    channel_id = payload.get("channel_id")
    if not channel_id:
        return

    await manager.join_channel(channel_id, ws)

    # Notify others
    event_data = {
        "type": "user_joined",
        "payload": {"user_id": user.id, "channel_id": channel_id},
    }
    await manager.broadcast_to_channel(channel_id, event_data, exclude=ws)
    await bus.publish(UserJoinedEvent(user_id=user.id, channel_id=channel_id))


async def handle_leave_channel(ws: websockets.WebSocketServerProtocol, user: UserRead, payload: dict):
    channel_id = payload.get("channel_id")
    if not channel_id:
        return
    await manager.leave_channel(channel_id, ws)


async def handle_typing(user: UserRead, payload: dict, started: bool):
    channel_id = payload.get("channel_id")
    if not channel_id:
        return
    event_type = "typing_start" if started else "typing_stop"
    event_data = {
        "type": event_type,
        "payload": {"user_id": user.id, "channel_id": channel_id},
    }
    await manager.broadcast_to_channel(channel_id, event_data)


async def main(host: str = "0.0.0.0", port: int = 8765):
    """Run WebSocket server."""
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting Sonix WebSocket server on %s:%d", host, port)

    async with websockets.serve(handle_client, host, port):
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())