# progress.md

## 2026-04-24 17:43
- 変更内容:
  ミニマップ操作を右下の重なり UI から外し、左下のキャンバス操作側へ地図アイコン 1 つで統合した。ミニマップの `拡大 / 縮小` 操作は削除し、表示中は右下にマップ本体だけを出し、アイコンで `表示 / 非表示` を切り替える構成へ整理した。smoke test も新しいトグル操作に合わせて更新し、確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  右下でマップ本体と操作が重なって見づらい状態を解消し、キャンバス操作を左下へ集約して視認性を上げるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  左下コントロール群の全体密度や並び順はまだ調整余地がある。
- 次のアクション:
  この minimap 操作移設をコミットして push し、続けて topbar とカード見た目の整理を進める。

## 2026-04-24 17:32
- 変更内容:
  キャンバス一覧のカードグリッドを固定幅寄りのレイアウトへ変更し、キャンバス数やタイトル長でカードサイズがばらつかないように調整した。カード本体はサムネイルと本文領域の高さを揃え、操作ボタンも 2 列グリッドにして見た目を安定させた。モバイル幅では 1 列表示へ戻るようにした。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  一覧画面でカードの大きさが不揃いに見える問題を解消し、一覧全体を見比べやすくするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  今回は一覧カードのサイズ安定化が中心で、一覧ヘッダやボタン密度の整理はまだ残っている。
- 次のアクション:
  この一覧レイアウト調整をコミットして push し、続けて editor 側の見た目整理を進める。

## 2026-04-24 17:18
- 変更内容:
  editor のミニマップにドック型の操作 UI を追加し、右下から `表示 / 非表示`、`拡大 / 縮小` を行えるようにした。あわせて、ミニマップの空き領域クリックでその座標へ移動し、ノードクリックで該当カードへ寄る挙動を追加した。smoke test にはミニマップの表示、サイズ変更、クリック移動、再表示の確認を加えた。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  キャンバスが大きくなったときに全体把握と移動をミニマップ側でも完結できるようにし、常時表示が不要な場合は簡単に隠せるようにするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  Playwright smoke test は今回追加したミニマップ検証まで含めて更新したが、ローカル実行では `page.goto(\"/login\")` が `ERR_ABORTED` で止まり、今回の editor 変更箇所まで到達しなかった。実装差分の compile failure ではなく、既存のローカル E2E 実行環境の不安定さが残っている。
- 次のアクション:
  このミニマップ改善をコミットして push し、続けて topbar とカード見た目の整理を進める。

## 2026-04-24 16:57
- 変更内容:
  カード本文の編集モーダルから Markdown プレビューを外し、編集に入ったあとはテキスト編集だけを行う構成へ整理した。本文の閲覧側プレビューはカード詳細に残しつつ、`split` 表示用の状態管理と対応テストを削減した。
- 目的:
  本文確認と本文編集の役割を分け、編集モーダル内の情報量を減らして操作を単純化するため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  本文編集はシンプルになったが、将来的にリッチ編集が必要なら別UIとして再設計した方がよい。
- 次のアクション:
  この本文編集簡素化をコミットして push し、続けてカードや topbar の見た目調整を進める。

## 2026-04-24 16:45
- 変更内容:
  editor の見た目を実用寄りに調整し、上部バー・キャンバス・左右パネル・入力欄の余白と角丸を詰めて画面を広く使えるようにした。左上ツールパネルは説明文の列をやめ、現在の操作モードだけを短い状態表示で見せる形へ変更した。あわせて、添付ドロップゾーンと未選択系の詳細パネル文言を簡素化した。
- 目的:
  Notion 風に近い密度で editor を使えるようにしつつ、説明過多で画面が散る状態を減らすため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  今回は全体の密度調整が中心で、カードノード自体の見た目や topbar ボタン群の情報量はまだ整理余地がある。
- 次のアクション:
  この UI 整理をコミットして push し、続けてカード本体と topbar の見た目を詰める。

## 2026-04-24 16:20
- 変更内容:
  editor の本文表示を読み取り中心に整理し、カード選択時は Markdown プレビューをそのまま表示、本文領域をクリックしたときだけ本文編集モーダルへ入るように変更した。モーダル内では `編集` がテキスト編集のみ、`プレビュー` が編集欄と Markdown プレビューの同時表示になるよう切り替え、本文まわりの説明文や冗長な見出しラベルを削減した。あわせて Playwright smoke test を新しい本文操作に合わせて更新した。
- 目的:
  本文確認時の視認性を上げつつ、編集 UI を常時見せない形にして、説明が多すぎる違和感を減らすため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  本文プレビューの見た目改善を優先しており、本文周辺の細かな文言やモーダル内レイアウトの微調整余地は残る。
- 次のアクション:
  lint と build で UI 崩れを確認し、問題がなければこの本文 UX 整理を単独コミットして push する。

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

## 2026-04-20 23:12
- 変更内容:
  編集画面で新規作成するカードとリンクの ID 生成を、接頭辞付き文字列から純粋な UUID に変更した。これにより、`uuid` 型で定義している Supabase テーブルへそのまま保存できるようにした。
- 目的:
  migration 適用済みの hosted Supabase へ接続した実環境で、カード追加後の document 保存が ID 型不一致で失敗する問題を防ぐため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  JSON import/export、タグ強調 / 絞り込み、整列、添付は未実装。新規キャンバス作成の blocker だった migration 未適用は解消したため、今後は保存を含む実環境操作で UI 起因の不整合を順次潰す必要がある。
- 次のアクション:
  今回の UUID 互換修正をコミットして push し、その後は JSON import/export の API と UI を実装する。

## 2026-04-20 23:46
- 変更内容:
  backend に `GET /api/canvases/{canvasId}/export` と `POST /api/canvases/import` を追加し、添付なしの構造 JSON を書き出し・取り込みできるようにした。取り込み時は新規キャンバスを作成し、カードとリンクの ID を再採番する。frontend の一覧画面には `JSON取込` と `JSON書出` を追加し、エクスポート時に添付ファイルが含まれない旨の案内を表示するようにした。
- 目的:
  仕様で定義されている 1 キャンバス単位の JSON 持ち運びを MVP に入れ、バックアップと構造複製の導線を早期に成立させるため。
- 影響範囲:
  `backend/`、`frontend/`、`progress.md`
