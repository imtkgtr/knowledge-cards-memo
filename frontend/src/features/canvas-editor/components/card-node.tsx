"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";

type CardNodeData = {
  childCount: number;
  color: string;
  isDimmed?: boolean;
  isHighlighted?: boolean;
  isLocked: boolean;
  tagSummary?: string;
  title: string;
};

export type KnowledgeCardNode = Node<CardNodeData, "knowledgeCard">;

export function CardNode({ data, selected }: NodeProps<KnowledgeCardNode>) {
  return (
    <div
      className={[
        "card-node",
        selected ? "card-node--selected" : "",
        data.isHighlighted ? "card-node--highlighted" : "",
        data.isDimmed ? "card-node--dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: data.color }}
    >
      <Handle
        className="card-node__handle card-node__handle--target"
        isConnectable={!data.isLocked}
        position={Position.Top}
        type="target"
      />
      <div className="card-node__header">
        <strong>{data.title}</strong>
        {data.isLocked ? <span className="card-node__meta">LOCK</span> : null}
      </div>
      {data.tagSummary ? <p className="card-node__meta">タグ: {data.tagSummary}</p> : null}
      <p className="card-node__meta">子リンク数: {data.childCount}</p>
      <Handle
        className="card-node__handle card-node__handle--source"
        isConnectable={!data.isLocked}
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
