"""クラスタ異常検知サービス。"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Dict

from models.cluster_detector import ClusterAnomalyDetector
from schemas.cluster import ClusterAnomalyRequest

logger = logging.getLogger(__name__)


@dataclass
class ClusterDetectionResult:
    """クラスタ異常検知APIレスポンス用データ。"""

    cluster_id: int
    prediction: int
    anomaly_score: float
    threshold: float
    is_anomaly: bool
    request_id: str


class ClusterDetectionService:
    """クラスタ異常検知を提供するサービス。"""

    def __init__(self, detector: ClusterAnomalyDetector):
        self._detector = detector

    def predict(self, request: ClusterAnomalyRequest) -> ClusterDetectionResult:
        """クラスタ異常検知を実行。"""
        input_data: Dict[str, int] = request.model_dump()
        result = self._detector.predict(input_data)

        return ClusterDetectionResult(
            cluster_id=result["cluster_id"],
            prediction=result["prediction"],
            anomaly_score=result["anomaly_score"],
            threshold=result["threshold"],
            is_anomaly=result["is_anomaly"],
            request_id=str(uuid.uuid4()),
        )
