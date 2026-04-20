"use client";

import type { CanvasDocument, Card, HierarchyLink } from "@/lib/api/types";
import { produce } from "immer";
import { create } from "zustand";

type SaveState = "idle" | "saving" | "saved" | "error";
export type ActiveMode = "idle" | "addHierarchyLink" | "addRelatedLink";

type CanvasEditorState = {
  document: CanvasDocument | null;
  selectedCardId: string | null;
  selectedCardIds: string[];
  nextCardColor: string;
  activeMode: ActiveMode;
  saveState: SaveState;
  saveError: string | null;
  loadDocument: (document: CanvasDocument) => void;
  selectCard: (cardId: string | null) => void;
  setSelectedCardIds: (cardIds: string[]) => void;
  createCard: (input: { body?: string; title: string; x: number; y: number }) => void;
  updateCard: (cardId: string, updates: Partial<CanvasDocument["cards"][number]>) => void;
  moveCard: (cardId: string, x: number, y: number) => void;
  addHierarchyLink: (parentCardId: string, childCardId: string) => boolean;
  addRelatedLink: (cardAId: string, cardBId: string) => boolean;
  removeHierarchyLink: (linkId: string) => void;
  removeRelatedLink: (linkId: string) => void;
  toggleCardLock: (cardId: string) => void;
  bulkSetColor: (cardIds: string[], color: string) => void;
  bulkToggleLock: (cardIds: string[], isLocked: boolean) => void;
  bulkDeleteCards: (cardIds: string[]) => void;
  setCanvasName: (name: string) => void;
  setNextCardColor: (color: string) => void;
  setActiveMode: (mode: ActiveMode) => void;
  setSaveState: (saveState: SaveState, saveError?: string | null) => void;
};

function getNow() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sortedPair(left: string, right: string) {
  return left < right ? [left, right] : [right, left];
}

function recalculateChildCount(cards: Card[], links: HierarchyLink[]) {
  const childCountByCard = new Map<string, number>();
  for (const card of cards) {
    childCountByCard.set(card.id, 0);
  }
  for (const link of links) {
    childCountByCard.set(link.parentCardId, (childCountByCard.get(link.parentCardId) ?? 0) + 1);
  }
  for (const card of cards) {
    card.childCount = childCountByCard.get(card.id) ?? 0;
  }
}

function createsHierarchyCycle(links: HierarchyLink[], parentCardId: string, childCardId: string) {
  const graph = new Map<string, string[]>();
  for (const link of links) {
    graph.set(link.parentCardId, [...(graph.get(link.parentCardId) ?? []), link.childCardId]);
  }
  graph.set(parentCardId, [...(graph.get(parentCardId) ?? []), childCardId]);

  const queue = [childCardId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    if (current === parentCardId) {
      return true;
    }
    visited.add(current);
    queue.push(...(graph.get(current) ?? []));
  }
  return false;
}

