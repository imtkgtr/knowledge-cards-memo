from dataclasses import dataclass

from fastapi.testclient import TestClient

from app.api.routes.canvases import get_canvas_service
from app.core.auth import AuthenticatedUser, get_current_user
from app.infrastructure.canvas_repository import build_memory_canvas_repository
from app.main import app
from app.services.canvas_service import CanvasService


@dataclass(slots=True)
class CanvasTestContext:
    repository: object
    client: TestClient


def build_test_context() -> CanvasTestContext:
    repository = build_memory_canvas_repository()

    def override_current_user() -> AuthenticatedUser:
        return AuthenticatedUser(id="user-1", email="tester@example.com")

    def override_canvas_service() -> CanvasService:
        return CanvasService(repository=repository)

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_canvas_service] = override_canvas_service
    client = TestClient(app)
    return CanvasTestContext(repository=repository, client=client)


def teardown_module() -> None:
    app.dependency_overrides.clear()


def test_canvas_crud_flow() -> None:
    context = build_test_context()

    create_response = context.client.post("/api/canvases", json={"name": "世界史"})
    assert create_response.status_code == 201
    created = create_response.json()["canvas"]
    canvas_id = created["id"]
    assert created["name"] == "世界史"

    list_response = context.client.get("/api/canvases")
    assert list_response.status_code == 200
    assert list_response.json()[0]["name"] == "世界史"

    update_response = context.client.patch(
        f"/api/canvases/{canvas_id}",
        json={"name": "日本史", "backgroundColor": "#faf7ef", "gridEnabled": True},
    )
    assert update_response.status_code == 200
    assert update_response.json()["canvas"]["name"] == "日本史"
    assert update_response.json()["canvas"]["gridEnabled"] is True

    document_response = context.client.get(f"/api/canvases/{canvas_id}/document")
    assert document_response.status_code == 200
    assert document_response.json()["canvas"]["canvas"]["name"] == "日本史"
    assert document_response.json()["canvas"]["cards"] == []

    duplicate_response = context.client.post(f"/api/canvases/{canvas_id}/duplicate")
    assert duplicate_response.status_code == 201
    assert duplicate_response.json()["canvas"]["name"] == "日本史のコピー"

    delete_response = context.client.delete(f"/api/canvases/{canvas_id}")
    assert delete_response.status_code == 204


def test_canvas_not_found() -> None:
    context = build_test_context()

    response = context.client.get("/api/canvases/missing/document")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "canvas_not_found"
