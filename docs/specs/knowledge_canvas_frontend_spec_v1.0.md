# 知識キャンバス フロントエンド詳細仕様 v1.0

## 1. 目的
Next.js 側で実装する route、component、state、API 呼び出し境界を定義する。

---

## 2. ルーティング

```text
src/app/
  (public)/
    login/page.tsx
  (app)/
    layout.tsx
    canvases/page.tsx
    canvases/[canvasId]/page.tsx
```

### 2.1 `(public)/login`
- ログイン画面
- 既ログインなら `/canvases` へ redirect

### 2.2 `(app)/layout`
- 認証必須レイアウト
- サーバ側で session を確認
- 未ログインなら `/login` へ redirect

### 2.3 `/canvases`
- 一覧画面

### 2.4 `/canvases/[canvasId]`
- 編集画面

---

## 3. ディレクトリ構成

```text
src/
  app/
  features/
    auth/
    canvas-list/
    canvas-editor/
  components/
    ui/
  lib/
    api/
    supabase/
    validators/
    utils/
  stores/
```

---

## 4. 一覧画面仕様

### 4.1 主要 component
- `CanvasListPage`
- `CanvasGrid`
- `CanvasCard`
- `CreateCanvasModal`
- `RenameCanvasModal`
- `ImportCanvasModal`

### 4.2 表示項目
- 名前
- サムネイル
- 更新日時
- 右上メニュー

### 4.3 操作
- 開く
- 新規作成
- 名前変更
- 削除
- 複製
- エクスポート
- インポート

---

## 5. 編集画面仕様

### 5.1 page の責務
`page.tsx` は server component として、`canvasId` を受け取って初期 document を取得し、`CanvasEditorPageClient` に渡す。

### 5.2 client 側構成
- `CanvasEditorPageClient`
- `EditorShell`
- `TopBar`
- `FlowCanvas`
- `QuickPalette`
- `DetailPanel`
- `SelectionToolbar`
- `SearchPopover`
- `MiniMapPanel`
- `CreateCardModal`
- `DuplicateNameWarningModal`

### 5.3 TopBar
- キャンバスタイトル
- カード数
- 最終更新表示
- 検索
- 表示設定
- 整列
- 保存
- エクスポート
- 一覧へ戻る

### 5.4 QuickPalette
- カード追加
- 階層リンク追加
- 通常リンク追加
- タグ強調
- タグ絞り込み
- 複数選択補助
- 色パレット
- ロック / 解除

### 5.5 DetailPanel
常時表示:
- title

アコーディオン:
- タグ
  - 複数チップ表示
  - Enter / Tab / カンマで追加
  - 使用中タグから候補追加
- 本文
  - Markdown 編集
  - 編集 / 分割 / プレビュー切替
  - 大きく表示するページモーダル
- 上位
- 下位
- 通常リンク
- 画像
- ファイル

### 5.6 SelectionToolbar
- 一括色変更
- 一括ロック
- 一括解除
- 一括整列
- 一括削除

---

## 6. Zustand store

### 6.1 `useCanvasEditorStore`
保持:
- `document`
- `selectedCardId`
- `selectedCardIds`
- `viewport`
- `activeMode`
- `tagHighlightFilters`
- `tagFilterFilters`
- `nextCardColor`
- `isDirty`
- `isSaving`
- `lastSavedAt`

### 6.2 action 例
- `loadDocument`
- `createCard`
- `updateCard`
- `deleteCard`
- `moveCards`
- `setCardColor`
- `toggleCardLock`
- `addHierarchyLink`
- `removeHierarchyLink`
- `addRelatedLink`
- `removeRelatedLink`
- `setSelection`
- `setViewport`
- `applyLayout`
- `undo`
- `redo`
- `markSaved`

### 6.3 モード定義
- `idle`
- `addHierarchyLink`
- `addRelatedLink`
- `tagHighlight`
- `tagFilter`
- `multiSelectAssist`

---

## 7. API 呼び出し境界

### 7.1 server component
- session 取得
- 初期 canvas document 取得

### 7.2 client component
- 保存 mutation
- attachment upload
- attachment access URL 取得
- export
- import

### 7.3 TanStack Query の使用範囲
- 一覧取得
- 一覧 mutation の invalidation
- attachment の再取得

使用しない範囲:
- 編集中ドキュメント本体

---

## 8. フロントバリデーション

### 8.1 カード作成
- タイトル必須

### 8.2 キャンバス作成 / 名前変更
- 空文字不可

### 8.3 JSON インポート
- 最低限の shape 確認
- 本検証は API 側

---

## 9. 実装順
1. auth route と protected layout
2. canvas list
3. editor shell
4. React Flow 組み込み
5. card CRUD
6. save
7. link / tag / lock / selection

---

## 10. 注意
- 編集画面の中核 component は `use client`
- server component に React Flow を直接持ち込まない
- 右パネルと複数選択バーの責務を混ぜない
