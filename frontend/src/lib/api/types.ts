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

export type CanvasDocument = {
  canvas: Canvas;
  cards: Card[];
  hierarchyLinks: Array<Record<string, unknown>>;
  relatedLinks: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
};
