#!/usr/bin/env bash
# qlab backend — dev/watch mode.
# Runs FastAPI under uvicorn --reload (restarts on save).
# .env is auto-loaded by api/main.py (load_dotenv); no manual sourcing.
#
# Usage:
#   ./scripts/dev.sh              # port 8000
#   API_PORT=8080 ./scripts/dev.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PORT=${API_PORT:-8000}

exec env PYTHONPATH=api uv run uvicorn api.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --reload \
  --reload-dir api
