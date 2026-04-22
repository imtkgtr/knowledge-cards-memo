from dataclasses import dataclass

from fastapi.testclient import TestClient

from app.api.routes.canvases import get_canvas_service
from app.core.auth import AuthenticatedUser, get_current_user
from app.infrastructure.canvas_repository import (
    SupabaseCanvasRepository,
    build_memory_canvas_repository,
)
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


def test_save_canvas_document() -> None:
    context = build_test_context()
    created = context.client.post("/api/canvases", json={"name": "保存テスト"}).json()["canvas"]
    canvas_id = created["id"]

    payload = {
        "canvas": {
            "id": canvas_id,
            "name": "保存テスト",
            "backgroundColor": "#faf7ef",
            "gridEnabled": True,
            "duplicateWarningSuppressed": False,
            "createdAt": created["createdAt"],
            "updatedAt": created["updatedAt"],
        },
        "cards": [
            {
                "id": "card-1",
                "canvasId": canvas_id,
                "title": "ノード 1",
                "body": "本文",
                "tagNames": ["history"],
                "color": "#eed9b6",
                "isLocked": False,
                "x": 120,
                "y": 180,
                "childCount": 1,
                "createdAt": created["createdAt"],
                "updatedAt": created["updatedAt"],
            },
            {
                "id": "card-2",
                "canvasId": canvas_id,
                "title": "ノード 2",
                "body": "",
                "tagNames": [],
                "color": "#eed9b6",
                "isLocked": False,
                "x": 320,
                "y": 180,
                "childCount": 0,
                "createdAt": created["createdAt"],
                "updatedAt": created["updatedAt"],
            },
        ],
        "hierarchyLinks": [
            {
                "id": "link-1",
                "canvasId": canvas_id,
                "parentCardId": "card-1",
                "childCardId": "card-2",
                "createdAt": created["createdAt"],
            }
        ],
        "relatedLinks": [],
        "attachments": [],
    }

    save_response = context.client.put(f"/api/canvases/{canvas_id}/document", json=payload)
    assert save_response.status_code == 200
    saved = save_response.json()["canvas"]
    assert saved["canvas"]["gridEnabled"] is True
    assert len(saved["cards"]) == 2
    assert saved["cards"][0]["tagNames"] == ["history"]


def test_save_canvas_document_rejects_cycles() -> None:
    context = build_test_context()
    created = context.client.post("/api/canvases", json={"name": "循環テスト"}).json()["canvas"]
    canvas_id = created["id"]

    payload = {
        "canvas": {
            "id": canvas_id,
            "name": "循環テスト",
            "backgroundColor": "#ffffff",
            "gridEnabled": False,
            "duplicateWarningSuppressed": False,
            "createdAt": created["createdAt"],
            "updatedAt": created["updatedAt"],
        },
        "cards": [
            {
                "id": "card-1",
                "canvasId": canvas_id,
                "title": "A",
                "body": "",
                "tagNames": [],
                "color": "#eed9b6",
                "isLocked": False,
                "x": 0,
                "y": 0,
                "childCount": 1,
                "createdAt": created["createdAt"],
                "updatedAt": created["updatedAt"],
            },
            {
                "id": "card-2",
                "canvasId": canvas_id,
                "title": "B",
                "body": "",
                "tagNames": [],
                "color": "#eed9b6",
                "isLocked": False,
                "x": 100,
                "y": 100,
                "childCount": 1,
                "createdAt": created["createdAt"],
                "updatedAt": created["updatedAt"],
            },
        ],
        "hierarchyLinks": [
            {
                "id": "link-1",
                "canvasId": canvas_id,
                "parentCardId": "card-1",
                "childCardId": "card-2",
                "createdAt": created["createdAt"],
            },
            {
                "id": "link-2",
                "canvasId": canvas_id,
                "parentCardId": "card-2",
                "childCardId": "card-1",
                "createdAt": created["createdAt"],
            },
        ],
        "relatedLinks": [],
        "attachments": [],
    }

    save_response = context.client.put(f"/api/canvases/{canvas_id}/document", json=payload)
    assert save_response.status_code == 422
    assert save_response.json()["detail"]["code"] == "invalid_payload"