- 関連ファイル:
  `backend/app/api/routes/canvases.py`、`backend/app/services/canvas_service.py`、`backend/app/schemas/canvas.py`、`backend/tests/test_canvases.py`、`frontend/src/lib/api/backend.ts`、`frontend/src/lib/api/types.ts`、`frontend/src/features/canvas-list/components/canvas-list-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  タグ強調 / 絞り込み、整列、添付は未実装。JSON インポートは最小 shape 確認をフロントに入れているが、本格的な schema プレビューや dry-run は未対応。
- 次のアクション:
  JSON 入出力をコミットして push し、その後はタグ強調 / 絞り込みか自動整列のどちらかへ進む。

## 2026-04-21 00:08
- 変更内容:
  編集画面の左パレットに `タグ強調` と `タグ絞り込み` を追加した。タグ強調では一致カードを強調し、それ以外を減衰表示する。タグ絞り込みでは一致カードとその間のリンクだけを表示する。絞り込みで非表示になった選択状態は自動的に解除するようにした。
- 目的:
  検索とは別に、同じタグを持つカード群を視覚的に追いやすくし、仕様で要求されているタグ操作を MVP に取り込むため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/features/canvas-editor/components/card-node.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  自動整列、添付は未実装。タグ操作にはまだ専用の UI テストがなく、今回は `bun run lint` と `bun run build` による確認に留まっている。
- 次のアクション:
  このタグ機能をコミットして push し、その後は自動整列か添付機能のどちらかへ進む。

## 2026-04-21 00:26
- 変更内容:
  キャンバス一覧の mutation 系 request パスから余分な `/api` 接頭辞を除去し、`/api/backend/api/canvases` へ飛んでいた二重化を修正した。あわせて一覧画面と編集画面の日時表示を `Asia/Tokyo` 固定にし、client component の SSR とブラウザ描画で日時テキストがずれにくいようにした。
- 目的:
  新規キャンバス作成が 404 になる不具合を修正し、一覧画面で出ていた hydration mismatch の要因になりうる日時フォーマット差を減らすため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-list/components/canvas-list-page-client.tsx`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  シェルから取得したトークンでの直接 `curl` は 401 だったため、proxy 経路の最終確認はブラウザセッション前提で見る必要がある。hydrate mismatch が完全に解消したかは、一覧画面を再読み込みしてブラウザ側で再確認が必要。
- 次のアクション:
  今回の一覧修正をコミットして push し、ブラウザで新規作成と一覧再読み込みを再確認したうえで次機能へ進む。

## 2026-04-21 00:39
- 変更内容:
  `getBrowserProxyPath()` に path 正規化を追加し、呼び出し側が誤って `/api/canvases` を渡しても `/api/backend/canvases` へ補正されるようにした。
- 目的:
  一覧画面以外に古い呼び出しが残っていても `api/backend/api/...` の二重パスで 404 にならないようにし、proxy 経路の再発防止を入れるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/lib/api/backend.ts`、`progress.md`
- 未解決事項:
  ブラウザ側で読み込まれている bundle が古い場合は、hard reload か dev server 再起動が必要な可能性がある。hydrate mismatch については再読込後のブラウザ確認がまだ必要。
- 次のアクション:
  この再発防止をコミットして push し、ブラウザで `/canvases` を強制再読み込みして 404 が消えることを確認する。

## 2026-04-21 01:07
- 変更内容:
  `dagre` を導入し、編集画面 top bar に `整列` ボタンを追加した。階層リンクを基準に全体レイアウトを計算し、ロックされていないカードだけを 1 履歴で再配置する。ロックカードがある場合は先頭のロックカードをアンカーにして全体のオフセットを合わせるようにした。
- 目的:
  仕様で定義された MVP の全体整列機能を先に成立させ、カード数が増えたキャンバスでも構造を見直しやすくするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/package.json`、`frontend/bun.lock`、`frontend/src/features/canvas-editor/lib/apply-dagre-layout.ts`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`progress.md`
- 未解決事項:
  添付、サムネイルは未実装。整列には専用テストがまだなく、今回は `bun run lint` と `bun run build` による確認に留めている。複数ロックカードがある場合は先頭アンカー基準のため、厳密な最適配置ではない。
- 次のアクション:
  この整列機能をコミットして push し、その後は添付 upload / access URL の実装へ進む。

## 2026-04-21 01:34
- 変更内容:
  backend に添付 API を追加し、`POST /api/canvases/{canvasId}/attachments`、`GET /api/attachments/{attachmentId}/access`、`DELETE /api/attachments/{attachmentId}` を実装した。Storage には `card-attachments` バケットを使い、初回 upload 時に backend 側で bucket を自動作成する。frontend の右パネルには添付追加、開く、削除を追加し、editor document に添付 metadata を同期するようにした。proxy route は `multipart/form-data` を壊さないよう `arrayBuffer()` 転送へ変更した。
- 目的:
  仕様で定義された MVP 添付機能を通し、カード単位で画像 / PDF / TXT を保持・参照できる状態にするため。
- 影響範囲:
  `backend/`、`frontend/`、`progress.md`
- 関連ファイル:
  `backend/app/api/routes/canvases.py`、`backend/app/api/routes/attachments.py`、`backend/app/api/router.py`、`backend/app/services/canvas_service.py`、`backend/app/infrastructure/canvas_repository.py`、`backend/app/schemas/canvas.py`、`backend/tests/test_canvases.py`、`backend/pyproject.toml`、`backend/uv.lock`、`frontend/src/app/api/backend/[...path]/route.ts`、`frontend/src/lib/api/backend.ts`、`frontend/src/lib/api/types.ts`、`frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  一覧サムネイル更新は未実装。画像の右パネル内プレビューはまだなく、現状は署名 URL を新規タブで開く方式。Storage bucket を migration で事前作成する構成にはまだしていないため、初回 upload 時に backend が bucket 作成権限を持っている前提になる。
- 次のアクション:
  この添付機能をコミットして push し、その後はサムネイル更新か画像プレビューのどちらかへ進む。

## 2026-04-21 01:49
- 変更内容:
  カード追加時の配置を固定座標ではなく現在の表示中心基準に変更し、作成直後にそのカードへカメラを寄せるようにした。タグ絞り込み中に新規カードが即座に見えなくなる問題も避けるため、作成時は絞り込みを解除してメッセージを出すようにした。
- 目的:
  「カードを作成したのに見えない / 作れていないように見える」状態を防ぎ、編集画面での基本操作の体感を安定させるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`progress.md`
- 未解決事項:
  ブラウザ上での最終確認は必要。検索・整列・タグ絞り込みなど他の表示操作と組み合わせた時の導線改善余地はまだある。
- 次のアクション:
  このカード追加導線の修正をコミットして push し、ブラウザでカード追加時に表示中心へ作られることを再確認する。

## 2026-04-21 02:02
- 変更内容:
  編集画面 top bar に `カード追加` ボタンを常設し、左パレットはデスクトップ幅で sticky 表示に変更した。これにより、カード作成導線が画面上部からすぐ触れるようになり、左パレットもスクロールで見失いにくくした。
- 目的:
  「そもそも追加ボタンが見つからない」状態を避け、編集画面の主要操作を常に視界へ置くため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  実ブラウザでの最終確認は必要。小画面では sticky を無効化しているため、モバイル相当幅での導線改善余地はまだある。
- 次のアクション:
  この視認性改善をコミットして push し、ブラウザで top bar に `カード追加` が見えていることを確認する。

## 2026-04-21 02:15
- 変更内容:
  editor store の `selectCard` / `setSelectedCardIds` に同値更新ガードを追加し、同じ選択状態を繰り返し `set` しないようにした。
- 目的:
  タグ絞り込みと React Flow の selection change が重なった際に、同じ選択状態の更新が連鎖して `Maximum update depth exceeded` になるのを防ぐため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/stores/use-canvas-editor-store.ts`、`progress.md`
