# progress.md

## 2026-04-20 01:29
- 変更内容:
  リポジトリ状態、既存仕様書、既存実装、既存テストを確認し、知識キャンバスの技術仕様書作成に向けた調査方針を整理した。あわせて、統合技術仕様書と機能別調査資料を `docs/` に追加するタスクを起票した。
- 目的:
  AGENTS.md の運用に従い、仕様との整合を確認したうえで、実装準備段階の設計作業を開始できる状態にするため。
- 影響範囲:
  `docs/`、`task.md`、`progress.md`
- 関連ファイル:
  `AGENTS.md`、`task.md`、`progress.md`、`docs/knowledge_canvas_base_spec_v1.1.md`、`docs/knowledge_canvas_technical_spec_skeleton_v1.0.md`、`docs/knowledge_canvas_handoff_analysis_v1.0.md`
- 未解決事項:
  技術仕様書本体および機能別の技術調査資料は未作成。フロントエンド・バックエンドの依存導入も未実施。
- 次のアクション:
  公式ドキュメントを中心に候補技術を調査し、統合技術仕様書と機能別技術調査資料を作成する。

## 2026-04-20 01:29
- 変更内容:
  統合技術仕様書 `docs/knowledge_canvas_technical_spec_v1.0.md` を新規作成し、フロントエンド構成、キャンバス描画、認証・DB・添付、状態管理・履歴、検索・整列・入出力、テスト・運用の機能別調査資料を `docs/research/` に追加した。
- 目的:
  実装開始前に、基盤仕様の各要件を満たすための採用技術、責務分割、実装順序、代替案を明文化し、判断を迷いにくくするため。
- 影響範囲:
  `docs/`、`task.md`、`progress.md`
- 関連ファイル:
  `docs/knowledge_canvas_technical_spec_v1.0.md`、`docs/research/knowledge_canvas_frontend_architecture_research.md`、`docs/research/knowledge_canvas_canvas_engine_research.md`、`docs/research/knowledge_canvas_auth_storage_research.md`、`docs/research/knowledge_canvas_state_history_research.md`、`docs/research/knowledge_canvas_search_layout_research.md`、`docs/research/knowledge_canvas_test_ops_research.md`、`task.md`、`progress.md`
- 未解決事項:
  FastAPI 側の Supabase JWT 検証実装詳細、サムネイル生成失敗時の再試行戦略、日本語検索の正規化方針は今後の詳細設計で詰める必要がある。
- 次のアクション:
  技術仕様書に基づいて、まず認証・キャンバス一覧・キャンバス編集骨格の実装タスクへ分解する。

## 2026-04-20 01:29
- 変更内容:
  実装着手可能な粒度まで仕様を細分化し、実装仕様書、DB 詳細仕様、API 詳細仕様、フロントエンド詳細仕様、編集挙動詳細仕様、実装フェーズ仕様を `docs/` に追加した。
- 目的:
  技術選定だけで止まらず、担当者が migration、API、画面、状態管理の各層へすぐ着手できるようにするため。
- 影響範囲:
  `docs/`、`task.md`、`progress.md`
- 関連ファイル:
  `docs/knowledge_canvas_implementation_spec_v1.0.md`、`docs/specs/knowledge_canvas_database_spec_v1.0.md`、`docs/specs/knowledge_canvas_api_spec_v1.0.md`、`docs/specs/knowledge_canvas_frontend_spec_v1.0.md`、`docs/specs/knowledge_canvas_editor_interaction_spec_v1.0.md`、`docs/specs/knowledge_canvas_delivery_plan_v1.0.md`、`task.md`、`progress.md`
- 未解決事項:
  migration SQL 本文、RLS policy SQL、Pydantic schema コード、Zustand store の型定義はまだ文書レベルであり、実コードは未着手。
- 次のアクション:
  DB migration の初版作成から実装を開始し、並行して FastAPI API と Next.js route / layout を整備する。

## 2026-04-20 02:31
- 変更内容:
  Supabase 向けの初期 migration を追加し、`profiles`、`canvases`、`cards`、`hierarchy_links`、`related_links`、`card_attachments` のテーブルと基本 RLS を定義した。あわせて FastAPI に Supabase JWT 認証依存、canvas repository / service、キャンバス一覧・作成・更新・削除・複製・document 取得 API を追加し、メモリ repository を使うバックエンドテストを整備した。
- 目的:
  フェーズ 1 の土台となる DB スキーマとバックエンド API を先に安定させ、フロントエンドから接続可能な最小機能を作るため。
