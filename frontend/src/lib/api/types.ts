export type CanvasSummary = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  updatedAt: string;
  createdAt: string;
};

export type Canvas = {
  id: string;
  name: string;
  backgroundColor: string;
  gridEnabled: boolean;
  duplicateWarningSuppressed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Card = {
  id: string;
  canvasId: string;
  title: string;
  body: string;
  tagNames: string[];
  color: string;
  isLocked: boolean;
  x: number;
  y: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HierarchyLink = {
  id: string;
  canvasId: string;
  parentCardId: string;
  childCardId: string;
  createdAt: string;
};

export type RelatedLink = {
  id: string;
  canvasId: string;
  cardAId: string;
  cardBId: string;
  createdAt: string;
};

export type Attachment = {
  id: string;
  cardId: string;
  kind: "image" | "pdf" | "text";
  fileName: string;
  storagePath: string;
  createdAt: string;
};

export type CanvasDocument = {
  canvas: Canvas;
  cards: Card[];
  hierarchyLinks: HierarchyLink[];
  relatedLinks: RelatedLink[];
  attachments: Attachment[];
};