- 未解決事項:
  実ブラウザで canvas 作成後に編集画面へ入り、エラーが消えているかの最終確認は必要。
- 次のアクション:
  このループ防止修正をコミットして push し、ブラウザで canvas 詳細画面へ入れることを再確認する。

## 2026-04-21 02:29
- 変更内容:
  リンク追加時の起点を `selectedCardId` へ暗黙依存させるのをやめ、editor 内で `pendingLinkSourceId` を別管理するようにした。リンクモード中は 1 回目クリックで起点を確定し、2 回目クリックで接続する。起点カード名も左パレットに表示するようにした。
- 目的:
  選択状態の変化に引きずられてリンク追加が成立しない状態を避け、操作手順を明確にするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  実ブラウザで階層リンクと通常リンクの両方を追加できるかの最終確認は必要。
- 次のアクション:
  このリンク追加導線修正をコミットして push し、ブラウザで起点クリック → 対象クリックの 2 段階で接続できることを確認する。

## 2026-04-21 02:44
- 変更内容:
  リンク追加後に mode を解除せず、起点カードを維持したまま連続して子カードや関連カードを追加できるようにした。リンク種別を切り替える際も起点を引き継ぐようにし、通常リンクの描画も `smoothstep` に寄せて階層リンクと流れが揃うようにした。あわせて編集挙動仕様書のリンクモード定義を更新した。
- 目的:
  1 本ずつ毎回起点を選び直す負荷を減らし、親子リンクと通常リンクを続けて張る操作を自然にするため。
- 影響範囲:
  `frontend/`、`docs/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`docs/specs/knowledge_canvas_editor_interaction_spec_v1.0.md`、`progress.md`
- 未解決事項:
  実ブラウザで連続リンク追加、モード切替時の起点引き継ぎ、関連リンクの視認性を最終確認する必要がある。
- 次のアクション:
  lint / build を通し、今回の連続リンク操作改善をコミットして push する。

## 2026-04-21 03:18
- 変更内容:
  キャンバス一覧用サムネイルの upload / clear API を backend に追加し、`canvas-thumbnails` バケットへ保存できるようにした。一覧取得時は storage path から public URL を組み立てて返す。frontend には `html-to-image` を導入し、保存成功後に editor 表示領域からサムネイル画像を生成して自動送信する処理を追加した。カードが 0 件のときはサムネイル削除に切り替える。あわせて API 仕様書と backend テストを更新した。
- 目的:
  フェーズ 7 の未完了だった「一覧サムネイルが更新される」を実装し、キャンバス一覧から内容を視覚的に識別しやすくするため。
- 影響範囲:
  `backend/`、`frontend/`、`docs/`、`progress.md`
- 関連ファイル:
  `backend/app/api/routes/canvases.py`、`backend/app/infrastructure/canvas_repository.py`、`backend/app/services/canvas_service.py`、`backend/tests/test_canvases.py`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/lib/api/backend.ts`、`frontend/package.json`、`frontend/bun.lock`、`docs/specs/knowledge_canvas_api_spec_v1.0.md`、`progress.md`
- 未解決事項:
  現在のサムネイルは editor の表示領域ベースで生成しており、キャンバス全体を必ず fit した縮小画像ではない。実ブラウザで生成結果の見え方と保存頻度を確認する必要がある。
- 次のアクション:
  lint / build / backend test を確認したうえで、このサムネイル自動更新機能をコミットして push する。

## 2026-04-21 03:27
- 変更内容:
  右パネルの添付一覧で、画像添付だけは署名 URL を先読みしてインラインプレビューを出すようにした。削除時はプレビュー状態も同期して消すようにし、スタイルも画像添付向けに調整した。
- 目的:
  添付画像を毎回新規タブで開かなくても内容を確認できるようにし、カード編集中の参照効率を上げるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  画像以外の PDF / TXT は引き続き `開く` 導線のみ。画像プレビューの並び順や大きさは実ブラウザで見え方を確認する必要がある。
- 次のアクション:
  lint / build を通したうえで、この画像プレビュー改善をコミットして push する。

## 2026-04-21 04:02
- 変更内容:
  `docs/opinion_by_toru.md` の意見を確認し、右パネルの本文編集を Markdown 前提のページ表示へ寄せた。本文は 編集 / 分割 / プレビュー を切り替えられ、見出しや箇条書きなどを挿入するツールバーと、大きく表示するページモーダルを追加した。タグ入力はカンマ文字列入力をやめ、複数チップ表示、Enter / Tab / カンマ追加、候補タグの再利用へ変更した。あわせてカード作成モーダルは Enter で確定できるようにし、関連仕様書も更新した。
- 目的:
  本文を書く意味が出る見え方と、複数タグを扱いやすい入力方式へ寄せて、実使用時の不満点を先に潰すため。
- 影響範囲:
  `frontend/`、`docs/`、`progress.md`
- 関連ファイル:
  `docs/opinion_by_toru.md`、`docs/specs/knowledge_canvas_frontend_spec_v1.0.md`、`docs/specs/knowledge_canvas_editor_interaction_spec_v1.0.md`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/features/canvas-editor/components/create-card-modal.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  Markdown プレビューは軽量実装のため、表やネストした記法までは未対応。本文の full-page 編集時により Notion らしいブロック操作を入れる余地がある。
- 次のアクション:
  lint / build を確認したうえで、この本文・タグ入力改善をコミットして push する。

## 2026-04-21 04:10
- 変更内容:
  card node の再生成時にも `selected` 状態を明示するようにし、本文編集中や自動保存前後で React Flow の選択が空へ戻りにくいようにした。
- 目的:
  実使用で出ていた「自動保存でカードの選択がリセットされる」違和感を先に軽減し、連続編集しやすくするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  実ブラウザで本文編集中に選択が維持されるかの最終確認は必要。React Flow 側の内部 selection event と干渉する経路が残る場合は、次に selection change の受け方も見直す必要がある。
- 次のアクション:
  lint / build を確認したうえで、この選択維持の修正をコミットして push する。

