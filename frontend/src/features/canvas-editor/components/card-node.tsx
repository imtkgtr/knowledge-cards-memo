"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";

type CardNodeData = {
  childCount: number;
  color: string;
  isLocked: boolean;
  title: string;
};

export type KnowledgeCardNode = Node<CardNodeData, "knowledgeCard">;

export function CardNode({ data, selected }: NodeProps<KnowledgeCardNode>) {
  return (
    <div
      className={selected ? "card-node card-node--selected" : "card-node"}
      style={{ backgroundColor: data.color }}
    >
      <Handle position={Position.Top} type="target" />
      <div className="card-node__header">
        <strong>{data.title}</strong>
        {data.isLocked ? <span className="card-node__meta">LOCK</span> : null}
      </div>
      <p className="card-node__meta">子リンク数: {data.childCount}</p>
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}
