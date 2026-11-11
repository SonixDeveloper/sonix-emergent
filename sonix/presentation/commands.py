"""CLI commands for Sonix."""
from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table

from sonix.core.crypto import hash_password
from sonix.core.models import User
from sonix.infrastructure.database import UserRepository, get_session, init_db

app = typer.Typer(name="sonix", help="Sonix chat application CLI")
console = Console()


@app.command()
def init():
    """Initialize database."""
    import asyncio
    asyncio.run(init_db())
    console.print("[green]Database initialized[/green]")


@app.command()
def create_user(
    username: str = typer.Argument(..., help="Username"),
    email: str = typer.Argument(..., help="Email"),
    password: str = typer.Option(..., prompt=True, hide_input=True, help="Password"),
    display_name: str = typer.Option(None, help="Display name"),
):
    """Create a new user."""
    import asyncio

    async def _create():
        async with get_session() as session:
            repo = UserRepository(session)
            existing = await repo.get_by_username(username)
            if existing:
                console.print(f"[red]User '{username}' already exists[/red]")
                raise typer.Exit(1)
            existing = await repo.get_by_email(email)
            if existing:
                console.print(f"[red]Email '{email}' already registered[/red]")
                raise typer.Exit(1)

            user = User(
                username=username,
                email=email,
                display_name=display_name,
                hashed_password=hash_password(password),
            )
            await repo.create(user)
            console.print(f"[green]Created user: {username}[/green]")

    asyncio.run(_create())


@app.command()
def list_users():
    """List all users."""
    import asyncio

    from sqlmodel import select

    async def _list():
        async with get_session() as session:
            result = await session.exec(select(User))
            users = result.all()
            if not users:
                console.print("[yellow]No users found[/yellow]")
                return
            table = Table(title="Users")
            table.add_column("ID", style="cyan")
            table.add_column("Username", style="green")
            table.add_column("Email", style="blue")
            table.add_column("Display Name", style="magenta")
            for u in users:
                table.add_row(str(u.id), u.username, u.email, u.display_name or "")
            console.print(table)

    asyncio.run(_list())


@app.command()
def tui(demo: bool = True):
    """Launch TUI (demo mode by default, or connect to server)."""
    import asyncio

    from sonix.main import run_tui, run_tui_demo
    if demo:
        asyncio.run(run_tui_demo())
    else:
        asyncio.run(run_tui())


if __name__ == "__main__":
    app()