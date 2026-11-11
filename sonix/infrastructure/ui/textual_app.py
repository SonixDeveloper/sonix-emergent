"""Textual TUI for Sonix."""
from __future__ import annotations

import asyncio
from typing import ClassVar

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal
from textual.message import Message
from textual.widgets import Footer, Header, Input, Label, ListItem, ListView, RichLog, Static

from sonix.core.events import EventBus, NewMessageEvent, TypingStartEvent, UserJoinedEvent
from sonix.core.models import UserRead
from sonix.infrastructure.network.client import WSClient


class ChannelSelected(Message):
    def __init__(self, channel_id: int, channel_name: str) -> None:
        self.channel_id = channel_id
        self.channel_name = channel_name
        super().__init__()


class ChannelList(ListView):
    """Sidebar with channel list."""

    BINDINGS: ClassVar = [
        Binding("enter", "select_cursor", "Select", show=False),
    ]

    def __init__(self, channels: list[tuple[int, str]] | None = None):
        super().__init__()
        self._channels = channels or []

    def compose(self) -> ComposeResult:
        for ch_id, name in self._channels:
            yield ListItem(Label(name), id=f"ch-{ch_id}")

    def add_channel(self, channel_id: int, name: str):
        self._channels.append((channel_id, name))
        self.append(ListItem(Label(name), id=f"ch-{channel_id}"))


class ChatView(RichLog):
    """Main chat display area."""

    def __init__(self):
        super().__init__(markup=True, highlight=True, wrap=True)
        self.current_channel: int | None = None

    def add_message(self, author: str, content: str, is_self: bool = False):
        style = "bold green" if is_self else "bold cyan"
        self.write(f"[{style}]{author}[/{style}]: {content}")

    def add_system(self, text: str):
        self.write(f"[dim italic]{text}[/dim italic]")

    def set_channel(self, channel_id: int, channel_name: str):
        self.current_channel = channel_id
        self.clear()
        self.add_system(f"--- {channel_name} ---")


class MessageInput(Input):
    """Message input with typing indicator."""

    def __init__(self, ws: WSClient):
        super().__init__(placeholder="Type a message... (Ctrl+S to send)", id="msg_input")
        self.ws = ws
        self._typing_task: asyncio.Task | None = None

    async def on_key(self, event) -> None:
        # Send on Ctrl+S
        if event.key == "ctrl+s":
            await self.send_message()
            event.prevent_default()
            event.stop()

    async def send_message(self):
        if not self.value.strip():
            return
        content = self.value
        self.value = ""
        # Find current channel from app
        app = self.app
        if hasattr(app, "current_channel_id") and app.current_channel_id:
            await self.ws.send_message(app.current_channel_id, content)


class UserList(Static):
    """Right sidebar with online users."""

    def __init__(self):
        super().__init__()
        self.users: dict[int, str] = {}

    def add_user(self, user_id: int, name: str):
        self.users[user_id] = name
        self.refresh()

    def remove_user(self, user_id: int):
        self.users.pop(user_id, None)
        self.refresh()

    def render(self):
        if not self.users:
            return "[dim]No users online[/dim]"
        lines = ["[b]Online:[/b]"]
        for name in self.users.values():
            lines.append(f"  {name}")
        return "\n".join(lines)


class SonixTUI(App):
    """Main Sonix TUI application."""

    CSS = """
    Screen {
        layout: horizontal;
    }
    #sidebar {
        width: 25%;
        min-width: 30;
        border-right: solid $primary;
        padding: 1;
    }
    #main {
        width: 55%;
        layout: vertical;
    }
    #userlist {
        width: 20%;
        min-width: 20;
        border-left: solid $primary;
        padding: 1;
    }
    ChannelList {
        height: 1fr;
    }
    ChatView {
        height: 1fr;
        border: solid $surface;
    }
    MessageInput {
        dock: bottom;
        height: 3;
    }
    UserList {
        height: 1fr;
        border: solid $surface;
    }
    """

    BINDINGS: ClassVar = [
        Binding("ctrl+q", "quit", "Quit"),
        Binding("ctrl+n", "new_channel", "New Channel"),
        Binding("ctrl+j", "join_channel", "Join Channel"),
    ]

    def __init__(self, bus: EventBus, ws: WSClient, current_user: UserRead):
        super().__init__()
        self.bus = bus
        self.ws = ws
        self.current_user = current_user
        self.current_channel_id: int | None = None
        self.channels: list[tuple[int, str]] = []
        self.channel_list = ChannelList()
        self.chat = ChatView()
        self.msg_input = MessageInput(ws)
        self.user_list = UserList()

    def compose(self) -> ComposeResult:
        yield Header(name="Sonix", show_clock=True)
        with Horizontal():
            with Container(id="sidebar"):
                yield Label("[b]Channels[/b]")
                yield self.channel_list
            with Container(id="main"):
                yield self.chat
                yield self.msg_input
            with Container(id="userlist"):
                yield Label("[b]Users[/b]")
                yield self.user_list
        yield Footer()

    async def on_mount(self):
        # Subscribe to events
        self.bus.subscribe(NewMessageEvent, self._on_new_message)
        self.bus.subscribe(UserJoinedEvent, self._on_user_joined)
        self.bus.subscribe(TypingStartEvent, self._on_typing)

        # Connect to server
        await self.ws.connect()

        # Load demo channels (in real app, fetch from server)
        demo_channels = [(1, "general"), (2, "random"), (3, "dev")]
        for ch_id, name in demo_channels:
            self.channel_list.add_channel(ch_id, name)

        self.channel_list.focus()

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        if event.list_view is self.channel_list:
            item = event.item
            if item.id and item.id.startswith("ch-"):
                ch_id = int(item.id.split("-")[1])
                ch_name = item.children[0].renderable if item.children else f"Channel {ch_id}"
                self._switch_channel(ch_id, str(ch_name))

    def _switch_channel(self, channel_id: int, channel_name: str):
        self.current_channel_id = channel_id
        self.chat.set_channel(channel_id, channel_name)
        self.msg_input.placeholder = f"Message #{channel_name}... (Ctrl+S to send)"
        # Join channel on server
        asyncio.create_task(self.ws.join_channel(channel_id))
        self.msg_input.focus()

    async def _on_new_message(self, evt: NewMessageEvent):
        if evt.channel_id == self.current_channel_id:
            is_self = evt.author_id == self.current_user.id
            author = "You" if is_self else f"User{evt.author_id}"
            self.chat.add_message(author, evt.content, is_self=is_self)

    async def _on_user_joined(self, evt: UserJoinedEvent):
        if evt.channel_id == self.current_channel_id:
            self.chat.add_system(f"User{evt.user_id} joined")
            self.user_list.add_user(evt.user_id, f"User{evt.user_id}")

    async def _on_typing(self, evt: TypingStartEvent):
        if evt.channel_id == self.current_channel_id and evt.user_id != self.current_user.id:
            self.chat.add_system(f"User{evt.user_id} is typing...")

    async def action_new_channel(self):
        # TODO: Implement channel creation dialog
        self.chat.add_system("New channel creation not implemented yet")

    async def action_join_channel(self):
        self.channel_list.focus()

    async def on_unmount(self):
        await self.ws.close()