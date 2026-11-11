"""Message and event handlers."""
from __future__ import annotations

from sonix.core.events import EventBus, NewMessageEvent
from sonix.core.models import MessageRead, UserRead
from sonix.core.plugins import PluginManager


class MessageHandler:
    """Handles incoming messages with plugin support."""

    def __init__(self, bus: EventBus, plugin_manager: PluginManager):
        self.bus = bus
        self.plugins = plugin_manager
        bus.subscribe(NewMessageEvent, self.handle_new_message)

    async def handle_new_message(self, event: NewMessageEvent):
        """Process new message through plugins."""
        message = MessageRead(
            id=event.message_id,
            author_id=event.author_id,
            channel_id=event.channel_id,
            content=event.content,
            type=event.message_type,
            created_at=event.__dict__.get("created_at"),  # type: ignore
        )
        await self.plugins.handle_message(message, self.bus)


class CommandHandler:
    """Handles slash commands."""

    def __init__(self, plugin_manager: PluginManager):
        self.plugins = plugin_manager

    async def handle(self, command: str, args: list[str], user: UserRead, bus: EventBus) -> bool:
        """Process a slash command. Returns True if handled."""
        return await self.plugins.handle_command(command, args, user, bus)

    def get_help(self) -> str:
        """Get formatted help for all commands."""
        commands = self.plugins.get_all_commands()
        if not commands:
            return "No commands available"
        lines = ["Available commands:"]
        for cmd, desc in sorted(commands.items()):
            lines.append(f"  /{cmd} - {desc}")
        return "\n".join(lines)