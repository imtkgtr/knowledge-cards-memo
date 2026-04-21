"use client";

import type { CanvasDocument } from "@/lib/api/types";
import dagre from "dagre";

type Position = {
  x: number;
  y: number;
};

const CARD_WIDTH = 220;
const CARD_HEIGHT = 120;
const NODE_SEPARATION = 56;
const RANK_SEPARATION = 96;

export function buildDagreLayout(document: CanvasDocument): Record<string, Position> {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    align: "UL",
    nodesep: NODE_SEPARATION,
    ranksep: RANK_SEPARATION,
    marginx: 40,
    marginy: 40,
  });

  for (const card of document.cards) {
    graph.setNode(card.id, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  }

  for (const link of document.hierarchyLinks) {
    if (graph.hasNode(link.parentCardId) && graph.hasNode(link.childCardId)) {
      graph.setEdge(link.parentCardId, link.childCardId);
    }
  }

  dagre.layout(graph);

  const nextPositions: Record<string, Position> = {};
  for (const card of document.cards) {
    const node = graph.node(card.id);
    if (!node) {
      nextPositions[card.id] = { x: card.x, y: card.y };
      continue;
    }
    nextPositions[card.id] = {
      x: node.x - CARD_WIDTH / 2,
      y: node.y - CARD_HEIGHT / 2,
    };
  }

  const lockedCards = document.cards.filter((card) => card.isLocked);
  if (lockedCards.length > 0) {
    const anchor = lockedCards[0];
    const anchorPosition = nextPositions[anchor.id];
    if (anchorPosition) {
      const deltaX = anchor.x - anchorPosition.x;
      const deltaY = anchor.y - anchorPosition.y;
      for (const position of Object.values(nextPositions)) {
        position.x += deltaX;
        position.y += deltaY;
      }
    }
  }

  return nextPositions;
}
