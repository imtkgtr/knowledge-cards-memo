"use client";

import { useEffect, useState } from "react";

type DuplicateCardWarningModalProps = {
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: (suppressFutureWarnings: boolean) => void;
};

export function DuplicateCardWarningModal({
  open,
  title,
  onCancel,
  onConfirm,
}: DuplicateCardWarningModalProps) {
  const [suppressFutureWarnings, setSuppressFutureWarnings] = useState(false);

  useEffect(() => {
    if (open) {
      setSuppressFutureWarnings(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" role="presentation">
      <dialog aria-modal="true" className="modal" open>
        <h2>同じ名前のカードがあります</h2>
        <p className="muted">
          <strong>{title}</strong>{" "}
          は既に存在します。このまま追加する場合はそのまま作成してください。
        </p>
        <label className="checkbox-field">
          <input
            checked={suppressFutureWarnings}
            onChange={(event) => setSuppressFutureWarnings(event.target.checked)}
            type="checkbox"
          />
          <span>今後はこのキャンバスで表示しない</span>
        </label>
        <div className="modal__actions">
          <button className="button button--ghost" onClick={onCancel} type="button">
            戻る
          </button>
          <button
            className="button button--accent"
            onClick={() => onConfirm(suppressFutureWarnings)}
            type="button"
          >
            そのまま作成
          </button>
        </div>
      </dialog>
    </div>
  );
}
