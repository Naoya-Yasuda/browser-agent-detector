"""FastAPI で利用する依存関係定義。"""

from __future__ import annotations

from functools import lru_cache

from models.cluster_detector import ClusterAnomalyDetector
from models.lightgbm_loader import DEFAULT_FEATURE_NAMES, LightGBMModel, load_lightgbm_model
from services.cluster_service import ClusterDetectionService
from services.detection_service import DetectionService
from services.feature_extractor import FeatureExtractor


@lru_cache
def get_feature_extractor() -> FeatureExtractor:
    """特徴量抽出器のシングルトン取得。"""
    return FeatureExtractor(DEFAULT_FEATURE_NAMES)


@lru_cache
def get_lightgbm_model() -> LightGBMModel:
    """LightGBM ブラウザモデルのシングルトン取得。"""
    return load_lightgbm_model()


@lru_cache
def get_detection_service() -> DetectionService:
    """LightGBM ベースの検知サービス取得。"""
    return DetectionService(get_lightgbm_model(), get_feature_extractor())


@lru_cache
def get_cluster_detector() -> ClusterAnomalyDetector:
    """クラスタ異常検知モデルのシングルトン取得。"""
    detector = ClusterAnomalyDetector()
    detector.load_models()
    return detector


@lru_cache
def get_cluster_service() -> ClusterDetectionService:
    """クラスタ異常検知サービスのシングルトン取得。"""
    return ClusterDetectionService(get_cluster_detector())
