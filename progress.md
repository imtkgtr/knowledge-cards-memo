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

## 2026-04-20 03:15
- 変更内容:
  editor shell に階層リンク追加モード、通常リンク追加モード、単体ロック、一括ロック、一括解除、複数選択、一括色変更、一括削除、リンク削除、リンク一覧表示を追加した。あわせて canvas document のフロント型定義を具体化し、リンク追加失敗時に誤った成功メッセージを出さないよう調整した。
- 目的:
  仕様書で定義した主要編集機能のうち、カード間関係の編集とロック制御を実際に操作できる状態へ進めるため。
- 影響範囲:
  `frontend/`、`task.md`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/lib/api/types.ts`、`frontend/src/app/globals.css`、`task.md`、`progress.md`
- 未解決事項:
  Undo/Redo、自動保存、検索、整列、添付、JSON import/export は未実装。リンクの詳細表示はカードタイトル中心で、今後はラベルや経路可視化を拡張余地として残している。
- 次のアクション:
  フロントエンドの lint / build を再実行して今回の編集機能追加を確定し、その後 Undo/Redo と自動保存のフェーズへ進む。

## 2026-04-20 14:45
- 変更内容:
  キャンバス新規作成がブラウザから失敗する経路を見直し、クライアント側の create / rename / duplicate / delete / document save を Next.js の同一オリジン proxy 経由に切り替えた。`frontend/src/app/api/backend/[...path]/route.ts` を追加し、ブラウザから直接 `NEXT_PUBLIC_API_BASE_URL` を叩かない構成へ変更した。
- 目的:
  ログイン後の一覧表示はできる一方で、新規作成などの変異系 API だけが CORS や公開 URL 差異の影響を受ける構成だったため、環境依存を減らして安定して操作できるようにするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/app/api/backend/[...path]/route.ts`、`frontend/src/lib/api/backend.ts`、`frontend/src/features/canvas-list/components/canvas-list-page-client.tsx`、`progress.md`
- 未解決事項:
  Undo/Redo、自動保存、検索、整列、添付、JSON import/export は未実装。公開 URL を使う直接呼び出しは一覧・保存から除外したが、今後クライアント変異系 API を増やす場合も proxy 経由を前提に統一する必要がある。
- 次のアクション:
  今回の修正をコミットして push し、ユーザ環境でキャンバス新規作成が通ることを確認したうえで Undo/Redo と自動保存の実装へ進む。

## 2026-04-20 15:05
- 変更内容:
  editor store を Immer patches ベースの履歴管理へ拡張し、`undo` / `redo`、dirty 状態、最終保存時刻、保存済みマークを追加した。編集画面には Undo / Redo ボタンと `Ctrl/Cmd + Z`, `Ctrl/Cmd + Y`, `Shift + Cmd/Ctrl + Z`, `Delete/Backspace`, `Escape` のショートカットを追加し、履歴操作が可能な状態にした。
- 目的:
  仕様書で要求されているクライアントセッション内の履歴管理を先に成立させ、次段の自動保存と独立して扱える編集基盤を整えるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  タイトル・本文・タグ・キャンバス名の入力はまだ毎入力単位で履歴化されうるため、仕様どおりの 500ms デバウンスまたは blur 確定には次段で寄せる必要がある。自動保存も未実装。
- 次のアクション:
  この履歴基盤をコミットし、その上で入力のデバウンス確定と 1000ms 無操作時の自動保存を追加する。

## 2026-04-20 15:24
- 変更内容:
  キャンバス名、カードタイトル、本文、タグの入力を 500ms デバウンスまたは blur で確定する方式へ切り替え、dirty 状態なら 1000ms 無操作で自動保存する処理を追加した。保存状態表示も `未保存` / `自動保存中` / `保存済み` を切り替えるよう更新した。
- 目的:
  履歴粒度を仕様に近づけつつ、手動保存に依存せず編集中の変更がサーバへ反映される MVP 保存体験を成立させるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  自動保存失敗時の再試行戦略、保存中のトースト UI、タブ離脱時警告、JSON import/export、検索、整列、添付は未実装。
- 次のアクション:
  autosave をコミットして push し、その後は検索または JSON import/export のどちらかを次フェーズとして着手する。

## 2026-04-20 22:15
- 変更内容:
  Supabase Auth の access token 検証を `HS256` 固定から、共有 secret と JWKS 公開鍵の両対応へ修正した。あわせて、接続先 Supabase プロジェクトに `profiles` などのテーブルが無い場合は `storage_not_initialized` を返すようにし、ホスト側 DB 未初期化が UI からも判別できるようにした。認証ユニットテストと storage 初期化エラーテストも追加した。
- 目的:
  ログイン済みでも変異系 API が `認証トークンが不正です` で失敗していた問題を解消し、次に残る blocker が remote Supabase の migration 未適用であることを切り分けるため。
- 影響範囲:
  `backend/`、`progress.md`
- 関連ファイル:
  `backend/app/core/auth.py`、`backend/app/services/canvas_service.py`、`backend/tests/test_auth.py`、`backend/tests/test_canvas_service.py`、`progress.md`
- 未解決事項:
  いま接続している hosted Supabase 側には `public.profiles` などのテーブルがまだ存在せず、migration を適用しない限り新規キャンバス作成は成功しない。これはアプリコードではなく接続先 DB の初期化状態の問題。
- 次のアクション:
  今回の backend 修正をコミットして push し、引き続き検索や JSON 入出力などコード側で進められる機能実装を進行する。remote DB へ migration を流せる手段が用意できたら、その時点で新規作成の実動作確認を再開する。

## 2026-04-20 22:31
- 変更内容:
  編集画面の top bar に検索入力と検索結果ポップオーバーを追加した。検索対象はカードのタイトルと本文で、結果は更新日時降順で表示し、クリックするとカード位置へカメラを移動するようにした。選択状態や右パネルは変更しない。
- 目的:
  仕様で定義されている「見に行く導線」としての検索を先に成立させ、remote DB 初期化待ちの間も UI 実装を前に進めるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  タグ強調 / タグ絞り込み、JSON import/export、整列、添付は未実装。新規キャンバス作成は依然として接続先 Supabase の migration 未適用が blocker。
- 次のアクション:
  検索機能をコミットし、次は JSON import/export かタグ強調 / 絞り込みのどちらかを実装する。
