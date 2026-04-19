"use client";

import { useEffect, useState } from "react";

type CreateCardModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (title: string) => void;
};

export function CreateCardModal({ open, onCancel, onConfirm }: CreateCardModalProps) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" role="presentation">
      <dialog aria-modal="true" className="modal" open>
        <h2>カードを作成</h2>
        <label className="field">
          <span>タイトル</span>
          <input
            className="input"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <div className="modal__actions">
          <button className="button button--ghost" onClick={onCancel} type="button">
            キャンセル
          </button>
          <button
            className="button button--accent"
            disabled={!title.trim()}
            onClick={() => onConfirm(title)}
            type="button"
          >
            作成する
          </button>
        </div>
      </dialog>
    </div>
  );
}
