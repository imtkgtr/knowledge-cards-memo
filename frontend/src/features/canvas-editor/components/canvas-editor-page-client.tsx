"use client";

import {
  Background,
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
  clientDeleteAttachment,
  clientGetAttachmentAccessUrl,
  clientSaveCanvasDocument,
  clientUploadAttachment,
} from "@/lib/api/backend";
import type { CanvasDocument } from "@/lib/api/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useCanvasEditorStore } from "@/stores/use-canvas-editor-store";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
import { buildDagreLayout } from "../lib/apply-dagre-layout";
import { CardNode, type KnowledgeCardNode } from "./card-node";
import { CreateCardModal } from "./create-card-modal";

type CanvasEditorPageClientProps = {
  initialDocument: CanvasDocument;
};

const colorChoices = ["#eed9b6", "#cfe5e7", "#f4d8d8", "#dceac8", "#efe0ff"];
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

function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [isPending, startTransition] = useTransition();
  const [isAttachmentPending, setIsAttachmentPending] = useState(false);
  const [tagsDraft, setTagsDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
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
  const setCanvasName = useCanvasEditorStore((state) => state.setCanvasName);
  const setNextCardColor = useCanvasEditorStore((state) => state.setNextCardColor);
  const setActiveMode = useCanvasEditorStore((state) => state.setActiveMode);
  const setSaveState = useCanvasEditorStore((state) => state.setSaveState);
  const undo = useCanvasEditorStore((state) => state.undo);
  const redo = useCanvasEditorStore((state) => state.redo);

  useEffect(() => {
    loadDocument(initialDocument);
  }, [initialDocument, loadDocument]);

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
    [activeHighlightTag, visibleCards],
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
          type: "default",
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
    setTagsDraft(selectedCard?.tagNames.join(", ") ?? "");
  }, [selectedCard?.body, selectedCard?.tagNames, selectedCard?.title]);

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
    if (!selectedCardId || !reactFlowInstance) {
      return;
    }
    const card = document?.cards.find((item) => item.id === selectedCardId);
    if (!card) {
      return;
    }
    reactFlowInstance.setCenter(card.x + 120, card.y + 80, {
      duration: 250,
      zoom: Math.max(reactFlowInstance.getZoom(), 0.95),
    });
  }, [document?.cards, reactFlowInstance, selectedCardId]);

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

  const commitCardTags = useEffectEvent((value: string) => {
    if (!selectedCard) {
      return;
    }
    const nextTags = parseTags(value);
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
    if (!selectedCard || selectedCard.isLocked) {
      return;
    }
    if (parseTags(tagsDraft).join(",") === selectedCard.tagNames.join(",")) {
      return;
    }
    const timeoutId = window.setTimeout(() => commitCardTags(tagsDraft), 500);
    return () => window.clearTimeout(timeoutId);
  }, [commitCardTags, selectedCard, tagsDraft]);

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
  }, [bulkDeleteCards, document?.cards, redo, selectedCardIds, setActiveMode, undo]);

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
        if (!isAutoSave) {
          setSaveMessage("保存しました。");
        }
      } catch (error) {
        setSaveState("error", error instanceof Error ? error.message : "保存に失敗しました。");
      }
    });
  }

  function toggleMode(mode: "addHierarchyLink" | "addRelatedLink") {
    setInteractionMessage(null);
    setActiveMode(activeMode === mode ? "idle" : mode);
  }

  function handleNodeClick(nodeId: string) {
    if (activeMode === "idle") {
      selectCard(nodeId);
      setInteractionMessage(null);
      return;
    }

    if (!selectedCardId) {
      selectCard(nodeId);
      setInteractionMessage("起点カードを選択してから、対象カードをクリックしてください。");
      return;
    }

    if (selectedCardId === nodeId) {
      setInteractionMessage("同じカード同士は接続できません。");
      return;
    }

    if (activeMode === "addHierarchyLink") {
      const wasAdded = addHierarchyLink(selectedCardId, nodeId);
      setInteractionMessage(
        wasAdded
          ? "階層リンクを追加しました。"
          : "階層リンクを追加できませんでした。重複、循環、ロック状態を確認してください。",
      );
      return;
    }

    const wasAdded = addRelatedLink(selectedCardId, nodeId);
    setInteractionMessage(
      wasAdded
        ? "通常リンクを追加しました。"
        : "通常リンクを追加できませんでした。重複またはロック状態を確認してください。",
    );
  }

  function handleSelectionChange(ids: string[]) {
    setSelectedCardIds(ids);
    if (ids.length <= 1) {
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

    const positions = buildDagreLayout(document);
    const changed = applyCardLayout(positions);
    setInteractionMessage(
      changed
        ? "カードを自動整列しました。ロック中のカードは固定しています。"
        : "整列対象のカード位置に変更はありませんでした。",
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
      setInteractionMessage("添付ファイルを削除しました。");
    } catch (error) {
      setInteractionMessage(
        error instanceof Error ? error.message : "添付ファイルの削除に失敗しました。",
      );
    } finally {
      setIsAttachmentPending(false);
    }
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
            カード数: {document?.cards.length ?? 0} / 保存状態:{" "}
            {saveState === "saving"
              ? "自動保存中..."
              : isDirty
                ? "未保存の変更あり"
                : lastSavedAt
                  ? `保存済み (${formatDate(lastSavedAt)})`
                  : "-"}
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

      <section className="editor-layout">
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
            disabled={selectedCardIds.length !== 1}
            onClick={() => toggleMode("addHierarchyLink")}
            type="button"
          >
            階層リンク追加
          </button>
          <button
            className={
              activeMode === "addRelatedLink" ? "button button--accent" : "button button--ghost"
            }
            disabled={selectedCardIds.length !== 1}
            onClick={() => toggleMode("addRelatedLink")}
            type="button"
          >
            通常リンク追加
          </button>
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
              <label className="field">
                <span>本文</span>
                <textarea
                  className="textarea"
                  disabled={selectedCard.isLocked}
                  onBlur={(event) => commitCardBody(event.target.value)}
                  onChange={(event) => setBodyDraft(event.target.value)}
                  value={bodyDraft}
                />
              </label>
              <label className="field">
                <span>タグ</span>
                <input
                  className="input"
                  disabled={selectedCard.isLocked}
                  onBlur={(event) => commitCardTags(event.target.value)}
                  onChange={(event) => setTagsDraft(event.target.value)}
                  value={tagsDraft}
                />
              </label>
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
                      <li key={attachment.id}>
                        <span>
                          [{attachment.kind}] {attachment.fileName}
                        </span>
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
        </aside>
      </section>

      <CreateCardModal
        onCancel={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateCard}
        open={isCreateModalOpen}
      />
    </main>
  );
}
