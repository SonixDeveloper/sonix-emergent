"""Sonix main entry point."""
from __future__ import annotations

import asyncio
import logging

from sonix.core.events import EventBus
from sonix.core.models import UserRead
from sonix.core.plugins import ExamplePlugin, PluginManager
from sonix.infrastructure.database import init_db
from sonix.infrastructure.network.client import WSClient
from sonix.infrastructure.ui.textual_app import SonixTUI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_tui_demo():
    """Run TUI in demo mode (without server)."""
    await init_db()

    bus = EventBus()
    plugin_manager = PluginManager()
    plugin_manager.load_plugin(ExamplePlugin())

    # Demo user
    from datetime import UTC, datetime
    current_user = UserRead(
        id=1,
        username="demo",
        email="demo@example.com",
        display_name="Demo User",
        created_at=datetime.now(UTC),
    )

    # Mock WS client for demo
    class MockWS:
        async def connect(self): pass
        async def send_message(self, channel_id: int, content: str):
            from sonix.core.events import NewMessageEvent
            await bus.publish(NewMessageEvent(
                message_id=999, channel_id=channel_id,
                author_id=current_user.id, content=content
            ))
        async def join_channel(self, channel_id: int): pass
        async def close(self): pass

    ws = MockWS()
    app = SonixTUI(bus, ws, current_user)
    await app.run_async()


async def run_tui(server_url: str = "ws://localhost:8765", token: str | None = None):
    """Run TUI connected to server."""
    await init_db()

    bus = EventBus()
    plugin_manager = PluginManager()
    plugin_manager.load_plugin(ExamplePlugin())

    # In real app, get current_user from token validation
    from datetime import UTC, datetime
    current_user = UserRead(
        id=1,
        username="user",
        email="user@example.com",
        display_name="User",
        created_at=datetime.now(UTC),
    )

    ws = WSClient(server_url, bus, token=token)
    app = SonixTUI(bus, ws, current_user)
    await app.run_async()


def main():
    """Entry point for `sonix` command."""
    import sys
    if len(sys.argv) > 1 and sys.argv[1] in ("tui", "--tui"):
        asyncio.run(run_tui())
    else:
        # Run CLI
        from sonix.presentation.commands import app as cli_app
        cli_app()


if __name__ == "__main__":
    main()