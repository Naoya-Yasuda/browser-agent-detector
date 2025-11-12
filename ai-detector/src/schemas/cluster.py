"""クラスタ異常検知 API のスキーマ定義。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ClusterAnomalyRequest(BaseModel):
    """クラスタ異常検知リクエスト。"""

    age: int = Field(..., ge=0, le=120, description="年齢")
    gender: int = Field(..., ge=1, le=2, description="性別コード (1=男性, 2=女性)")
    prefecture: int = Field(..., ge=1, le=47, description="都道府県コード")
    product_category: int = Field(..., ge=1, le=11, description="商品カテゴリ")
    quantity: int = Field(..., ge=1, description="購入個数")
    price: int = Field(..., ge=0, description="単価 (円)")
    total_amount: int = Field(..., ge=0, description="総額 (円)")
    purchase_time: int = Field(..., ge=0, le=23, description="購入時間 (0-23)")
    limited_flag: int = Field(..., ge=0, le=1, description="限定品フラグ")
    payment_method: int = Field(..., ge=1, le=7, description="決済手段カテゴリ")
    manufacturer: int = Field(..., ge=1, le=20, description="メーカーID")


class ClusterAnomalyResponse(BaseModel):
    """クラスタ異常検知レスポンス。"""

    cluster_id: int = Field(..., description="クラスタID")
    prediction: int = Field(..., description="IsolationForest予測値 (1=正常, -1=異常)")
    anomaly_score: float = Field(..., description="IsolationForestの異常スコア")
    threshold: float = Field(..., description="クラスタ判定閾値")
    is_anomaly: bool = Field(..., description="異常判定フラグ")
    request_id: str = Field(..., description="リクエスト識別子")
