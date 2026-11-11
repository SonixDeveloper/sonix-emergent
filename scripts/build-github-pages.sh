#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO_ROOT/dist-github-pages"
PAGE_PATH="${GITHUB_PAGES_PATH:-/sonix-emergent}"
API_BASE="${SONIX_API_BASE:?Set SONIX_API_BASE to the deployed Sonix API proxy URL}"

rm -rf "$DIST"
mkdir -p "$DIST/assets"
cp "$REPO_ROOT"/sonix/web/assets/* "$DIST/assets/"
cp "$REPO_ROOT"/sonix/web/assets/index.html "$DIST/index.html"
cp "$REPO_ROOT"/sonix/web/assets/privacy.html "$DIST/privacy.html"
cp "$REPO_ROOT"/sonix/web/assets/sw.js "$DIST/sw.js"

# GitHub project pages live below /<repository>/; make all app assets resolve
# under that prefix and point API/media/voice requests at the Cloudflare proxy.
sed -i "s|/assets/|$PAGE_PATH/assets/|g" "$DIST/index.html" "$DIST/assets/style.css"
sed -i "s|/assets/|$PAGE_PATH/assets/|g" "$DIST/privacy.html"
cat > "$DIST/assets/config.js" <<EOF
window.SONIX_API_BASE = "$API_BASE";
window.SONIX_BASE_PATH = "$PAGE_PATH";
EOF
sed -i 's|"id":"/"|"id":"'"$PAGE_PATH"'/"|; s|"start_url":"/"|"start_url":"'"$PAGE_PATH"'/"|; s|"scope":"/"|"scope":"'"$PAGE_PATH"'/"|; s|"src":"/assets/|"src":"'"$PAGE_PATH"'/assets/|g' "$DIST/assets/manifest.webmanifest"

touch "$DIST/.nojekyll"
