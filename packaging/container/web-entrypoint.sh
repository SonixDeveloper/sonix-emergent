#!/bin/sh
set -eu

database="${SONIX_WEB_DATABASE:-/data/sonix-web.db}"
data_dir=$(dirname "$database")
mkdir -p "$data_dir"
chown sonix:sonix "$data_dir"

exec su -s /bin/sh sonix -c 'exec python -m sonix.web --host 0.0.0.0 --port "${PORT:-8080}" --database "${SONIX_WEB_DATABASE:-/data/sonix-web.db}" --secure-cookie'