export const useCanvasEditorStore = create<CanvasEditorState>((set) => ({
  document: null,
  selectedCardId: null,
  selectedCardIds: [],
  nextCardColor: "#eed9b6",
  activeMode: "idle",
  saveState: "idle",
  saveError: null,
  loadDocument: (document) =>
    set({
      document,
      selectedCardId: null,
      selectedCardIds: [],
      nextCardColor: "#eed9b6",
      activeMode: "idle",
      saveState: "idle",
      saveError: null,
    }),
  selectCard: (selectedCardId) =>
    set({
      selectedCardId,
      selectedCardIds: selectedCardId ? [selectedCardId] : [],
    }),
  setSelectedCardIds: (selectedCardIds) =>
    set({
      selectedCardIds,
      selectedCardId: selectedCardIds.length === 1 ? selectedCardIds[0] : null,
    }),
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
        draft.selectedCardIds = draft.selectedCardId ? [draft.selectedCardId] : [];
        draft.activeMode = "idle";
        draft.saveState = "idle";
        draft.saveError = null;
      });
    }),
  updateCard: (cardId, updates) =>
    set((state) =>
      produce(state, (draft) => {
        const card = draft.document?.cards.find((item) => item.id === cardId);
        if (!card || card.isLocked) {
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
        if (!card || card.isLocked) {
          return;
        }
        card.x = x;
        card.y = y;
        card.updatedAt = getNow();
        draft.saveState = "idle";
        draft.saveError = null;
      }),
    ),
  addHierarchyLink: (parentCardId, childCardId) => {
    let wasAdded = false;
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document || parentCardId === childCardId) {
          return;
        }
        const parent = draft.document.cards.find((card) => card.id === parentCardId);
        const child = draft.document.cards.find((card) => card.id === childCardId);
        if (!parent || !child || parent.isLocked || child.isLocked) {
          return;
        }
        const exists = draft.document.hierarchyLinks.some(
          (link) => link.parentCardId === parentCardId && link.childCardId === childCardId,
        );
        if (
          exists ||
          createsHierarchyCycle(draft.document.hierarchyLinks, parentCardId, childCardId)
        ) {
          return;
        }
        draft.document.hierarchyLinks.push({
          id: randomId("hierarchy"),
          canvasId: draft.document.canvas.id,
          parentCardId,
          childCardId,
          createdAt: getNow(),
        });
        recalculateChildCount(draft.document.cards, draft.document.hierarchyLinks);
        draft.activeMode = "idle";
        draft.saveState = "idle";
        draft.saveError = null;
        wasAdded = true;
      }),
    );
    return wasAdded;
  },
  addRelatedLink: (cardAId, cardBId) => {
    let wasAdded = false;
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document || cardAId === cardBId) {
          return;
        }
        const cardA = draft.document.cards.find((card) => card.id === cardAId);
        const cardB = draft.document.cards.find((card) => card.id === cardBId);
        if (!cardA || !cardB || cardA.isLocked || cardB.isLocked) {
          return;
        }
        const [left, right] = sortedPair(cardAId, cardBId);
        const exists = draft.document.relatedLinks.some(
          (link) => link.cardAId === left && link.cardBId === right,
        );
        if (exists) {
          return;
        }
        draft.document.relatedLinks.push({
          id: randomId("related"),
          canvasId: draft.document.canvas.id,
          cardAId: left,
          cardBId: right,
          createdAt: getNow(),
        });
        draft.activeMode = "idle";
        draft.saveState = "idle";
        draft.saveError = null;
        wasAdded = true;
      }),
    );
    return wasAdded;
  },
  removeHierarchyLink: (linkId) =>
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document) {
          return;
        }
        draft.document.hierarchyLinks = draft.document.hierarchyLinks.filter(
          (link) => link.id !== linkId,
        );
        recalculateChildCount(draft.document.cards, draft.document.hierarchyLinks);
        draft.saveState = "idle";
        draft.saveError = null;
      }),
    ),
  removeRelatedLink: (linkId) =>
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document) {
          return;
        }
        draft.document.relatedLinks = draft.document.relatedLinks.filter(
          (link) => link.id !== linkId,
        );
        draft.saveState = "idle";
        draft.saveError = null;
      }),
    ),
  toggleCardLock: (cardId) =>
    set((state) =>
      produce(state, (draft) => {
        const card = draft.document?.cards.find((item) => item.id === cardId);
        if (!card) {
          return;
        }
        card.isLocked = !card.isLocked;
        card.updatedAt = getNow();
        draft.saveState = "idle";
        draft.saveError = null;
      }),
    ),
  bulkSetColor: (cardIds, color) =>
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document) {
          return;
        }
        const lockedIncluded = draft.document.cards.some(
          (card) => cardIds.includes(card.id) && card.isLocked,
        );
        if (lockedIncluded) {
          return;
        }
        for (const card of draft.document.cards) {
          if (cardIds.includes(card.id)) {
            card.color = color;
            card.updatedAt = getNow();
          }
        }
        draft.saveState = "idle";
      }),
    ),
  bulkToggleLock: (cardIds, isLocked) =>
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document) {
          return;
        }
        for (const card of draft.document.cards) {
          if (cardIds.includes(card.id)) {
            card.isLocked = isLocked;
            card.updatedAt = getNow();
          }
        }
        draft.saveState = "idle";
      }),
    ),
  bulkDeleteCards: (cardIds) =>
    set((state) =>
      produce(state, (draft) => {
        if (!draft.document) {
          return;
        }
        const lockedIncluded = draft.document.cards.some(
          (card) => cardIds.includes(card.id) && card.isLocked,
        );
        if (lockedIncluded) {
          return;
        }
        draft.document.cards = draft.document.cards.filter((card) => !cardIds.includes(card.id));
        draft.document.hierarchyLinks = draft.document.hierarchyLinks.filter(
          (link) => !cardIds.includes(link.parentCardId) && !cardIds.includes(link.childCardId),
        );
        draft.document.relatedLinks = draft.document.relatedLinks.filter(
          (link) => !cardIds.includes(link.cardAId) && !cardIds.includes(link.cardBId),
        );
        recalculateChildCount(draft.document.cards, draft.document.hierarchyLinks);
        draft.selectedCardId = null;
        draft.selectedCardIds = [];
        draft.saveState = "idle";
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
  setActiveMode: (activeMode) => set({ activeMode }),
  setSaveState: (saveState, saveError = null) => set({ saveState, saveError }),
}));
