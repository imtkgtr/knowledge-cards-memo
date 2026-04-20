"use client";

import { getBrowserProxyPath } from "@/lib/api/backend";
import type { CanvasSummary } from "@/lib/api/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CanvasNameModal } from "./canvas-name-modal";

type CanvasListPageClientProps = {
  initialCanvases: CanvasSummary[];
  initialError: string | null;
  userEmail: string | undefined;
};

type ModalState = { mode: "create" } | { mode: "rename"; canvas: CanvasSummary } | null;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CanvasListPageClient({
  initialCanvases,
  initialError,
  userEmail,
}: CanvasListPageClientProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [canvases, setCanvases] = useState(initialCanvases);
  const [error, setError] = useState<string | null>(initialError);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [isPending, startTransition] = useTransition();

  const sortedCanvases = useMemo(
    () =>
      [...canvases].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [canvases],
  );

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function request(path: string, init?: RequestInit) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      router.push("/login");
      router.refresh();
      throw new Error("セッションが見つかりません。");
    }

    const response = await fetch(getBrowserProxyPath(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        detail?: { message?: string };
      } | null;
      throw new Error(payload?.detail?.message ?? "リクエストに失敗しました。");
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function openCreateModal() {
    setModalState({ mode: "create" });
  }

  function openRenameModal(canvas: CanvasSummary) {
    setModalState({ mode: "rename", canvas });
  }

  function closeModal() {
    setModalState(null);
  }

  function handleCreateOrRename(value: string) {
    if (!modalState) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        if (modalState.mode === "create") {
          const payload = (await request("/api/canvases", {
            method: "POST",
            body: JSON.stringify({ name: value }),
          })) as { canvas: CanvasSummary };
          setCanvases((current) => [payload.canvas, ...current]);
        } else {
          const payload = (await request(`/api/canvases/${modalState.canvas.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: value }),
          })) as { canvas: CanvasSummary };
          setCanvases((current) =>
            current.map((canvas) =>
              canvas.id === payload.canvas.id ? { ...canvas, ...payload.canvas } : canvas,
            ),
          );
        }
        closeModal();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "保存に失敗しました。");
      }
    });
  }

  function handleDuplicate(canvas: CanvasSummary) {
    setError(null);
    startTransition(async () => {
      try {
        const payload = (await request(`/api/canvases/${canvas.id}/duplicate`, {
          method: "POST",
        })) as { canvas: CanvasSummary };
        setCanvases((current) => [payload.canvas, ...current]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "複製に失敗しました。");
      }
    });
  }

  function handleDelete(canvas: CanvasSummary) {
    if (!window.confirm(`「${canvas.name}」を削除します。`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await request(`/api/canvases/${canvas.id}`, {
          method: "DELETE",
        });
        setCanvases((current) => current.filter((item) => item.id !== canvas.id));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "削除に失敗しました。");
      }
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Knowledge Canvas</p>
          <h1>キャンバス一覧</h1>
          <p className="muted">
            {userEmail ? `${userEmail} としてログイン中です。` : "ログイン中です。"}
          </p>
        </div>
        <div className="dashboard-header__actions">
          <button className="button button--accent" onClick={openCreateModal} type="button">
            新規作成
          </button>
          <button className="button button--ghost" onClick={handleSignOut} type="button">
            ログアウト
          </button>
        </div>
      </header>

      {error ? <p className="notice notice--error">{error}</p> : null}
      {isPending ? <p className="muted">処理中です...</p> : null}

      <section className="canvas-grid">
        {sortedCanvases.length === 0 ? (
          <article className="canvas-card canvas-card--empty">
            <h2>まだキャンバスがありません</h2>
            <p>最初のキャンバスを作成して、知識地図の下地を作ります。</p>
          </article>
        ) : (
          sortedCanvases.map((canvas) => (
            <article className="canvas-card" key={canvas.id}>
              <Link className="canvas-card__thumbnail" href={`/canvases/${canvas.id}`}>
                {canvas.thumbnailUrl ? (
                  <img alt={`${canvas.name} のサムネイル`} src={canvas.thumbnailUrl} />
                ) : (
                  <div className="canvas-card__thumbnailPlaceholder">{canvas.name}</div>
                )}
              </Link>
              <div className="canvas-card__body">
                <div>
                  <h2>{canvas.name}</h2>
                  <p>更新: {formatDate(canvas.updatedAt)}</p>
                </div>
                <div className="canvas-card__actions">
                  <button
                    className="button button--ghost"
                    onClick={() => openRenameModal(canvas)}
                    type="button"
                  >
                    名前変更
                  </button>
                  <button
                    className="button button--ghost"
                    onClick={() => handleDuplicate(canvas)}
                    type="button"
                  >
                    複製
                  </button>
                  <button
                    className="button button--ghost"
                    onClick={() => handleDelete(canvas)}
                    type="button"
                  >
                    削除
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <CanvasNameModal
        confirmLabel={modalState?.mode === "create" ? "作成する" : "更新する"}
        initialValue={modalState?.mode === "rename" ? modalState.canvas.name : ""}
        onCancel={closeModal}
        onConfirm={handleCreateOrRename}
        open={modalState !== null}
        title={modalState?.mode === "create" ? "キャンバスを作成" : "キャンバス名を変更"}
      />
    </main>
  );
}
