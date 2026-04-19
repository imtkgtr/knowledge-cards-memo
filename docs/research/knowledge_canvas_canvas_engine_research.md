# 知識キャンバス キャンバス描画技術調査

## 1. 調査目的
無限キャンバス、パン、ズーム、ミニマップ、カスタムカード描画、リンク描画、複数選択を成立させる描画技術を比較する。

---

## 2. 候補比較

### 2.1 React Flow（`@xyflow/react`）
採用候補: 最有力

適合点:
- ノードベース UI に特化
- `MiniMap` と `Controls` を標準提供
- カスタムノード実装が容易
- `fitView`、ズーム、パン、表示最適化が揃う
- Dagre / ELK との連携例が公式にある

懸念:
- 画面上の自由度が高いため、仕様に合わせた UI 制約は自前実装が必要

### 2.2 Canvas / SVG 独自実装
採用しない

理由:
- ミニマップ、ノード選択、エッジ接続、ビューポート制御、アクセシビリティを一から作るコストが高い
- 初版に必要な機能数に対して割に合わない

### 2.3 Konva / Fabric.js 系
初版では採用しない

理由:
- 図形描画には強いが、ノード編集と関係線管理を自前で多く持つ必要がある

---

## 3. 自動整列候補

### 3.1 Dagre
初版採用候補

適合点:
- ツリー / DAG の整列に向く
- React Flow 公式 docs でも推奨寄り
- シンプルで実装コストが低い

弱点:
- 複雑なグラフでは柔軟性が低い

### 3.2 ELK
将来候補

適合点:
- 高機能
- 複雑なレイアウトに強い

弱点:
- 導入と調整のコストが高い
- 初版では過剰

---

## 4. サムネイル生成候補

### 4.1 `html-to-image`
初版採用候補

適合点:
- React Flow 公式 example に採用例がある
- クライアント上で DOM から PNG を生成できる
- 実装が軽い

弱点:
- クライアント性能やブラウザ差異の影響を受ける

### 4.2 Playwright サーバ生成
将来候補

適合点:
- 生成結果を安定させやすい
- バッチ生成に向く

弱点:
- インフラコストが上がる
- 初版には重い

---

## 5. 採用結論
- 描画基盤: React Flow
- 自動整列: Dagre
- 高度整列の拡張候補: ELK
- サムネイル: `html-to-image`
- サーバ側画像生成の保険: Playwright

---

## 6. 実装メモ
- カードは Custom Node として実装する
- 階層リンクと通常リンクは別 edge type に分ける
- `MiniMap` に色を反映する
- `Controls` は補助 UI とし、上部バーにも主要操作を持たせる
- ロック状態や添付有無はノード内で視覚表示する

---

## 7. 参考 URL
- React Flow built-in components: https://reactflow.dev/learn/concepts/built-in-components
- React Flow MiniMap: https://reactflow.dev/api-reference/components/minimap
- React Flow Controls: https://reactflow.dev/api-reference/components/controls
- React Flow ReactFlow component: https://reactflow.dev/api-reference/react-flow
- React Flow custom nodes: https://reactflow.dev/learn/customization/custom-nodes
- React Flow layouting overview: https://reactflow.dev/learn/layouting/layouting
- React Flow ELK example: https://reactflow.dev/examples/layout/elkjs
- React Flow examples: https://reactflow.dev/examples
- React Flow download image example: https://reactflow.dev/examples/misc/download-image
- html-to-image: https://github.com/bubkoo/html-to-image
- Playwright screenshots: https://playwright.dev/docs/screenshots
