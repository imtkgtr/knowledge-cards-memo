"use client";

import type { CanvasDocument } from "@/lib/api/types";
import dagre from "dagre";

type Position = {
  x: number;
  y: number;
};

type LayoutOptions = {
  anchorCardId?: string | null;
};

const CARD_WIDTH = 220;
const CARD_HEIGHT = 120;
const NODE_SEPARATION = 56;
const RANK_SEPARATION = 96;

export function buildDagreLayout(
  document: CanvasDocument,
  options: LayoutOptions = {},
): Record<string, Position> {
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

  const childCardIds = new Set(document.hierarchyLinks.map((link) => link.childCardId));
  const rootCards = document.cards.filter((card) => !childCardIds.has(card.id));
  const lockedCards = document.cards.filter((card) => card.isLocked);
  const anchorCard =
    document.cards.find((card) => card.id === options.anchorCardId) ??
    rootCards[0] ??
    lockedCards[0] ??
    document.cards[0];
  const anchorPosition = anchorCard ? nextPositions[anchorCard.id] : null;
  if (anchorCard && anchorPosition) {
    const deltaX = anchorCard.x - anchorPosition.x;
    const deltaY = anchorCard.y - anchorPosition.y;
    for (const position of Object.values(nextPositions)) {
      position.x += deltaX;
      position.y += deltaY;
    }
  }

  return nextPositions;
}
