"""WebSocket client for real-time communication."""
from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable

import websockets

from sonix.core.events import EventBus, NewMessageEvent, TypingStartEvent, UserJoinedEvent

logger = logging.getLogger(__name__)


class WSClient:
    """WebSocket client with automatic reconnection and event publishing."""

    def __init__(
        self,
        uri: str,
        bus: EventBus,
        token: str | None = None,
        on_connect: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        self.uri = uri
        self.bus = bus
        self.token = token
        self.on_connect = on_connect
        self._ws: websockets.WebSocketClientProtocol | None = None
        self._listen_task: asyncio.Task | None = None
        self._reconnect_delay = 1.0
        self._max_reconnect_delay = 30.0
        self._running = False

    async def connect(self) -> None:
        """Connect to WebSocket server."""
        self._running = True
        await self._connect_once()

    async def _connect_once(self) -> None:
        try:
            headers = {}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"

            self._ws = await websockets.connect(self.uri, additional_headers=headers)
            self._reconnect_delay = 1.0
            logger.info("Connected to %s", self.uri)

            if self.on_connect:
                await self.on_connect()

            self._listen_task = asyncio.create_task(self._listen())

        except (OSError, websockets.WebSocketException) as e:
            logger.error("Connection failed: %s", e)
            if self._running:
                await self._reconnect()

    async def _reconnect(self) -> None:
        logger.info("Reconnecting in %.1fs...", self._reconnect_delay)
        await asyncio.sleep(self._reconnect_delay)
        self._reconnect_delay = min(self._reconnect_delay * 2, self._max_reconnect_delay)
        await self._connect_once()

    async def _listen(self) -> None:
        """Listen for incoming messages."""
        assert self._ws is not None
        try:
            async for raw in self._ws:
                await self._handle_message(raw)
        except websockets.ConnectionClosed:
            logger.warning("Connection closed")
        except (OSError, websockets.WebSocketException) as e:
            logger.error("Listen error: %s", e)
        finally:
            if self._running:
                await self._reconnect()

    async def _handle_message(self, raw: str) -> None:
        """Parse and dispatch incoming message."""
        try:
            data = json.loads(raw)
            msg_type = data.get("type")
            payload = data.get("payload", {})

            if msg_type == "new_message":
                evt = NewMessageEvent(**payload)
                await self.bus.publish(evt)
            elif msg_type == "user_joined":
                evt = UserJoinedEvent(**payload)
                await self.bus.publish(evt)
            elif msg_type == "typing_start":
                evt = TypingStartEvent(**payload)
                await self.bus.publish(evt)
            elif msg_type == "typing_stop":
                # Could add TypingStopEvent
                pass
            elif msg_type == "error":
                logger.error("Server error: %s", payload.get("message"))
            else:
                logger.debug("Unknown message type: %s", msg_type)

        except json.JSONDecodeError:
            logger.error("Invalid JSON: %s", raw)
        except (ValueError, TypeError) as e:
            logger.error("Message handling error: %s", e)

    async def send_message(self, channel_id: int, content: str, msg_type: str = "text") -> None:
        """Send a message to a channel."""
        if not self._ws:
            raise RuntimeError("Not connected")
        await self._ws.send(
            json.dumps(
                {
                    "type": "send_message",
                    "payload": {
                        "channel_id": channel_id,
                        "content": content,
                        "message_type": msg_type,
                    },
                }
            )
        )

    async def send_typing(self, channel_id: int, started: bool) -> None:
        """Send typing indicator."""
        if not self._ws:
            return
        await self._ws.send(
            json.dumps(
                {
                    "type": "typing" if started else "typing_stop",
                    "payload": {"channel_id": channel_id},
                }
            )
        )

    async def join_channel(self, channel_id: int) -> None:
        """Join a channel."""
        if not self._ws:
            return
        await self._ws.send(
            json.dumps(
                {"type": "join_channel", "payload": {"channel_id": channel_id}}
            )
        )

    async def close(self) -> None:
        """Close connection gracefully."""
        self._running = False
        if self._listen_task:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass
        if self._ws:
            await self._ws.close()