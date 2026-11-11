"""Domain models for Sonix - Pydantic + SQLModel."""
from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlmodel import Field as SQLField
from sqlmodel import Relationship, SQLModel


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"


class UserBase(BaseModel):
    username: str = Field(min_length=2, max_length=32, pattern=r"^[\w-]+$")
    email: EmailStr
    display_name: str | None = None


class MessageBase(BaseModel):
    content: str
    type: MessageType = MessageType.TEXT
    reply_to_id: int | None = None


class ChannelBase(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    is_private: bool = False


# Table models - defined after base classes to allow forward references
class User(UserBase, SQLModel, table=True):
    __tablename__ = "user"
    id: int | None = SQLField(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(UTC))
    public_key: str | None = None
    messages: list["Message"] = Relationship(back_populates="author")
    owned_channels: list["Channel"] = Relationship(back_populates="owner")


class Message(MessageBase, SQLModel, table=True):
    __tablename__ = "message"
    id: int | None = SQLField(default=None, primary_key=True)
    author_id: int = SQLField(foreign_key="user.id")
    channel_id: int = SQLField(foreign_key="channel.id")
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(UTC))
    edited_at: datetime | None = None
    author: "User" = Relationship(back_populates="messages")
    channel: "Channel" = Relationship(back_populates="messages")


class Channel(ChannelBase, SQLModel, table=True):
    __tablename__ = "channel"
    id: int | None = SQLField(default=None, primary_key=True)
    owner_id: int = SQLField(foreign_key="user.id")
    messages: list["Message"] = Relationship(back_populates="channel")
    owner: "User" = Relationship(back_populates="owned_channels")


# Pydantic-only schemas for API/WS communication
class UserRead(UserBase):
    id: int
    created_at: datetime
    public_key: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageRead(MessageBase):
    id: int
    author_id: int
    channel_id: int
    created_at: datetime
    edited_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ChannelRead(ChannelBase):
    id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)


class TokenData(BaseModel):
    user_id: int
    username: str
    exp: datetime