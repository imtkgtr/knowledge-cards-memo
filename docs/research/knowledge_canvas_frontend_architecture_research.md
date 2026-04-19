# 知識キャンバス フロントエンド構成調査

## 1. 調査目的
知識キャンバスの PC 向け UI を、既存の Next.js ベースで無理なく拡張できる構成を整理する。

---

## 2. 候補

### 2.1 Next.js App Router
採用候補: 最有力

適合理由:
- 既存リポジトリが App Router 構成
- Server Component / Client Component の責務分離が明確
- 認証済みルートと初期データ取得をサーバ側へ寄せやすい

懸念:
- キャンバス編集は Client Component へ明確に分離しないと責務が崩れる

### 2.2 Pages Router
採用しない

理由:
- 既存構成と不整合
- 新規で移行する理由がない

---

## 3. 推奨構成

### 3.1 画面レベル
- `app/(public)/login/page.tsx`
- `app/(app)/canvases/page.tsx`
- `app/(app)/canvases/[canvasId]/page.tsx`

### 3.2 コンポーネント責務
- Server Component:
  ログイン状態確認、初期データ取得、画面メタデータ、ルート保護
- Client Component:
  キャンバス編集、ドラッグ、ズーム、選択、モーダル、ショートカット

### 3.3 ディレクトリ案
```text
src/
  app/
  features/
    auth/
    canvas-list/
    canvas-editor/
    import-export/
    attachments/
  components/
  lib/
    api/
    supabase/
    validators/
```

---

## 4. 補助ライブラリ候補

### 4.1 Zustand
採用候補: 有力

用途:
- キャンバス編集状態
- 選択状態
- UI 状態
- dirty 状態

### 4.2 TanStack Query
採用候補: 部分採用

用途:
- キャンバス一覧取得
- 保存 API の mutation 管理
- 添付一覧再取得

非採用にするもの:
- キャンバス編集のメイン状態

理由:
- 編集中のノード状態は Query Cache よりローカル編集ストアの方が相性が良い

### 4.3 Zod
採用候補: 推奨

用途:
- カード作成入力
- JSON インポート前のクライアント側一次検証
- API 入出力型の共有

---

## 5. 採用結論
- ルーティング: Next.js App Router
- ページデータ取得: Server Component
- 編集 UI: Client Component
- 編集状態: Zustand
- サーバ通信キャッシュ: TanStack Query を必要箇所だけ使用
- バリデーション: Zod

---

## 6. 参考 URL
- Next.js App Router: https://nextjs.org/docs/app
- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Zustand persist middleware: https://zustand.docs.pmnd.rs/reference/middlewares/persist
- TanStack Query: https://tanstack.dev/query/latest
