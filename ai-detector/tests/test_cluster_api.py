"""クラスタ異常検知エンドポイントの基本テスト。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_cluster_anomaly_detection_basic_case(client: TestClient) -> None:
    payload = {
        "age": 65,
        "gender": 2,
        "prefecture": 13,
        "product_category": 1,
        "quantity": 2,
        "price": 5000,
        "total_amount": 10000,
        "purchase_time": 14,
        "limited_flag": 0,
        "payment_method": 3,
        "manufacturer": 5,
    }

    response = client.post("/detect_cluster_anomaly", json=payload)
    assert response.status_code == 200
    body = response.json()

    assert body["cluster_id"] in {0, 1, 2, 3}
    assert body["prediction"] in {1, -1}
    assert isinstance(body["is_anomaly"], bool)
    assert "anomaly_score" in body
    assert "threshold" in body
    assert "request_id" in body