## 2026-04-21 04:18
- 変更内容:
  `Ctrl/Cmd + C` と `Ctrl/Cmd + V` で、選択中カードを複製できるようにした。複製時はカード名を `○○のコピー` へ変更し、選択内に含まれる階層リンク・通常リンクも一緒に複製する。貼り付け後は新しいカード群を選択状態にし、少しずらした位置へ配置する。
- 目的:
  意見書にあったコピー＆ペースト需要を満たし、複数カードの再利用を速くするため。
- 影響範囲:
  `frontend/`、`docs/`、`progress.md`
- 関連ファイル:
  `frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`docs/specs/knowledge_canvas_editor_interaction_spec_v1.0.md`、`progress.md`
- 未解決事項:
  OS クリップボードとの連携はしていないため、現在はアプリ内コピーのみ。添付ファイルまでは複製していない。
- 次のアクション:
  lint / build を確認したうえで、このカード複製ショートカットをコミットして push する。

## 2026-04-21 04:25
- 変更内容:
  左上でリンク種別を選んだ状態なら、カードの上下端子から別カードへ線をドラッグしてリンク追加できるようにした。handle 自体も大きくして視認性を上げ、パレット文言にも端子ドラッグ操作を案内するようにした。
- 目的:
  意見書にあった「カードから線を引いて簡単にリンクをつなげたい」「リンクのアイコンが小さい」をまとめて改善するため。
- 影響範囲:
  `frontend/`、`docs/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/features/canvas-editor/components/card-node.tsx`、`frontend/src/app/globals.css`、`docs/specs/knowledge_canvas_editor_interaction_spec_v1.0.md`、`progress.md`
- 未解決事項:
  関連リンクでも上下端子を共用しているため、専用の横向き handle まではまだない。実ブラウザでドラッグしやすさを確認して、必要なら handle の位置や色を追加調整する。
- 次のアクション:
  lint / build を確認したうえで、このドラッグ接続導線をコミットして push する。

## 2026-04-21 04:36
- 変更内容:
  自動整列の基準を見直し、選択中カードがある場合はその絶対座標を維持し、未選択時はルート親カードを優先して基準にするようにした。あわせて editor の左パレットと右詳細パネルの幅をドラッグまたは矢印キーで変更できる resizer を追加した。
- 目的:
  「親の絶対座標を変えずに整列させたい」「各パネルの大きさを変えたい」という意見を先に取り込み、編集レイアウトの自由度を上げるため。
- 影響範囲:
  `frontend/`、`docs/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/lib/apply-dagre-layout.ts`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`docs/specs/knowledge_canvas_editor_interaction_spec_v1.0.md`、`progress.md`
- 未解決事項:
  複数の親がいる複雑な階層では「どの親を優先固定するか」の最適化余地がある。パネル幅はセッション保存していないため、再読込で初期値に戻る。
- 次のアクション:
  lint / build を確認したうえで、この整列基準とパネルリサイズ改善をコミットして push する。

## 2026-04-21 04:42
- 変更内容:
  カードノードの見た目に `childCount` を反映し、子リンクが多いカードほど少し大きく、影も強く見えるようにした。
- 目的:
  構造上のハブになっているカードを視覚的に見つけやすくし、意見書にあった「子リンクが多いほど大きくなるやつ」へ先に寄せるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/card-node.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  現在は見た目だけの強弱で、ノード実サイズの厳密な再計算や Dagre 連携までは行っていない。
- 次のアクション:
  lint / build を確認したうえで、この childCount 可視化をコミットして push する。

## 2026-04-21 23:13
- 変更内容:
  エディタ初期化を見直し、同一キャンバスの再描画時に `initialDocument` を再読込して選択状態や入力途中の状態を消してしまう挙動を抑制した。あわせて、React Flow の一時的な空選択イベントでは選択を消さないようにした。右本文パネルは Markdown ページとして使いやすい見た目へ寄せ、ページ表示の文言とプレースホルダを調整した。さらに、左右パネル幅と本文表示モードを `localStorage` に保存し、タグ入力はカンマ区切りで複数追加できるようにした。
- 目的:
  実利用で残っていた「自動保存で選択が解除される」「パネル幅変更が定着しない」「本文がページとして使いづらい」「タグが 1 個ずつしか入れにくい」という編集体験の不整合をまとめて解消するため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  この修正はフロントエンド内の状態保持と操作性改善に寄せたもので、別タブから同じキャンバスを同時編集した際の外部更新取り込みはまだ未対応。タグ入力もカンマ区切り中心であり、高度なタグ補完は未実装。
- 次のアクション:
  `bun run lint` と `bun run build` で整合を確認したうえでコミットし、実ブラウザで autosave 後の選択保持、パネル幅保持、Markdown ページ表示、複数タグ追加を再確認する。

## 2026-04-21 23:51
- 変更内容:
  React Flow の選択同期を見直し、空選択イベントを握りつぶす処理をやめたうえで、選択カード ID 配列を一意化・ソートしてから store に入れるようにした。これにより、選択順の揺れだけで `selectedCardIds` が更新され続ける経路を抑えた。
- 目的:
  タグ絞り込み周辺で発生していた `Maximum update depth exceeded` を解消し、選択状態の同期を React Flow と無理なく合わせるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`progress.md`
- 未解決事項:
  実ブラウザ上でタグ絞り込み、複数選択、空白クリック解除を通した最終確認はまだ必要。
- 次のアクション:
  `bun run lint` と `bun run build` の通過を確認したうえで、この再帰更新修正をコミットして push する。

## 2026-04-22 00:02
- 変更内容:
  カード選択時やリンク追加後に走っていた自動センタリングを外し、リンク操作で視点が元の親カード位置へ戻りにくいようにした。本文は Markdown プレビュー中心の UI をやめ、プレーンテキスト中心の大きい編集欄へ戻した。左右パネルのリサイズは独立列ではなくパネル端のオーバーレイ把手へ変更し、横幅を食わないようにしたうえで縮小可能な最小幅も下げた。カードのリンク端子はカード縁に半分重なる位置へ寄せ、不自然に浮かない見た目へ調整した。
- 目的:
  実使用で出ていた「リンク操作で視点が戻る」「本文が書くより見る UI になっている」「リサイズ線のせいで画面が狭い」「リンク端子が浮いて見える」という違和感を、操作中心の方向へ寄せて解消するため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  本文は plain text ベースへ戻したため、Notion のようなブロック編集はまだ未実装。今後本当に Notion ライクな本文編集を狙うなら、別コンポーネントとしてエディタを切り出す必要がある。
- 次のアクション:
  `bun run lint` と `bun run build` の通過を確認したうえでコミットし、実ブラウザでリンク追加中の視点保持、パネル縮小量、端子位置、本文編集感を再確認する。

## 2026-04-22 00:08
- 変更内容:
  キャンバス編集ページに client-only の薄い wrapper を追加し、エディタ本体を SSR しない構成へ変更した。これにより、最近続いていた hydration mismatch を避けやすくした。あわせて、左右パネル幅の `localStorage` 永続化をいったん外し、既定幅と最小・最大幅を見直した。リサイズ把手はパネル内側の端へ寄せ、右詳細パネルの `overflow` による掴みにくさも軽減した。
- 目的:
  SSR と client 初期描画のズレで editor が壊れる問題を止めつつ、右パネルが大きすぎる・把手が掴めないという実用上の不具合を先に解消するため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/app/(app)/canvases/[canvasId]/page.tsx`、`frontend/src/features/canvas-editor/components/canvas-editor-page-shell.tsx`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  editor を client-only にしたため、初回表示は SSR 時より少し遅く見える可能性がある。必要なら後で skeleton や loading を追加する。
