"""Database infrastructure - async SQLModel with SQLite."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from sonix.core.models import Channel, Message, User

# Default to local SQLite file; can be overridden via env
DATABASE_URL = os.getenv("SONIX_DATABASE_URL", "sqlite+aiosqlite:///sonix.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db() -> None:
    """Create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(User.metadata.create_all)


@asynccontextmanager
async def get_session() -> AsyncSession:
    """Get a database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Repository helpers
class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_username(self, username: str) -> User | None:
        from sqlmodel import select
        result = await self.session.exec(select(User).where(User.username == username))
        return result.first()

    async def get_by_email(self, email: str) -> User | None:
        from sqlmodel import select
        result = await self.session.exec(select(User).where(User.email == email))
        return result.first()


class ChannelRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, channel: Channel) -> Channel:
        self.session.add(channel)
        await self.session.flush()
        await self.session.refresh(channel)
        return channel

    async def get_by_id(self, channel_id: int) -> Channel | None:
        return await self.session.get(Channel, channel_id)

    async def list_for_user(self, user_id: int) -> list[Channel]:
        from sqlmodel import select
        # Channels user owns or has messages in
        result = await self.session.exec(
            select(Channel).where(Channel.owner_id == user_id)
        )
        return list(result.all())


class MessageRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, message: Message) -> Message:
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def get_by_id(self, message_id: int) -> Message | None:
        return await self.session.get(Message, message_id)

    async def list_for_channel(
        self, channel_id: int, limit: int = 50, offset: int = 0
    ) -> list[Message]:
        from sqlmodel import select
        result = await self.session.exec(
            select(Message)
            .where(Message.channel_id == channel_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(reversed(result.all()))  # chronological

    async def update_content(self, message_id: int, new_content: str) -> Message | None:
        from datetime import UTC, datetime
        message = await self.get_by_id(message_id)
        if message:
            message.content = new_content
            message.edited_at = datetime.now(UTC)
            await self.session.flush()
            await self.session.refresh(message)
        return message

    async def delete(self, message_id: int) -> bool:
        message = await self.get_by_id(message_id)
        if message:
            await self.session.delete(message)
            return True
        return False