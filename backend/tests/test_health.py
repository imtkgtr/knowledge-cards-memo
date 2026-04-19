from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthcheck_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root_includes_canvas_endpoint() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["canvases"] == "/api/canvases"
