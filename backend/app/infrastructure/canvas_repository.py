from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from supabase import Client, create_client

from app.core.config import Settings, get_settings
from app.schemas.canvas import (
    AttachmentSchema,
    CanvasDocumentSchema,
    CanvasSchema,
    CanvasSummarySchema,
    CardSchema,
    HierarchyLinkSchema,
    RelatedLinkSchema,
    UpdateCanvasRequest,
)


class CanvasRepository(Protocol):
    def ensure_profile(self, user_id: str, email: str | None) -> None: ...

    def list_canvases(self, user_id: str) -> list[CanvasSummarySchema]: ...

    def create_canvas(self, user_id: str, name: str) -> CanvasSummarySchema: ...

    def update_canvas(
        self,
        user_id: str,
        canvas_id: str,
        payload: UpdateCanvasRequest,
    ) -> CanvasSchema | None: ...

    def delete_canvas(self, user_id: str, canvas_id: str) -> bool: ...

    def duplicate_canvas(self, user_id: str, canvas_id: str) -> CanvasSummarySchema | None: ...

    def get_canvas_document(self, user_id: str, canvas_id: str) -> CanvasDocumentSchema | None: ...


@dataclass(slots=True)
class SupabaseCanvasRepository:
    client: Client

    def ensure_profile(self, user_id: str, email: str | None) -> None:
        self.client.table("profiles").upsert(
            {"id": user_id, "email": email or ""},
            on_conflict="id",
        ).execute()

    def list_canvases(self, user_id: str) -> list[CanvasSummarySchema]:
        response = (
            self.client.table("canvases")
            .select("id,name,thumbnail_path,updated_at,created_at")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return [
            CanvasSummarySchema(
                id=row["id"],
                name=row["name"],
                thumbnail_url=row.get("thumbnail_path"),
                updated_at=row["updated_at"],
                created_at=row["created_at"],
            )
            for row in response.data or []
        ]

    def create_canvas(self, user_id: str, name: str) -> CanvasSummarySchema:
        response = (
            self.client.table("canvases")
            .insert({"user_id": user_id, "name": name.strip()})
            .execute()
        )
        row = response.data[0]
        return CanvasSummarySchema(
            id=row["id"],
            name=row["name"],
            thumbnail_url=row.get("thumbnail_path"),
            updated_at=row["updated_at"],
            created_at=row["created_at"],
        )

    def update_canvas(
        self,
        user_id: str,
        canvas_id: str,
        payload: UpdateCanvasRequest,
    ) -> CanvasSchema | None:
        existing = self._get_canvas_row(user_id, canvas_id)
        if existing is None:
            return None

        updates = {
            key: value
            for key, value in payload.model_dump(exclude_none=True).items()
            if key != "name" or value.strip()
        }
        if "name" in updates:
            updates["name"] = updates["name"].strip()

        response = (
            self.client.table("canvases")
            .update(updates)
            .eq("id", canvas_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            return None
        return self._to_canvas_schema(response.data[0])

    def delete_canvas(self, user_id: str, canvas_id: str) -> bool:
        response = (
            self.client.table("canvases")
            .delete()
            .eq("id", canvas_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(response.data)

    def duplicate_canvas(self, user_id: str, canvas_id: str) -> CanvasSummarySchema | None:
        original = self._get_canvas_row(user_id, canvas_id)
        if original is None:
            return None

        cards = (
            self.client.table("cards")
            .select("*")
            .eq("canvas_id", canvas_id)
            .order("created_at")
            .execute()
            .data
            or []
        )
        hierarchy_links = (
            self.client.table("hierarchy_links")
            .select("*")
            .eq("canvas_id", canvas_id)
            .execute()
            .data
            or []
        )
        related_links = (
            self.client.table("related_links")
            .select("*")
            .eq("canvas_id", canvas_id)
            .execute()
            .data
            or []
        )

        duplicated_canvas = self.create_canvas(user_id, f"{original['name']}のコピー")
        card_id_map = {card["id"]: str(uuid4()) for card in cards}

        if cards:
            self.client.table("cards").insert(
                [
                    {
                        "id": card_id_map[card["id"]],
                        "canvas_id": duplicated_canvas.id,
                        "title": card["title"],
                        "body": card["body"],
                        "tag_names": card.get("tag_names", []),
                        "color": card["color"],
                        "is_locked": card["is_locked"],
                        "x": card["x"],
                        "y": card["y"],
                        "child_count": card.get("child_count", 0),
                    }
                    for card in cards
                ]
            ).execute()

        if hierarchy_links:
            self.client.table("hierarchy_links").insert(
                [
                    {
                        "id": str(uuid4()),
                        "canvas_id": duplicated_canvas.id,
                        "parent_card_id": card_id_map[link["parent_card_id"]],
                        "child_card_id": card_id_map[link["child_card_id"]],
                    }
                    for link in hierarchy_links
                ]
            ).execute()

        if related_links:
            self.client.table("related_links").insert(
                [
                    {
                        "id": str(uuid4()),
                        "canvas_id": duplicated_canvas.id,
                        "card_a_id": card_id_map[link["card_a_id"]],
                        "card_b_id": card_id_map[link["card_b_id"]],
                    }
                    for link in related_links
                ]
            ).execute()

        return duplicated_canvas

    def get_canvas_document(self, user_id: str, canvas_id: str) -> CanvasDocumentSchema | None:
        canvas = self._get_canvas_row(user_id, canvas_id)
        if canvas is None:
            return None

        cards = (
            self.client.table("cards")
            .select("*")
            .eq("canvas_id", canvas_id)
            .order("created_at")
            .execute()
            .data
            or []
        )
        hierarchy_links = (
            self.client.table("hierarchy_links")
            .select("*")
            .eq("canvas_id", canvas_id)
            .execute()
            .data
            or []
        )
        related_links = (
            self.client.table("related_links")
            .select("*")
            .eq("canvas_id", canvas_id)
            .execute()
            .data
            or []
        )
        attachments = (
            self.client.table("card_attachments")
            .select("*, cards!inner(canvas_id)")
            .eq("cards.canvas_id", canvas_id)
            .execute()
            .data
            or []
        )

        return CanvasDocumentSchema(
            canvas=self._to_canvas_schema(canvas),
            cards=[CardSchema.model_validate(row) for row in cards],
            hierarchy_links=[HierarchyLinkSchema.model_validate(row) for row in hierarchy_links],
            related_links=[RelatedLinkSchema.model_validate(row) for row in related_links],
            attachments=[AttachmentSchema.model_validate(row) for row in attachments],
        )

    def _get_canvas_row(self, user_id: str, canvas_id: str) -> dict | None:
        response = (
            self.client.table("canvases")
            .select("*")
            .eq("id", canvas_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    @staticmethod
    def _to_canvas_schema(row: dict) -> CanvasSchema:
        return CanvasSchema.model_validate(row)


@dataclass(slots=True)
class MemoryCanvasRepository:
    canvases: dict[str, dict]
    cards: dict[str, list[dict]]
    hierarchy_links: dict[str, list[dict]]
    related_links: dict[str, list[dict]]
    attachments: dict[str, list[dict]]

    def ensure_profile(self, user_id: str, email: str | None) -> None:
        return None

    def list_canvases(self, user_id: str) -> list[CanvasSummarySchema]:
        rows = [row for row in self.canvases.values() if row["user_id"] == user_id]
        rows.sort(key=lambda item: item["updated_at"], reverse=True)
        return [
            CanvasSummarySchema(
                id=row["id"],
                name=row["name"],
                thumbnail_url=row.get("thumbnail_path"),
                updated_at=row["updated_at"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def create_canvas(self, user_id: str, name: str) -> CanvasSummarySchema:
        now = datetime.now(tz=UTC)
        canvas_id = str(uuid4())
        row = {
            "id": canvas_id,
            "user_id": user_id,
            "name": name.strip(),
            "background_color": "#ffffff",
            "grid_enabled": False,
            "duplicate_warning_suppressed": False,
            "thumbnail_path": None,
            "created_at": now,
            "updated_at": now,
        }
        self.canvases[canvas_id] = row
        self.cards[canvas_id] = []
        self.hierarchy_links[canvas_id] = []
        self.related_links[canvas_id] = []
        self.attachments[canvas_id] = []
        return CanvasSummarySchema(
            id=canvas_id,
            name=row["name"],
            thumbnail_url=None,
            updated_at=now,
            created_at=now,
        )

    def update_canvas(
        self,
        user_id: str,
        canvas_id: str,
        payload: UpdateCanvasRequest,
    ) -> CanvasSchema | None:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return None
        for key, value in payload.model_dump(exclude_none=True).items():
            row[key] = value.strip() if key == "name" else value
        row["updated_at"] = datetime.now(tz=UTC)
        return CanvasSchema.model_validate(row)

    def delete_canvas(self, user_id: str, canvas_id: str) -> bool:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return False
        del self.canvases[canvas_id]
        self.cards.pop(canvas_id, None)
        self.hierarchy_links.pop(canvas_id, None)
        self.related_links.pop(canvas_id, None)
        self.attachments.pop(canvas_id, None)
        return True

    def duplicate_canvas(self, user_id: str, canvas_id: str) -> CanvasSummarySchema | None:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return None
        duplicated = self.create_canvas(user_id, f"{row['name']}のコピー")
        return duplicated

    def get_canvas_document(self, user_id: str, canvas_id: str) -> CanvasDocumentSchema | None:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return None
        return CanvasDocumentSchema(
            canvas=CanvasSchema.model_validate(row),
            cards=[CardSchema.model_validate(card) for card in self.cards.get(canvas_id, [])],
            hierarchy_links=[
                HierarchyLinkSchema.model_validate(link)
                for link in self.hierarchy_links.get(canvas_id, [])
            ],
            related_links=[
                RelatedLinkSchema.model_validate(link)
                for link in self.related_links.get(canvas_id, [])
            ],
            attachments=[
                AttachmentSchema.model_validate(item)
                for item in self.attachments.get(canvas_id, [])
            ],
        )


def build_memory_canvas_repository() -> MemoryCanvasRepository:
    return MemoryCanvasRepository(
        canvases={},
        cards={},
        hierarchy_links={},
        related_links={},
        attachments={},
    )


def get_canvas_repository(settings: Settings = Depends(get_settings)) -> CanvasRepository:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "storage_not_configured", "message": "Supabase 設定が不足しています。"},
        )
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return SupabaseCanvasRepository(client=client)
