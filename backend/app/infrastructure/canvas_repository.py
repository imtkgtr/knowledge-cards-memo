from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
import re
from typing import Protocol
import unicodedata
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
    SaveCanvasDocumentRequest,
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

    def save_canvas_document(
        self,
        user_id: str,
        canvas_id: str,
        payload: SaveCanvasDocumentRequest,
    ) -> CanvasDocumentSchema | None: ...

    def list_attachments_for_card(
        self,
        user_id: str,
        canvas_id: str,
        card_id: str,
    ) -> list[AttachmentSchema] | None: ...

    def add_attachment(
        self,
        user_id: str,
        canvas_id: str,
        card_id: str,
        file_name: str,
        mime_type: str,
        size_bytes: int,
        kind: str,
        file_bytes: bytes,
    ) -> AttachmentSchema | None: ...

    def delete_attachment(self, user_id: str, attachment_id: str) -> bool: ...

    def get_attachment_access_url(
        self,
        user_id: str,
        attachment_id: str,
        expires_in: int,
    ) -> str | None: ...

    def upload_thumbnail(
        self,
        user_id: str,
        canvas_id: str,
        file_bytes: bytes,
        mime_type: str,
    ) -> CanvasSummarySchema | None: ...

    def clear_thumbnail(self, user_id: str, canvas_id: str) -> bool: ...


