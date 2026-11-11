"""Event Bus for decoupled architecture."""
from __future__ import annotations

from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import TypeVar

from pydantic import BaseModel

EventT = TypeVar("EventT", bound=BaseModel)


class EventBus:
    """Simple async event bus with type-based subscriptions."""

    def __init__(self) -> None:
        self._subs: dict[type[BaseModel], list[Callable[[BaseModel], Awaitable[None]]]] = defaultdict(list)

    def subscribe(self, event_type: type[EventT], handler: Callable[[EventT], Awaitable[None]]) -> None:
        """Subscribe a handler to an event type."""
        self._subs[event_type].append(handler)  # type: ignore[arg-type]

    def unsubscribe(self, event_type: type[EventT], handler: Callable[[EventT], Awaitable[None]]) -> None:
        """Unsubscribe a handler."""
        if handler in self._subs[event_type]:
            self._subs[event_type].remove(handler)

    async def publish(self, event: BaseModel) -> None:
        """Publish an event to all subscribers."""
        for handler in self._subs.get(type(event), []):
            await handler(event)


# Core domain events
class NewMessageEvent(BaseModel):
    message_id: int
    channel_id: int
    author_id: int
    content: str
    message_type: str = "text"


class MessageEditedEvent(BaseModel):
    message_id: int
    new_content: str


class MessageDeletedEvent(BaseModel):
    message_id: int
    channel_id: int


class UserJoinedEvent(BaseModel):
    user_id: int
    channel_id: int


class UserLeftEvent(BaseModel):
    user_id: int
    channel_id: int


class ChannelCreatedEvent(BaseModel):
    channel_id: int
    name: str
    owner_id: int


class TypingStartEvent(BaseModel):
    user_id: int
    channel_id: int


class TypingStopEvent(BaseModel):
    user_id: int
    channel_id: int