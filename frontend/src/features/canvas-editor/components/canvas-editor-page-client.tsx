"use client";

import {
  Background,
  Controls,
  MiniMap,
  type Node,
  type NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import "@xyflow/react/dist/style.css";
import { clientSaveCanvasDocument } from "@/lib/api/backend";
import type { CanvasDocument } from "@/lib/api/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useCanvasEditorStore } from "@/stores/use-canvas-editor-store";
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

export function CanvasEditorPageClient({ initialDocument }: CanvasEditorPageClientProps) {
  const supabase = createBrowserSupabaseClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const document = useCanvasEditorStore((state) => state.document);
  const selectedCardId = useCanvasEditorStore((state) => state.selectedCardId);
  const nextCardColor = useCanvasEditorStore((state) => state.nextCardColor);
  const saveState = useCanvasEditorStore((state) => state.saveState);
  const saveError = useCanvasEditorStore((state) => state.saveError);
  const loadDocument = useCanvasEditorStore((state) => state.loadDocument);
  const selectCard = useCanvasEditorStore((state) => state.selectCard);
  const createCard = useCanvasEditorStore((state) => state.createCard);
  const updateCard = useCanvasEditorStore((state) => state.updateCard);
  const moveCard = useCanvasEditorStore((state) => state.moveCard);
  const setCanvasName = useCanvasEditorStore((state) => state.setCanvasName);
  const setNextCardColor = useCanvasEditorStore((state) => state.setNextCardColor);
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
        data: {
          title: card.title,
          color: card.color,
          isLocked: card.isLocked,
          childCount: card.childCount,
        },
      })),
    [document?.cards],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesFromDocument);
  const [edges, , onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(nodesFromDocument);
  }, [nodesFromDocument, setNodes]);

  const selectedCard = useMemo(
    () => document?.cards.find((card) => card.id === selectedCardId) ?? null,
    [document?.cards, selectedCardId],
  );

  function handleCreateCard(title: string) {
    createCard({
      title,
      x: 160 + (document?.cards.length ?? 0) * 20,
      y: 120 + (document?.cards.length ?? 0) * 20,
    });
    setIsCreateModalOpen(false);
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

      {saveMessage ? <p className="notice notice--success">{saveMessage}</p> : null}
      {saveError ? <p className="notice notice--error">{saveError}</p> : null}

      <section className="editor-layout">
        <aside className="editor-palette">
          <button
            className="button button--accent"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            カード追加
          </button>
          <div className="editor-palette__colors">
            {colorChoices.map((color) => (
              <button
                aria-label={`色 ${color}`}
                className={nextCardColor === color ? "color-chip color-chip--active" : "color-chip"}
                key={color}
                onClick={() => setNextCardColor(color)}
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
            nodeTypes={nodeTypes}
            nodes={nodes}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => selectCard(node.id)}
            onNodeDragStop={(_, node) => moveCard(node.id, node.position.x, node.position.y)}
            onNodesChange={onNodesChange}
            onPaneClick={() => selectCard(null)}
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
                  onChange={(event) => updateCard(selectedCard.id, { title: event.target.value })}
                  value={selectedCard.title}
                />
              </label>
              <label className="field">
                <span>本文</span>
                <textarea
                  className="textarea"
                  onChange={(event) => updateCard(selectedCard.id, { body: event.target.value })}
                  value={selectedCard.body}
                />
              </label>
              <label className="field">
                <span>タグ</span>
                <input
                  className="input"
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
                      key={color}
                      onClick={() => updateCard(selectedCard.id, { color })}
                      style={{ backgroundColor: color }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="detail-panel detail-panel--empty">
              <h2>カードを選択してください</h2>
              <p className="muted">右パネルではタイトル、本文、タグ、色を編集できます。</p>
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
