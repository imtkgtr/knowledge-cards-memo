"use client";

import type { CanvasExportPayload } from "@/lib/api/types";

type CanvasImportModalProps = {
  payload: CanvasExportPayload | null;
  onCancel: () => void;
  onConfirm: (payload: CanvasExportPayload) => void;
};

export function CanvasImportModal({ payload, onCancel, onConfirm }: CanvasImportModalProps) {
  if (!payload) {
    return null;
  }

  return (
    <div className="overlay" role="presentation">
      <dialog aria-modal="true" className="modal" open>
        <h2>JSON を取り込む</h2>
        <div className="field">
          <span>キャンバス名</span>
          <strong>{payload.canvas.name}</strong>
        </div>
        <div className="field">
          <span>含まれる内容</span>
          <p className="muted">
            カード {payload.cards.length} 件 / 階層リンク {payload.hierarchyLinks.length} 件 /
            関連リンク {payload.relatedLinks.length} 件
          </p>
        </div>
        <p className="muted">添付ファイルは JSON に含まれないため取り込まれません。</p>
        <div className="modal__actions">
          <button className="button button--ghost" onClick={onCancel} type="button">
            キャンセル
          </button>
          <button
            className="button button--accent"
            onClick={() => onConfirm(payload)}
            type="button"
          >
            取り込む
          </button>
        </div>
      </dialog>
    </div>
  );
}
