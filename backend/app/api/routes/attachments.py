from fastapi import APIRouter, Depends, Response, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.canvas import AttachmentAccessResponse
from app.services.canvas_service import CanvasService, get_canvas_service

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> Response:
    service.delete_attachment(user, attachment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{attachment_id}/access", response_model=AttachmentAccessResponse)
def get_attachment_access(
    attachment_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    service: CanvasService = Depends(get_canvas_service),
) -> AttachmentAccessResponse:
    return service.get_attachment_access(user, attachment_id)
