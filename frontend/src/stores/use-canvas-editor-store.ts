"use client";

import type { Attachment, CanvasDocument, Card, HierarchyLink, RelatedLink } from "@/lib/api/types";
import { type Patch, applyPatches, enablePatches, produce, produceWithPatches } from "immer";
import { create } from "zustand";

enablePatches();

type SaveState = "idle" | "saving" | "saved" | "error";
export type ActiveMode =
  | "idle"
  | "addHierarchyLink"
  | "addRelatedLink"
  | "deleteCard"
  | "toggleCardLock";

type HistoryEntry = {
  createdAt: string;
  inversePatches: Patch[];
  label: string;
  patches: Patch[];
};

type CanvasEditorState = {
  activeMode: ActiveMode;
  document: CanvasDocument | null;
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  lastSavedAt: string | null;
  nextCardColor: string;
  saveError: string | null;
  saveState: SaveState;
  selectedCardId: string | null;
  selectedCardIds: string[];
  addHierarchyLink: (parentCardId: string, childCardId: string) => boolean;
  addRelatedLink: (cardAId: string, cardBId: string) => boolean;
  appendAttachment: (attachment: Attachment) => void;
  applyCardLayout: (positions: Record<string, { x: number; y: number }>) => boolean;
  bulkDeleteCards: (cardIds: string[]) => void;
  duplicateCards: (
    cardIds: string[],
    options?: {
      offsetX?: number;
      offsetY?: number;
    },
  ) => string[];
  bulkSetColor: (cardIds: string[], color: string) => void;
  bulkToggleLock: (cardIds: string[], isLocked: boolean) => void;
  createCard: (input: { body?: string; title: string; x: number; y: number }) => string | null;
  loadDocument: (document: CanvasDocument) => void;
  markSaved: (savedAt?: string | null) => void;
  moveCard: (cardId: string, x: number, y: number) => void;
  redo: () => void;
  removeHierarchyLink: (linkId: string) => void;
  removeRelatedLink: (linkId: string) => void;
  removeAttachment: (attachmentId: string) => void;
  selectCard: (cardId: string | null) => void;
  setActiveMode: (mode: ActiveMode) => void;
  setCanvasName: (name: string) => void;
  setNextCardColor: (color: string) => void;
  setSaveState: (saveState: SaveState, saveError?: string | null) => void;
  setSelectedCardIds: (cardIds: string[]) => void;
  toggleCardLock: (cardId: string) => void;
  undo: () => void;
  updateCard: (cardId: string, updates: Partial<CanvasDocument["cards"][number]>) => void;
};

const HISTORY_LIMIT = 100;

function getNow() {
  return new Date().toISOString();
}

