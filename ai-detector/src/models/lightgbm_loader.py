"""LightGBM モデルの読み込みユーティリティ。"""

from __future__ import annotations

from dataclasses import dataclass
import json
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, List

import joblib
import lightgbm as lgb

import config

logger = logging.getLogger(__name__)


DEFAULT_FEATURE_NAMES: List[str] = [
    "mouse_movements_count",
    "mouse_velocity_mean",
    "mouse_velocity_std",
    "mouse_velocity_max",
    "click_avg_interval",
    "click_precision",
    "click_double_rate",
    "keystroke_speed",
    "keystroke_hold",
    "keystroke_interval_var",
    "scroll_speed",
    "scroll_acc",
    "scroll_pause",
    "page_session_duration_ms",
    "page_dwell_time_ms",
    "page_first_interaction_delay_ms",
    "page_form_fill_speed",
    "page_paste_ratio",
    "seq_total_actions",
    "seq_count_mouse_move",
    "seq_count_click",
    "seq_count_keystroke",
    "seq_count_scroll",
    "seq_count_TIMED_SHORT",
    "seq_count_TIMED_LONG",
    "action_type_PAGE_BEFORE_UNLOAD",
    "action_type_PERIODIC_SNAPSHOT",
    "action_type_TIMED_SHORT",
]


class LightGBMModelDisabledError(RuntimeError):
    """環境変数でブラウザモデルが無効化されている場合の例外。"""


class _DisabledBooster:
    """モデル無効化時に使用するダミーBooster。"""

    def predict(self, data: Any) -> List[float]:
        raise LightGBMModelDisabledError(
            "LightGBM browser model is disabled via AI_DETECTOR_DISABLE_BROWSER_MODEL"
        )

    def predict_proba(self, data: Any) -> List[float]:
        raise LightGBMModelDisabledError(
            "LightGBM browser model is disabled via AI_DETECTOR_DISABLE_BROWSER_MODEL"
        )


@dataclass(frozen=True)
class LightGBMModel:
    """LightGBM Booster と特徴量名のセット。"""

    booster: Any
    feature_names: Iterable[str]
    model_format: str = "lightgbm_booster"
    metadata: Dict[str, Any] | None = None

    def predict_proba(self, data: Any) -> Any:
        """与えられたデータに対して human 確率を返す。"""
        if hasattr(self.booster, "predict_proba"):
            proba = self.booster.predict_proba(data)
            return proba[:, 1] if hasattr(proba, "__getitem__") else proba
        if isinstance(self.booster, lgb.Booster):
            return self.booster.predict(data)
        if hasattr(self.booster, "predict"):
            return self.booster.predict(data)
        raise RuntimeError("LightGBM model does not support predict_proba/predict")


def _load_metadata(path: Path) -> Dict[str, Any]:
    """メタデータ JSON を読み込む。存在しなければ空 dict。"""
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - ファイル破損時の防御
        logger.warning("LightGBMメタデータの読み込みに失敗しました (%s): %s", path, exc)
        return {}


def load_lightgbm_model(model_path: Path | None = None) -> LightGBMModel:
    """LightGBM モデルファイルを読み込み、Booster を返す。"""

    if config.BROWSER_MODEL_DISABLED:
        logger.warning("LightGBMブラウザモデルを無効化します (AI_DETECTOR_DISABLE_BROWSER_MODEL=1)")
        return LightGBMModel(
            booster=_DisabledBooster(),
            feature_names=DEFAULT_FEATURE_NAMES,
            model_format="disabled",
            metadata=None,
        )

    resolved_path = model_path or config.LIGHTGBM_MODEL_PATH
    if not resolved_path.exists():
        raise FileNotFoundError(f"LightGBMモデルファイルが見つかりません: {resolved_path}")

    metadata = _load_metadata(config.LIGHTGBM_METADATA_PATH)
    feature_names = metadata.get("feature_names", DEFAULT_FEATURE_NAMES)
    model_format = metadata.get("model_format", "")

    # フォーマット指定または拡張子から読み込み方法を決定
    try:
        if model_format == "pickle" or resolved_path.suffix in {".pkl", ".joblib"}:
            booster = joblib.load(resolved_path)
            model_format = model_format or "pickle"
        elif model_format in {"lightgbm_booster", ""} or resolved_path.suffix in {".txt", ".model"}:
            booster = lgb.Booster(model_file=str(resolved_path))
            model_format = model_format or "lightgbm_booster"
        else:
            booster = joblib.load(resolved_path)
            model_format = model_format or "pickle"
    except Exception as exc:  # pragma: no cover - LightGBM内部例外のラップ
        logger.error("LightGBMモデルの読み込みに失敗しました: %s", exc)
        raise

    logger.info("LightGBMモデルを読み込みました: %s (format=%s)", resolved_path, model_format)
    return LightGBMModel(
        booster=booster,
        feature_names=feature_names,
        model_format=model_format,
        metadata=metadata or None,
    )