- 次のアクション:
  `bun run lint` と `bun run build` の通過を確認したうえでコミットし、実ブラウザで hydration エラー消失とパネルリサイズ可否を再確認する。

## 2026-04-22 00:20
- 変更内容:
  React Flow の `nodes` / `edges` を store 由来の計算値と `useNodesState` / `useEdgesState` で二重管理していた構成をやめ、`nodesFromDocument` と `edgesFromDocument` をそのまま渡す単一ソース構成へ戻した。これにより、React Flow 内部イベントと外部 state 同期が循環しやすい経路を削った。
- 目的:
  `Maximum update depth exceeded` が editor マウント直後に再発していたため、React Flow の state 同期ループを根本から減らすため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  位置更新は `onNodeDragStop` ベースのままであり、ドラッグ中の中間 state を別管理する構成ではない。必要なら後で最適化する。
- 次のアクション:
  `bun run lint` と `bun run build` の通過を確認したうえでコミットし、実ブラウザで editor 初期表示とカード選択・ドラッグが安定するかを再確認する。

## 2026-04-22 01:09
- 変更内容:
  frontend に `@playwright/test` を導入し、`playwright.config.ts` と smoke test `frontend/tests/e2e/canvas-editor-smoke.spec.ts` を追加した。テストでは backend の `.env` から Supabase 接続情報を読み、confirmed user を admin API で先に作成してから UI ログインし、キャンバス作成、editor 表示、カード追加までを通している。あわせて、React Flow の `selected` 制御と `onSelectionChange` の同期を外し、editor マウント時に再発していた runtime error を抑えた。Biome は `test-results` と `playwright-report` を無視するよう更新した。