function randomUuid() {
  return crypto.randomUUID();
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

function buildDuplicateTitle(title: string) {
  if (!title.trim()) {
    return "無題のコピー";
  }
  return title.endsWith("のコピー") ? `${title} 2` : `${title}のコピー`;
}

function filterRelatedLinksByCardIds(links: RelatedLink[], cardIds: Set<string>) {
  return links.filter((link) => cardIds.has(link.cardAId) && cardIds.has(link.cardBId));
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

function sanitizeSelection(
  state: Pick<CanvasEditorState, "document" | "selectedCardId" | "selectedCardIds">,
) {
  const cardIds = new Set((state.document?.cards ?? []).map((card) => card.id));
  const selectedCardIds = state.selectedCardIds.filter((cardId) => cardIds.has(cardId));
  return {
    selectedCardId:
      selectedCardIds.length === 1 && state.selectedCardId && cardIds.has(state.selectedCardId)
        ? state.selectedCardId
        : selectedCardIds.length === 1
          ? selectedCardIds[0]
          : null,
    selectedCardIds,
  };
}

function pushHistory(history: HistoryEntry[], historyIndex: number, entry: HistoryEntry) {
  const nextHistory = history.slice(0, historyIndex + 1);
  nextHistory.push(entry);
  if (nextHistory.length <= HISTORY_LIMIT) {
    return {
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    };
  }
  return {
    history: nextHistory.slice(-HISTORY_LIMIT),
    historyIndex: HISTORY_LIMIT - 1,
  };
}

function areCardIdsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((cardId, index) => cardId === right[index]);
}

function normalizeSelectedCardIds(cardIds: string[]) {
  return Array.from(new Set(cardIds)).sort((left, right) => left.localeCompare(right));
}

export const useCanvasEditorStore = create<CanvasEditorState>((set, get) => {
  function updateDocument(
    label: string,
    recipe: (draft: CanvasDocument) => void,
    afterMutate?: (draft: CanvasEditorState) => void,
  ) {
    const state = get();
    if (!state.document) {
      return false;
    }

    const [nextDocument, patches, inversePatches] = produceWithPatches(state.document, recipe);
    if (patches.length === 0) {
      return false;
    }

    const nextHistoryState = pushHistory(state.history, state.historyIndex, {
      createdAt: getNow(),
      inversePatches,
      label,
      patches,
    });

    set(
      produce((draft: CanvasEditorState) => {
        draft.document = nextDocument;
        draft.history = nextHistoryState.history;
        draft.historyIndex = nextHistoryState.historyIndex;
        draft.isDirty = true;
        draft.saveState = "idle";
        draft.saveError = null;
        if (afterMutate) {
          afterMutate(draft);
        }
      }),
    );
    return true;
  }

  return {
    activeMode: "idle",
    document: null,
    history: [],
    historyIndex: -1,
    isDirty: false,
    lastSavedAt: null,
    nextCardColor: "#eed9b6",
    saveError: null,
    saveState: "idle",
    selectedCardId: null,
    selectedCardIds: [],
    addHierarchyLink: (parentCardId, childCardId) =>
      updateDocument("階層リンク追加", (draft) => {
        if (parentCardId === childCardId) {
          return;
        }
        const parent = draft.cards.find((card) => card.id === parentCardId);
        const child = draft.cards.find((card) => card.id === childCardId);
        if (!parent || !child || parent.isLocked || child.isLocked) {
          return;
        }
        const exists = draft.hierarchyLinks.some(
          (link) => link.parentCardId === parentCardId && link.childCardId === childCardId,
        );
        if (exists || createsHierarchyCycle(draft.hierarchyLinks, parentCardId, childCardId)) {
          return;
        }
        draft.hierarchyLinks.push({
          id: randomUuid(),
          canvasId: draft.canvas.id,
          parentCardId,
          childCardId,
          createdAt: getNow(),
        });
        recalculateChildCount(draft.cards, draft.hierarchyLinks);
      }),
    addRelatedLink: (cardAId, cardBId) =>
      updateDocument("通常リンク追加", (draft) => {
        if (cardAId === cardBId) {
          return;
        }
        const cardA = draft.cards.find((card) => card.id === cardAId);
        const cardB = draft.cards.find((card) => card.id === cardBId);
        if (!cardA || !cardB || cardA.isLocked || cardB.isLocked) {
          return;
        }
        const [left, right] = sortedPair(cardAId, cardBId);
        const exists = draft.relatedLinks.some(
          (link) => link.cardAId === left && link.cardBId === right,
        );
        if (exists) {
          return;
        }
        draft.relatedLinks.push({
          id: randomUuid(),
          canvasId: draft.canvas.id,
          cardAId: left,
          cardBId: right,
          createdAt: getNow(),
        });
      }),
    appendAttachment: (attachment) => {
      set(
        produce((draft: CanvasEditorState) => {
          if (!draft.document) {
            return;
          }
          draft.document.attachments.push(attachment);
        }),
      );
    },
    applyCardLayout: (positions) =>
      updateDocument("カード整列", (draft) => {
        let didChange = false;
        for (const card of draft.cards) {
          if (card.isLocked) {
            continue;
          }
          const nextPosition = positions[card.id];
          if (!nextPosition) {
            continue;
          }
          if (card.x === nextPosition.x && card.y === nextPosition.y) {
            continue;
          }
          card.x = nextPosition.x;
          card.y = nextPosition.y;
          didChange = true;
        }
        if (!didChange) {
          return;
        }
      }),
    bulkDeleteCards: (cardIds) => {
      updateDocument(
        "カード一括削除",
        (draft) => {
          const lockedIncluded = draft.cards.some(
            (card) => cardIds.includes(card.id) && card.isLocked,
          );
          if (lockedIncluded) {
            return;
          }
          draft.cards = draft.cards.filter((card) => !cardIds.includes(card.id));
          draft.hierarchyLinks = draft.hierarchyLinks.filter(
            (link) => !cardIds.includes(link.parentCardId) && !cardIds.includes(link.childCardId),
          );
          draft.relatedLinks = draft.relatedLinks.filter(
            (link) => !cardIds.includes(link.cardAId) && !cardIds.includes(link.cardBId),
          );
          recalculateChildCount(draft.cards, draft.hierarchyLinks);
        },
        (draft) => {
          draft.selectedCardId = null;
          draft.selectedCardIds = [];
        },
      );
    },
    duplicateCards: (cardIds, options) => {
      const duplicatedCardIds: string[] = [];
      const offsetX = options?.offsetX ?? 48;
      const offsetY = options?.offsetY ?? 48;

      const didDuplicate = updateDocument(
        "カード複製",
        (draft) => {
          const selectedSet = new Set(cardIds);
          const sourceCards = draft.cards.filter((card) => selectedSet.has(card.id));
          if (sourceCards.length === 0) {
            return;
          }

          const idMap = new Map<string, string>();
          const now = getNow();
          for (const sourceCard of sourceCards) {
            const duplicatedId = randomUuid();
            idMap.set(sourceCard.id, duplicatedId);
            duplicatedCardIds.push(duplicatedId);
            draft.cards.push({
              ...sourceCard,
              id: duplicatedId,
              title: buildDuplicateTitle(sourceCard.title),
              x: sourceCard.x + offsetX,
              y: sourceCard.y + offsetY,
              childCount: 0,
              createdAt: now,
              updatedAt: now,
            });
          }

          for (const link of draft.hierarchyLinks.filter(
            (item) => selectedSet.has(item.parentCardId) && selectedSet.has(item.childCardId),
          )) {
            draft.hierarchyLinks.push({
              ...link,
              id: randomUuid(),
              parentCardId: idMap.get(link.parentCardId) ?? link.parentCardId,
              childCardId: idMap.get(link.childCardId) ?? link.childCardId,
              createdAt: now,
            });
          }

          for (const link of filterRelatedLinksByCardIds(draft.relatedLinks, selectedSet)) {
            const cardAId = idMap.get(link.cardAId) ?? link.cardAId;
            const cardBId = idMap.get(link.cardBId) ?? link.cardBId;
            const [left, right] = sortedPair(cardAId, cardBId);
            draft.relatedLinks.push({
              ...link,
              id: randomUuid(),
              cardAId: left,
              cardBId: right,
              createdAt: now,
            });
          }

          recalculateChildCount(draft.cards, draft.hierarchyLinks);
        },
        (draft) => {
          draft.activeMode = "idle";
          draft.selectedCardId = duplicatedCardIds.length === 1 ? duplicatedCardIds[0] : null;
          draft.selectedCardIds = [...duplicatedCardIds];
        },
      );

      return didDuplicate ? duplicatedCardIds : [];
    },
    bulkSetColor: (cardIds, color) => {
      updateDocument("カード一括色変更", (draft) => {
        const lockedIncluded = draft.cards.some(
          (card) => cardIds.includes(card.id) && card.isLocked,
        );
        if (lockedIncluded) {
          return;
        }
        for (const card of draft.cards) {
          if (cardIds.includes(card.id)) {
            card.color = color;
            card.updatedAt = getNow();
          }
        }
      });
    },
    bulkToggleLock: (cardIds, isLocked) => {
      updateDocument("カード一括ロック切替", (draft) => {
        for (const card of draft.cards) {
          if (cardIds.includes(card.id)) {
            card.isLocked = isLocked;
            card.updatedAt = getNow();
          }
        }
      });
    },
    createCard: ({ body = "", title, x, y }) => {
      const cardId = randomUuid();
      const now = getNow();
      const didCreate = updateDocument("カード追加", (draft) => {
        draft.cards.push({
          id: cardId,
          canvasId: draft.canvas.id,
          title: title.trim(),
          body,
          tagNames: [],
          color: get().nextCardColor,
          isLocked: false,
          x,
          y,
          childCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      });
      if (!didCreate) {
        return null;
      }
      set({
        activeMode: "idle",
        selectedCardId: cardId,
        selectedCardIds: [cardId],
      });
      return cardId;
    },
    loadDocument: (document) =>
      set({
        activeMode: "idle",
        document,
        history: [],
        historyIndex: -1,
        isDirty: false,
        lastSavedAt: document.canvas.updatedAt,
        nextCardColor: "#eed9b6",
        saveError: null,
        saveState: "idle",
        selectedCardId: null,
        selectedCardIds: [],
      }),
    markSaved: (savedAt = getNow()) =>
      set({
        isDirty: false,
        lastSavedAt: savedAt,
        saveError: null,
        saveState: "saved",
      }),
    moveCard: (cardId, x, y) => {
      updateDocument("カード移動", (draft) => {
        const card = draft.cards.find((item) => item.id === cardId);
        if (!card || card.isLocked) {
          return;
        }
        card.x = x;
        card.y = y;
        card.updatedAt = getNow();
      });
    },
    redo: () => {
      const state = get();
      const entry = state.history[state.historyIndex + 1];
      if (!state.document || !entry) {
        return;
      }
      const nextDocument = applyPatches(state.document, entry.patches);
      set(
        produce((draft: CanvasEditorState) => {
          draft.document = nextDocument;
          draft.historyIndex += 1;
          draft.isDirty = true;
          draft.saveState = "idle";
          draft.saveError = null;
          Object.assign(draft, sanitizeSelection(draft));
        }),
      );
    },
    removeHierarchyLink: (linkId) => {
      updateDocument("階層リンク削除", (draft) => {
        draft.hierarchyLinks = draft.hierarchyLinks.filter((link) => link.id !== linkId);
        recalculateChildCount(draft.cards, draft.hierarchyLinks);
      });
    },
    removeRelatedLink: (linkId) => {
      updateDocument("通常リンク削除", (draft) => {
        draft.relatedLinks = draft.relatedLinks.filter((link) => link.id !== linkId);
      });
    },
    removeAttachment: (attachmentId) => {
      set(
        produce((draft: CanvasEditorState) => {
          if (!draft.document) {
            return;
          }
          draft.document.attachments = draft.document.attachments.filter(
            (attachment) => attachment.id !== attachmentId,
          );
        }),
      );
    },
    selectCard: (selectedCardId) => {
      const state = get();
      const nextSelectedCardIds = normalizeSelectedCardIds(selectedCardId ? [selectedCardId] : []);
      if (
        state.selectedCardId === selectedCardId &&
        areCardIdsEqual(state.selectedCardIds, nextSelectedCardIds)
      ) {
        return;
      }
      set({
        selectedCardId,
        selectedCardIds: nextSelectedCardIds,
      });
    },
    setActiveMode: (activeMode) => set({ activeMode }),
    setCanvasName: (name) => {
      updateDocument("キャンバス名変更", (draft) => {
        const nextName = name.trim();
        if (!nextName || draft.canvas.name === nextName) {
          return;
        }
        draft.canvas.name = nextName;
        draft.canvas.updatedAt = getNow();
      });
    },
    setNextCardColor: (nextCardColor) => set({ nextCardColor }),
    setSaveState: (saveState, saveError = null) => set({ saveError, saveState }),
    setSelectedCardIds: (selectedCardIds) => {
      const state = get();
      const normalizedSelectedCardIds = normalizeSelectedCardIds(selectedCardIds);
      const nextSelectedCardId =
        normalizedSelectedCardIds.length === 1 ? normalizedSelectedCardIds[0] : null;
      if (
        state.selectedCardId === nextSelectedCardId &&
        areCardIdsEqual(state.selectedCardIds, normalizedSelectedCardIds)
      ) {
        return;
      }
      set({
        selectedCardId: nextSelectedCardId,
        selectedCardIds: normalizedSelectedCardIds,
      });
    },
    toggleCardLock: (cardId) => {
      updateDocument("カードロック切替", (draft) => {
        const card = draft.cards.find((item) => item.id === cardId);
        if (!card) {
          return;
        }
        card.isLocked = !card.isLocked;
        card.updatedAt = getNow();
      });
    },
    undo: () => {
      const state = get();
      const entry = state.history[state.historyIndex];
      if (!state.document || !entry) {
        return;
      }
      const nextDocument = applyPatches(state.document, entry.inversePatches);
      set(
        produce((draft: CanvasEditorState) => {
          draft.document = nextDocument;
          draft.historyIndex -= 1;
          draft.isDirty = true;
          draft.saveState = "idle";
          draft.saveError = null;
          draft.activeMode = "idle";
          Object.assign(draft, sanitizeSelection(draft));
        }),
      );
    },
    updateCard: (cardId, updates) => {
      updateDocument("カード更新", (draft) => {
        const card = draft.cards.find((item) => item.id === cardId);
        if (!card || card.isLocked) {
          return;
        }
        Object.assign(card, updates, { updatedAt: getNow() });
      });
    },
  };
});
