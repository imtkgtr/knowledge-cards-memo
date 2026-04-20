"use client";

import {
  Background,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { clientSaveCanvasDocument } from "@/lib/api/backend";
import type { CanvasDocument } from "@/lib/api/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useCanvasEditorStore } from "@/stores/use-canvas-editor-store";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  }).format(new Date(value));
}

function findCardLabel(document: CanvasDocument | null, cardId: string) {
  return document?.cards.find((card) => card.id === cardId)?.title || cardId;
}

export function CanvasEditorPageClient({ initialDocument }: CanvasEditorPageClientProps) {
  const supabase = createBrowserSupabaseClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const document = useCanvasEditorStore((state) => state.document);
  const selectedCardId = useCanvasEditorStore((state) => state.selectedCardId);
  const selectedCardIds = useCanvasEditorStore((state) => state.selectedCardIds);
  const nextCardColor = useCanvasEditorStore((state) => state.nextCardColor);
  const activeMode = useCanvasEditorStore((state) => state.activeMode);
  const saveState = useCanvasEditorStore((state) => state.saveState);
  const saveError = useCanvasEditorStore((state) => state.saveError);
  const loadDocument = useCanvasEditorStore((state) => state.loadDocument);
  const selectCard = useCanvasEditorStore((state) => state.selectCard);
  const setSelectedCardIds = useCanvasEditorStore((state) => state.setSelectedCardIds);
  const createCard = useCanvasEditorStore((state) => state.createCard);
  const updateCard = useCanvasEditorStore((state) => state.updateCard);
  const moveCard = useCanvasEditorStore((state) => state.moveCard);
  const addHierarchyLink = useCanvasEditorStore((state) => state.addHierarchyLink);
  const addRelatedLink = useCanvasEditorStore((state) => state.addRelatedLink);
  const removeHierarchyLink = useCanvasEditorStore((state) => state.removeHierarchyLink);
  const removeRelatedLink = useCanvasEditorStore((state) => state.removeRelatedLink);
  const toggleCardLock = useCanvasEditorStore((state) => state.toggleCardLock);
  const bulkSetColor = useCanvasEditorStore((state) => state.bulkSetColor);
  const bulkToggleLock = useCanvasEditorStore((state) => state.bulkToggleLock);
  const bulkDeleteCards = useCanvasEditorStore((state) => state.bulkDeleteCards);
  const setCanvasName = useCanvasEditorStore((state) => state.setCanvasName);
  const setNextCardColor = useCanvasEditorStore((state) => state.setNextCardColor);
  const setActiveMode = useCanvasEditorStore((state) => state.setActiveMode);
  const setSaveState = useCanvasEditorStore((state) => state.setSaveState);

  useEffect(() => {
    loadDocument(initialDocument);
  }, [initialDocument, loadDocument]);

  const nodesFromDocument = useMemo<KnowledgeCardNode[]>(
    () =>
      (document?.cards ?? []).map((card) => ({
        id: card.id,
        type: "knowledgeCard",
        position: { x: card.x, y: card.y },
        draggable: !card.isLocked,
        selectable: true,
        data: {
          title: card.title,
          color: card.color,
          isLocked: card.isLocked,
          childCount: card.childCount,
        },
      })),
    [document?.cards],
  );

  const edgesFromDocument = useMemo<Edge[]>(
    () => [
      ...((document?.hierarchyLinks ?? []).map((link) => ({
        id: link.id,
        source: link.parentCardId,
        target: link.childCardId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
        data: { kind: "hierarchy" },
      })) satisfies Edge[]),
      ...((document?.relatedLinks ?? []).map((link) => ({
        id: link.id,
        source: link.cardAId,
        target: link.cardBId,
        type: "default",
        style: { strokeDasharray: "6 4", strokeWidth: 2 },
        data: { kind: "related" },
      })) satisfies Edge[]),
    ],
    [document?.hierarchyLinks, document?.relatedLinks],
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

  function handleCreateCard(title: string) {
    createCard({
      title,
      x: 160 + (document?.cards.length ?? 0) * 20,
      y: 120 + (document?.cards.length ?? 0) * 20,
    });
    setIsCreateModalOpen(false);
    setInteractionMessage(null);
  }

  async function handleSave() {
    if (!document) {
      return;
    }
    setSaveMessage(null);
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
        loadDocument(saved);
        setSaveState("saved");
        setSaveMessage("保存しました。");
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

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <div>
          <p className="eyebrow">Knowledge Canvas</p>
          <input
            className="editor-topbar__title"
            onChange={(event) => setCanvasName(event.target.value)}
            value={document?.canvas.name ?? ""}
          />
          <p className="muted">
            カード数: {document?.cards.length ?? 0} / 最終更新:{" "}
            {document ? formatDate(document.canvas.updatedAt) : "-"}
          </p>
        </div>
        <div className="editor-topbar__actions">
          <button className="button button--accent" onClick={handleSave} type="button">
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
        </aside>

        <div className="editor-canvas">
          <ReactFlow
            edges={edges}
            fitView
            multiSelectionKeyCode={["Meta", "Control", "Shift"]}
            nodeTypes={nodeTypes}
            nodes={nodes}
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
                  onChange={(event) => updateCard(selectedCard.id, { title: event.target.value })}
                  value={selectedCard.title}
                />
              </label>
              <label className="field">
                <span>本文</span>
                <textarea
                  className="textarea"
                  disabled={selectedCard.isLocked}
                  onChange={(event) => updateCard(selectedCard.id, { body: event.target.value })}
                  value={selectedCard.body}
                />
              </label>
              <label className="field">
                <span>タグ</span>
                <input
                  className="input"
                  disabled={selectedCard.isLocked}
                  onChange={(event) =>
                    updateCard(selectedCard.id, {
                      tagNames: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    })
                  }
                  value={selectedCard.tagNames.join(", ")}
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
