from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.infrastructure.canvas_repository import CanvasRepository, get_canvas_repository
from app.schemas.canvas import (
    CanvasDocumentSchema,
    CanvasSchema,
    CanvasSummarySchema,
    UpdateCanvasRequest,
)


@dataclass(slots=True)
class CanvasService:
    repository: CanvasRepository

    def list_canvases(self, user: AuthenticatedUser) -> list[CanvasSummarySchema]:
        self.repository.ensure_profile(user.id, user.email)
        return self.repository.list_canvases(user.id)

    def create_canvas(self, user: AuthenticatedUser, name: str) -> CanvasSummarySchema:
        self.repository.ensure_profile(user.id, user.email)
        return self.repository.create_canvas(user.id, name)

    def update_canvas(
        self,
        user: AuthenticatedUser,
        canvas_id: str,
        payload: UpdateCanvasRequest,
    ) -> CanvasSchema:
        self.repository.ensure_profile(user.id, user.email)
        updated = self.repository.update_canvas(user.id, canvas_id, payload)
        if updated is None:
            raise self._not_found()
        return updated

    def delete_canvas(self, user: AuthenticatedUser, canvas_id: str) -> None:
        self.repository.ensure_profile(user.id, user.email)
        if not self.repository.delete_canvas(user.id, canvas_id):
            raise self._not_found()

    def duplicate_canvas(self, user: AuthenticatedUser, canvas_id: str) -> CanvasSummarySchema:
        self.repository.ensure_profile(user.id, user.email)
        duplicated = self.repository.duplicate_canvas(user.id, canvas_id)
        if duplicated is None:
            raise self._not_found()
        return duplicated

    def get_canvas_document(self, user: AuthenticatedUser, canvas_id: str) -> CanvasDocumentSchema:
        self.repository.ensure_profile(user.id, user.email)
        document = self.repository.get_canvas_document(user.id, canvas_id)
        if document is None:
            raise self._not_found()
        return document

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
