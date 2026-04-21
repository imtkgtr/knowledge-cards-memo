from fastapi import APIRouter

from app.api.routes.attachments import router as attachments_router
from app.api.routes.canvases import router as canvas_router
from app.api.routes.health import router as health_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(canvas_router)
api_router.include_router(attachments_router)