ATTACHMENT_BUCKET_NAME = "card-attachments"
THUMBNAIL_BUCKET_NAME = "canvas-thumbnails"


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
            self._to_canvas_summary_schema(row)
            for row in response.data or []
        ]

    def create_canvas(self, user_id: str, name: str) -> CanvasSummarySchema:
        response = (
            self.client.table("canvases")
            .insert({"user_id": user_id, "name": name.strip()})
            .execute()
        )
        row = response.data[0]
        return self._to_canvas_summary_schema(row)

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

    def save_canvas_document(
        self,
        user_id: str,
        canvas_id: str,
        payload: SaveCanvasDocumentRequest,
    ) -> CanvasDocumentSchema | None:
        canvas = self._get_canvas_row(user_id, canvas_id)
        if canvas is None:
            return None

        self.client.table("canvases").update(
            {
                "name": payload.canvas.name.strip(),
                "background_color": payload.canvas.background_color,
                "grid_enabled": payload.canvas.grid_enabled,
                "duplicate_warning_suppressed": payload.canvas.duplicate_warning_suppressed,
            }
        ).eq("id", canvas_id).eq("user_id", user_id).execute()

        self.client.table("hierarchy_links").delete().eq("canvas_id", canvas_id).execute()
        self.client.table("related_links").delete().eq("canvas_id", canvas_id).execute()
        self.client.table("cards").delete().eq("canvas_id", canvas_id).execute()

        if payload.cards:
            self.client.table("cards").insert(
                [
                    {
                        "id": card.id,
                        "canvas_id": canvas_id,
                        "title": card.title.strip(),
                        "body": card.body,
                        "tag_names": [tag.strip().lower() for tag in card.tag_names if tag.strip()],
                        "color": card.color,
                        "is_locked": card.is_locked,
                        "x": card.x,
                        "y": card.y,
                        "child_count": card.child_count,
                    }
                    for card in payload.cards
                ]
            ).execute()

        if payload.hierarchy_links:
            self.client.table("hierarchy_links").insert(
                [
                    {
                        "id": link.id,
                        "canvas_id": canvas_id,
                        "parent_card_id": link.parent_card_id,
                        "child_card_id": link.child_card_id,
                    }
                    for link in payload.hierarchy_links
                ]
            ).execute()

        if payload.related_links:
            self.client.table("related_links").insert(
                [
                    {
                        "id": link.id,
                        "canvas_id": canvas_id,
                        "card_a_id": min(link.card_a_id, link.card_b_id),
                        "card_b_id": max(link.card_a_id, link.card_b_id),
                    }
                    for link in payload.related_links
                ]
            ).execute()

        return self.get_canvas_document(user_id, canvas_id)

    def list_attachments_for_card(
        self,
        user_id: str,
        canvas_id: str,
        card_id: str,
    ) -> list[AttachmentSchema] | None:
        card = self._get_card_row_for_canvas(user_id, canvas_id, card_id)
        if card is None:
            return None
        response = (
            self.client.table("card_attachments")
            .select("*")
            .eq("card_id", card_id)
            .order("created_at")
            .execute()
        )
        return [AttachmentSchema.model_validate(row) for row in response.data or []]

    def add_attachment(
        self,
        user_id: str,
        canvas_id: str,
        card_id: str,
        file_name: str,
        mime_type: str,
        size_bytes: int,
        kind: str,
        file_bytes: bytes,
    ) -> AttachmentSchema | None:
        card = self._get_card_row_for_canvas(user_id, canvas_id, card_id)
        if card is None:
            return None

        attachment_id = str(uuid4())
        storage_path = self._build_attachment_path(
            user_id=user_id,
            canvas_id=canvas_id,
            card_id=card_id,
            attachment_id=attachment_id,
            file_name=file_name,
        )
        self._ensure_attachment_bucket()
        self.client.storage.from_(ATTACHMENT_BUCKET_NAME).upload(
            storage_path,
            file_bytes,
            {"content-type": mime_type, "x-upsert": "false"},
        )
        response = (
            self.client.table("card_attachments")
            .insert(
                {
                    "id": attachment_id,
                    "card_id": card_id,
                    "storage_path": storage_path,
                    "file_name": file_name,
                    "mime_type": mime_type,
                    "size_bytes": size_bytes,
                    "kind": kind,
                }
            )
            .execute()
        )
        return AttachmentSchema.model_validate(response.data[0])

    def delete_attachment(self, user_id: str, attachment_id: str) -> bool:
        attachment = self._get_attachment_row(user_id, attachment_id)
        if attachment is None:
            return False
        self.client.storage.from_(ATTACHMENT_BUCKET_NAME).remove([attachment["storage_path"]])
        response = self.client.table("card_attachments").delete().eq("id", attachment_id).execute()
        return bool(response.data)

    def get_attachment_access_url(
        self,
        user_id: str,
        attachment_id: str,
        expires_in: int,
    ) -> str | None:
        attachment = self._get_attachment_row(user_id, attachment_id)
        if attachment is None:
            return None
        response = self.client.storage.from_(ATTACHMENT_BUCKET_NAME).create_signed_url(
            attachment["storage_path"],
            expires_in,
        )
        return response["signedURL"]

    def upload_thumbnail(
        self,
        user_id: str,
        canvas_id: str,
        file_bytes: bytes,
        mime_type: str,
    ) -> CanvasSummarySchema | None:
        canvas = self._get_canvas_row(user_id, canvas_id)
        if canvas is None:
            return None

        storage_path = self._build_thumbnail_path(user_id, canvas_id)
        self._ensure_thumbnail_bucket()
        self.client.storage.from_(THUMBNAIL_BUCKET_NAME).upload(
            storage_path,
            file_bytes,
            {"content-type": mime_type, "x-upsert": "true"},
        )
        response = (
            self.client.table("canvases")
            .update({"thumbnail_path": storage_path})
            .eq("id", canvas_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            return None
        return self._to_canvas_summary_schema(response.data[0])

    def clear_thumbnail(self, user_id: str, canvas_id: str) -> bool:
        canvas = self._get_canvas_row(user_id, canvas_id)
        if canvas is None:
            return False

        thumbnail_path = canvas.get("thumbnail_path")
        if not thumbnail_path:
            return True

        self._ensure_thumbnail_bucket()
        self.client.storage.from_(THUMBNAIL_BUCKET_NAME).remove([thumbnail_path])

        response = (
            self.client.table("canvases")
            .update({"thumbnail_path": None})
            .eq("id", canvas_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(response.data)

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

    def _get_card_row_for_canvas(self, user_id: str, canvas_id: str, card_id: str) -> dict | None:
        canvas = self._get_canvas_row(user_id, canvas_id)
        if canvas is None:
            return None
        response = (
            self.client.table("cards")
            .select("*")
            .eq("id", card_id)
            .eq("canvas_id", canvas_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def _get_attachment_row(self, user_id: str, attachment_id: str) -> dict | None:
        response = (
            self.client.table("card_attachments")
            .select("*")
            .eq("id", attachment_id)
            .limit(1)
            .execute()
        )
        attachment = response.data[0] if response.data else None
        if attachment is None:
            return None
        card = (
            self.client.table("cards")
            .select("id, canvas_id")
            .eq("id", attachment["card_id"])
            .limit(1)
            .execute()
        )
        card_row = card.data[0] if card.data else None
        if card_row is None:
            return None
        canvas = self._get_canvas_row(user_id, card_row["canvas_id"])
        if canvas is None:
            return None
        return attachment

    def _ensure_attachment_bucket(self) -> None:
        try:
            self.client.storage.get_bucket(ATTACHMENT_BUCKET_NAME)
        except Exception:
            self.client.storage.create_bucket(
                ATTACHMENT_BUCKET_NAME,
                options={
                    "public": False,
                    "file_size_limit": 10 * 1024 * 1024,
                    "allowed_mime_types": ["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain"],
                },
            )

    def _ensure_thumbnail_bucket(self) -> None:
        try:
            self.client.storage.get_bucket(THUMBNAIL_BUCKET_NAME)
        except Exception:
            self.client.storage.create_bucket(
                THUMBNAIL_BUCKET_NAME,
                options={
                    "public": True,
                    "file_size_limit": 5 * 1024 * 1024,
                    "allowed_mime_types": ["image/png", "image/jpeg", "image/webp"],
                },
            )

    @staticmethod
    def _build_attachment_path(
        user_id: str,
        canvas_id: str,
        card_id: str,
        attachment_id: str,
        file_name: str,
    ) -> str:
        sanitized_name = SupabaseCanvasRepository._sanitize_storage_file_name(file_name)
        return f"{user_id}/{canvas_id}/{card_id}/{attachment_id}-{sanitized_name}"

    @staticmethod
    def _sanitize_storage_file_name(file_name: str) -> str:
        normalized_name = unicodedata.normalize("NFKD", Path(file_name).name)
        ascii_name = normalized_name.encode("ascii", "ignore").decode("ascii")
        suffix = "".join(
            char.lower()
            for char in Path(ascii_name).suffix
            if char.isascii() and (char.isalnum() or char in {".", "-", "_"})
        )
        stem = Path(ascii_name).stem or "file"
        sanitized_stem = re.sub(r"[^A-Za-z0-9_-]+", "-", stem)
        sanitized_stem = re.sub(r"-{2,}", "-", sanitized_stem).strip("-_")
        if not sanitized_stem:
            sanitized_stem = "file"
        if suffix in {".", "-", "_"}:
            suffix = ""
        return f"{sanitized_stem}{suffix}"

    @staticmethod
    def _build_thumbnail_path(user_id: str, canvas_id: str) -> str:
        return f"{user_id}/{canvas_id}/latest.png"

    @staticmethod
    def _to_canvas_schema(row: dict) -> CanvasSchema:
        return CanvasSchema.model_validate(row)

    def _to_canvas_summary_schema(self, row: dict) -> CanvasSummarySchema:
        return CanvasSummarySchema(
            id=row["id"],
            name=row["name"],
            thumbnail_url=self._resolve_thumbnail_url(row.get("thumbnail_path")),
            updated_at=row["updated_at"],
            created_at=row["created_at"],
        )

    def _resolve_thumbnail_url(self, thumbnail_path: str | None) -> str | None:
        if not thumbnail_path:
            return None
        return self.client.storage.from_(THUMBNAIL_BUCKET_NAME).get_public_url(thumbnail_path)


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

    def save_canvas_document(
        self,
        user_id: str,
        canvas_id: str,
        payload: SaveCanvasDocumentRequest,
    ) -> CanvasDocumentSchema | None:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return None
        row["name"] = payload.canvas.name.strip()
        row["background_color"] = payload.canvas.background_color
        row["grid_enabled"] = payload.canvas.grid_enabled
        row["duplicate_warning_suppressed"] = payload.canvas.duplicate_warning_suppressed
        row["updated_at"] = datetime.now(tz=UTC)
        self.cards[canvas_id] = [card.model_dump() for card in payload.cards]
        self.hierarchy_links[canvas_id] = [link.model_dump() for link in payload.hierarchy_links]
        self.related_links[canvas_id] = [link.model_dump() for link in payload.related_links]
        return self.get_canvas_document(user_id, canvas_id)

    def list_attachments_for_card(
        self,
        user_id: str,
        canvas_id: str,
        card_id: str,
    ) -> list[AttachmentSchema] | None:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return None
        attachments = [
            item for item in self.attachments.get(canvas_id, []) if item["card_id"] == card_id
        ]
        return [AttachmentSchema.model_validate(item) for item in attachments]

    def add_attachment(
        self,
        user_id: str,
        canvas_id: str,
        card_id: str,
        file_name: str,
        mime_type: str,
        size_bytes: int,
        kind: str,
        file_bytes: bytes,
    ) -> AttachmentSchema | None:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return None
        if not any(card["id"] == card_id for card in self.cards.get(canvas_id, [])):
            return None
        attachment = {
            "id": str(uuid4()),
            "card_id": card_id,
            "storage_path": f"memory/{canvas_id}/{card_id}/{file_name}",
            "file_name": file_name,
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "kind": kind,
            "created_at": datetime.now(tz=UTC),
        }
        self.attachments[canvas_id].append(attachment)
        return AttachmentSchema.model_validate(attachment)

    def delete_attachment(self, user_id: str, attachment_id: str) -> bool:
        for canvas_id, items in self.attachments.items():
            row = self.canvases.get(canvas_id)
            if row is None or row["user_id"] != user_id:
                continue
            for index, item in enumerate(items):
                if item["id"] == attachment_id:
                    del items[index]
                    return True
        return False

    def get_attachment_access_url(
        self,
        user_id: str,
        attachment_id: str,
        expires_in: int,
    ) -> str | None:
        for canvas_id, items in self.attachments.items():
            row = self.canvases.get(canvas_id)
            if row is None or row["user_id"] != user_id:
                continue
            for item in items:
                if item["id"] == attachment_id:
                    return f"https://example.test/attachments/{attachment_id}?expires_in={expires_in}"
        return None

    def upload_thumbnail(
        self,
        user_id: str,
        canvas_id: str,
        file_bytes: bytes,
        mime_type: str,
    ) -> CanvasSummarySchema | None:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return None
        row["thumbnail_path"] = f"https://example.test/thumbnails/{canvas_id}/latest.png"
        row["updated_at"] = datetime.now(tz=UTC)
        return CanvasSummarySchema(
            id=row["id"],
            name=row["name"],
            thumbnail_url=row["thumbnail_path"],
            updated_at=row["updated_at"],
            created_at=row["created_at"],
        )

    def clear_thumbnail(self, user_id: str, canvas_id: str) -> bool:
        row = self.canvases.get(canvas_id)
        if row is None or row["user_id"] != user_id:
            return False
        if row["thumbnail_path"] is None:
            return True
        row["thumbnail_path"] = None
        row["updated_at"] = datetime.now(tz=UTC)
        return True


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
