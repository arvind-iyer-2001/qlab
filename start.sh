#!/usr/bin/env bash
# qlab start script — launches kdb+ db, notebook q, and FastAPI
# Usage: ./start.sh
# Safe to re-run: kills any existing qlab processes on those ports first.

cd "$(dirname "$0")"

DB_PORT=${QLAB_DB_PORT:-5000}
NB_PORT=${QLAB_NB_PORT:-5001}
API_PORT=${API_PORT:-8000}
Q_BINARY=${QLAB_Q_BINARY:-/home/aiyer/.kx/bin/q}
PROBLEMS_DIR=${PROBLEMS_DIR:-$(pwd)/problems}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null) || true
  if [ -n "$pids" ]; then
    echo "  Stopping existing process(es) on port $port (pid $pids)..."
    kill $pids 2>/dev/null || true
    local i=0
    while lsof -ti tcp:"$port" &>/dev/null && [ $i -lt 10 ]; do
      sleep 0.5; ((i++))
    done
    if lsof -ti tcp:"$port" &>/dev/null; then
      echo "  WARNING: port $port still in use after 5s, trying SIGKILL..."
      kill -9 $pids 2>/dev/null || true
      sleep 1
    fi
  fi
}

wait_for_port() {
  local label=$1 port=$2 pid=$3 retries=${4:-20}
  local i=0
  while ! lsof -ti tcp:"$port" &>/dev/null; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "ERROR: $label process died before port $port became available"
      return 1
    fi
    if [ $i -ge "$retries" ]; then
      echo "ERROR: $label did not listen on port $port after ${retries}×0.5s"
      return 1
    fi
    sleep 0.5; ((i++))
  done
  return 0
}

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$DB_PID"  ] && kill "$DB_PID"  2>/dev/null || true
  [ -n "$NB_PID"  ] && kill "$NB_PID"  2>/dev/null || true
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "All services stopped."
}
trap cleanup INT TERM

# ---------------------------------------------------------------------------
# Clear ports
# ---------------------------------------------------------------------------
echo "Checking ports..."
kill_port "$DB_PORT"
kill_port "$NB_PORT"
kill_port "$API_PORT"

# ---------------------------------------------------------------------------
# kdb+ db
# ---------------------------------------------------------------------------
echo "Starting kdb+ db on port $DB_PORT..."
"$Q_BINARY" db/schema.q -p "$DB_PORT" -q &
DB_PID=$!

if ! wait_for_port "kdb+ db" "$DB_PORT" "$DB_PID"; then
  exit 1
fi
echo "  kdb+ db ready (pid $DB_PID)"

# ---------------------------------------------------------------------------
# Notebook q process
# ---------------------------------------------------------------------------
echo "Starting notebook q process on port $NB_PORT..."
"$Q_BINARY" -p "$NB_PORT" -q &
NB_PID=$!

if ! wait_for_port "notebook q" "$NB_PORT" "$NB_PID"; then
  kill "$DB_PID" 2>/dev/null || true
  exit 1
fi
echo "  Notebook q ready (pid $NB_PID)"

# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------
echo "Starting API on port $API_PORT..."
PROBLEMS_DIR="$PROBLEMS_DIR" \
QLAB_Q_BINARY="$Q_BINARY" \
QLAB_DB_HOST=localhost \
QLAB_DB_PORT="$DB_PORT" \
QLAB_NB_PORT="$NB_PORT" \
PYTHONPATH="$(pwd)/api" \
python3 -m uvicorn api.main:app \
  --host 0.0.0.0 \
  --port "$API_PORT" \
  --log-level warning &
API_PID=$!

if ! wait_for_port "FastAPI" "$API_PORT" "$API_PID"; then
  kill "$DB_PID" "$NB_PID" 2>/dev/null || true
  exit 1
fi
echo "  FastAPI ready (pid $API_PID)"

# ---------------------------------------------------------------------------
# Ready
# ---------------------------------------------------------------------------
echo ""
echo "qlab running:"
echo "  API:        http://localhost:$API_PORT"
echo "  Docs:       http://localhost:$API_PORT/docs"
echo "  Notebook q: localhost:$NB_PORT"
echo ""
echo "Press Ctrl+C to stop all services."

wait "$API_PID"
