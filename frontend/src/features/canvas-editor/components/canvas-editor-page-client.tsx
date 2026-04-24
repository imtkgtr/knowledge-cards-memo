"use client";

import {
  Background,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  type ReactFlowInstance,
  applyNodeChanges,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  clientClearCanvasThumbnail,
  clientDeleteAttachment,
  clientExportCanvas,
  clientGetAttachmentAccessUrl,
  clientSaveCanvasDocument,
  clientUploadAttachment,
  clientUploadCanvasThumbnail,
} from "@/lib/api/backend";
import type { CanvasDocument } from "@/lib/api/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useCanvasEditorStore } from "@/stores/use-canvas-editor-store";
import { toBlob } from "html-to-image";
import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { buildDagreLayout } from "../lib/apply-dagre-layout";
import { CardNode, type KnowledgeCardNode } from "./card-node";
import { CreateCardModal } from "./create-card-modal";
import { DuplicateCardWarningModal } from "./duplicate-card-warning-modal";

type CanvasEditorPageClientProps = {
  initialDocument: CanvasDocument;
};

type MiniMapSize = "small" | "medium" | "large";

const colorChoices = ["#eed9b6", "#cfe5e7", "#f4d8d8", "#dceac8", "#efe0ff"];
const panelResizeHitArea = 14;
const thumbnailAutoSyncIntervalMs = 60 * 1000;
const panelSizeLimits = {
  detailMax: 640,
  detailMin: 280,
  paletteMax: 520,
  paletteMin: 72,
} as const;
const miniMapDimensions: Record<MiniMapSize, { width: number; height: number }> = {
  small: { width: 144, height: 96 },
  medium: { width: 180, height: 120 },
  large: { width: 240, height: 160 },
};
const nodeTypes: NodeTypes = {
  knowledgeCard: CardNode,
};