def test_export_canvas_document() -> None:
    context = build_test_context()
    created = context.client.post("/api/canvases", json={"name": "書き出しテスト"}).json()["canvas"]
    canvas_id = created["id"]

    context.client.put(
        f"/api/canvases/{canvas_id}/document",
        json={
            "canvas": {
                "id": canvas_id,
                "name": "書き出しテスト",
                "backgroundColor": "#faf7ef",
                "gridEnabled": True,
                "duplicateWarningSuppressed": False,
                "createdAt": created["createdAt"],
                "updatedAt": created["updatedAt"],
            },
            "cards": [
                {
                    "id": "card-1",
                    "canvasId": canvas_id,
                    "title": "ノード 1",
                    "body": "本文",
                    "tagNames": ["history"],
                    "color": "#eed9b6",
                    "isLocked": False,
                    "x": 10,
                    "y": 20,
                    "childCount": 0,
                    "createdAt": created["createdAt"],
                    "updatedAt": created["updatedAt"],
                }
            ],
            "hierarchyLinks": [],
            "relatedLinks": [],
            "attachments": [],
        },
    )

    export_response = context.client.get(f"/api/canvases/{canvas_id}/export")

    assert export_response.status_code == 200
    exported = export_response.json()
    assert exported["version"] == "1.0"
    assert exported["canvas"]["name"] == "書き出しテスト"
    assert len(exported["cards"]) == 1
    assert "attachments" not in exported


def test_import_canvas_creates_new_canvas_with_remapped_ids() -> None:
    context = build_test_context()

    import_response = context.client.post(
        "/api/canvases/import",
        json={
            "payload": {
                "version": "1.0",
                "canvas": {
                    "id": "source-canvas",
                    "name": "インポート元",
                    "backgroundColor": "#faf7ef",
                    "gridEnabled": True,
                    "duplicateWarningSuppressed": False,
                    "createdAt": "2026-04-20T00:00:00Z",
                    "updatedAt": "2026-04-20T00:00:00Z",
                },
                "cards": [
                    {
                        "id": "source-card-1",
                        "canvasId": "source-canvas",
                        "title": "ノード 1",
                        "body": "本文 1",
                        "tagNames": ["history"],
                        "color": "#eed9b6",
                        "isLocked": False,
                        "x": 10,
                        "y": 20,
                        "childCount": 1,
                        "createdAt": "2026-04-20T00:00:00Z",
                        "updatedAt": "2026-04-20T00:00:00Z",
                    },
                    {
                        "id": "source-card-2",
                        "canvasId": "source-canvas",
                        "title": "ノード 2",
                        "body": "本文 2",
                        "tagNames": [],
                        "color": "#cfe8ff",
                        "isLocked": False,
                        "x": 110,
                        "y": 120,
                        "childCount": 0,
                        "createdAt": "2026-04-20T00:00:00Z",
                        "updatedAt": "2026-04-20T00:00:00Z",
                    },
                ],
                "hierarchyLinks": [
                    {
                        "id": "source-link-1",
                        "canvasId": "source-canvas",
                        "parentCardId": "source-card-1",
                        "childCardId": "source-card-2",
                        "createdAt": "2026-04-20T00:00:00Z",
                    }
                ],
                "relatedLinks": [],
            }
        },
    )

    assert import_response.status_code == 201
    imported = import_response.json()["canvas"]
    assert imported["name"] == "インポート元"

    document_response = context.client.get(f"/api/canvases/{imported['id']}/document")
    assert document_response.status_code == 200
    document = document_response.json()["canvas"]
    assert len(document["cards"]) == 2
    assert len(document["hierarchyLinks"]) == 1
    assert {card["id"] for card in document["cards"]} != {"source-card-1", "source-card-2"}
    assert all(card["canvasId"] == imported["id"] for card in document["cards"])