- 目的:
  「Playwright を使って実動作を確認しながら実装する」ための最低限の E2E 基盤を入れ、実ブラウザで再現した editor の runtime error を継続的に検知できるようにするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/package.json`、`frontend/bun.lock`、`frontend/biome.json`、`frontend/playwright.config.ts`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  現在の smoke test は複数選択やリンク追加までは見ていない。editor の詳細回帰は今後シナリオを増やしていく必要がある。
- 次のアクション:
  今回の E2E 基盤と editor 安定化をコミットし、次はリンク追加やパネルリサイズも Playwright シナリオへ広げる。

## 2026-04-22 10:44
- 変更内容:
  editor の `fitView` prop を外し、初回だけ `reactFlowInstance.fitView()` を呼ぶ方式へ変更した。あわせてカード座標のローカル UI state を追加し、`onNodeDrag` 中はその座標で即時描画し、`onNodeDragStop` で store へ確定するようにした。これにより、ドラッグ中の見た目を滑らかに戻した。本文欄の下には live Markdown プレビューを復活させ、`- ` や見出しが即時に整形表示されるようにした。Playwright smoke test には本文入力と Markdown プレビュー確認も追加し、production mode の frontend (`next start` on `3002`) に対してログイン、キャンバス作成、editor 表示、カード追加、Markdown プレビューまで pass した。
- 目的:
  実ブラウザで残っていた `Maximum update depth exceeded` を `fitView` 起点で解消し、同時にドラッグ体験と Markdown 表示要求も満たすため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  Markdown は live preview 方式であり、Notion のように本文欄そのものが WYSIWYG になるわけではない。複数選択やリンク追加の E2E はまだ未追加。
- 次のアクション:
  この修正をコミットし、次はリンク追加とパネルリサイズも Playwright シナリオへ広げる。

## 2026-04-22 11:07
- 変更内容:
  カード座標を毎フレーム React state で差し替える方式をやめ、React Flow の `useNodesState` と `applyNodeChanges` を使って、ドラッグ中のノード位置は editor 内のローカル node state で処理する構成へ切り替えた。document 由来のノード情報は `useEffect` で同期しつつ、現在ドラッグ中のノード座標だけは保持するようにしたため、ドラッグ中の全体再計算を減らしている。確認は最新 build を使った `next start` on `3003` で行い、Playwright smoke test は pass した。
- 目的:
  直近修正後も残っていた「カードドラッグがまだ引っかかる」という体感上の問題に対して、ドラッグ中の state 更新経路そのものを軽くするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  Playwright では editor 破損の回帰までは見られるが、ドラッグの滑らかさ自体は自動計測していない。必要なら drag 操作を含む manual QA か、将来的にパフォーマンス計測を追加する必要がある。
- 次のアクション:
  このドラッグ経路の見直しをコミットして push し、ユーザ環境で体感が改善したかを確認する。改善が足りなければ次はカードノード再描画数の削減や detail panel 側 state の分離を進める。

## 2026-04-22 11:16
- 変更内容:
  document 保存処理が autosave と手動保存で並行実行されると、backend 側の `delete -> insert` 保存と衝突して `cards_pkey` の重複 500 が出る経路を確認した。frontend では保存中フラグと pending save mode を ref で持ち、保存要求を直列化した。manual save は auto save より優先し、保存完了後に保留中の最新要求だけを再実行する。あわせて、カードドラッグ中は autosave と document 由来 node 同期を抑止し、`onNodesChange` では `position` / `dimensions` / `select` だけを local node state に反映するようにして、ドラッグ中にカードが消える症状を避けた。確認は最新 build を使った `next start` on `3004` と Playwright smoke test で pass した。
- 目的:
  ドラッグ操作中にカードが消え、保存 API が 500 になる不具合を、frontend 側の保存競合と React Flow 同期競合の両面から止めるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  backend の `save_canvas_document` 自体は依然として `delete -> insert` 方式のため、将来的には DB トランザクションや upsert ベースへ寄せた方が安全。現時点では frontend 側で直列化して衝突を避けている。
- 次のアクション:
  この保存直列化とドラッグ安定化をコミットして push し、ユーザ環境で 500 とカード消失が再発しないかを確認する。必要なら次は backend 保存処理のトランザクション化も検討する。

## 2026-04-22 11:26
- 変更内容:
  本文 UI を「右パネルでは常時 Markdown プレビュー、クリック時だけ中央ページで編集」に変更した。右パネルの本文セクションは preview surface をそのまま押せる形にし、`ページで編集` で開くモーダルでは textarea に集中して編集できるようにした。ページ表示を閉じると右パネルへ戻り、プレビューに内容が反映される。Playwright smoke test も、本文プレビューからページ編集を開いて入力し、閉じたあとにプレビューへ見出しと箇条書きが出る流れへ更新した。
- 目的:
  本文は通常時に読む UI を優先しつつ、編集時だけノートのような中央ページへ集中できる体験へ寄せるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  現在のページ編集は plain textarea ベースであり、Notion のような block editor ではない。必要なら将来は本文エディタを別コンポーネントとして差し替える余地がある。
- 次のアクション:
  lint / build / E2E を通したうえでこの UI 変更をコミットし、実ブラウザで本文プレビューの押しやすさとページ編集の見え方を確認する。

## 2026-04-22 11:39
- 変更内容:
  editor の見た目を整理し、左パレットの構成を `リンク / 色 / 強調 / 絞り込み` の短いラベル中心へ再編した。ボタン文言も `カードを追加`、`階層リンク` のように自然な日本語へ寄せ、説明文は起点表示など必要最低限に削った。右パネルでも `カード詳細` を `カード` に短縮し、タグやリンク、添付のセクションは説明文を減らして入力例や空状態の短い表示へ寄せた。CSS 側では `min-width: 0`、`width: 100%`、`overflow-wrap: anywhere`、`flex-wrap` を追加し、入力欄や動的テキストが枠からはみ出しにくいよう調整した。Playwright smoke test の文言参照も新 UI に合わせて更新し、最新 build を `next start` on `3006` で確認して pass した。
- 目的:
  使い方の説明を読ませるよりも、短いラベルと入力例で理解できる画面へ寄せつつ、日本語の不自然さ、改行崩れ、入力欄のはみ出しをまとめて整えるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  今回は主に editor 画面の文言とレイアウト整理であり、一覧画面やログイン画面の文言・余白まではまだ手を入れていない。
- 次のアクション:
  この UI 整理をコミットして push し、次は一覧画面やモーダル類も同じ方針で文言と見た目を整える。

## 2026-04-22 12:03
- 変更内容:
  editor のツール配置を再設計し、左パネルをキャンバス左上に重なるフローティングツールへ変更した。ツールは icon-only に絞り、`カードを追加` は常時アクセントをやめて、モーダル表示中だけ active 扱いにした。通常リンクの UI は frontend から撤去し、React Flow 上の表示や右パネルの編集 UI も出さないようにしたが、backend や store の機能自体は残している。タグの `強調 / 絞り込み` は上部ストリップへ移し、右パネルは `詳細を隠す / 表示` で開閉できるようにした。左右パネルのリサイズバーは削除し、パネル端のドラッグで幅変更できるように変更した。本文のページモーダルはほぼ全画面まで広げ、`編集 / 閉じる` の短い操作に揃えた。Playwright smoke test は新しい本文ボタン文言に合わせて更新し、最新 build を `next start` on `3007` で確認して pass した。
- 目的:
  ユーザのイメージに合わせて、左パネルを小さな重なりツールへ寄せ、通常リンク UI を引っ込め、タグ操作や詳細パネルの位置づけを整理しつつ、パネル操作と全画面編集の使い勝手を改善するため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  通常リンクの backend 機能は残っているが、frontend からは不可視化しただけで完全削除ではない。必要なら今後、保存 payload の扱いも含めて機能自体を縮退させる判断が必要。
- 次のアクション:
  この editor 再配置をコミットして push し、次は一覧画面やモーダル、カードノード自体の見た目も同じ密度で調整する。

## 2026-04-22 12:24
- 変更内容:
  editor 上部の検索、タグ強調、タグ絞り込みを同じ topbar 内へ統合し、独立していた filter bar を削除した。あわせて、左上のフローティングツールを縦並びから横向きへ変更し、カード追加、階層リンク、ロック、削除を一列で扱えるように整理した。ツール収納は他ボタンと見分けやすいように下端の矢印ボタンへ変更し、閉じた状態からの再表示も矢印アイコンへ揃えた。削除は選択中カードに対して有効化され、ロック中カードが含まれる場合は無効化される。確認は `bun run lint`、`bun run build`、`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3008 bun run test:e2e tests/e2e/canvas-editor-smoke.spec.ts` で行った。
- 目的:
  検索とタグ操作を視線移動の少ない上パネルへ集約しつつ、左パネルの視認性と操作性を上げ、削除と収納の導線を直感的にするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  左ツールの「自由な形への変更」は今回未対応で、現時点では横向き固定のフローティングパネルとして調整している。
- 次のアクション:
  この上パネル統合と左ツール整理をコミットして push し、必要であれば次はカード外観や一覧画面側の密度調整へ進む。

## 2026-04-22 13:02
- 変更内容:
  左ツールのロックと削除を即時実行ボタンからモードボタンへ変更し、押下中は色が変わるようにした。`ロックモード` ではカードクリックでロック / 解除を繰り返せるようにし、`削除モード` ではカードクリックで削除できるようにした。リンクモードと同様に `Escape` または再押下までモードを維持し、キャンバス空白クリックでも解除されないように調整した。あわせて、タグの強調 / 絞り込みを topbar のタイトル直下へ移し、上パネル内に確実に表示される構成へ再配置した。左ツールは幅上限を広げ、横一列近くまで伸ばせるレイアウトへ変更し、幅が広いときは収納矢印の向きも変えるようにした。Playwright smoke test には、ロックモードでのロック / 解除、タグ追加後の topbar 表示、削除モードでのカード削除を追加した。
- 目的:
  カード操作を連続実行しやすいモード型 UI に寄せつつ、タグ操作を常に上パネルで見える状態にし、左ツールの形状変更要求にも応えるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/src/stores/use-canvas-editor-store.ts`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  左ツールの形状変更は現在「幅に応じた横展開」までで、任意の自由配置や完全なレイアウト保存までは未対応。
- 次のアクション:
  このモード化と topbar / palette 調整をコミットして push し、必要であれば次はカード見た目や一覧画面の整形へ進む。