function ToolGlyph({
  kind,
}: {
  kind:
    | "add"
    | "branch"
    | "lock"
    | "unlock"
    | "close"
    | "panel"
    | "delete"
    | "chevronLeft"
    | "chevronRight"
    | "chevronDown";
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  return (
    <svg aria-hidden="true" className="editor-toolIcon" viewBox="0 0 24 24">
      {kind === "add" ? (
        <>
          <path {...common} d="M12 5v14" />
          <path {...common} d="M5 12h14" />
        </>
      ) : null}
      {kind === "branch" ? (
        <>
          <path {...common} d="M7 6v12" />
          <path {...common} d="M7 12h10" />
          <circle {...common} cx="7" cy="6" r="2.5" />
          <circle {...common} cx="17" cy="12" r="2.5" />
          <circle {...common} cx="7" cy="18" r="2.5" />
        </>
      ) : null}
      {kind === "lock" ? (
        <>
          <rect {...common} height="9" rx="2" width="10" x="7" y="11" />
          <path {...common} d="M9 11V9a3 3 0 0 1 6 0v2" />
        </>
      ) : null}
      {kind === "unlock" ? (
        <>
          <rect {...common} height="9" rx="2" width="10" x="7" y="11" />
          <path {...common} d="M15 11V9a3 3 0 0 0-5.2-2" />
        </>
      ) : null}
      {kind === "close" ? (
        <>
          <path {...common} d="M6 6l12 12" />
          <path {...common} d="M18 6L6 18" />
        </>
      ) : null}
      {kind === "panel" ? (
        <>
          <rect {...common} height="14" rx="2" width="16" x="4" y="5" />
          <path {...common} d="M10 5v14" />
        </>
      ) : null}
      {kind === "delete" ? (
        <>
          <path {...common} d="M5 7h14" />
          <path {...common} d="M9 7V5h6v2" />
          <path {...common} d="M8 7l1 12h6l1-12" />
          <path {...common} d="M10 11v5" />
          <path {...common} d="M14 11v5" />
        </>
      ) : null}
      {kind === "chevronLeft" ? <path {...common} d="M14.5 6.5L8.5 12l6 5.5" /> : null}
      {kind === "chevronRight" ? <path {...common} d="M9.5 6.5l6 5.5-6 5.5" /> : null}
      {kind === "chevronDown" ? <path {...common} d="M6.5 9.5l5.5 6 5.5-6" /> : null}
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function findCardLabel(document: CanvasDocument | null, cardId: string) {
  return document?.cards.find((card) => card.id === cardId)?.title || cardId;
}

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeTags(values: string[]) {
  return Array.from(new Set(values.map(normalizeTag).filter(Boolean)));
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-") || "knowledge-canvas";
}

function parseTagInput(value: string) {
  return normalizeTags(
    value
      .replace(/[、，;\n]/g, ",")
      .split(",")
      .map((item) => item.trim().replace(/^#/, "")),
  );
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <span key={key}>{part}</span>;
  });
}

function renderMarkdownDocument(markdown: string) {
  if (!markdown.trim()) {
    return <p className="markdown-empty">本文はまだありません。</p>;
  }

  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push(
        <pre className="markdown-code" key={`code-${index}`}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const className = level === 1 ? "markdown-h1" : level === 2 ? "markdown-h2" : "markdown-h3";
      blocks.push(
        <div className={className} key={`heading-${index}`}>
          {renderInlineMarkdown(content, `heading-${index}`)}
        </div>,
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote className="markdown-quote" key={`quote-${index}`}>
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`quote-line-${index}-${quoteIndex}-${quoteLine}`}>
              {renderInlineMarkdown(quoteLine, `quote-${index}-${quoteIndex}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: { checked: boolean; text: string }[] = [];
      while (index < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[index])) {
        const itemLine = lines[index];
        items.push({
          checked: /^[-*]\s+\[[xX]\]\s+/.test(itemLine),
          text: itemLine.replace(/^[-*]\s+\[[ xX]\]\s+/, ""),
        });
        index += 1;
      }
      blocks.push(
        <ul className="markdown-checklist" key={`checklist-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`check-item-${index}-${itemIndex}-${item.text}`}>
              <input checked={item.checked} readOnly type="checkbox" />
              <span>{renderInlineMarkdown(item.text, `check-${index}-${itemIndex}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul className="markdown-list" key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`list-item-${index}-${itemIndex}-${item}`}>
              {renderInlineMarkdown(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol className="markdown-list" key={`ordered-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`ordered-item-${index}-${itemIndex}-${item}`}>
              {renderInlineMarkdown(item, `ordered-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^[-*]\s+\[[ xX]\]\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p className="markdown-paragraph" key={`paragraph-${index}`}>
        {renderInlineMarkdown(paragraphLines.join(" "), `paragraph-${index}`)}
      </p>,
    );
  }

  return <div className="markdown-body">{blocks}</div>;
}

export function CanvasEditorPageClient({ initialDocument }: CanvasEditorPageClientProps) {
  const supabase = createBrowserSupabaseClient();
  const [activeHighlightTag, setActiveHighlightTag] = useState<string | null>(null);
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [bodyDraft, setBodyDraft] = useState("");
  const [canvasNameDraft, setCanvasNameDraft] = useState(initialDocument.canvas.name);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialTitle, setCreateModalInitialTitle] = useState("");
  const [pendingDuplicateTitle, setPendingDuplicateTitle] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<string, string>>({});
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [isDetailHidden, setIsDetailHidden] = useState(false);
  const [isPaletteHidden, setIsPaletteHidden] = useState(false);
  const [isMiniMapHidden, setIsMiniMapHidden] = useState(false);
  const [miniMapSize, setMiniMapSize] = useState<MiniMapSize>("medium");
  const [paletteWidth, setPaletteWidth] = useState(240);
  const [paintColor, setPaintColor] = useState<string | null>(null);
  const [detailWidth, setDetailWidth] = useState(360);
  const [pendingLinkSourceId, setPendingLinkSourceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAttachmentPending, setIsAttachmentPending] = useState(false);
  const [isThumbnailPending, setIsThumbnailPending] = useState(false);
  const [tagInputDraft, setTagInputDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const copiedCardIdsRef = useRef<string[]>([]);
  const hasLoadedInitialDocumentRef = useRef(false);
  const hasFittedViewRef = useRef(false);
  const isDraggingNodeRef = useRef(false);
  const lastThumbnailSyncedAtRef = useRef(0);
  const latestDocumentRef = useRef<CanvasDocument | null>(initialDocument);
  const pendingSaveModeRef = useRef<"auto" | "manual" | null>(null);
  const saveInFlightRef = useRef(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    KnowledgeCardNode,
    Edge
  > | null>(null);
  const history = useCanvasEditorStore((state) => state.history);
  const historyIndex = useCanvasEditorStore((state) => state.historyIndex);
  const isDirty = useCanvasEditorStore((state) => state.isDirty);
  const lastSavedAt = useCanvasEditorStore((state) => state.lastSavedAt);
  const document = useCanvasEditorStore((state) => state.document);
  const selectedCardId = useCanvasEditorStore((state) => state.selectedCardId);
  const selectedCardIds = useCanvasEditorStore((state) => state.selectedCardIds);
  const nextCardColor = useCanvasEditorStore((state) => state.nextCardColor);
  const activeMode = useCanvasEditorStore((state) => state.activeMode);
  const saveState = useCanvasEditorStore((state) => state.saveState);
  const saveError = useCanvasEditorStore((state) => state.saveError);
  const loadDocument = useCanvasEditorStore((state) => state.loadDocument);
  const markSaved = useCanvasEditorStore((state) => state.markSaved);
  const selectCard = useCanvasEditorStore((state) => state.selectCard);
  const setSelectedCardIds = useCanvasEditorStore((state) => state.setSelectedCardIds);
  const createCard = useCanvasEditorStore((state) => state.createCard);
  const updateCard = useCanvasEditorStore((state) => state.updateCard);
  const moveCard = useCanvasEditorStore((state) => state.moveCard);
  const addHierarchyLink = useCanvasEditorStore((state) => state.addHierarchyLink);
  const appendAttachment = useCanvasEditorStore((state) => state.appendAttachment);
  const applyCardLayout = useCanvasEditorStore((state) => state.applyCardLayout);
  const removeHierarchyLink = useCanvasEditorStore((state) => state.removeHierarchyLink);
  const removeAttachment = useCanvasEditorStore((state) => state.removeAttachment);
  const toggleCardLock = useCanvasEditorStore((state) => state.toggleCardLock);
  const bulkSetColor = useCanvasEditorStore((state) => state.bulkSetColor);
  const bulkToggleLock = useCanvasEditorStore((state) => state.bulkToggleLock);
  const bulkDeleteCards = useCanvasEditorStore((state) => state.bulkDeleteCards);
  const duplicateCards = useCanvasEditorStore((state) => state.duplicateCards);
  const setCanvasName = useCanvasEditorStore((state) => state.setCanvasName);
  const setDuplicateWarningSuppressed = useCanvasEditorStore(
    (state) => state.setDuplicateWarningSuppressed,
  );
  const setNextCardColor = useCanvasEditorStore((state) => state.setNextCardColor);
  const setActiveMode = useCanvasEditorStore((state) => state.setActiveMode);
  const setSaveState = useCanvasEditorStore((state) => state.setSaveState);
  const undo = useCanvasEditorStore((state) => state.undo);
  const redo = useCanvasEditorStore((state) => state.redo);

  useEffect(() => {
    if (!hasLoadedInitialDocumentRef.current || document?.canvas.id !== initialDocument.canvas.id) {
      loadDocument(initialDocument);
      hasLoadedInitialDocumentRef.current = true;
    }
  }, [document?.canvas.id, initialDocument, loadDocument]);

  useEffect(() => {
    latestDocumentRef.current = document;
  }, [document]);

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set((document?.cards ?? []).flatMap((card) => card.tagNames.map((tag) => tag.trim()))),
      )
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "ja")),
    [document?.cards],
  );

  const visibleCards = useMemo(
    () =>
      activeFilterTag
        ? (document?.cards ?? []).filter((card) => card.tagNames.includes(activeFilterTag))
        : (document?.cards ?? []),
    [activeFilterTag, document?.cards],
  );
  const visibleCardIds = useMemo(
    () => new Set(visibleCards.map((card) => card.id)),
    [visibleCards],
  );
  const childCountByCardId = useMemo(() => {
    const countByCardId = new Map<string, number>();
    for (const card of document?.cards ?? []) {
      countByCardId.set(card.id, 0);
    }
    for (const link of document?.hierarchyLinks ?? []) {
      countByCardId.set(link.parentCardId, (countByCardId.get(link.parentCardId) ?? 0) + 1);
    }
    return countByCardId;
  }, [document?.cards, document?.hierarchyLinks]);

  const nodesFromDocument = useMemo<KnowledgeCardNode[]>(
    () =>
      visibleCards.map((card) => ({
        id: card.id,
        type: "knowledgeCard",
        position: { x: card.x, y: card.y },
        draggable: !card.isLocked,
        selectable: true,
        data: {
          title: card.title,
          color: card.color,
          isHighlighted: Boolean(activeHighlightTag && card.tagNames.includes(activeHighlightTag)),
          isDimmed: Boolean(activeHighlightTag && !card.tagNames.includes(activeHighlightTag)),
          isLocked: card.isLocked,
          childCount: childCountByCardId.get(card.id) ?? card.childCount,
          tagSummary: card.tagNames.slice(0, 2).join(", "),
        },
      })),
    [activeHighlightTag, childCountByCardId, visibleCards],
  );
  const [flowNodes, setFlowNodes] = useNodesState<KnowledgeCardNode>(nodesFromDocument);

  const edgesFromDocument = useMemo<Edge[]>(
    () =>
      (document?.hierarchyLinks ?? [])
        .filter(
          (link) => visibleCardIds.has(link.parentCardId) && visibleCardIds.has(link.childCardId),
        )
        .map((link) => ({
          id: link.id,
          source: link.parentCardId,
          target: link.childCardId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 },
          data: { kind: "hierarchy" },
        })) satisfies Edge[],
    [document?.hierarchyLinks, visibleCardIds],
  );

  const selectedCard = useMemo(
    () => document?.cards.find((card) => card.id === selectedCardId) ?? null,
    [document?.cards, selectedCardId],
  );

  const lockedSelected = useMemo(
    () =>
      (document?.cards ?? []).some((card) => selectedCardIds.includes(card.id) && card.isLocked),
    [document?.cards, selectedCardIds],
  );
  const isPaletteWide = paletteWidth >= 320;
  const canDeleteSelection = selectedCardIds.length > 0 && !lockedSelected;
  const searchResults = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) {
      return [];
    }
    return [...(document?.cards ?? [])]
      .filter((card) => {
        const title = normalizeSearchText(card.title);
        const body = normalizeSearchText(card.body);
        return title.includes(query) || body.includes(query);
      })
      .sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
      .slice(0, 10);
  }, [document?.cards, searchQuery]);
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;
  const currentMiniMapDimensions = miniMapDimensions[miniMapSize];
  const paletteStatusLabel =
    activeMode === "addHierarchyLink"
      ? pendingLinkSourceId
        ? `親: ${findCardLabel(document ?? null, pendingLinkSourceId)}`
        : "親カードを選択"
      : activeMode === "toggleCardLock"
        ? "ロック"
        : activeMode === "deleteCard"
          ? "削除"
          : activeMode === "paintColor" && paintColor
            ? "色を適用"
            : null;
  const saveStatusLabel =
    saveState === "saving"
      ? "自動保存中..."
      : isThumbnailPending
        ? "サムネイル更新中..."
        : isDirty
          ? "未保存の変更あり"
          : lastSavedAt
            ? `保存済み (${formatDate(lastSavedAt)})`
            : "-";
  const selectedAttachments = useMemo(
    () =>
      (document?.attachments ?? []).filter((attachment) => attachment.cardId === selectedCard?.id),
    [document?.attachments, selectedCard?.id],
  );

  useEffect(() => {
    setCanvasNameDraft(document?.canvas.name ?? "");
  }, [document?.canvas.name]);

  useEffect(() => {
    setTitleDraft(selectedCard?.title ?? "");
    setBodyDraft(selectedCard?.body ?? "");
    setTagInputDraft("");
  }, [selectedCard?.body, selectedCard?.title]);

  useEffect(() => {
    if (isDraggingNodeRef.current) {
      return;
    }
    setFlowNodes((currentNodes) => {
      const currentNodeById = new Map(currentNodes.map((node) => [node.id, node]));
      const nextNodes = nodesFromDocument.map((node) => {
        const currentNode = currentNodeById.get(node.id);
        if (!currentNode) {
          return node;
        }

        return {
          ...node,
          dragging: currentNode.dragging,
          position: currentNode.dragging ? currentNode.position : node.position,
          selected: currentNode.selected,
        };
      });

      const isSame =
        currentNodes.length === nextNodes.length &&
        currentNodes.every((node, index) => {
          const nextNode = nextNodes[index];
          return (
            nextNode &&
            node.id === nextNode.id &&
            node.position.x === nextNode.position.x &&
            node.position.y === nextNode.position.y &&
            node.dragging === nextNode.dragging &&
            node.selected === nextNode.selected &&
            node.data.title === nextNode.data.title &&
            node.data.color === nextNode.data.color &&
            node.data.isLocked === nextNode.data.isLocked &&
            node.data.isHighlighted === nextNode.data.isHighlighted &&
            node.data.isDimmed === nextNode.data.isDimmed &&
            node.data.childCount === nextNode.data.childCount &&
            node.data.tagSummary === nextNode.data.tagSummary
          );
        });

      return isSame ? currentNodes : nextNodes;
    });
  }, [nodesFromDocument, setFlowNodes]);

  useEffect(() => {
    if (activeFilterTag && !availableTags.includes(activeFilterTag)) {
      setActiveFilterTag(null);
    }
    if (activeHighlightTag && !availableTags.includes(activeHighlightTag)) {
      setActiveHighlightTag(null);
    }
  }, [activeFilterTag, activeHighlightTag, availableTags]);

  useEffect(() => {
    if (!activeFilterTag) {
      return;
    }

    const nextSelectedIds = selectedCardIds.filter((cardId) => visibleCardIds.has(cardId));
    if (nextSelectedIds.length !== selectedCardIds.length) {
      setSelectedCardIds(nextSelectedIds);
    }
    if (selectedCardId && !visibleCardIds.has(selectedCardId)) {
      selectCard(null);
    }
  }, [
    activeFilterTag,
    selectCard,
    selectedCardId,
    selectedCardIds,
    setSelectedCardIds,
    visibleCardIds,
  ]);

  useEffect(() => {
    if (!reactFlowInstance || !document) {
      return;
    }
    if (hasFittedViewRef.current) {
      return;
    }
    if (document.cards.length === 0) {
      return;
    }

    hasFittedViewRef.current = true;
    window.requestAnimationFrame(() => {
      reactFlowInstance.fitView({
        duration: 200,
        padding: 0.16,
      });
    });
  }, [document, reactFlowInstance]);

  const commitCanvasName = useEffectEvent((value: string) => {
    const currentName = document?.canvas.name ?? "";
    const nextName = value.trim();
    if (!nextName) {
      setCanvasNameDraft(currentName);
      return;
    }
    if (nextName !== currentName) {
      setCanvasName(nextName);
    }
  });

  const commitCardTitle = useEffectEvent((value: string) => {
    if (!selectedCard) {
      return;
    }
    const nextTitle = value.trim();
    if (!nextTitle) {
      setTitleDraft(selectedCard.title);
      return;
    }
    if (nextTitle !== selectedCard.title) {
      updateCard(selectedCard.id, { title: nextTitle });
    }
  });

  const commitCardBody = useEffectEvent((value: string) => {
    if (!selectedCard || value === selectedCard.body) {
      return;
    }
    updateCard(selectedCard.id, { body: value });
  });

  const commitCardTags = useEffectEvent((values: string[]) => {
    if (!selectedCard) {
      return;
    }
    const nextTags = normalizeTags(values);
    if (nextTags.join(",") === selectedCard.tagNames.join(",")) {
      return;
    }
    updateCard(selectedCard.id, { tagNames: nextTags });
  });

  useEffect(() => {
    if (!document) {
      return;
    }
    if (canvasNameDraft.trim() === document.canvas.name) {
      return;
    }
    const timeoutId = window.setTimeout(() => commitCanvasName(canvasNameDraft), 500);
    return () => window.clearTimeout(timeoutId);
  }, [canvasNameDraft, commitCanvasName, document]);

  useEffect(() => {
    if (!selectedCard || selectedCard.isLocked) {
      return;
    }
    if (titleDraft.trim() === selectedCard.title) {
      return;
    }
    const timeoutId = window.setTimeout(() => commitCardTitle(titleDraft), 500);
    return () => window.clearTimeout(timeoutId);
  }, [commitCardTitle, selectedCard, titleDraft]);

  useEffect(() => {
    if (!selectedCard || selectedCard.isLocked) {
      return;
    }
    if (bodyDraft === selectedCard.body) {
      return;
    }
    const timeoutId = window.setTimeout(() => commitCardBody(bodyDraft), 500);
    return () => window.clearTimeout(timeoutId);
  }, [bodyDraft, commitCardBody, selectedCard]);

  useEffect(() => {
    const imageAttachments = selectedAttachments.filter(
      (attachment) => attachment.kind === "image",
    );
    const missingPreviewAttachments = imageAttachments.filter(
      (attachment) => !attachmentPreviewUrls[attachment.id],
    );
    if (missingPreviewAttachments.length === 0) {
      return;
    }

    let isCancelled = false;
    void (async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      const nextEntries = await Promise.all(
        missingPreviewAttachments.map(async (attachment) => {
          try {
            const url = await clientGetAttachmentAccessUrl(accessToken, attachment.id);
            return [attachment.id, url] as const;
          } catch {
            return null;
          }
        }),
      );

      if (isCancelled) {
        return;
      }

      setAttachmentPreviewUrls((current) => {
        const updates = nextEntries.filter((entry): entry is readonly [string, string] =>
          Boolean(entry),
        );
        if (updates.length === 0) {
          return current;
        }
        return Object.fromEntries([...Object.entries(current), ...updates]);
      });
    })();

    return () => {
      isCancelled = true;
    };
  }, [attachmentPreviewUrls, selectedAttachments]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target;
      const isInputTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const modifierPressed = event.metaKey || event.ctrlKey;

      if (modifierPressed && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        setSaveMessage(null);
        return;
      }

      if (
        modifierPressed &&
        (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))
      ) {
        event.preventDefault();
        redo();
        setSaveMessage(null);
        return;
      }

      if (modifierPressed && event.key.toLowerCase() === "c" && selectedCardIds.length > 0) {
        event.preventDefault();
        copiedCardIdsRef.current = [...selectedCardIds];
        setInteractionMessage(`${selectedCardIds.length} 件のカードをコピーしました。`);
        return;
      }

      if (
        modifierPressed &&
        event.key.toLowerCase() === "v" &&
        copiedCardIdsRef.current.length > 0
      ) {
        event.preventDefault();
        const duplicatedIds = duplicateCards(copiedCardIdsRef.current);
        if (duplicatedIds.length > 0) {
          setInteractionMessage(`${duplicatedIds.length} 件のカードを貼り付けました。`);
        }
        return;
      }

      if (event.key === "Escape") {
        setActiveMode("idle");
        setInteractionMessage(null);
        return;
      }

      if (isInputTarget) {
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedCardIds.length > 0) {
        const hasLocked = (document?.cards ?? []).some(
          (card) => selectedCardIds.includes(card.id) && card.isLocked,
        );
        if (hasLocked) {
          return;
        }
        event.preventDefault();
        bulkDeleteCards(selectedCardIds);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    bulkDeleteCards,
    document?.cards,
    duplicateCards,
    redo,
    selectedCardIds,
    setActiveMode,
    undo,
  ]);

  useEffect(() => {
    if (!document || !isDirty || saveState === "saving" || isDraggingNodeRef.current) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void handleSave(true);
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [document, isDirty, saveState]);

  useEffect(() => {
    if (!isBodyExpanded) {
      return;
    }
    const animationFrameId = window.requestAnimationFrame(() => {
      bodyTextareaRef.current?.focus();
      bodyTextareaRef.current?.setSelectionRange(bodyDraft.length, bodyDraft.length);
    });
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [bodyDraft.length, isBodyExpanded]);

  function handleCreateCard(title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }
    const duplicateExists = (document?.cards ?? []).some(
      (card) => card.title.trim().localeCompare(nextTitle, "ja", { sensitivity: "base" }) === 0,
    );
    if (duplicateExists && !document?.canvas.duplicateWarningSuppressed) {
      setCreateModalInitialTitle(nextTitle);
      setIsCreateModalOpen(false);
      setPendingDuplicateTitle(nextTitle);
      return;
    }
    createCardAtCenter(nextTitle);
  }

  function createCardAtCenter(title: string) {
    const canvasBounds = canvasContainerRef.current?.getBoundingClientRect();
    const defaultPosition = {
      x: 160 + (document?.cards.length ?? 0) * 20,
      y: 120 + (document?.cards.length ?? 0) * 20,
    };
    const centerPosition =
      reactFlowInstance && canvasBounds
        ? reactFlowInstance.screenToFlowPosition({
            x: canvasBounds.left + canvasBounds.width / 2 - 120,
            y: canvasBounds.top + canvasBounds.height / 2 - 80,
          })
        : defaultPosition;

    const createdCardId = createCard({
      title,
      x: centerPosition.x,
      y: centerPosition.y,
    });
    setCreateModalInitialTitle("");
    setIsCreateModalOpen(false);
    setPendingDuplicateTitle(null);
    if (createdCardId) {
      setIsDetailHidden(false);
    }
    if (activeFilterTag) {
      setActiveFilterTag(null);
      setInteractionMessage("カードを追加しました。絞り込みは解除しています。");
      return;
    }
    setInteractionMessage(createdCardId ? "カードを追加しました。" : null);
  }

  function handleConfirmDuplicateCardCreation(suppressFutureWarnings: boolean) {
    if (suppressFutureWarnings) {
      setDuplicateWarningSuppressed(true);
    }
    if (!pendingDuplicateTitle) {
      return;
    }
    createCardAtCenter(pendingDuplicateTitle);
  }

  function handleCancelDuplicateCardCreation() {
    setPendingDuplicateTitle(null);
    setIsCreateModalOpen(true);
  }

  function handleDeleteSelection() {
    if (!canDeleteSelection) {
      return;
    }
    bulkDeleteCards(selectedCardIds);
    setInteractionMessage(`${selectedCardIds.length} 件のカードを削除しました。`);
  }

  function togglePaintColorMode(color: string) {
    setNextCardColor(color);

    if (selectedCardIds.length > 1) {
      bulkSetColor(selectedCardIds, color);
      setInteractionMessage(`${selectedCardIds.length} 件のカード色を変更しました。`);
    }

    if (activeMode === "paintColor" && paintColor === color) {
      setActiveMode("idle");
      setPaintColor(null);
      setInteractionMessage(null);
      return;
    }

    setPaintColor(color);
    setPendingLinkSourceId(null);
    setActiveMode("paintColor");
    setInteractionMessage("色モードです。カードをクリックすると色を適用します。");
  }

  function handleHighlightTagClick(tag: string | null) {
    setActiveHighlightTag((current) => {
      const nextTag = current === tag ? null : tag;
      if (nextTag) {
        setActiveFilterTag(null);
      }
      return nextTag;
    });
  }

  function handleFilterTagClick(tag: string | null) {
    setActiveFilterTag((current) => {
      const nextTag = current === tag ? null : tag;
      if (nextTag) {
        setActiveHighlightTag(null);
      }
      return nextTag;
    });
  }

  async function syncCanvasThumbnail(accessToken: string, isAutoSave: boolean) {
    if (!document || isThumbnailPending) {
      return;
    }

    if (isAutoSave && Date.now() - lastThumbnailSyncedAtRef.current < thumbnailAutoSyncIntervalMs) {
      return;
    }

    if (document.cards.length === 0) {
      try {
        await clientClearCanvasThumbnail(accessToken, document.canvas.id);
        lastThumbnailSyncedAtRef.current = Date.now();
      } catch (error) {
        setInteractionMessage(
          error instanceof Error ? error.message : "サムネイルの削除に失敗しました。",
        );
      }
      return;
    }

    const captureTarget = canvasContainerRef.current;
    if (!captureTarget) {
      return;
    }

    setIsThumbnailPending(true);
    try {
      const blob = await toBlob(captureTarget, {
        backgroundColor: "#f7f0df",
        cacheBust: true,
        pixelRatio: 1,
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            (node.classList.contains("react-flow__controls") ||
              node.classList.contains("react-flow__minimap") ||
              node.classList.contains("react-flow__attribution"))
          ),
      });
      if (!blob) {
        throw new Error("サムネイル画像を生成できませんでした。");
      }
      const file = new File([blob], "thumbnail.png", { type: "image/png" });
      await clientUploadCanvasThumbnail(accessToken, document.canvas.id, file);
      lastThumbnailSyncedAtRef.current = Date.now();
    } catch (error) {
      setInteractionMessage(
        error instanceof Error ? error.message : "サムネイルの更新に失敗しました。",
      );
    } finally {
      setIsThumbnailPending(false);
    }
  }

  const flushQueuedSave = useEffectEvent(async () => {
    if (!pendingSaveModeRef.current) {
      return;
    }

    const nextMode = pendingSaveModeRef.current;
    pendingSaveModeRef.current = null;
    await handleSave(nextMode === "auto");
  });

  async function runSave(documentToSave: CanvasDocument, isAutoSave: boolean) {
    if (!isAutoSave) {
      setSaveMessage(null);
    }
    saveInFlightRef.current = true;
    setSaveState("saving");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      saveInFlightRef.current = false;
      setSaveState("error", "セッションが切れています。再ログインしてください。");
      return;
    }

    await new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const saved = await clientSaveCanvasDocument(
            session.access_token,
            documentToSave.canvas.id,
            documentToSave,
          );
          markSaved(saved.canvas.updatedAt);
          void syncCanvasThumbnail(session.access_token, isAutoSave);
          if (!isAutoSave) {
            setSaveMessage("保存しました。");
          }
        } catch (error) {
          setSaveState("error", error instanceof Error ? error.message : "保存に失敗しました。");
        } finally {
          saveInFlightRef.current = false;
          resolve();
        }
      });
    });

    await flushQueuedSave();
  }

  async function handleSave(isAutoSave = false) {
    const documentToSave = latestDocumentRef.current;
    if (!documentToSave) {
      return;
    }
    const requestedMode = isAutoSave ? "auto" : "manual";
    if (saveInFlightRef.current) {
      pendingSaveModeRef.current =
        pendingSaveModeRef.current === "manual" || requestedMode === "manual" ? "manual" : "auto";
      return;
    }
    await runSave(documentToSave, isAutoSave);
  }

  function handleNodesChange(changes: NodeChange<KnowledgeCardNode>[]) {
    const relevantChanges = changes.filter(
      (change) =>
        change.type === "position" || change.type === "dimensions" || change.type === "select",
    );
    if (relevantChanges.length === 0) {
      return;
    }
    setFlowNodes((currentNodes) => applyNodeChanges(relevantChanges, currentNodes));
  }

  function handleNodeDragStart() {
    isDraggingNodeRef.current = true;
  }

  function handleNodeDragStop(nodeId: string, x: number, y: number) {
    isDraggingNodeRef.current = false;
    moveCard(nodeId, x, y);
    setFlowNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              dragging: false,
              position: { x, y },
            }
          : node,
      ),
    );
  }

  function handleAddTag(rawValue: string) {
    if (!selectedCard || selectedCard.isLocked) {
      return;
    }
    const nextTags = parseTagInput(rawValue);
    if (nextTags.length === 0) {
      setTagInputDraft("");
      return;
    }

    const mergedTags = normalizeTags([...selectedCard.tagNames, ...nextTags]);
    if (mergedTags.join(",") === selectedCard.tagNames.join(",")) {
      setTagInputDraft("");
      return;
    }
    commitCardTags(mergedTags);
    setTagInputDraft("");
  }

  function handleRemoveTag(tagName: string) {
    if (!selectedCard || selectedCard.isLocked) {
      return;
    }
    commitCardTags(selectedCard.tagNames.filter((tag) => tag !== tagName));
  }

  function handleTagInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      event.preventDefault();
      handleAddTag(tagInputDraft);
      return;
    }
    if (event.key === "Backspace" && !tagInputDraft && selectedCard?.tagNames.length) {
      event.preventDefault();
      handleRemoveTag(selectedCard.tagNames[selectedCard.tagNames.length - 1]);
    }
  }

  function toggleMode(mode: "addHierarchyLink") {
    if (activeMode === mode) {
      setActiveMode("idle");
      setPendingLinkSourceId(null);
      setPaintColor(null);
      setInteractionMessage(null);
      return;
    }

    setActiveMode(mode);
    setPaintColor(null);
    const nextSourceId =
      pendingLinkSourceId ?? (selectedCardIds.length === 1 ? selectedCardId : null);
    setPendingLinkSourceId(nextSourceId);
    setInteractionMessage(
      nextSourceId
        ? `起点「${findCardLabel(document ?? null, nextSourceId)}」を維持しました。接続先カードをクリックしてください。`
        : "起点カードをクリックしてください。",
    );
  }

  function toggleCardActionMode(mode: "deleteCard" | "toggleCardLock") {
    if (activeMode === mode) {
      setActiveMode("idle");
      setInteractionMessage(null);
      return;
    }

    setActiveMode(mode);
    setPendingLinkSourceId(null);
    setPaintColor(null);
    setInteractionMessage(
      mode === "deleteCard"
        ? "削除モードです。カードをクリックすると削除します。"
        : "ロックモードです。カードをクリックするとロック / 解除します。",
    );
  }

  function handleNodeClick(nodeId: string) {
    if (activeMode === "idle") {
      selectCard(nodeId);
      setInteractionMessage(null);
      return;
    }

    if (activeMode === "deleteCard") {
      const targetCard = document?.cards.find((card) => card.id === nodeId);
      if (!targetCard) {
        return;
      }
      if (targetCard.isLocked) {
        setInteractionMessage("ロック中のカードは削除できません。");
        return;
      }
      bulkDeleteCards([nodeId]);
      setInteractionMessage(`「${targetCard.title}」を削除しました。`);
      return;
    }

    if (activeMode === "paintColor") {
      const targetCard = document?.cards.find((card) => card.id === nodeId);
      if (!targetCard || !paintColor) {
        return;
      }
      if (targetCard.isLocked) {
        setInteractionMessage("ロック中のカードには色を適用できません。");
        return;
      }
      updateCard(nodeId, { color: paintColor });
      selectCard(nodeId);
      setInteractionMessage(`「${targetCard.title}」に色を適用しました。`);
      return;
    }

    if (activeMode === "toggleCardLock") {
      const targetCard = document?.cards.find((card) => card.id === nodeId);
      if (!targetCard) {
        return;
      }
      toggleCardLock(nodeId);
      selectCard(nodeId);
      setInteractionMessage(
        targetCard.isLocked
          ? `「${targetCard.title}」のロックを解除しました。`
          : `「${targetCard.title}」をロックしました。`,
      );
      return;
    }

    const sourceCardId = pendingLinkSourceId ?? selectedCardId;
    if (!sourceCardId) {
      selectCard(nodeId);
      setPendingLinkSourceId(nodeId);
      setInteractionMessage("起点カードを選択してから、対象カードをクリックしてください。");
      return;
    }

    if (sourceCardId === nodeId) {
      setInteractionMessage("起点カードです。接続先カードをクリックしてください。");
      return;
    }

    if (!pendingLinkSourceId) {
      selectCard(sourceCardId);
      setPendingLinkSourceId(sourceCardId);
    }

    if (activeMode !== "addHierarchyLink") {
      return;
    }

    const wasAdded = addHierarchyLink(sourceCardId, nodeId);
    setPendingLinkSourceId(sourceCardId);
    selectCard(sourceCardId);
    setInteractionMessage(
      wasAdded
        ? "階層リンクを追加しました。起点は維持しています。"
        : "階層リンクを追加できませんでした。重複、循環、ロック状態を確認してください。",
    );
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }
    if (connection.source === connection.target) {
      setInteractionMessage("同じカード同士は接続できません。");
      return;
    }

    selectCard(connection.source);
    setPendingLinkSourceId(connection.source);
    const wasAdded = addHierarchyLink(connection.source, connection.target);
    setPendingLinkSourceId(connection.source);
    setInteractionMessage(
      wasAdded
        ? "階層リンクを追加しました。起点は維持しています。"
        : "階層リンクを追加できませんでした。重複、循環、ロック状態を確認してください。",
    );
  }

  function handleSearchResultClick(cardId: string) {
    const card = document?.cards.find((item) => item.id === cardId);
    if (!card || !reactFlowInstance) {
      return;
    }
    reactFlowInstance.setCenter(card.x + 120, card.y + 80, {
      duration: 400,
      zoom: Math.max(reactFlowInstance.getZoom(), 0.95),
    });
    setSearchQuery("");
    setInteractionMessage(`「${card.title}」の位置へ移動しました。`);
  }

  function handleMiniMapClick(_: ReactMouseEvent, position: { x: number; y: number }) {
    if (!reactFlowInstance) {
      return;
    }
    reactFlowInstance.setCenter(position.x, position.y, {
      duration: 260,
      zoom: reactFlowInstance.getZoom(),
    });
    setInteractionMessage("ミニマップの位置へ移動しました。");
  }

  function handleMiniMapNodeClick(_: ReactMouseEvent, node: KnowledgeCardNode) {
    if (!reactFlowInstance || !document) {
      return;
    }
    const card = document.cards.find((item) => item.id === node.id);
    if (!card) {
      return;
    }
    selectCard(card.id);
    reactFlowInstance.setCenter(card.x + 120, card.y + 80, {
      duration: 260,
      zoom: Math.max(reactFlowInstance.getZoom(), 0.95),
    });
    setInteractionMessage(`「${card.title}」へ移動しました。`);
  }

  function adjustMiniMapSize(direction: "smaller" | "larger") {
    setMiniMapSize((current) => {
      if (direction === "smaller") {
        if (current === "large") {
          return "medium";
        }
        if (current === "medium") {
          return "small";
        }
        return "small";
      }
      if (current === "small") {
        return "medium";
      }
      if (current === "medium") {
        return "large";
      }
      return "large";
    });
  }

  function handleAutoLayout() {
    if (!document || document.cards.length === 0) {
      return;
    }

    const positions = buildDagreLayout(document, {
      anchorCardId: selectedCardId,
    });
    const changed = applyCardLayout(positions);
    setInteractionMessage(
      changed
        ? "カードを自動整列しました。選択中カードまたは親カードの位置を基準に保っています。"
        : "整列対象のカード位置に変更はありませんでした。",
    );
  }

  function handleSelectionAutoLayout() {
    if (!document || selectedCardIds.length === 0) {
      return;
    }

    const positions = buildDagreLayout(document, {
      anchorCardId: selectedCardIds[0],
    });
    const changed = applyCardLayout(positions);
    setInteractionMessage(
      changed
        ? "選択中カードを基準に全体整列しました。"
        : "整列対象のカード位置に変更はありませんでした。",
    );
  }

  async function handleExport() {
    const accessToken = await getAccessToken();
    if (!accessToken || !document) {
      setInteractionMessage("セッションが切れています。再ログインしてください。");
      return;
    }

    setSaveMessage(null);
    try {
      const payload = await clientExportCanvas(accessToken, document.canvas.id);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFileName(canvasNameDraft || document.canvas.name)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setInteractionMessage("JSON を書き出しました。添付ファイルは含まれません。");
    } catch (error) {
      setInteractionMessage(
        error instanceof Error ? error.message : "JSON の書き出しに失敗しました。",
      );
    }
  }

  function handleBodyEditComplete(value: string) {
    if (selectedCard && value === selectedCard.body) {
      return;
    }
    commitCardBody(value);
  }

  function startPanelResize(target: "palette" | "detail", clientX: number) {
    const startX = clientX;
    const startWidth = target === "palette" ? paletteWidth : detailWidth;

    function handlePointerMove(event: PointerEvent) {
      const deltaX = event.clientX - startX;
      if (target === "palette") {
        setPaletteWidth(
          Math.min(
            panelSizeLimits.paletteMax,
            Math.max(panelSizeLimits.paletteMin, startWidth + deltaX),
          ),
        );
        return;
      }
      setDetailWidth(
        Math.min(
          panelSizeLimits.detailMax,
          Math.max(panelSizeLimits.detailMin, startWidth - deltaX),
        ),
      );
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePanelEdgePointerDown(
    target: "palette" | "detail",
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const isResizeHit =
      target === "palette"
        ? bounds.right - event.clientX <= panelResizeHitArea
        : event.clientX - bounds.left <= panelResizeHitArea;
    if (!isResizeHit) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    startPanelResize(target, event.clientX);
  }

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleAttachmentFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !document || !selectedCard) {
      return;
    }

    if (isDirty) {
      await handleSave();
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setInteractionMessage("セッションが切れています。再ログインしてください。");
      return;
    }

    setIsAttachmentPending(true);
    try {
      const attachment = await clientUploadAttachment(
        accessToken,
        document.canvas.id,
        selectedCard.id,
        file,
      );
      appendAttachment(attachment);
      setInteractionMessage(`添付「${attachment.fileName}」を追加しました。`);
    } catch (error) {
      setInteractionMessage(
        error instanceof Error ? error.message : "添付ファイルの追加に失敗しました。",
      );
    } finally {
      setIsAttachmentPending(false);
    }
  }

  async function handleAttachmentOpen(attachmentId: string) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setInteractionMessage("セッションが切れています。再ログインしてください。");
      return;
    }
    try {
      const url = await clientGetAttachmentAccessUrl(accessToken, attachmentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setInteractionMessage(
        error instanceof Error ? error.message : "添付ファイル URL の取得に失敗しました。",
      );
    }
  }

  async function handleAttachmentDelete(attachmentId: string) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setInteractionMessage("セッションが切れています。再ログインしてください。");
      return;
    }
    setIsAttachmentPending(true);
    try {
      await clientDeleteAttachment(accessToken, attachmentId);
      removeAttachment(attachmentId);
      setAttachmentPreviewUrls((current) => {
        if (!current[attachmentId]) {
          return current;
        }
        const next = { ...current };
        delete next[attachmentId];
        return next;
      });
      setInteractionMessage("添付ファイルを削除しました。");
    } catch (error) {
      setInteractionMessage(
        error instanceof Error ? error.message : "添付ファイルの削除に失敗しました。",
      );
    } finally {
      setIsAttachmentPending(false);
    }
  }

  function renderBodySection(expanded = false) {
    const canEditBody = Boolean(selectedCard && !selectedCard.isLocked);
    const shouldShowEditor = expanded;
    const shouldShowPreview = !expanded;

    return (
      <section
        className={expanded ? "detail-markdown detail-markdown--expanded" : "detail-markdown"}
      >
        <div className="detail-markdown__header">
          <div>
            <h3>本文</h3>
          </div>
          <div className="detail-markdown__actions">
            {expanded ? (
              <>
                <button
                  className="button button--ghost"
                  onClick={() => setIsBodyExpanded(false)}
                  type="button"
                >
                  閉じる
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="detail-markdown__workspace">
          {shouldShowEditor ? (
            <label className="field">
              <span className="sr-only">本文編集</span>
              <textarea
                aria-label="本文編集"
                className="textarea textarea--page"
                disabled={!canEditBody}
                onBlur={(event) => handleBodyEditComplete(event.target.value)}
                onChange={(event) => setBodyDraft(event.target.value)}
                placeholder="本文を書く"
                ref={bodyTextareaRef}
                value={bodyDraft}
              />
            </label>
          ) : null}
          {shouldShowPreview ? (
            <button
              className="detail-markdown__previewButton"
              onClick={() => {
                setIsBodyExpanded(true);
              }}
              type="button"
            >
              <div className="detail-markdown__preview">
                <div
                  className={
                    expanded ? "markdown-surface markdown-surface--page" : "markdown-surface"
                  }
                >
                  {renderMarkdownDocument(bodyDraft)}
                </div>
              </div>
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <div>
          <p className="eyebrow">Knowledge Canvas</p>
          <input
            className="editor-topbar__title"
            onBlur={(event) => commitCanvasName(event.target.value)}
            onChange={(event) => setCanvasNameDraft(event.target.value)}
            value={canvasNameDraft}
          />
          <p className="muted">
            {document?.cards.length ?? 0} cards / {saveStatusLabel}
          </p>
          {availableTags.length > 0 ? (
            <div className="editor-topbar__filters">
              <div className="editor-topbar__filterGroup">
                <span>強調</span>
                <div className="tag-chip-list">
                  <button
                    className={!activeHighlightTag ? "tag-chip tag-chip--active" : "tag-chip"}
                    onClick={() => handleHighlightTagClick(null)}
                    type="button"
                  >
                    なし
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      className={
                        activeHighlightTag === tag ? "tag-chip tag-chip--active" : "tag-chip"
                      }
                      key={`highlight-${tag}`}
                      onClick={() => handleHighlightTagClick(tag)}
                      type="button"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="editor-topbar__filterGroup">
                <span>絞り込み</span>
                <div className="tag-chip-list">
                  <button
                    className={!activeFilterTag ? "tag-chip tag-chip--active" : "tag-chip"}
                    onClick={() => handleFilterTagClick(null)}
                    type="button"
                  >
                    すべて
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      className={activeFilterTag === tag ? "tag-chip tag-chip--active" : "tag-chip"}
                      key={`filter-${tag}`}
                      onClick={() => handleFilterTagClick(tag)}
                      type="button"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="editor-topbar__side">
          <div className="editor-topbar__searchRow">
            <div className="search-panel">
              <input
                className="input search-panel__input"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="検索"
                value={searchQuery}
              />
              {searchQuery.trim() ? (
                <div className="search-panel__results">
                  {searchResults.length > 0 ? (
                    searchResults.map((card) => (
                      <button
                        className="search-result"
                        key={card.id}
                        onClick={() => handleSearchResultClick(card.id)}
                        type="button"
                      >
                        <strong>{card.title}</strong>
                        <span>{card.body.slice(0, 80) || "本文なし"}</span>
                      </button>
                    ))
                  ) : (
                    <p className="muted search-panel__empty">一致するカードはありません。</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="editor-topbar__actions">
            <button
              className="button button--ghost"
              disabled={!canUndo}
              onClick={undo}
              type="button"
            >
              Undo
            </button>
            <button
              className="button button--ghost"
              disabled={!canRedo}
              onClick={redo}
              type="button"
            >
              Redo
            </button>
            <button
              className={isCreateModalOpen ? "button button--accent" : "button button--ghost"}
              onClick={() => {
                setCreateModalInitialTitle("");
                setIsCreateModalOpen(true);
              }}
              type="button"
            >
              カードを追加
            </button>
            <button className="button button--ghost" onClick={handleAutoLayout} type="button">
              整列
            </button>
            <button
              className="button button--ghost"
              onClick={() => void handleExport()}
              type="button"
            >
              書き出し
            </button>
            <button
              className={isDetailHidden ? "button button--accent" : "button button--ghost"}
              onClick={() => setIsDetailHidden((current) => !current)}
              type="button"
            >
              {isDetailHidden ? "詳細を表示" : "詳細を隠す"}
            </button>
            <button
              className="button button--accent"
              onClick={() => {
                void handleSave();
              }}
              type="button"
            >
              {isPending || saveState === "saving" ? "保存中..." : "保存"}
            </button>
            <Link className="button button--ghost" href="/canvases">
              一覧へ戻る
            </Link>
          </div>
        </div>
      </header>

      {selectedCardIds.length > 1 ? (
        <section className="selection-toolbar">
          <p className="muted">複数選択: {selectedCardIds.length} 件</p>
          <div className="selection-toolbar__actions">
            {colorChoices.map((color) => (
              <button
                aria-label={`一括色 ${color}`}
                className="color-chip"
                disabled={lockedSelected}
                key={color}
                onClick={() => bulkSetColor(selectedCardIds, color)}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
            <button
              className="button button--ghost"
              disabled={lockedSelected}
              onClick={handleSelectionAutoLayout}
              type="button"
            >
              選択を基準に整列
            </button>
            <button
              className="button button--ghost"
              disabled={lockedSelected}
              onClick={() => bulkToggleLock(selectedCardIds, true)}
              type="button"
            >
              一括ロック
            </button>
            <button
              className="button button--ghost"
              onClick={() => bulkToggleLock(selectedCardIds, false)}
              type="button"
            >
              一括解除
            </button>
            <button
              className="button button--ghost"
              disabled={lockedSelected}
              onClick={() => bulkDeleteCards(selectedCardIds)}
              type="button"
            >
              一括削除
            </button>
          </div>
        </section>
      ) : null}

      {saveMessage ? <p className="notice notice--success">{saveMessage}</p> : null}
      {saveError ? <p className="notice notice--error">{saveError}</p> : null}
      {interactionMessage ? <p className="notice notice--success">{interactionMessage}</p> : null}

      <section
        className="editor-layout"
        style={{
          gridTemplateColumns: isDetailHidden
            ? "minmax(0, 1fr)"
            : `minmax(0, 1fr) ${detailWidth}px`,
        }}
      >
        <div className="editor-canvas" ref={canvasContainerRef}>
          {!isPaletteHidden ? (
            <aside
              className={
                isPaletteWide
                  ? "editor-palette editor-palette--floating editor-palette--wide"
                  : "editor-palette editor-palette--floating"
              }
              onPointerDown={(event) => handlePanelEdgePointerDown("palette", event)}
              style={{ width: paletteWidth }}
            >
              <div className="editor-palette__floatingMain">
                <div className="editor-palette__floatingActions">
                  <button
                    aria-label="カードを追加"
                    className={
                      isCreateModalOpen
                        ? "editor-toolButton editor-toolButton--active"
                        : "editor-toolButton"
                    }
                    onClick={() => {
                      setCreateModalInitialTitle("");
                      setIsCreateModalOpen(true);
                    }}
                    title="カードを追加"
                    type="button"
                  >
                    <ToolGlyph kind="add" />
                  </button>
                  <button
                    aria-label="階層リンク"
                    className={
                      activeMode === "addHierarchyLink"
                        ? "editor-toolButton editor-toolButton--active"
                        : "editor-toolButton"
                    }
                    onClick={() => toggleMode("addHierarchyLink")}
                    title="階層リンク"
                    type="button"
                  >
                    <ToolGlyph kind="branch" />
                  </button>
                  <div className="editor-palette__floatingColors">
                    {colorChoices.map((color) => (
                      <button
                        aria-label={`色モード ${color}`}
                        className={
                          activeMode === "paintColor" && paintColor === color
                            ? "color-chip color-chip--active color-chip--painting"
                            : nextCardColor === color
                              ? "color-chip color-chip--active"
                              : "color-chip"
                        }
                        key={color}
                        onClick={() => togglePaintColorMode(color)}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                  <button
                    aria-label="ロックモード"
                    className={
                      activeMode === "toggleCardLock"
                        ? "editor-toolButton editor-toolButton--active"
                        : "editor-toolButton"
                    }
                    onClick={() => toggleCardActionMode("toggleCardLock")}
                    title="ロックモード"
                    type="button"
                  >
                    <ToolGlyph kind="lock" />
                  </button>
                  <button
                    aria-label="削除モード"
                    className={
                      activeMode === "deleteCard"
                        ? "editor-toolButton editor-toolButton--active editor-toolButton--danger"
                        : "editor-toolButton editor-toolButton--danger"
                    }
                    onClick={() => toggleCardActionMode("deleteCard")}
                    title="削除モード"
                    type="button"
                  >
                    <ToolGlyph kind="delete" />
                  </button>
                </div>
              </div>
              {paletteStatusLabel ? (
                <output className="editor-palette__status">{paletteStatusLabel}</output>
              ) : null}
              <button
                aria-label="ツールを隠す"
                className="editor-palette__collapse"
                onClick={() => setIsPaletteHidden(true)}
                title="ツールを隠す"
                type="button"
              >
                <ToolGlyph kind="chevronLeft" />
              </button>
            </aside>
          ) : (
            <button
              aria-label="ツールを表示"
              className="editor-panelToggle editor-panelToggle--palette"
              onClick={() => setIsPaletteHidden(false)}
              title="ツールを表示"
              type="button"
            >
              <ToolGlyph kind={isPaletteWide ? "chevronDown" : "chevronRight"} />
            </button>
          )}
          <ReactFlow<KnowledgeCardNode, Edge>
            edges={edgesFromDocument}
            multiSelectionKeyCode={["Meta", "Control", "Shift"]}
            nodeTypes={nodeTypes}
            nodes={flowNodes}
            onInit={setReactFlowInstance}
            onEdgeClick={(_, edge) => removeHierarchyLink(edge.id)}
            onConnect={handleConnect}
            onNodeClick={(_, node) => handleNodeClick(node.id)}
            onNodeDragStart={() => handleNodeDragStart()}
            onNodesChange={handleNodesChange}
            onNodeDragStop={(_, node) =>
              handleNodeDragStop(node.id, node.position.x, node.position.y)
            }
            onPaneClick={() => {
              selectCard(null);
              if (activeMode === "idle") {
                setInteractionMessage(null);
                return;
              }
              if (activeMode === "addHierarchyLink") {
                setInteractionMessage(
                  "リンクモードを維持しています。起点または接続先を選択してください。",
                );
                return;
              }
              if (activeMode === "paintColor") {
                setInteractionMessage("色モードです。カードをクリックすると色を適用します。");
                return;
              }
              if (activeMode === "toggleCardLock") {
                setInteractionMessage(
                  "ロックモードです。カードをクリックするとロック / 解除します。",
                );
                return;
              }
              if (activeMode === "deleteCard") {
                setInteractionMessage("削除モードです。カードをクリックすると削除します。");
              }
            }}
            selectionKeyCode={["Meta", "Control", "Shift"]}
          >
            <Background gap={20} size={1} />
            <Controls />
            {isMiniMapHidden ? (
              <div className="editor-minimapDock">
                <button
                  aria-label="ミニマップを表示"
                  className="editor-minimapToggle"
                  onClick={() => setIsMiniMapHidden(false)}
                  type="button"
                >
                  地図
                </button>
              </div>
            ) : (
              <div className="editor-minimapDock">
                <div className="editor-minimapTools">
                  <button
                    aria-label="ミニマップを小さくする"
                    className="editor-minimapTool"
                    disabled={miniMapSize === "small"}
                    onClick={() => adjustMiniMapSize("smaller")}
                    type="button"
                  >
                    -
                  </button>
                  <button
                    aria-label="ミニマップを大きくする"
                    className="editor-minimapTool"
                    disabled={miniMapSize === "large"}
                    onClick={() => adjustMiniMapSize("larger")}
                    type="button"
                  >
                    +
                  </button>
                  <button
                    aria-label="ミニマップを隠す"
                    className="editor-minimapTool"
                    onClick={() => setIsMiniMapHidden(true)}
                    type="button"
                  >
                    隠す
                  </button>
                </div>
                <MiniMap
                  ariaLabel="キャンバス全体マップ"
                  className="editor-minimap"
                  maskColor="rgba(31, 26, 19, 0.08)"
                  nodeBorderRadius={8}
                  nodeStrokeWidth={2}
                  onClick={handleMiniMapClick}
                  onNodeClick={handleMiniMapNodeClick}
                  pannable
                  position="bottom-right"
                  style={currentMiniMapDimensions}
                  zoomable
                />
              </div>
            )}
          </ReactFlow>
        </div>

        {!isDetailHidden ? (
          <aside
            className="editor-detail"
            onPointerDown={(event) => handlePanelEdgePointerDown("detail", event)}
          >
            {selectedCard ? (
              <div className="detail-panel">
                <div className="detail-panel__header">
                  <h2>カード</h2>
                  <button
                    aria-label="詳細を隠す"
                    className="button button--ghost"
                    onClick={() => setIsDetailHidden(true)}
                    type="button"
                  >
                    隠す
                  </button>
                </div>
                <label className="field">
                  <span>タイトル</span>
                  <input
                    className="input"
                    disabled={selectedCard.isLocked}
                    onBlur={(event) => commitCardTitle(event.target.value)}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    value={titleDraft}
                  />
                </label>
                {renderBodySection()}
                <section className="detail-tags">
                  <div className="detail-tags__header">
                    <h3>タグ</h3>
                  </div>
                  <div className="detail-tags__list">
                    {selectedCard.tagNames.map((tag) => (
                      <button
                        className="tag-chip tag-chip--filled"
                        disabled={selectedCard.isLocked}
                        key={tag}
                        onClick={() => handleRemoveTag(tag)}
                        type="button"
                      >
                        #{tag} ×
                      </button>
                    ))}
                    {!selectedCard.tagNames.length ? <p className="muted">なし</p> : null}
                  </div>
                  <input
                    className="input"
                    disabled={selectedCard.isLocked}
                    onBlur={() => handleAddTag(tagInputDraft)}
                    onChange={(event) => setTagInputDraft(event.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="例: 設計, backend"
                    value={tagInputDraft}
                  />
                  <div className="tag-chip-list">
                    {availableTags
                      .filter((tag) => !selectedCard.tagNames.includes(tag))
                      .map((tag) => (
                        <button
                          className="tag-chip"
                          key={`suggestion-${tag}`}
                          onClick={() => handleAddTag(tag)}
                          type="button"
                        >
                          + #{tag}
                        </button>
                      ))}
                  </div>
                </section>
                <div className="field">
                  <span>色</span>
                  <div className="detail-swatchList">
                    {colorChoices.map((color) => (
                      <button
                        aria-label={`カード色 ${color}`}
                        className={
                          selectedCard.color === color
                            ? "color-chip color-chip--active"
                            : "color-chip"
                        }
                        disabled={selectedCard.isLocked}
                        key={color}
                        onClick={() => updateCard(selectedCard.id, { color })}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
                <section className="detail-links">
                  <h3>階層リンク</h3>
                  {document?.hierarchyLinks.filter(
                    (link) =>
                      link.parentCardId === selectedCard.id || link.childCardId === selectedCard.id,
                  ).length ? (
                    <ul>
                      {document?.hierarchyLinks
                        .filter(
                          (link) =>
                            link.parentCardId === selectedCard.id ||
                            link.childCardId === selectedCard.id,
                        )
                        .map((link) => (
                          <li key={link.id}>
                            <span>
                              {link.parentCardId === selectedCard.id ? "下位へ" : "上位から"}{" "}
                              {findCardLabel(
                                document ?? null,
                                link.parentCardId === selectedCard.id
                                  ? link.childCardId
                                  : link.parentCardId,
                              )}
                            </span>
                            <button
                              className="button button--ghost"
                              disabled={selectedCard.isLocked}
                              onClick={() => removeHierarchyLink(link.id)}
                              type="button"
                            >
                              削除
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="muted">なし</p>
                  )}
                </section>
                <section className="detail-links">
                  <h3>添付</h3>
                  <label className="detail-attachmentDropzone">
                    <strong>{isAttachmentPending ? "添付中..." : "添付"}</strong>
                    <span>画像 / PDF / TXT</span>
                    <input
                      accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,.txt"
                      className="detail-attachmentInput"
                      disabled={selectedCard.isLocked || isAttachmentPending}
                      onChange={handleAttachmentFileChange}
                      type="file"
                    />
                  </label>
                  {selectedAttachments.length ? (
                    <ul>
                      {selectedAttachments.map((attachment) => (
                        <li
                          className={
                            attachment.kind === "image"
                              ? "detail-attachment detail-attachment--image"
                              : undefined
                          }
                          key={attachment.id}
                        >
                          <div className="detail-attachment__body">
                            <span>
                              [{attachment.kind}] {attachment.fileName}
                            </span>
                            {attachment.kind === "image" ? (
                              attachmentPreviewUrls[attachment.id] ? (
                                <img
                                  alt={attachment.fileName}
                                  className="detail-attachment__preview"
                                  src={attachmentPreviewUrls[attachment.id]}
                                />
                              ) : (
                                <p className="muted">読み込み中</p>
                              )
                            ) : null}
                          </div>
                          <div className="detail-links__actions">
                            <button
                              className="button button--ghost"
                              onClick={() => handleAttachmentOpen(attachment.id)}
                              type="button"
                            >
                              開く
                            </button>
                            <button
                              className="button button--ghost"
                              disabled={selectedCard.isLocked || isAttachmentPending}
                              onClick={() => handleAttachmentDelete(attachment.id)}
                              type="button"
                            >
                              削除
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">なし</p>
                  )}
                </section>
              </div>
            ) : selectedCardIds.length > 1 ? (
              <div className="detail-panel detail-panel--empty">
                <div className="detail-panel__header">
                  <h2>複数選択</h2>
                  <button
                    aria-label="詳細を隠す"
                    className="button button--ghost"
                    onClick={() => setIsDetailHidden(true)}
                    type="button"
                  >
                    隠す
                  </button>
                </div>
              </div>
            ) : (
              <div className="detail-panel detail-panel--empty">
                <div className="detail-panel__header">
                  <h2>未選択</h2>
                  <button
                    aria-label="詳細を隠す"
                    className="button button--ghost"
                    onClick={() => setIsDetailHidden(true)}
                    type="button"
                  >
                    隠す
                  </button>
                </div>
              </div>
            )}
          </aside>
        ) : null}
      </section>

      {selectedCard && isBodyExpanded ? (
        <div
          className="overlay overlay--page"
          onClick={() => setIsBodyExpanded(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setIsBodyExpanded(false);
            }
          }}
          role="presentation"
        >
          <dialog
            aria-modal="true"
            className="modal modal--page"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            open
          >
            {renderBodySection(true)}
          </dialog>
        </div>
      ) : null}

      <CreateCardModal
        initialTitle={createModalInitialTitle}
        onCancel={() => {
          setCreateModalInitialTitle("");
          setIsCreateModalOpen(false);
        }}
        onConfirm={handleCreateCard}
        open={isCreateModalOpen}
      />
      <DuplicateCardWarningModal
        onCancel={handleCancelDuplicateCardCreation}
        onConfirm={handleConfirmDuplicateCardCreation}
        open={Boolean(pendingDuplicateTitle)}
        title={pendingDuplicateTitle ?? ""}
      />
    </main>
  );
}
