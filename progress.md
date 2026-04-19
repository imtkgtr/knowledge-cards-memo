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