## 2026-04-22 14:02
- 変更内容:
  editor に `色モード` を追加し、左パレットの色チップを選んだままカードを連続クリックして色を適用できるようにした。本文では箇条書き・チェックリスト・番号付きリスト・ `##` / `###` 見出しを抽出し、編集確定時に不足している子カードを自動生成して階層リンクへ接続するようにした。UI は Notion 参考画像に寄せて、画面全体の余白と角丸を減らし、キャンバスと右パネルの占有率を上げ、左パレットを広いときは一列表示 + 右端収納矢印になるよう再設計した。添付 UI は隠し input の疑似クリックから visible file input ベースの dropzone へ変更し、添付 upload は browser から backend へ直接送る経路へ切り替えた。あわせて `NEXT_PUBLIC_API_BASE_URL` の client-side 参照を静的参照へ修正した。確認は `bun run lint`、`bun run build`、`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 bun run test:e2e tests/e2e/canvas-editor-smoke.spec.ts`、`cd backend && uv run pytest tests/test_canvases.py -k attachment_crud_flow -q` で行った。
- 目的:
  本文から知識カードが自然に増えていく体験、左パレットからの連続操作、より広いワークスペース表示、添付導線の安定化をまとめて進めるため。
- 影響範囲:
  `frontend/`、`backend test`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/lib/api/backend.ts`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  添付は backend CRUD test では通っているが、Playwright から native file picker を完全再現する確認までは入れていない。現時点の smoke では upload surface の表示確認までに留めている。
- 次のアクション:
  この editor 強化をコミットして push し、必要であれば次は添付の browser 実機確認を追加するか、本文からのカード生成ルールをさらに細かく調整する。

## 2026-04-22 14:09
- 変更内容:
  類似ツールの現状把握のため、Heptabase、Obsidian Canvas、Milanote、Capacities、Napkin AI を公式サイト・公式ヘルプベースで調査し、知識カードキャンバスとの近さ、差別化候補、次に見るべき論点を `docs/research/knowledge_canvas_reference_tools_research.md` に整理した。
- 目的:
  今後の UI / AI / export 方針を、既存ツールとの差分を意識しながら判断できるようにするため。
- 影響範囲:
  `docs/`、`progress.md`
- 関連ファイル:
  `docs/research/knowledge_canvas_reference_tools_research.md`、`progress.md`
- 未解決事項:
  類似ツールの価格、コラボ制限、API 範囲などの詳細比較まではまだ表にしていない。
- 次のアクション:
  必要になった段階で、競合比較表や差別化メッセージの形に展開する。

## 2026-04-23 19:17
- 変更内容:
  React Flow の `MiniMap` に明示的な class、位置、サイズ、z-index、背景、枠線を付け、editor 右下に常に見えるようにした。`pannable` / `zoomable` も有効化した。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  最近のレイアウト調整後にミニマップが見えなくなっていたため、キャンバス全体の把握と移動補助を復帰させるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`progress.md`
- 未解決事項:
  なし。
- 次のアクション:
  この MiniMap 表示復帰をコミットして push する。

## 2026-04-23 19:11
- 変更内容:
  JSON 取込の動作確認や大量データ投入テストに使えるサンプルとして、小学校算数 6 年間の内容を整理したキャンバス JSON を追加した。全体カード、1〜6年生カード、各学年 5 項目の単元カードで構成し、合計 37 cards / 36 hierarchyLinks の階層データにした。`python -m json.tool`、backend の `CanvasExportSchema.model_validate`、リンク参照チェックで検証した。
- 目的:
  実際にまとまった学習内容を一括投入したときのキャンバス表示、リンク表示、カードサイズ、タグ、検索の見え方を試せるようにするため。
- 影響範囲:
  `docs/`、`progress.md`
- 関連ファイル:
  `docs/samples/elementary_math_canvas_import.json`、`progress.md`
- 未解決事項:
  実 DB への import はユーザのログインセッションが必要なため、今回は取り込み用 JSON の作成と schema 検証まで行った。
- 次のアクション:
  アプリの一覧画面で `JSON取込` から `docs/samples/elementary_math_canvas_import.json` を選び、実際の表示密度と操作感を確認する。

## 2026-04-23 19:04
- 変更内容:
  新規カード作成後に本文編集モーダルを自動で開く挙動をやめ、本文の通常表示はプレビュー中心へ戻した。本文プレビューを押した場合は、本文編集欄と Markdown プレビューを並べて表示する形に変更した。本文 blur 時に見出しや箇条書きから子カードを自動生成する処理と store action を削除した。あわせて、カードの子リンク数は保存済みの `childCount` ではなく現在の hierarchyLinks から再計算し、子リンク数に応じてカードの幅と高さが明確に大きくなるようにした。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  カードを開いた直後に本文編集へ強制遷移しないようにし、本文は必要なときだけ編集できる状態へ戻すため。また、自動カード化を止め、親カードの重要度を子リンク数の見た目で分かりやすくするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  なし。
- 次のアクション:
  この本文編集 UX とカードサイズ反映の修正をコミットして push する。

## 2026-04-23 18:57
- 変更内容:
  左上フローティングパネルの収納ボタンを、パネル幅に関係なく常に左向き矢印で表示するようにした。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  横長表示時に矢印の向きが変わって意図が分かりにくくなるのを避け、閉じる操作を一貫して左向きで示すため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  なし。
- 次のアクション:
  この UI 微修正をコミットして push する。

## 2026-04-23 00:00
- 変更内容:
  React Flow のカード端子ドラッグ接続を、リンクモードやリンク種別選択に依存せず常に `source -> target` の階層リンクとして作成するように変更した。あわせて editor 側に残っていた通常リンク追加の文言分岐を削除し、端子接続時に「左上でリンク種別を選んでから」という案内が出ないようにした。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  現在の UI ではリンク種別が上位下位のみであるため、端子をつないだ操作をそのまま親子リンク作成として扱い、余計なモード選択を不要にするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  store と backend schema には通常リンクのデータ構造を残している。現時点では frontend の端子接続と表示導線からは通常リンクを作れない。
- 次のアクション:
  この端子接続改善をコミットして push し、必要なら通常リンクの内部 API / store を残すか縮退させるかを別タスクで整理する。

## 2026-04-22 16:35
- 変更内容:
  一覧画面の JSON import を即時実行から確認モーダル付きに変更した。JSON を選んだらキャンバス名、カード数、リンク数を表示してから取り込みを確定するようにし、添付が含まれないことも明示した。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  仕様書にある import confirm を一覧画面へ反映し、誤った JSON を即座に流し込むリスクを減らすため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-list/components/canvas-list-page-client.tsx`、`frontend/src/features/canvas-list/components/canvas-import-modal.tsx`、`progress.md`
- 未解決事項:
  import error は notice 表示で扱っているが、専用の error modal まではまだ作っていない。
- 次のアクション:
  この import confirm 対応をコミットして push し、その後は auth 遷移の切り分けや一覧画面の文言密度調整へ進む。

