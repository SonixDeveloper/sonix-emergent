# Sonix 🎧

> A modern, extensible chat application built with Python. Clean architecture, type-safe, and ready for E2E encryption.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Ruff](https://img.shields.io/badge/lint-ruff-fast.svg)](https://github.com/astral-sh/ruff)
[![MyPy](https://img.shields.io/badge/type--check-mypy-strict.svg)](https://mypy-lang.org)
[![Textual](https://img.shields.io/badge/TUI-textual-green.svg)](https://textual.textualize.io)

## Features

- 🏗 **Clean Architecture** — Domain-driven, framework-agnostic core
- ⚡ **Async First** — Built on `asyncio`, `websockets`, `aiohttp`
- 🔒 **E2E Ready** — NaCl/libsodium crypto integrated
- 🖥 **Modern TUI** — Terminal UI via [Textual](https://textual.textualize.io)
- 🧩 **Plugin System** — Extensible via `pluggy` hooks
- 💾 **Local-First** — SQLite (SQLModel) for offline history
- 🧪 **Type Safe** — Strict `mypy`, `pydantic` v2, `ruff` linting

## Quick Start

Run the browser app from the project root with Python 3.11 or later.

```bash
python -m pip install -e .
python -m sonix.web
```

Open http://127.0.0.1:8080. The web app stores accounts, sessions, servers and
messages in `sonix-web.db` by default. It uses a separate database from the
terminal client. Use `--database PATH` to select another SQLite file. To share
an instance over the internet, serve it behind an HTTPS reverse proxy and run
with `--secure-cookie`. Supported browsers can install Sonix as a web app when
served over HTTPS or localhost. Users see the sign-up or sign-in screen first.
After signing in, Home shows their servers and common actions. Discovery lists
Sonix Official Server, built-in apps and slash-command bots.

### Share Sonix with other devices

Everyone using the same Sonix instance should open the same HTTPS URL in their
browser. To publish an instance, run Sonix on a Python host with persistent disk
space. Point an HTTPS reverse proxy on that host at `127.0.0.1:8080`, and set its
public hostname to a domain you control.

```bash
python -m sonix.web --database /path/to/persistent/sonix-web.db --secure-cookie
```

Replace the database path with a writable location on the host. Share the
proxy's HTTPS URL after checking that sign-up and sign-in work through it. The
localhost URL works only on the machine running Sonix.

For an always-on cloud deployment, build with `Dockerfile.web` and attach a
persistent volume at `/data`. Set the host's `PORT` variable if it provides
one. The container binds to `0.0.0.0`, enables secure session cookies, and
serves `/healthz` for health checks. Keep the SQLite database, its `.mfa-key`,
and the matching `.db.media` directory together on persistent storage. Back
up all three before moving or replacing the volume. A host that sleeps the
service or discards its filesystem is not suitable for this app's chat,
account, upload, and voice features.

Sonix has separate clients for the same web service: the responsive browser
app, Android WebView app, Linux WebKit app, and Windows Edge app window. The
browser version works on mobile and desktop; installation packages open the
same service in a platform-appropriate window. Publishing a hosted backend is
separate from publishing the static marketing and downloads pages.

The Discord import accepts a server template link such as `https://discord.new/CODE`
or its template code. It copies supported channel types and category placement
into a new server. Messages, members, roles, permissions, and installed Discord
bots are outside the import.

New servers require an invite by default. Open Server settings → Invites to
create or revoke a free link. Links expire after seven days. Server settings
also include role assignment, custom emoji, moderation logs and bans.
Find friends by their Sonix email and create private group chats with people
who accept your request.

Server owners can manage up to 500 text channels, poll channels, voice rooms,
and categories. Voice uses browser WebRTC with up to eight peers per room and
requires microphone permission. Clicking a voice channel starts joining the
call. The call bar has separate camera and screen controls; both feeds can
be active together. Camera and screen sharing depend on browser support and
permissions. The app provides STUN discovery. Connections
across networks that require a TURN relay may fail.

The profile and server banner editors open a drag-and-zoom crop with a live
preview. Applying creates a 600 × 240 pixel banner and keeps the source for
further adjustment. GIF banners stay animated. Static profile pictures are
resized automatically. Photo uploads accept up to 50 MB before browser
resizing; GIF uploads accept up to 24 MB and are checked for bounded pixel
and frame counts. Images are served as cached media files instead of being
embedded into every chat response.

Shadow Bot can install a custom slash command that replies with plain text.
For optional AI draft generation, run Ollama on the same host at
`127.0.0.1:11434` and set `SONIX_SHADOW_MODEL` to an installed model name when
starting Sonix. The Rings screen shows a US$20 price and exchange-rate
estimates. Payments are currently unavailable.

### Account security in the browser app

Settings → Account security supports Google Authenticator-compatible TOTP.
Enrollment requires the current password and a six-digit code. Ten recovery
codes are displayed once. Each recovery code works once. Authenticator setup
and disable actions revoke other sessions.

Login cookies persist for one year and renew during active use. The Linux
launcher stores cookies in its private data directory, and Android flushes
cookies when the app enters the background. Explicit sign-out and account
security changes can revoke sessions.

Sign-in also offers a two-minute QR code. Scanning opens an approval screen
on the phone. The user signs in there, compares the confirmation text, and
explicitly approves. Accounts with TOTP also provide a fresh authenticator
or recovery code when approving. The initiating browser keeps a separate
secret required to finish QR sign-in.

Authenticator seeds are encrypted with a key stored beside the database in
`<database>.mfa-key`, with owner-only file permissions. Keep this key with the
database when moving or backing up an instance. Alternatively provide
`SONIX_MFA_KEY` as a base64-encoded 32-byte key. Never publish this key. Pending
QR logins and authenticator setup sessions expire when the server restarts.

### Terminal client

```bash
# Clone & install
git clone <repo> sonix && cd sonix
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Initialize database
sonix init

# Create a user
sonix create-user alice alice@example.com

# Run server (terminal 1)
python -m sonix.infrastructure.network.server

# Run TUI client (terminal 2)
sonix tui
```

## Architecture

```
sonix/
├── core/                 # Domain logic (no external deps)
│   ├── models.py         # Pydantic + SQLModel entities
│   ├── events.py         # Event bus (pub/sub)
│   ├── crypto.py         # NaCl encryption & Argon2 hashing
│   └── plugins.py        # Plugin hook specifications
├── infrastructure/       # External adapters
│   ├── database.py       # Async SQLModel + SQLite
│   ├── network/          # WebSocket client/server
│   └── ui/               # Textual TUI
├── presentation/         # CLI commands & handlers
└── main.py               # Entry point
```

## Development

```bash
# Run tests
pytest

# Type check
mypy sonix

# Lint & format
ruff check sonix
ruff format sonix

# Hot-reload dev mode
python scripts/run_dev.py
```

## Plugin Development

Create a plugin by implementing `SonixPlugin` protocol:

```python
from sonix.core.plugins import hookimpl, SonixPlugin

class MyPlugin:
    @hookimpl
    async def on_startup(self, bus):
        print("Plugin loaded!")

    @hookimpl
    def get_commands(self):
        return {"mycmd": "Does something cool"}

    @hookimpl
    async def on_command(self, command, args, user, bus):
        if command == "mycmd":
            await bus.publish(...)
            return True
        return False
```

Register via entry point in `pyproject.toml`:

```toml
[project.entry-points."sonix.plugins"]
myplugin = "my_package:MyPlugin"
```

## Roadmap

- [ ] JWT authentication & user sessions
- [ ] WebRTC voice/video (via `aiortc`)
- [ ] File uploads with thumbnail generation
- [ ] Message reactions & threads
- [ ] Push notifications (mobile)
- [ ] Desktop installer (PyInstaller + briefcase)
- [ ] Docker Compose for production deployment

## License

MIT — see [LICENSE](LICENSE) for details.
