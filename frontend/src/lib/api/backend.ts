import type { Attachment, CanvasDocument, CanvasExportPayload, CanvasSummary } from "./types";

const browserProxyBasePath = "/api/backend";

function getRequiredInternalUrl() {
  const value = process.env.BACKEND_INTERNAL_URL;
  if (!value) {
    throw new Error("BACKEND_INTERNAL_URL is not configured.");
  }
  return value;
}

function getRequiredPublicUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return value;
}

export function getBackendInternalUrl() {
  return getRequiredInternalUrl();
}

export function getBackendPublicUrl() {
  return getRequiredPublicUrl();
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

export async function clientUploadAttachment(
  accessToken: string,
  canvasId: string,
  cardId: string,
  file: File,
): Promise<Attachment> {
  const formData = new FormData();
  formData.set("cardId", cardId);
  formData.set("file", file);

  const response = await fetch(`${getBackendPublicUrl()}/api/canvases/${canvasId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(payload?.detail?.message ?? "添付ファイルの追加に失敗しました。");
  }

  const data = (await response.json()) as { attachment: Attachment };
  return data.attachment;
}

export async function clientUploadCanvasThumbnail(
  accessToken: string,
  canvasId: string,
  file: File,
): Promise<CanvasSummary> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(getBrowserProxyPath(`/canvases/${canvasId}/thumbnail`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(payload?.detail?.message ?? "サムネイルの更新に失敗しました。");
  }

  const data = (await response.json()) as { canvas: CanvasSummary };
  return data.canvas;
}

export async function clientClearCanvasThumbnail(
  accessToken: string,
  canvasId: string,
): Promise<void> {
  const response = await fetch(getBrowserProxyPath(`/canvases/${canvasId}/thumbnail`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(payload?.detail?.message ?? "サムネイルの削除に失敗しました。");
  }
}

export async function clientDeleteAttachment(
  accessToken: string,
  attachmentId: string,
): Promise<void> {
  const response = await fetch(getBrowserProxyPath(`/attachments/${attachmentId}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(payload?.detail?.message ?? "添付ファイルの削除に失敗しました。");
  }
}

export async function clientGetAttachmentAccessUrl(
  accessToken: string,
  attachmentId: string,
): Promise<string> {
  const response = await fetch(getBrowserProxyPath(`/attachments/${attachmentId}/access`), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { message?: string };
    } | null;
    throw new Error(payload?.detail?.message ?? "添付ファイル URL の取得に失敗しました。");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}
