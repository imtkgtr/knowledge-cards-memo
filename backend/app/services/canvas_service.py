from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from postgrest.exceptions import APIError

from app.core.auth import AuthenticatedUser, get_current_user
from app.infrastructure.canvas_repository import CanvasRepository, get_canvas_repository
from app.schemas.canvas import (
    CanvasDocumentSchema,
    CanvasSchema,
    CanvasSummarySchema,
    SaveCanvasDocumentRequest,
    UpdateCanvasRequest,
)


@dataclass(slots=True)
class CanvasService:
    repository: CanvasRepository

    def list_canvases(self, user: AuthenticatedUser) -> list[CanvasSummarySchema]:
        return self._with_storage_guard(
            lambda: self._prepare_profile_and_run(
                user,
                lambda: self.repository.list_canvases(user.id),
            )
        )

    def create_canvas(self, user: AuthenticatedUser, name: str) -> CanvasSummarySchema:
        return self._with_storage_guard(
            lambda: self._prepare_profile_and_run(
                user,
                lambda: self.repository.create_canvas(user.id, name),
            )
        )

    def update_canvas(
        self,
        user: AuthenticatedUser,
        canvas_id: str,
        payload: UpdateCanvasRequest,
    ) -> CanvasSchema:
        updated = self._with_storage_guard(
            lambda: self._prepare_profile_and_run(
                user,
                lambda: self.repository.update_canvas(user.id, canvas_id, payload),
            )
        )
        if updated is None:
            raise self._not_found()
        return updated

    def delete_canvas(self, user: AuthenticatedUser, canvas_id: str) -> None:
        deleted = self._with_storage_guard(
            lambda: self._prepare_profile_and_run(
                user,
                lambda: self.repository.delete_canvas(user.id, canvas_id),
            )
        )
        if not deleted:
            raise self._not_found()

    def duplicate_canvas(self, user: AuthenticatedUser, canvas_id: str) -> CanvasSummarySchema:
        duplicated = self._with_storage_guard(
            lambda: self._prepare_profile_and_run(
                user,
                lambda: self.repository.duplicate_canvas(user.id, canvas_id),
            )
        )
        if duplicated is None:
            raise self._not_found()
        return duplicated

    def get_canvas_document(self, user: AuthenticatedUser, canvas_id: str) -> CanvasDocumentSchema:
        document = self._with_storage_guard(
            lambda: self._prepare_profile_and_run(
                user,
                lambda: self.repository.get_canvas_document(user.id, canvas_id),
            )
        )
        if document is None:
            raise self._not_found()
        return document

    def save_canvas_document(
        self,
        user: AuthenticatedUser,
        canvas_id: str,
        payload: SaveCanvasDocumentRequest,
    ) -> CanvasDocumentSchema:
        self._validate_document(canvas_id, payload)
        document = self._with_storage_guard(
            lambda: self._prepare_profile_and_run(
                user,
                lambda: self.repository.save_canvas_document(user.id, canvas_id, payload),
            )
        )
        if document is None:
            raise self._not_found()
        return document

    def _prepare_profile_and_run(self, user: AuthenticatedUser, callback):
        self.repository.ensure_profile(user.id, user.email)
        return callback()

    @staticmethod
    def _with_storage_guard(callback):
        try:
            return callback()
        except APIError as error:
            if error.code == "PGRST205":
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "code": "storage_not_initialized",
                        "message": "Supabase のテーブルが未初期化です。migration を適用してください。",
                    },
                ) from error
            raise

    def _validate_document(self, canvas_id: str, payload: SaveCanvasDocumentRequest) -> None:
        if payload.canvas.id != canvas_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"code": "invalid_payload", "message": "キャンバス ID が一致しません。"},
            )

        card_ids = {card.id for card in payload.cards}
        if len(card_ids) != len(payload.cards):
            raise self._invalid_payload("カード ID が重複しています。")

        for card in payload.cards:
            if not card.title.strip():
                raise self._invalid_payload("カードタイトルは必須です。")
            if card.canvas_id != canvas_id:
                raise self._invalid_payload("カードの canvasId が不正です。")

        seen_hierarchy: set[tuple[str, str]] = set()
        graph: dict[str, set[str]] = {card_id: set() for card_id in card_ids}
        for link in payload.hierarchy_links:
            if link.canvas_id != canvas_id:
                raise self._invalid_payload("階層リンクの canvasId が不正です。")
            if link.parent_card_id == link.child_card_id:
                raise self._invalid_payload("自己参照の階層リンクは保存できません。")
            if link.parent_card_id not in card_ids or link.child_card_id not in card_ids:
                raise self._invalid_payload(
                    "存在しないカードを参照する階層リンクは保存できません。"
                )
            pair = (link.parent_card_id, link.child_card_id)
            if pair in seen_hierarchy:
                raise self._invalid_payload("重複した階層リンクは保存できません。")
            seen_hierarchy.add(pair)
            graph[link.parent_card_id].add(link.child_card_id)

        if self._has_cycle(graph):
            raise self._invalid_payload("循環する階層リンクは保存できません。")

        seen_related: set[tuple[str, str]] = set()
        for link in payload.related_links:
            if link.canvas_id != canvas_id:
                raise self._invalid_payload("通常リンクの canvasId が不正です。")
            if link.card_a_id == link.card_b_id:
                raise self._invalid_payload("自己参照の通常リンクは保存できません。")
            if link.card_a_id not in card_ids or link.card_b_id not in card_ids:
                raise self._invalid_payload(
                    "存在しないカードを参照する通常リンクは保存できません。"
                )
            pair = tuple(sorted((link.card_a_id, link.card_b_id)))
            if pair in seen_related:
                raise self._invalid_payload("重複した通常リンクは保存できません。")
            seen_related.add(pair)

    @staticmethod
    def _has_cycle(graph: dict[str, set[str]]) -> bool:
        visited: set[str] = set()
        visiting: set[str] = set()

        def visit(node: str) -> bool:
            if node in visiting:
                return True
            if node in visited:
                return False
            visiting.add(node)
            for child in graph.get(node, set()):
                if visit(child):
                    return True
            visiting.remove(node)
            visited.add(node)
            return False

        return any(visit(node) for node in graph)

    @staticmethod
    def _invalid_payload(message: str) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "invalid_payload", "message": message},
        )

    @staticmethod
    def _not_found() -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "canvas_not_found", "message": "キャンバスが見つかりません。"},
        )


def get_canvas_service(
    repository: CanvasRepository = Depends(get_canvas_repository),
) -> CanvasService:
    return CanvasService(repository=repository)


def get_authenticated_canvas_service(
    _: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasService:
    return service
