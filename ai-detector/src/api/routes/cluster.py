"""クラスタ異常検知エンドポイント。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_cluster_service
from schemas.cluster import ClusterAnomalyRequest, ClusterAnomalyResponse
from services.cluster_service import ClusterDetectionService

router = APIRouter()


@router.post("/detect_cluster_anomaly", response_model=ClusterAnomalyResponse)
async def detect_cluster_anomaly(
    request: ClusterAnomalyRequest,
    service: ClusterDetectionService = Depends(get_cluster_service),
) -> ClusterAnomalyResponse:
    """クラスタ異常検知エンドポイント。"""
    try:
        result = service.predict(request)
        return ClusterAnomalyResponse(
            cluster_id=result.cluster_id,
            prediction=result.prediction,
            anomaly_score=result.anomaly_score,
            threshold=result.threshold,
            is_anomaly=result.is_anomaly,
            request_id=result.request_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - 予期せぬエラー
        raise HTTPException(
            status_code=500, detail=f"クラスタ異常検知処理中にエラーが発生しました: {exc}"
        ) from exc
