# Public Sonix server deployment

The Sonix browser app, Android app, and desktop wrappers need one shared server
to validate invites, save memberships, and sync messages. This deployment uses
the existing SQLite-backed Sonix API, a persistent Docker volume, and Caddy for
HTTPS.

## Requirements

- An always-on Linux VPS with Docker Compose v2.
- A domain you control, with its DNS `A` record pointing to the VPS address.
- Inbound TCP ports 80 and 443 open. UDP 443 is optional for HTTP/3.

## Deploy

1. Copy this project to the VPS and set `SONIX_DOMAIN` in `.env` to the domain
   you control. `.env.deploy.example` is a starting point.
2. Start the services with `docker compose up -d --build`.
3. Check `https://<your-domain>/healthz`; it should return `{"status":"ok"}`.
4. Keep the `sonix_data` Docker volume. It contains the account database,
   MFA encryption key, and uploaded profile/server images. Back it up before
   upgrades or migrations.

Caddy requests and renews TLS certificates automatically after DNS resolves to
the VPS. The `sonix-web` service is not exposed directly; public traffic passes
through Caddy. The app uses secure session cookies behind this HTTPS proxy.

## Connect clients

After the backend is live, point browser and installer launchers to
`https://<your-domain>`. Do not point clients at the VPS IP or localhost.
Everyone must use the same origin so account sessions, invite links, friend
requests, memberships, and messages resolve against the same database.

The current ChatGPT-hosted preview is a separate static site and has no shared
database binding. This compose deployment does not change that Site until its
clients are pointed at the new server origin.
