from fastapi import APIRouter, Depends, Response, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.canvas import (
    CanvasExportSchema,
    CanvasDocumentResponse,
    CanvasResponse,
    CanvasSummaryResponse,
    CanvasSummarySchema,
    CreateCanvasRequest,
    ImportCanvasRequest,
    SaveCanvasDocumentRequest,
    UpdateCanvasRequest,
)
from app.services.canvas_service import CanvasService, get_canvas_service

router = APIRouter(prefix="/canvases", tags=["canvases"])


@router.get("", response_model=list[CanvasSummarySchema])
def list_canvases(
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> list[CanvasSummarySchema]:
    return service.list_canvases(user)


@router.post("", response_model=CanvasSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_canvas(
    payload: CreateCanvasRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasSummaryResponse:
    created = service.create_canvas(user, payload.name)
    return CanvasSummaryResponse(canvas=created)


@router.patch("/{canvas_id}", response_model=CanvasResponse)
def update_canvas(
    canvas_id: str,
    payload: UpdateCanvasRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasResponse:
    updated = service.update_canvas(user, canvas_id, payload)
    return CanvasResponse(canvas=updated)


@router.delete("/{canvas_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_canvas(
    canvas_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> Response:
    service.delete_canvas(user, canvas_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{canvas_id}/duplicate",
    response_model=CanvasSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_canvas(
    canvas_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasSummaryResponse:
    duplicated = service.duplicate_canvas(user, canvas_id)
    return CanvasSummaryResponse(canvas=duplicated)


@router.get("/{canvas_id}/document", response_model=CanvasDocumentResponse)
def get_canvas_document(
    canvas_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasDocumentResponse:
    document = service.get_canvas_document(user, canvas_id)
    return CanvasDocumentResponse(canvas=document)


@router.put("/{canvas_id}/document", response_model=CanvasDocumentResponse)
def save_canvas_document(
    canvas_id: str,
    payload: SaveCanvasDocumentRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasDocumentResponse:
    document = service.save_canvas_document(user, canvas_id, payload)
    return CanvasDocumentResponse(canvas=document)


@router.get("/{canvas_id}/export", response_model=CanvasExportSchema)
def export_canvas(
    canvas_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasExportSchema:
    return service.export_canvas(user, canvas_id)


@router.post("/import", response_model=CanvasSummaryResponse, status_code=status.HTTP_201_CREATED)
def import_canvas(
    payload: ImportCanvasRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> CanvasSummaryResponse:
    imported = service.import_canvas(user, payload)
    return CanvasSummaryResponse(canvas=imported)
