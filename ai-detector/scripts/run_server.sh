#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# FastAPI サーバー起動 (uv 経由)
uv run uvicorn api.app:app --host 0.0.0.0 --port 8000 "$@"
