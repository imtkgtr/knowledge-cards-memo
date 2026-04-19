"use client";

import type { CanvasDocument } from "@/lib/api/types";
import { produce } from "immer";
import { create } from "zustand";

type SaveState = "idle" | "saving" | "saved" | "error";

type CanvasEditorState = {
  document: CanvasDocument | null;
  selectedCardId: string | null;
  nextCardColor: string;
  saveState: SaveState;
  saveError: string | null;
  loadDocument: (document: CanvasDocument) => void;
  selectCard: (cardId: string | null) => void;
  createCard: (input: { body?: string; title: string; x: number; y: number }) => void;
  updateCard: (cardId: string, updates: Partial<CanvasDocument["cards"][number]>) => void;
  moveCard: (cardId: string, x: number, y: number) => void;
  setCanvasName: (name: string) => void;
  setNextCardColor: (color: string) => void;
  setSaveState: (saveState: SaveState, saveError?: string | null) => void;
};

function getNow() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const useCanvasEditorStore = create<CanvasEditorState>((set) => ({
  document: null,
  selectedCardId: null,
  nextCardColor: "#eed9b6",
  saveState: "idle",
  saveError: null,
  loadDocument: (document) =>
    set({
      document,
      selectedCardId: null,
      saveState: "idle",
      saveError: null,
    }),
  selectCard: (selectedCardId) => set({ selectedCardId }),
  createCard: ({ body = "", title, x, y }) =>
    set((state) => {
      if (!state.document) {
        return state;
      }
      const now = getNow();
      return produce(state, (draft) => {
        if (!draft.document) {
          return;
        }
        draft.document.cards.push({
          id: randomId("card"),
          canvasId: draft.document.canvas.id,
          title: title.trim(),
          body,
          tagNames: [],
          color: draft.nextCardColor,
          isLocked: false,
          x,
          y,
          childCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        draft.selectedCardId = draft.document.cards.at(-1)?.id ?? null;
        draft.saveState = "idle";
        draft.saveError = null;
      });
    }),
  updateCard: (cardId, updates) =>
    set((state) =>
      produce(state, (draft) => {
        const card = draft.document?.cards.find((item) => item.id === cardId);
        if (!card) {
          return;
        }
        Object.assign(card, updates, { updatedAt: getNow() });
        draft.saveState = "idle";
        draft.saveError = null;
      }),
    ),
  moveCard: (cardId, x, y) =>
    set((state) =>
      produce(state, (draft) => {
        const card = draft.document?.cards.find((item) => item.id === cardId);
        if (!card) {
          return;
        }
        card.x = x;
        card.y = y;
        card.updatedAt = getNow();
        draft.saveState = "idle";
        draft.saveError = null;
      }),
    ),
  setCanvasName: (name) =>
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document) {
          return;
        }
        draft.document.canvas.name = name.trim();
        draft.document.canvas.updatedAt = getNow();
        draft.saveState = "idle";
      }),
    ),
  setNextCardColor: (nextCardColor) => set({ nextCardColor }),
  setSaveState: (saveState, saveError = null) => set({ saveState, saveError }),
}));
