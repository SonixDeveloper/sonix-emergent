"""Plugin system for extensibility."""
from __future__ import annotations

from typing import Protocol, runtime_checkable

import pluggy

from sonix.core.events import EventBus
from sonix.core.models import MessageRead, UserRead

# Plugin hook specifications
hookspec = pluggy.HookspecMarker("sonix")
hookimpl = pluggy.HookimplMarker("sonix")


@runtime_checkable
class SonixPlugin(Protocol):
    """Protocol for Sonix plugins."""

    @hookspec
    async def on_startup(self, bus: EventBus) -> None:
        """Called when application starts."""

    @hookspec
    async def on_shutdown(self) -> None:
        """Called when application shuts down."""

    @hookspec
    async def on_message(self, message: MessageRead, bus: EventBus) -> None:
        """Called when a new message is received."""

    @hookspec
    async def on_command(self, command: str, args: list[str], user: UserRead, bus: EventBus) -> bool:
        """Handle a slash command. Return True if handled."""

    @hookspec
    def get_commands(self) -> dict[str, str]:
        """Return dict of command -> description."""


class PluginManager:
    """Manages plugin discovery and lifecycle."""

    def __init__(self) -> None:
        self._pm = pluggy.PluginManager("sonix")
        self._pm.add_hookspecs(SonixPlugin)

    def load_plugin(self, plugin: SonixPlugin) -> None:
        self._pm.register(plugin)

    def load_setuptools_entrypoints(self, group: str = "sonix.plugins") -> int:
        return self._pm.load_setuptools_entrypoints(group)

    async def startup(self, bus: EventBus) -> None:
        await self._pm.hook.on_startup(bus=bus)

    async def shutdown(self) -> None:
        await self._pm.hook.on_shutdown()

    async def handle_message(self, message: MessageRead, bus: EventBus) -> None:
        await self._pm.hook.on_message(message=message, bus=bus)

    async def handle_command(
        self, command: str, args: list[str], user: UserRead, bus: EventBus
    ) -> bool:
        results = await self._pm.hook.on_command(
            command=command, args=args, user=user, bus=bus
        )
        return any(results)

    def get_all_commands(self) -> dict[str, str]:
        commands = {}
        for plugin_commands in self._pm.hook.get_commands():
            commands.update(plugin_commands)
        return commands


# Built-in example plugin
class ExamplePlugin:
    """Example plugin showing the plugin interface."""

    @hookimpl
    async def on_startup(self, bus: EventBus) -> None:
        print("[ExamplePlugin] Started")

    @hookimpl
    async def on_shutdown(self) -> None:
        print("[ExamplePlugin] Shutting down")

    @hookimpl
    async def on_message(self, message: MessageRead, bus: EventBus) -> None:
        if message.content.startswith("!ping"):
            # In real plugin, would send reply via bus
            pass

    @hookimpl
    async def on_command(
        self, command: str, args: list[str], user: UserRead, bus: EventBus
    ) -> bool:
        if command == "hello":
            print(f"Hello, {user.display_name or user.username}!")
            return True
        return False

    @hookimpl
    def get_commands(self) -> dict[str, str]:
        return {"hello": "Say hello"}