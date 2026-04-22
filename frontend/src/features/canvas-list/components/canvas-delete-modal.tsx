"use client";

import type { CanvasSummary } from "@/lib/api/types";

type CanvasDeleteModalProps = {
  canvas: CanvasSummary | null;
  onCancel: () => void;
  onConfirm: (canvas: CanvasSummary) => void;
};

export function CanvasDeleteModal({ canvas, onCancel, onConfirm }: CanvasDeleteModalProps) {
  if (!canvas) {
    return null;
  }

  return (
    <div className="overlay" role="presentation">
      <dialog aria-modal="true" className="modal" open>
        <h2>キャンバスを削除</h2>
        <p className="muted">
          <strong>{canvas.name}</strong>{" "}
          を削除します。キャンバス本体、カード、リンク、添付メタが対象です。
        </p>
        <div className="modal__actions">
          <button className="button button--ghost" onClick={onCancel} type="button">
            キャンセル
          </button>
          <button className="button button--accent" onClick={() => onConfirm(canvas)} type="button">
            削除する
          </button>
        </div>
      </dialog>
    </div>
  );
}
