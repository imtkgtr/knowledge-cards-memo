# 知識キャンバス テスト・運用調査

## 1. 調査目的
知識キャンバスのような編集 UI を、どの粒度のテストで担保し、既存 CI にどう組み込むかを整理する。

---

## 2. テスト方針

### 2.1 バックエンド
採用:
- Pytest

対象:
- キャンバス CRUD
- リンク重複禁止
- 階層循環禁止
- 添付制約
- JSON インポート検証

### 2.2 フロント単体 / 統合
採用候補:
- Vitest
- React Testing Library

対象:
- カード作成モーダル
- 右パネルの開閉
- タグ強調 / 絞り込み
- dirty 状態
- Undo / Redo

### 2.3 E2E
採用候補:
- Playwright

対象:
- ログイン
- キャンバス新規作成
- カード作成と移動
- リンク追加
- 保存
- JSON エクスポート / インポート
- 添付アップロード

理由:
- 複雑な UI フローとブラウザ実操作の確認に向く
- スクリーンショット取得も可能

---

## 3. CI 方針

### 3.1 backend
- `uv sync --extra dev`
- `uv run ruff check .`
- `uv run pytest`

### 3.2 frontend
- `bun install --frozen-lockfile`
- `bun run lint`
- `bun run test`
- `bun run build`

### 3.3 database
- `supabase start`
- `supabase db reset`
- `supabase db lint`

### 3.4 e2e
- アプリ起動
- Playwright 実行

---

## 4. 運用補足

### 4.1 監視
初版で必須ではないが、次は候補になる。
- Sentry
- Supabase Logs

### 4.2 背景処理
サムネイル生成や重い処理が増えた場合:
- 小規模: FastAPI `BackgroundTasks`
- より重い処理: Supabase Edge Functions か別ジョブ基盤

初版では `BackgroundTasks` で十分な範囲に留める。

---

## 5. 採用結論
- backend test: Pytest
- frontend unit/integration: Vitest + Testing Library
- E2E: Playwright
- CI: 既存 workflow を拡張
- 軽量非同期処理: FastAPI `BackgroundTasks`

---

## 6. 参考 URL
- FastAPI background tasks: https://fastapi.tiangolo.com/tutorial/background-tasks/
- Next.js forms / server actions guide: https://nextjs.org/docs/app/guides/forms
- Playwright screenshots: https://playwright.dev/docs/screenshots
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