def test_import_canvas_rejects_attachments() -> None:
    context = build_test_context()

    import_response = context.client.post(
        "/api/canvases/import",
        json={
            "payload": {
                "version": "1.0",
                "canvas": {
                    "id": "source-canvas",
                    "name": "添付付き",
                    "backgroundColor": "#ffffff",
                    "gridEnabled": False,
                    "duplicateWarningSuppressed": False,
                    "createdAt": "2026-04-20T00:00:00Z",
                    "updatedAt": "2026-04-20T00:00:00Z",
                },
                "cards": [],
                "hierarchyLinks": [],
                "relatedLinks": [],
                "attachments": [],
            }
        },
    )

    assert import_response.status_code == 422
    assert import_response.json()["detail"]["code"] == "invalid_payload"


def test_attachment_crud_flow() -> None:
    context = build_test_context()
    created = context.client.post("/api/canvases", json={"name": "添付テスト"}).json()["canvas"]
    canvas_id = created["id"]

    context.client.put(
        f"/api/canvases/{canvas_id}/document",
        json={
            "canvas": {
                "id": canvas_id,
                "name": "添付テスト",
                "backgroundColor": "#ffffff",
                "gridEnabled": False,
                "duplicateWarningSuppressed": False,
                "createdAt": created["createdAt"],
                "updatedAt": created["updatedAt"],
            },
            "cards": [
                {
                    "id": "card-1",
                    "canvasId": canvas_id,
                    "title": "ノード 1",
                    "body": "",
                    "tagNames": [],
                    "color": "#eed9b6",
                    "isLocked": False,
                    "x": 10,
                    "y": 20,
                    "childCount": 0,
                    "createdAt": created["createdAt"],
                    "updatedAt": created["updatedAt"],
                }
            ],
            "hierarchyLinks": [],
            "relatedLinks": [],
            "attachments": [],
        },
    )

    upload_response = context.client.post(
        f"/api/canvases/{canvas_id}/attachments",
        data={"cardId": "card-1"},
        files={"file": ("memo.txt", b"knowledge canvas", "text/plain")},
    )
    assert upload_response.status_code == 201
    attachment = upload_response.json()["attachment"]
    assert attachment["fileName"] == "memo.txt"
    assert attachment["kind"] == "txt"

    document_response = context.client.get(f"/api/canvases/{canvas_id}/document")
    assert document_response.status_code == 200
    assert len(document_response.json()["canvas"]["attachments"]) == 1

    access_response = context.client.get(f"/api/attachments/{attachment['id']}/access")
    assert access_response.status_code == 200
    assert attachment["id"] in access_response.json()["url"]

    delete_response = context.client.delete(f"/api/attachments/{attachment['id']}")
    assert delete_response.status_code == 204


def test_attachment_path_sanitizes_non_ascii_filename() -> None:
    storage_path = SupabaseCanvasRepository._build_attachment_path(
        user_id="user-1",
        canvas_id="canvas-1",
        card_id="card-1",
        attachment_id="attachment-1",
        file_name="スクリーンショット 2026-04-22 14.52.36.png",
    )

    file_part = storage_path.split("/")[-1]
    assert storage_path == "user-1/canvas-1/card-1/attachment-1-2026-04-22-14-52-36.png"
    assert file_part.endswith(".png")
    assert all(ord(char) < 128 for char in file_part)


def test_thumbnail_crud_flow() -> None:
    context = build_test_context()
    created = context.client.post("/api/canvases", json={"name": "サムネイルテスト"}).json()["canvas"]
    canvas_id = created["id"]

    upload_response = context.client.post(
        f"/api/canvases/{canvas_id}/thumbnail",
        files={"file": ("thumbnail.png", b"fake-png-bytes", "image/png")},
    )
    assert upload_response.status_code == 201
    uploaded = upload_response.json()["canvas"]
    assert uploaded["thumbnailUrl"] is not None
    assert canvas_id in uploaded["thumbnailUrl"]

    list_response = context.client.get("/api/canvases")
    assert list_response.status_code == 200
    assert list_response.json()[0]["thumbnailUrl"] is not None

    clear_response = context.client.delete(f"/api/canvases/{canvas_id}/thumbnail")
    assert clear_response.status_code == 204

    list_after_clear = context.client.get("/api/canvases")
    assert list_after_clear.status_code == 200
    assert list_after_clear.json()[0]["thumbnailUrl"] is None
