# 知識キャンバス 状態管理・履歴調査

## 1. 調査目的
キャンバス編集のローカル状態、Undo/Redo、自動保存、UI 補助状態の分離方法を整理する。

---

## 2. 候補比較

### 2.1 Zustand
採用候補: 最有力

適合点:
- シンプル
- React Flow と組み合わせやすい
- スライス分割しやすい
- 永続化 middleware も必要に応じて使える

### 2.2 Redux Toolkit
初版では採用しない

理由:
- 強力だが、現段階では設計の重さが過剰
- 編集ストアを素早く構築する観点では Zustand の方が軽い

### 2.3 Jotai
初版では採用しない

理由:
- 細粒度状態には向くが、履歴付きドキュメント全体を扱うには方針が散りやすい

---

## 3. 履歴管理候補

### 3.1 Immer patches
採用候補: 推奨

適合点:
- `patches` と `inversePatches` を持てる
- Undo/Redo と相性が良い
- 変更単位を明示しやすい

注意点:
- パッチ最適化までは保証しない
- 本文の細かい変更は粒度調整が必要

### 3.2 スナップショット丸ごと保存
初版では採用しない

理由:
- ノード数が増えるとメモリ効率が悪い
- 本文編集中の履歴で無駄が大きい

### 3.3 専用 Undo ライブラリ
初版では採用しない

理由:
- 業務ルールに合わせた粒度制御が必要
- 自前履歴の方が制御しやすい

---

## 4. 自動保存との関係

### 4.1 分離原則
- 履歴はクライアントセッション内
- 永続化は現在確定状態のみ

### 4.2 dirty 判定
推奨:
- 編集操作で dirty = true
- 保存成功で dirty = false
- Undo/Redo 後も現在状態が最新保存と異なるなら dirty を維持

### 4.3 デバウンス
推奨:
- 本文編集: 500ms
- その他操作: 1000ms

---

## 5. ストア分割推奨
- `canvasDocumentSlice`
- `selectionSlice`
- `viewportSlice`
- `uiSlice`
- `historySlice`
- `saveSlice`

---

## 6. 採用結論
- 状態管理: Zustand
- 履歴: Immer patches ベースの自前履歴
- 永続化補助: Zustand `persist` は UI 補助状態のみ限定使用

---

## 7. 実装メモ
- カードドラッグはマウス移動ごとに履歴追加しない
- 本文変更は blur またはデバウンスで集約する
- 一括整列や一括削除は 1 履歴にまとめる

---

## 8. 参考 URL
- Zustand persist middleware: https://zustand.docs.pmnd.rs/reference/middlewares/persist
- Zustand site persist guide: https://zustand.site/en/docs/persist/
- Immer patches: https://immerjs.github.io/immer/patches/
