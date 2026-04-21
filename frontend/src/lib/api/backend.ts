import type { CanvasDocument, CanvasExportPayload, CanvasSummary } from "./types";

const browserProxyBasePath = "/api/backend";

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

export function getBrowserProxyPath(path: string) {
  const normalizedPath = path.startsWith("/api/")
    ? path.slice(4)
    : path.startsWith("api/")
      ? `/${path.slice(4)}`
      : path.startsWith("/")
        ? path
        : `/${path}`;
  return `${browserProxyBasePath}${normalizedPath}`;
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

export async function clientSaveCanvasDocument(
  accessToken: string,
  canvasId: string,
  document: CanvasDocument,
): Promise<CanvasDocument> {
  const response = await fetch(getBrowserProxyPath(`/canvases/${canvasId}/document`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(payload?.detail?.message ?? "キャンバスの保存に失敗しました。");
  }

  const payload = (await response.json()) as { canvas: CanvasDocument };
  return payload.canvas;
}

export async function clientExportCanvas(
  accessToken: string,
  canvasId: string,
): Promise<CanvasExportPayload> {
  const response = await fetch(getBrowserProxyPath(`/canvases/${canvasId}/export`), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(payload?.detail?.message ?? "JSON の書き出しに失敗しました。");
  }

  return (await response.json()) as CanvasExportPayload;
}

export async function clientImportCanvas(
  accessToken: string,
  payload: CanvasExportPayload,
): Promise<CanvasSummary> {
  const response = await fetch(getBrowserProxyPath("/canvases/import"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(errorPayload?.detail?.message ?? "JSON のインポートに失敗しました。");
  }

  const data = (await response.json()) as { canvas: CanvasSummary };
  return data.canvas;
}
