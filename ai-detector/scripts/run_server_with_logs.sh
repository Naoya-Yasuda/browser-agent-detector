#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export AI_DETECTOR_TRAINING_LOG=1
if [ -z "${AI_DETECTOR_TRAINING_LOG_PATH:-}" ]; then
  export AI_DETECTOR_TRAINING_LOG_PATH="$REPO_ROOT/logs/training"
fi

exec "$SCRIPT_DIR/run_server.sh" "$@"