## 2026-04-22 16:27
- 変更内容:
  一覧画面のキャンバス削除を `window.confirm` から専用モーダルへ置き換えた。削除対象のキャンバス名を明示しつつ、一覧の create / rename と同じモーダル系 UI で確認できるようにした。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  仕様書にある delete confirm を一覧画面にも反映し、ブラウザ標準ダイアログ依存を減らして UI を統一するため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-list/components/canvas-list-page-client.tsx`、`frontend/src/features/canvas-list/components/canvas-delete-modal.tsx`、`progress.md`
- 未解決事項:
  import confirm まではまだモーダル化しておらず、現時点では import error の表示のみ既存の notice を使っている。
- 次のアクション:
  この一覧削除モーダル対応をコミットして push し、その後は import confirm や auth 遷移の切り分けへ進む。

## 2026-04-22 16:18
- 変更内容:
  editor 上部の検索で title / body を照合する際に、`NFKC` 正規化、空白圧縮、小文字化を入れた。これにより、全角半角や余分な空白を含む検索語でも一致しやすくなった。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  技術仕様書で未解決事項になっていた「検索の日本語正規化」を初版として改善し、基本的な表記ゆれに強くするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  かな変換や同義語展開までは行っておらず、初版は `NFKC + 小文字化 + 空白圧縮` の範囲に留めている。
- 次のアクション:
  この検索正規化をコミットして push し、その後は auth 遷移の切り分けか、editor / 一覧まわりの残仕様を順に埋める。

## 2026-04-22 16:06
- 変更内容:
  カード作成後に右パネルを開いたまま本文のページ編集モーダルを自動表示し、そのまま本文入力へ入れるようにした。これに合わせて smoke test へ「新規カード作成直後に本文ページ編集が開く」観点を追加した。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  仕様書にある「カード作成後は右パネルを開き、最初に本文へ入る」導線を満たし、カード作成直後の入力フローを短くするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  smoke test 自体は本文導線の観点を入れたが、ローカルでは依然として login 直後の `/canvases` 遷移で既存 auth 問題に当たるため、最後までは流せていない。
- 次のアクション:
  この本文導線改善をコミットして push し、その後は auth 遷移の切り分けか、残っている editor 周辺の細かな仕様差分の解消へ進む。

## 2026-04-22 15:48
- 変更内容:
  右パネル本文のページモーダルに `編集 / 分割 / プレビュー` の 3 モードを追加し、仕様どおり本文を単独編集・左右分割・閲覧専用で切り替えられるようにした。通常状態では従来どおりプレビューを維持しつつ、クリックでモーダルへ入り、分割モードでは textarea と Markdown プレビューを並べて確認できる。あわせて smoke test に本文モード切替の観点を追記した。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  仕様書で未実装だった本文 `分割` モードを埋め、Markdown を書きながら結果も見たいユースケースに対応するため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  smoke test は本文モード切替の観点を入れたが、ローカルでは依然として login 直後の `/canvases` 遷移で既存 auth 問題に当たるため最後までは流せていない。
- 次のアクション:
  この本文モード対応をコミットして push し、その後は auth 遷移の不安定化を切り分けるか、editor 周辺の未解決 UI を順次詰める。

## 2026-04-22 15:32
- 変更内容:
  editor のカード作成フローに同名カード警告モーダルを追加し、既存タイトルと重複する場合は確認を挟んでから作成するようにした。モーダルには `今後はこのキャンバスで表示しない` を追加し、canvas の `duplicateWarningSuppressed` へ保存されるよう store を拡張した。あわせて、作成モーダルの入力を警告から戻っても保持できるようにし、Playwright smoke test に同名警告と suppress 動作の確認を追加した。確認は `cd frontend && bun run lint`、`cd frontend && bun run build` で行った。
- 目的:
  仕様書に残っていた `同名カード警告モーダル` の取りこぼしを埋め、重複カードを意図せず増やす操作を抑止しつつ、警告を canvas 単位で抑制できるようにするため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`frontend/src/features/canvas-editor/components/create-card-modal.tsx`、`frontend/src/features/canvas-editor/components/duplicate-card-warning-modal.tsx`、`frontend/src/stores/use-canvas-editor-store.ts`、`frontend/src/app/globals.css`、`frontend/tests/e2e/canvas-editor-smoke.spec.ts`、`progress.md`
- 未解決事項:
  Playwright smoke test は今回追加した同名警告ケースまで含めて更新したが、ローカル実行ではログイン直後に `/canvases` へ遷移しない既存 auth 側の問題で開始直後に停止した。今回の変更箇所へ入る前で止まっているため、editor 機能自体の追加失敗はまだ観測していない。
- 次のアクション:
  この同名警告対応をコミットして push し、その後は Playwright の login 遷移不安定化を切り分けるか、本文 `分割` モードなど残仕様を順に埋める。

## 2026-04-22 15:08
- 変更内容:
  Supabase Storage へ添付を保存する際の key 生成を見直し、日本語や空白を含むファイル名でも ASCII ベースの安全な path へ正規化して upload できるようにした。あわせて、非 ASCII ファイル名が期待どおりの storage path に変換されることを固定する backend test を追加した。
- 目的:
  添付 upload 時に `InvalidKey` で 500 になっていた不具合を解消し、スクリーンショットのような日本語ファイル名でも保存できるようにするため。
- 影響範囲:
  `backend/`、`progress.md`
- 関連ファイル:
  `backend/app/infrastructure/canvas_repository.py`、`backend/tests/test_canvases.py`、`progress.md`
- 未解決事項:
  今回は storage key の安全化のみで、同名ファイルの扱いは既存どおり attachment id で一意化している。ブラウザ実機での添付再確認はこの修正後に別途確認する。
- 次のアクション:
  backend test を実行して修正を確認し、この不具合修正を単独コミットして push する。

## 2026-04-22 14:28
- 変更内容:
  仕様書と現在の実装を棚卸しし、editor 画面に残っていた取りこぼしを追加した。topbar には `書き出し` を追加し、一覧画面と同じ JSON export を editor から直接実行できるようにした。複数選択バーには `選択を基準に整列` を追加し、選択中カードの先頭を anchor にして全体整列できるようにした。確認は `bun run lint`、`bun run build`、`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 bun run test:e2e tests/e2e/canvas-editor-smoke.spec.ts` で行った。
- 目的:
  仕様との対応を見直したうえで、実用上不足していた editor 内の export 導線と selection toolbar の整列導線を埋めるため。
- 影響範囲:
  `frontend/`、`progress.md`
- 関連ファイル:
  `frontend/src/features/canvas-editor/components/canvas-editor-page-client.tsx`、`progress.md`
- 未解決事項:
  仕様書にある `同名カード警告モーダル` と本文 `分割` モードはまだ未実装で、現状は `progress.md` 上の残タスクとして扱うのが妥当。
- 次のアクション:
  この棚卸し対応をコミットして push し、次は duplicate warning と本文 edit mode の拡張を検討する。