- 影響範囲:
  `supabase/`、`backend/`
- 関連ファイル:
  `supabase/migrations/20260420023000_create_knowledge_canvas_schema.sql`、`backend/app/core/auth.py`、`backend/app/infrastructure/canvas_repository.py`、`backend/app/services/canvas_service.py`、`backend/app/api/routes/canvases.py`、`backend/tests/test_canvases.py`、`backend/tests/test_health.py`、`backend/pyproject.toml`、`backend/uv.lock`
- 未解決事項:
  document 保存 API、attachment API、JSON import/export API は未実装。複製時の添付複製も未対応。
- 次のアクション:
  Supabase Auth と接続するフロントエンドのログイン導線、保護ルート、キャンバス一覧 UI を実装する。

## 2026-04-20 02:31
- 変更内容:
  Next.js 側に Supabase SSR クライアント、proxy、ログイン画面、保護レイアウト、キャンバス一覧画面、キャンバス名モーダル、最低限の編集画面プレースホルダを追加した。フロントエンドからバックエンドの canvas API を呼ぶ helper と型定義も整備し、`bun run lint` と `bun run build` が通る状態にした。
- 目的:
  認証済み一覧導線までを通し、フェーズ 1 のフロントエンド実装を成立させるため。
- 影響範囲:
  `frontend/`
- 関連ファイル:
  `frontend/src/app/(public)/login/page.tsx`、`frontend/src/app/(app)/layout.tsx`、`frontend/src/app/(app)/canvases/page.tsx`、`frontend/src/app/(app)/canvases/[canvasId]/page.tsx`、`frontend/src/features/auth/components/login-form.tsx`、`frontend/src/features/canvas-list/components/canvas-list-page-client.tsx`、`frontend/src/lib/supabase/`、`frontend/src/lib/api/`、`frontend/package.json`、`frontend/bun.lock`
- 未解決事項:
  一覧画面の import/export UI、キャンバス編集の React Flow shell、カード CRUD、保存は未実装。ログイン画面は Google ログイン未対応。
- 次のアクション:
  次フェーズとして React Flow ベースの編集画面骨格と card CRUD を実装する。

## 2026-04-20 02:31
- 変更内容:
  FastAPI に `PUT /api/canvases/{canvasId}/document` を追加し、カード配列とリンク配列を含む canvas document の保存処理とバリデーションを実装した。存在しないカード参照、重複リンク、階層循環、canvasId 不整合を拒否し、メモリ repository ベースのテストも追加した。
- 目的:
  フロントエンドの編集画面からカード配置や本文を保存できる API を先に用意し、React Flow ベースの editor shell を実装可能にするため。
- 影響範囲:
  `backend/`
- 関連ファイル:
  `backend/app/api/routes/canvases.py`、`backend/app/infrastructure/canvas_repository.py`、`backend/app/schemas/canvas.py`、`backend/app/services/canvas_service.py`、`backend/tests/test_canvases.py`
- 未解決事項:
  attachment を含む document 保存、差分保存、トランザクション保証付きの保存方式は未対応。
- 次のアクション:
  React Flow と Zustand を使った editor shell を追加し、card CRUD と手動保存をフロントエンドで通す。

## 2026-04-20 02:31
- 変更内容:
  フロントエンドに `@xyflow/react`、`zustand`、`immer` を導入し、React Flow ベースの editor shell、カード作成モーダル、カードノード、右詳細パネル、Zustand ストア、手動保存処理を追加した。キャンバス画面ではカード追加、ドラッグ移動、タイトル/本文/タグ/色の編集、保存 API 呼び出しまでを実装し、`bun run lint` と `bun run build` が通る状態にした。
- 目的:
  プレースホルダだった編集画面を実際に操作可能な状態へ進め、フェーズ 2/3 の起点となる card CRUD を通すため。
- 影響範囲:
  `frontend/`
- 関連ファイル:
  `frontend/src/app/(app)/canvases/[canvasId]/page.tsx`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/features/canvas-editor/components/create-card-modal.tsx`、`frontend/src/features/canvas-editor/components/card-node.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/lib/api/backend.ts`、`frontend/src/app/globals.css`、`frontend/package.json`、`frontend/bun.lock`
- 未解決事項:
  リンク追加 UI、ロック、複数選択、Undo/Redo、自動保存、検索、整列は未実装。カード作成位置は可視範囲中心の厳密計算ではなく簡易オフセット配置。
- 次のアクション:
  リンク追加モード、ロック、複数選択、Undo/Redo を editor shell 上へ順次追加する。
