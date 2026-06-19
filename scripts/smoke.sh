#!/usr/bin/env bash
# qlab-smoke — authenticated API smoke-test against a running stack.
#
# Solves the recurring "paste a curl with a stale Clerk JWT, re-grab token,
# run again" loop. Resolves a fresh bearer token once, then fires requests.
#
# Token resolution order (first hit wins):
#   1. $QLAB_JWT environment variable
#   2. ./.qlab-jwt          (gitignored file holding the raw JWT)
#   3. QLAB_JWT=... line in ./.env
#
# Usage:
#   scripts/smoke.sh health                       # GET /health (no auth)
#   scripts/smoke.sh GET /problems                # authed GET
#   scripts/smoke.sh GET /submissions/me
#   scripts/smoke.sh POST /submissions '{"problem_id":1,"code":"func:{x}"}'
#   scripts/smoke.sh POST /execute '{"code":"1+1"}'
#   scripts/smoke.sh --suite                      # run a default smoke battery
#
# Env:
#   QLAB_API_URL   base url (default http://localhost:8000)
#   QLAB_JWT       bearer token (see resolution above)
set -euo pipefail

API="${QLAB_API_URL:-http://localhost:8000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

resolve_token() {
  if [ -n "${QLAB_JWT:-}" ]; then printf '%s' "$QLAB_JWT"; return; fi
  if [ -f "$ROOT/.qlab-jwt" ]; then tr -d '[:space:]' < "$ROOT/.qlab-jwt"; return; fi
  if [ -f "$ROOT/.env" ]; then
    local v
    v="$(grep -E '^QLAB_JWT=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '"'"'"'[:space:]')"
    if [ -n "$v" ]; then printf '%s' "$v"; return; fi
  fi
  printf ''
}

# req METHOD PATH [BODY] [--noauth]
req() {
  local method="$1" path="$2" body="${3:-}" noauth="${4:-}"
  local url="$API$path"
  local -a args=(-sS -w '\n__HTTP__ %{http_code} __T__ %{time_total}s' -X "$method" "$url")
  if [ "$noauth" != "--noauth" ]; then
    local tok; tok="$(resolve_token)"
    if [ -z "$tok" ]; then
      echo "ERROR: no JWT. Set \$QLAB_JWT, create .qlab-jwt, or add QLAB_JWT= to .env" >&2
      exit 2
    fi
    args+=(-H "Authorization: Bearer $tok")
  fi
  if [ -n "$body" ]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi
  echo "→ $method $path"
  local out; out="$(curl "${args[@]}")"
  local meta="${out##*__HTTP__ }"; local code="${meta%% *}"
  local tt="${meta##*__T__ }"
  local payload="${out%%__HTTP__*}"
  # truncate long bodies
  if [ "${#payload}" -gt 800 ]; then payload="${payload:0:800}…"; fi
  echo "  HTTP $code  (${tt})"
  [ -n "$payload" ] && echo "  $payload"
  echo
}

case "${1:-}" in
  ""|-h|--help)
    sed -n '2,30p' "$0"; exit 0 ;;
  health)
    req GET /health "" --noauth ;;
  --suite)
    req GET /health "" --noauth
    req GET /problems
    req GET /submissions/me
    echo "Suite done. Add a POST /submissions case with a known-good func to exercise the judge." ;;
  GET|POST|PATCH|DELETE|PUT)
    req "$1" "$2" "${3:-}" ;;
  *)
    echo "Unknown command: $1 (try --help)" >&2; exit 1 ;;
esac
