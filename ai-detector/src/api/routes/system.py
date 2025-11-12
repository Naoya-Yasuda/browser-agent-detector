"""システム関連エンドポイント。"""

from __future__ import annotations

import time

from fastapi import APIRouter

from api.dependencies import get_cluster_detector, get_lightgbm_model

router = APIRouter()


@router.get("/")
async def root() -> dict[str, str]:
    """ルートエンドポイント。"""
    return {
        "name": "AI Agent Detection API",
        "version": "1.0.0",
        "status": "running",
    }


@router.get("/health")
async def health_check() -> dict[str, object]:
    """ヘルスチェックエンドポイント。"""
    model_loaded = False
    cluster_loaded = False

    try:
        get_lightgbm_model()
        model_loaded = True
    except Exception:
        model_loaded = False

    try:
        get_cluster_detector()
        cluster_loaded = True
    except Exception:
        cluster_loaded = False

    return {
        "status": "healthy" if model_loaded and cluster_loaded else "degraded",
        "model_loaded": model_loaded,
        "cluster_model_loaded": cluster_loaded,
        "timestamp": int(time.time() * 1000),
    }
