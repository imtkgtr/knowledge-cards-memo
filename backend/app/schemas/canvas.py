from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class CanvasSummarySchema(CamelModel):
    id: str
    name: str
    thumbnail_url: str | None = None
    updated_at: datetime
    created_at: datetime


class CanvasSchema(CamelModel):
    id: str
    name: str
    background_color: str = "#ffffff"
    grid_enabled: bool = False
    duplicate_warning_suppressed: bool = False
    created_at: datetime
    updated_at: datetime


class CardSchema(CamelModel):
    id: str
    canvas_id: str
    title: str
    body: str = ""
    tag_names: list[str] = Field(default_factory=list)
    color: str
    is_locked: bool
    x: float
    y: float
    child_count: int = 0
    created_at: datetime
    updated_at: datetime


class HierarchyLinkSchema(CamelModel):
    id: str
    canvas_id: str
    parent_card_id: str
    child_card_id: str
    created_at: datetime


class RelatedLinkSchema(CamelModel):
    id: str
    canvas_id: str
    card_a_id: str
    card_b_id: str
    created_at: datetime


class AttachmentSchema(CamelModel):
    id: str
    card_id: str
    file_name: str
    mime_type: str
    size_bytes: int
    kind: str
    created_at: datetime


class CanvasDocumentSchema(CamelModel):
    canvas: CanvasSchema
    cards: list[CardSchema] = Field(default_factory=list)
    hierarchy_links: list[HierarchyLinkSchema] = Field(default_factory=list)
    related_links: list[RelatedLinkSchema] = Field(default_factory=list)
    attachments: list[AttachmentSchema] = Field(default_factory=list)


class CreateCanvasRequest(CamelModel):
    name: str


class UpdateCanvasRequest(CamelModel):
    name: str | None = None
    background_color: str | None = None
    grid_enabled: bool | None = None
    duplicate_warning_suppressed: bool | None = None


class CanvasSummaryResponse(CamelModel):
    canvas: CanvasSummarySchema


class CanvasResponse(CamelModel):
    canvas: CanvasSchema


class CanvasDocumentResponse(CamelModel):
    canvas: CanvasDocumentSchema


class SaveCanvasDocumentRequest(CamelModel):
    canvas: CanvasSchema
    cards: list[CardSchema] = Field(default_factory=list)
    hierarchy_links: list[HierarchyLinkSchema] = Field(default_factory=list)
    related_links: list[RelatedLinkSchema] = Field(default_factory=list)
    attachments: list[AttachmentSchema] = Field(default_factory=list)
