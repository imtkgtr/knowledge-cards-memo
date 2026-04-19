import type { CanvasDocument, CanvasSummary } from "./types";

function getRequiredValue(name: "BACKEND_INTERNAL_URL" | "NEXT_PUBLIC_API_BASE_URL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function getBackendInternalUrl() {
  return getRequiredValue("BACKEND_INTERNAL_URL");
}

export function getBackendPublicUrl() {
  return getRequiredValue("NEXT_PUBLIC_API_BASE_URL");
}

export async function serverFetchCanvases(accessToken: string): Promise<CanvasSummary[]> {
  const response = await fetch(`${getBackendInternalUrl()}/api/canvases`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("キャンバス一覧の取得に失敗しました。");
  }

  return (await response.json()) as CanvasSummary[];
}

export async function serverFetchCanvasDocument(
  accessToken: string,
  canvasId: string,
): Promise<CanvasDocument> {
  const response = await fetch(`${getBackendInternalUrl()}/api/canvases/${canvasId}/document`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("キャンバスの取得に失敗しました。");
  }

  const payload = (await response.json()) as { canvas: CanvasDocument };
  return payload.canvas;
}
