"use client";

import {
  Background,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  clientClearCanvasThumbnail,
  clientDeleteAttachment,
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
  type ReactNode,
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

type CanvasEditorPageClientProps = {
  initialDocument: CanvasDocument;
};

const colorChoices = ["#eed9b6", "#cfe5e7", "#f4d8d8", "#dceac8", "#efe0ff"];
const thumbnailAutoSyncIntervalMs = 60 * 1000;
const panelSizeLimits = {
  detailMax: 360,
  detailMin: 180,
  paletteMax: 260,
  paletteMin: 120,
} as const;
const nodeTypes: NodeTypes = {
  knowledgeCard: CardNode,
};

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

function normalizeTags(values: string[]) {
  return Array.from(new Set(values.map(normalizeTag).filter(Boolean)));
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
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<string, string>>({});
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [paletteWidth, setPaletteWidth] = useState(160);
  const [detailWidth, setDetailWidth] = useState(260);
  const [pendingLinkSourceId, setPendingLinkSourceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAttachmentPending, setIsAttachmentPending] = useState(false);
  const [isThumbnailPending, setIsThumbnailPending] = useState(false);
  const [tagInputDraft, setTagInputDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const copiedCardIdsRef = useRef<string[]>([]);
  const hasLoadedInitialDocumentRef = useRef(false);
  const lastThumbnailSyncedAtRef = useRef(0);
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
  const addRelatedLink = useCanvasEditorStore((state) => state.addRelatedLink);
  const appendAttachment = useCanvasEditorStore((state) => state.appendAttachment);
  const applyCardLayout = useCanvasEditorStore((state) => state.applyCardLayout);
  const removeHierarchyLink = useCanvasEditorStore((state) => state.removeHierarchyLink);
  const removeRelatedLink = useCanvasEditorStore((state) => state.removeRelatedLink);
  const removeAttachment = useCanvasEditorStore((state) => state.removeAttachment);
  const toggleCardLock = useCanvasEditorStore((state) => state.toggleCardLock);
  const bulkSetColor = useCanvasEditorStore((state) => state.bulkSetColor);
  const bulkToggleLock = useCanvasEditorStore((state) => state.bulkToggleLock);
  const bulkDeleteCards = useCanvasEditorStore((state) => state.bulkDeleteCards);
  const duplicateCards = useCanvasEditorStore((state) => state.duplicateCards);
  const setCanvasName = useCanvasEditorStore((state) => state.setCanvasName);
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

  const nodesFromDocument = useMemo<KnowledgeCardNode[]>(
    () =>
      visibleCards.map((card) => ({
        id: card.id,
        type: "knowledgeCard",
        position: { x: card.x, y: card.y },
        draggable: !card.isLocked,
        selected: selectedCardIds.includes(card.id),
        selectable: true,
        data: {
          title: card.title,
          color: card.color,
          isHighlighted: Boolean(activeHighlightTag && card.tagNames.includes(activeHighlightTag)),
          isDimmed: Boolean(activeHighlightTag && !card.tagNames.includes(activeHighlightTag)),
          isLocked: card.isLocked,
          childCount: card.childCount,
          tagSummary: card.tagNames.slice(0, 2).join(", "),
        },
      })),
    [activeHighlightTag, selectedCardIds, visibleCards],
  );

  const edgesFromDocument = useMemo<Edge[]>(
    () => [
      ...((document?.hierarchyLinks ?? [])
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
        })) satisfies Edge[]),
      ...((document?.relatedLinks ?? [])
        .filter((link) => visibleCardIds.has(link.cardAId) && visibleCardIds.has(link.cardBId))
        .map((link) => ({
          id: link.id,
          source: link.cardAId,
          target: link.cardBId,
          type: "smoothstep",
          style: { strokeDasharray: "6 4", strokeWidth: 2 },
          data: { kind: "related" },
        })) satisfies Edge[]),
    ],
    [document?.hierarchyLinks, document?.relatedLinks, visibleCardIds],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesFromDocument);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesFromDocument);

  useEffect(() => {
    setNodes(nodesFromDocument);
  }, [nodesFromDocument, setNodes]);

  useEffect(() => {
    setEdges(edgesFromDocument);
  }, [edgesFromDocument, setEdges]);

  const selectedCard = useMemo(
    () => document?.cards.find((card) => card.id === selectedCardId) ?? null,
    [document?.cards, selectedCardId],
  );

  const lockedSelected = useMemo(
    () =>
      (document?.cards ?? []).some((card) => selectedCardIds.includes(card.id) && card.isLocked),
    [document?.cards, selectedCardIds],
  );
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }
    return [...(document?.cards ?? [])]
      .filter((card) => {
        const title = card.title.toLowerCase();
        const body = card.body.toLowerCase();
        return title.includes(query) || body.includes(query);
      })
      .sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
      .slice(0, 10);
  }, [document?.cards, searchQuery]);
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;
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
    if (!document || !isDirty || saveState === "saving") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void handleSave(true);
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [document, isDirty, saveState]);

  function handleCreateCard(title: string) {
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
    setIsCreateModalOpen(false);
    if (activeFilterTag) {
      setActiveFilterTag(null);
      setInteractionMessage("カードを追加しました。絞り込みは解除しています。");
      return;
    }
    setInteractionMessage(createdCardId ? "カードを追加しました。" : null);
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

  async function handleSave(isAutoSave = false) {
    if (!document) {
      return;
    }
    if (!isAutoSave) {
      setSaveMessage(null);
    }
    setSaveState("saving");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setSaveState("error", "セッションが切れています。再ログインしてください。");
      return;
    }

    startTransition(async () => {
      try {
        const saved = await clientSaveCanvasDocument(
          session.access_token,
          document.canvas.id,
          document,
        );
        markSaved(saved.canvas.updatedAt);
        void syncCanvasThumbnail(session.access_token, isAutoSave);
        if (!isAutoSave) {
          setSaveMessage("保存しました。");
        }
      } catch (error) {
        setSaveState("error", error instanceof Error ? error.message : "保存に失敗しました。");
      }
    });
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

  function toggleMode(mode: "addHierarchyLink" | "addRelatedLink") {
    if (activeMode === mode) {
      setActiveMode("idle");
      setPendingLinkSourceId(null);
      setInteractionMessage(null);
      return;
    }

    setActiveMode(mode);
    const nextSourceId =
      pendingLinkSourceId ?? (selectedCardIds.length === 1 ? selectedCardId : null);
    setPendingLinkSourceId(nextSourceId);
    setInteractionMessage(
      nextSourceId
        ? `起点「${findCardLabel(document ?? null, nextSourceId)}」を維持しました。接続先カードをクリックしてください。`
        : "起点カードをクリックしてください。",
    );
  }

  function handleNodeClick(nodeId: string) {
    if (activeMode === "idle") {
      selectCard(nodeId);
      setInteractionMessage(null);
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

    if (activeMode === "addHierarchyLink") {
      const wasAdded = addHierarchyLink(sourceCardId, nodeId);
      setPendingLinkSourceId(sourceCardId);
      selectCard(sourceCardId);
      setInteractionMessage(
        wasAdded
          ? "階層リンクを追加しました。起点は維持しています。"
          : "階層リンクを追加できませんでした。重複、循環、ロック状態を確認してください。",
      );
      return;
    }

    const wasAdded = addRelatedLink(sourceCardId, nodeId);
    setPendingLinkSourceId(sourceCardId);
    selectCard(sourceCardId);
    setInteractionMessage(
      wasAdded
        ? "通常リンクを追加しました。起点は維持しています。"
        : "通常リンクを追加できませんでした。重複またはロック状態を確認してください。",
    );
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }
    if (activeMode === "idle") {
      setInteractionMessage("左上でリンク種別を選んでから、カードの端子をドラッグしてください。");
      return;
    }
    if (connection.source === connection.target) {
      setInteractionMessage("同じカード同士は接続できません。");
      return;
    }

    selectCard(connection.source);
    setPendingLinkSourceId(connection.source);
    const wasAdded =
      activeMode === "addHierarchyLink"
        ? addHierarchyLink(connection.source, connection.target)
        : addRelatedLink(connection.source, connection.target);
    setPendingLinkSourceId(connection.source);
    setInteractionMessage(
      wasAdded
        ? activeMode === "addHierarchyLink"
          ? "階層リンクを追加しました。起点は維持しています。"
          : "通常リンクを追加しました。起点は維持しています。"
        : activeMode === "addHierarchyLink"
          ? "階層リンクを追加できませんでした。重複、循環、ロック状態を確認してください。"
          : "通常リンクを追加できませんでした。重複またはロック状態を確認してください。",
    );
  }

  function handleSelectionChange(ids: string[]) {
    const nextSelectedIds = Array.from(new Set(ids)).sort((left, right) =>
      left.localeCompare(right),
    );
    setSelectedCardIds(nextSelectedIds);
    if (nextSelectedIds.length <= 1) {
      setInteractionMessage(null);
    }
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

  function nudgePanelWidth(target: "palette" | "detail", delta: number) {
    if (target === "palette") {
      setPaletteWidth((current) =>
        Math.min(panelSizeLimits.paletteMax, Math.max(panelSizeLimits.paletteMin, current + delta)),
      );
      return;
    }
    setDetailWidth((current) =>
      Math.min(panelSizeLimits.detailMax, Math.max(panelSizeLimits.detailMin, current + delta)),
    );
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

    return (
      <section
        className={expanded ? "detail-markdown detail-markdown--expanded" : "detail-markdown"}
      >
        <div className="detail-markdown__header">
          <div>
            <h3>本文</h3>
            <p className="muted">
              プレーンテキストでそのまま書けます。必要なら Markdown 記法も文字として残せます。
            </p>
          </div>
          <div className="detail-markdown__actions">
            <button
              className="button button--ghost"
              onClick={() => setIsBodyExpanded((current) => !current)}
              type="button"
            >
              {expanded ? "ページ表示を閉じる" : "ページで開く"}
            </button>
          </div>
        </div>
        <div className="detail-markdown__workspace">
          <label className="field">
            <span>{expanded ? "本文ページ編集" : "本文編集"}</span>
            <textarea
              className={expanded ? "textarea textarea--page" : "textarea"}
              disabled={!canEditBody}
              onBlur={(event) => commitCardBody(event.target.value)}
              onChange={(event) => setBodyDraft(event.target.value)}
              placeholder={
                expanded
                  ? "ここに本文を書いてください。必要なら Markdown 記法もそのまま使えます。"
                  : "ここに本文を書いてください"
              }
              ref={bodyTextareaRef}
              value={bodyDraft}
            />
          </label>
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
            カード数: {document?.cards.length ?? 0} / 保存状態: {saveStatusLabel}
          </p>
        </div>
        <div className="editor-topbar__actions">
          <div className="search-panel">
            <input
              className="input search-panel__input"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="タイトル・本文を検索"
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
          <button className="button button--ghost" disabled={!canUndo} onClick={undo} type="button">
            Undo
          </button>
          <button className="button button--ghost" disabled={!canRedo} onClick={redo} type="button">
            Redo
          </button>
          <button
            className="button button--accent"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            カード追加
          </button>
          <button className="button button--ghost" onClick={handleAutoLayout} type="button">
            整列
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
          gridTemplateColumns: `${paletteWidth}px minmax(0, 1fr) ${detailWidth}px`,
        }}
      >
        <aside className="editor-palette">
          <button
            className="button button--accent"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            カード追加
          </button>
          <button
            className={
              activeMode === "addHierarchyLink" ? "button button--accent" : "button button--ghost"
            }
            onClick={() => toggleMode("addHierarchyLink")}
            type="button"
          >
            階層リンク追加
          </button>
          <button
            className={
              activeMode === "addRelatedLink" ? "button button--accent" : "button button--ghost"
            }
            onClick={() => toggleMode("addRelatedLink")}
            type="button"
          >
            通常リンク追加
          </button>
          {activeMode !== "idle" ? (
            <>
              <p className="muted">
                起点:{" "}
                {pendingLinkSourceId
                  ? findCardLabel(document ?? null, pendingLinkSourceId)
                  : "未選択"}
              </p>
              <p className="muted">カード上下の端子から線を引いて接続できます。</p>
            </>
          ) : null}
          <button
            className="button button--ghost"
            disabled={!selectedCardId}
            onClick={() => selectedCardId && toggleCardLock(selectedCardId)}
            type="button"
          >
            {selectedCard?.isLocked ? "ロック解除" : "ロック"}
          </button>
          <div className="editor-palette__colors">
            {colorChoices.map((color) => (
              <button
                aria-label={`色 ${color}`}
                className={nextCardColor === color ? "color-chip color-chip--active" : "color-chip"}
                key={color}
                onClick={() =>
                  selectedCardIds.length > 1
                    ? bulkSetColor(selectedCardIds, color)
                    : setNextCardColor(color)
                }
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>
          <div className="editor-palette__section">
            <p className="muted">タグ強調</p>
            <div className="tag-chip-list">
              <button
                className={!activeHighlightTag ? "tag-chip tag-chip--active" : "tag-chip"}
                onClick={() => setActiveHighlightTag(null)}
                type="button"
              >
                なし
              </button>
              {availableTags.map((tag) => (
                <button
                  className={activeHighlightTag === tag ? "tag-chip tag-chip--active" : "tag-chip"}
                  key={`highlight-${tag}`}
                  onClick={() => setActiveHighlightTag((current) => (current === tag ? null : tag))}
                  type="button"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
          <div className="editor-palette__section">
            <p className="muted">タグ絞り込み</p>
            <div className="tag-chip-list">
              <button
                className={!activeFilterTag ? "tag-chip tag-chip--active" : "tag-chip"}
                onClick={() => setActiveFilterTag(null)}
                type="button"
              >
                すべて
              </button>
              {availableTags.map((tag) => (
                <button
                  className={activeFilterTag === tag ? "tag-chip tag-chip--active" : "tag-chip"}
                  key={`filter-${tag}`}
                  onClick={() => setActiveFilterTag((current) => (current === tag ? null : tag))}
                  type="button"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
          <div
            aria-label="左パネルの幅を変更"
            className="editor-resizer editor-resizer--palette"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                nudgePanelWidth("palette", -16);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                nudgePanelWidth("palette", 16);
              }
            }}
            onPointerDown={(event) => startPanelResize("palette", event.clientX)}
            role="separator"
            tabIndex={0}
          />
        </aside>

        <div className="editor-canvas" ref={canvasContainerRef}>
          <ReactFlow<KnowledgeCardNode, Edge>
            edges={edges}
            fitView
            multiSelectionKeyCode={["Meta", "Control", "Shift"]}
            nodeTypes={nodeTypes}
            nodes={nodes}
            onInit={setReactFlowInstance}
            onEdgeClick={(_, edge) => {
              if (edge.data?.kind === "hierarchy") {
                removeHierarchyLink(edge.id);
                return;
              }
              removeRelatedLink(edge.id);
            }}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => handleNodeClick(node.id)}
            onNodeDragStop={(_, node) => moveCard(node.id, node.position.x, node.position.y)}
            onNodesChange={onNodesChange}
            onPaneClick={() => {
              selectCard(null);
              setActiveMode("idle");
              setInteractionMessage(null);
            }}
            onSelectionChange={({ nodes: currentNodes }) =>
              handleSelectionChange(currentNodes.map((node) => node.id))
            }
            selectionKeyCode={["Meta", "Control", "Shift"]}
          >
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <aside className="editor-detail">
          {selectedCard ? (
            <div className="detail-panel">
              <h2>カード詳細</h2>
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
                  <p className="muted">Enter / Tab / カンマ区切りで複数追加できます。</p>
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
                  {!selectedCard.tagNames.length ? (
                    <p className="muted">タグはありません。</p>
                  ) : null}
                </div>
                <input
                  className="input"
                  disabled={selectedCard.isLocked}
                  onBlur={() => handleAddTag(tagInputDraft)}
                  onChange={(event) => setTagInputDraft(event.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="例: 設計, backend, 要確認"
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
                <div className="editor-palette__colors">
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
                  <p className="muted">リンクはありません。</p>
                )}
              </section>
              <section className="detail-links">
                <h3>通常リンク</h3>
                {document?.relatedLinks.filter(
                  (link) => link.cardAId === selectedCard.id || link.cardBId === selectedCard.id,
                ).length ? (
                  <ul>
                    {document?.relatedLinks
                      .filter(
                        (link) =>
                          link.cardAId === selectedCard.id || link.cardBId === selectedCard.id,
                      )
                      .map((link) => (
                        <li key={link.id}>
                          <span>
                            {findCardLabel(
                              document ?? null,
                              link.cardAId === selectedCard.id ? link.cardBId : link.cardAId,
                            )}
                          </span>
                          <button
                            className="button button--ghost"
                            disabled={selectedCard.isLocked}
                            onClick={() => removeRelatedLink(link.id)}
                            type="button"
                          >
                            削除
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="muted">リンクはありません。</p>
                )}
              </section>
              <section className="detail-links">
                <h3>添付</h3>
                <input
                  accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,.txt"
                  className="sr-only"
                  disabled={selectedCard.isLocked || isAttachmentPending}
                  onChange={handleAttachmentFileChange}
                  ref={attachmentInputRef}
                  type="file"
                />
                <button
                  className="button button--ghost"
                  disabled={selectedCard.isLocked || isAttachmentPending}
                  onClick={() => attachmentInputRef.current?.click()}
                  type="button"
                >
                  {isAttachmentPending ? "添付中..." : "添付追加"}
                </button>
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
                              <p className="muted">プレビューを読み込み中です。</p>
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
                  <p className="muted">添付はありません。</p>
                )}
              </section>
            </div>
          ) : selectedCardIds.length > 1 ? (
            <div className="detail-panel detail-panel--empty">
              <h2>複数選択中</h2>
              <p className="muted">一括色変更、一括ロック、一括削除は上部バーから実行できます。</p>
            </div>
          ) : (
            <div className="detail-panel detail-panel--empty">
              <h2>カードを選択してください</h2>
              <p className="muted">右パネルではタイトル、本文、タグ、色、リンクを編集できます。</p>
            </div>
          )}
          <div
            aria-label="右パネルの幅を変更"
            className="editor-resizer editor-resizer--detail"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                nudgePanelWidth("detail", 16);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                nudgePanelWidth("detail", -16);
              }
            }}
            onPointerDown={(event) => startPanelResize("detail", event.clientX)}
            role="separator"
            tabIndex={0}
          />
        </aside>
      </section>

      {selectedCard && isBodyExpanded ? (
        <div className="overlay overlay--page" role="presentation">
          <dialog aria-modal="true" className="modal modal--page" open>
            {renderBodySection(true)}
          </dialog>
        </div>
      ) : null}

      <CreateCardModal
        onCancel={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateCard}
        open={isCreateModalOpen}
      />
    </main>
  );
}
