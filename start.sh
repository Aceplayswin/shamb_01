#!/usr/bin/env bash
#
# start.sh — SSH into the production server.
#
#   Uses the same host / user / key as deploy.sh.
#   Override with SERVER_HOST, SERVER_USER, or PEM_KEY if needed.

set -euo pipefail

SERVER_HOST="${SERVER_HOST:-13.201.218.191}"
SERVER_USER="${SERVER_USER:-ubuntu}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PEM_KEY="${PEM_KEY:-$SCRIPT_DIR/whitelevel.pem}"
PROJECT_ROOT="${PROJECT_ROOT:-/var/www/shamb_01}"

[ -f "$PEM_KEY" ] || { echo "ERROR: PEM key not found at: $PEM_KEY"; exit 1; }
chmod 600 "$PEM_KEY" 2>/dev/null || true

echo "==> Connecting to ${SERVER_USER}@${SERVER_HOST} → ${PROJECT_ROOT}"
exec ssh -i "$PEM_KEY" \
  -o StrictHostKeyChecking=accept-new \
  -t "${SERVER_USER}@${SERVER_HOST}" \
  "cd '${PROJECT_ROOT}' && exec \$SHELL -l"
