#!/usr/bin/env bash
#
# start.sh — launch all 4 dev services at once.
#
#   super_admin/web   next dev   :3001
#   super_admin/api   django     :8000
#   dollara/web       next dev   :3000
#   dollara/api       django     :5000
#
# Logs stream to ./logs/<service>.log and are also prefixed to this terminal.
# Press Ctrl+C once to stop everything.

set -euo pipefail

# Directory this script lives in (project root), regardless of where it's run from.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

PIDS=()

# Kill every child service on exit / Ctrl+C.
cleanup() {
  echo ""
  echo "==> Shutting down all services..."
  for pid in "${PIDS[@]}"; do
    # Kill the whole process group so npm/python child procs die too.
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "==> Done."
}
trap cleanup INT TERM EXIT

# run <name> <working-dir> <command...>
# Runs a command in its own process group, teeing output to a log and the terminal.
run() {
  local name="$1"; shift
  local dir="$1"; shift
  echo "==> Starting $name  ($dir)"
  # setsid gives each service its own process group for clean shutdown.
  ( cd "$ROOT/$dir" && exec "$@" ) \
    > >(tee "$LOG_DIR/$name.log" | sed "s/^/[$name] /") 2>&1 &
  PIDS+=($!)
}

# Web apps (Next.js)
run "super_admin-web" "super_admin/web" npm run dev
run "dollara-web"     "dollara/web"     npm run dev

# APIs (Django, each with its own venv)
run "super_admin-api" "super_admin/api" \
  bash -c 'source venv/bin/activate && exec python manage.py runserver 0.0.0.0:8000'
run "dollara-api"     "dollara/api" \
  bash -c 'source venv/bin/activate && exec python manage.py runserver 0.0.0.0:5000'

echo ""
echo "==> All 4 services starting. Logs in $LOG_DIR/"
echo "    super_admin  web http://localhost:3001   api http://localhost:8000"
echo "    dollara      web http://localhost:3000   api http://localhost:5000"
echo "==> Press Ctrl+C to stop everything."
echo ""

# Wait for all background services; keeps the trap alive.
wait
