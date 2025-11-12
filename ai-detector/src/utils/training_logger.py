"""学習用にブラウザ操作ログをJSONLで保存するユーティリティ。"""

from __future__ import annotations

import json
import threading
import time
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import config

_lock = threading.Lock()


def _current_log_path() -> Path:
    """UTC日付ごとのファイルパスを返す。"""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    log_dir = config.TRAINING_LOG_DIR
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir / f"behavioral_{date_str}.jsonl"


def _serialize(obj: Any) -> Any:
    """pydanticモデルやdataclassを辞書に変換する。"""
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        # pydantic BaseModel
        return obj.model_dump(mode="json")
    if is_dataclass(obj):
        return asdict(obj)
    if isinstance(obj, Mapping):
        return dict(obj)
    return obj


def log_detection_sample(*, request: Any, browser_result: Any, persona_result: Any, final_decision: Any) -> None:
    """検知リクエストと結果をJSONラインで書き出す。"""
    if not config.TRAINING_LOG_ENABLED:
        return

    entry = {
        "timestamp": int(time.time() * 1000),
        "session_id": getattr(browser_result, "session_id", None) or getattr(request, "session_id", None),
        "request": _serialize(request),
        "browser_result": _serialize(browser_result),
        "persona_result": _serialize(persona_result),
        "final_decision": _serialize(final_decision),
    }

    log_path = _current_log_path()
    line = json.dumps(entry, ensure_ascii=False)
    with _lock:
        with log_path.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
