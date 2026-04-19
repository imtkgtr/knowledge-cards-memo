"use client";

import { useEffect, useState } from "react";

type CanvasNameModalProps = {
  confirmLabel: string;
  initialValue: string;
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

export function CanvasNameModal({
  confirmLabel,
  initialValue,
  open,
  title,
  onCancel,
  onConfirm,
}: CanvasNameModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [initialValue, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" role="presentation">
      <dialog aria-modal="true" className="modal" open>
        <h2>{title}</h2>
        <label className="field">
          <span>キャンバス名</span>
          <input
            className="input"
            onChange={(event) => setValue(event.target.value)}
            value={value}
          />
        </label>
        <div className="modal__actions">
          <button className="button button--ghost" onClick={onCancel} type="button">
            キャンセル
          </button>
          <button
            className="button button--accent"
            disabled={!value.trim()}
            onClick={() => onConfirm(value)}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </div>
  );
}
