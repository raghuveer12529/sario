#!/usr/bin/env bash
# Starts Cloudflare quick tunnels for web (:3000) and API (:4000),
# then patches .env files and restarts both dev servers automatically.
# No login required — generates temporary *.trycloudflare.com URLs

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGDIR="$ROOT/.tunnel-logs"
WEB_ENV="$ROOT/apps/web/.env"
API_ENV="$ROOT/apps/api/.env"

mkdir -p "$LOGDIR"
> "$LOGDIR/web.log"
> "$LOGDIR/api.log"

# ── helpers ──────────────────────────────────────────────────────────────────

extract_url() {
  local logfile="$1"
  local deadline=$((SECONDS + 30))
  while [ $SECONDS -lt $deadline ]; do
    local url
    url=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$logfile" 2>/dev/null | head -1)
    [ -n "$url" ] && echo "$url" && return
    sleep 1
  done
  echo ""
}

patch_env() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

add_cors_origin() {
  local new_origin="$1"
  local current
  current=$(grep '^ALLOWED_ORIGINS=' "$API_ENV" | cut -d= -f2-)
  # skip if already present
  if echo "$current" | grep -qF "$new_origin"; then
    return
  fi
  patch_env "$API_ENV" "ALLOWED_ORIGINS" "${current},${new_origin}"
}

restart_server() {
  local name="$1" port="$2" logfile="$3" pidfile="$4" cmd="$5"
  local old_pid
  old_pid=$(lsof -ti ":$port" 2>/dev/null | head -1 || true)
  if [ -n "$old_pid" ]; then
    # skip cloudflared processes on that port
    if ! ps -p "$old_pid" -o command= 2>/dev/null | grep -q cloudflared; then
      echo "  Restarting $name server..."
      kill "$old_pid" 2>/dev/null || true
      sleep 1
    fi
  fi
  > "$logfile"
  eval "$cmd" >> "$logfile" 2>&1 &
  echo $! > "$pidfile"
}

wait_ready() {
  local name="$1" logfile="$2" pattern="$3"
  local deadline=$((SECONDS + 40))
  while [ $SECONDS -lt $deadline ]; do
    grep -qE "$pattern" "$logfile" 2>/dev/null && echo "  $name ready." && return
    sleep 1
  done
  echo "  WARNING: $name did not report ready in time — check $logfile"
}

# ── find pnpm ─────────────────────────────────────────────────────────────────

PNPM=$(command -v pnpm 2>/dev/null || true)
# If pnpm is a shell function (nvm wrapper), use the real binary
if [ -x "/opt/homebrew/bin/pnpm" ]; then
  PNPM="/opt/homebrew/bin/pnpm"
fi

# ── start tunnels ────────────────────────────────────────────────────────────

echo ""
echo "  Starting Cloudflare tunnels..."
cloudflared tunnel --url http://localhost:3000 > "$LOGDIR/web.log" 2>&1 &
WEB_TUNNEL_PID=$!
cloudflared tunnel --url http://localhost:4000 > "$LOGDIR/api.log" 2>&1 &
API_TUNNEL_PID=$!

trap "echo ''; echo '  Tunnels closed.'; kill $WEB_TUNNEL_PID $API_TUNNEL_PID 2>/dev/null; exit 0" INT TERM

# ── wait for URLs ─────────────────────────────────────────────────────────────

WEB_URL=$(extract_url "$LOGDIR/web.log")
API_URL=$(extract_url "$LOGDIR/api.log")

if [ -z "$WEB_URL" ] || [ -z "$API_URL" ]; then
  echo "  ERROR: Could not get tunnel URLs. Check .tunnel-logs/*.log"
  kill $WEB_TUNNEL_PID $API_TUNNEL_PID 2>/dev/null
  exit 1
fi

# ── patch env files ───────────────────────────────────────────────────────────

echo "  Patching env files..."
patch_env "$WEB_ENV" "NEXT_PUBLIC_API_URL" "${API_URL}/v1"
add_cors_origin "$WEB_URL"

# ── restart dev servers ───────────────────────────────────────────────────────

restart_server "Web" 3000 "$LOGDIR/web-dev.log" "$LOGDIR/web-dev.pid" \
  "cd '$ROOT' && '$PNPM' --filter @sario/web dev"

restart_server "API" 4000 "$LOGDIR/api-dev.log" "$LOGDIR/api-dev.pid" \
  "cd '$ROOT' && '$PNPM' --filter @sario/api dev"

wait_ready "Web" "$LOGDIR/web-dev.log" "Ready"
wait_ready "API" "$LOGDIR/api-dev.log" "API running"

# ── done ──────────────────────────────────────────────────────────────────────

echo ""
echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │  Sario — Share these links                                  │"
echo "  ├─────────────────────────────────────────────────────────────┤"
echo "  │  Web  →  $WEB_URL"
echo "  │  API  →  $API_URL"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""
echo "  Press Ctrl+C to stop tunnels."
echo ""

wait $WEB_TUNNEL_PID $API_TUNNEL_PID
