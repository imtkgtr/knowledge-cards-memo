# 知識キャンバスアプリ 技術仕様書 v1.0

## 1. 文書の目的
本書は、基盤仕様書 v1.1 を実装可能な粒度まで落とし込むための技術仕様書である。  
対象は PC 向け Web アプリの初版実装であり、スマホ最終 UI、共有、共同編集、AI 自動整理は本書の主対象に含めない。

本書で決めることは次の通り。

- 採用する技術スタック
- フロントエンド / バックエンド / Supabase の責務分割
- キャンバス編集で必要な状態管理と永続化方針
- データモデルと API の設計方針
- 添付、JSON 入出力、検索、整列、Undo/Redo の実装方式
- テスト・運用・段階的な実装順序

---

## 2. 参照元
- [基盤仕様書 v1.1](./knowledge_canvas_base_spec_v1.1.md)
- [技術仕様書 骨組み v1.0](./knowledge_canvas_technical_spec_skeleton_v1.0.md)
- [分解・分析メモ v1.0](./knowledge_canvas_handoff_analysis_v1.0.md)

補助的な技術調査は次の資料に分離する。

- [フロントエンド構成調査](./research/knowledge_canvas_frontend_architecture_research.md)
- [キャンバス描画技術調査](./research/knowledge_canvas_canvas_engine_research.md)
- [認証・DB・添付調査](./research/knowledge_canvas_auth_storage_research.md)
- [状態管理・履歴調査](./research/knowledge_canvas_state_history_research.md)
- [検索・整列・入出力調査](./research/knowledge_canvas_search_layout_research.md)
- [テスト・運用調査](./research/knowledge_canvas_test_ops_research.md)

---

## 3. 技術方針サマリ

### 3.1 採用方針
初版では、既存リポジトリ構成と相性が良く、仕様の中核である「無限キャンバス編集」を最短で成立させやすい組み合わせを採用する。

### 3.2 推奨スタック
- フロントエンド: Next.js App Router + React 19 + TypeScript
- キャンバス描画: `@xyflow/react`（React Flow）
- クライアント状態管理: Zustand
- 履歴管理: Zustand ストア上のコマンド履歴 + Immer patches
- バックエンド API: FastAPI
- 認証 / DB / 添付ストレージ: Supabase Auth + Postgres + Storage
- DB セキュリティ: Row Level Security
- 自動整列: Dagre を初版採用、ELK は将来拡張候補
- キャンバスサムネイル生成: React Flow 表示領域を `html-to-image` で画像化
- バリデーション: フロントは Zod、バックエンドは Pydantic
- E2E テスト: Playwright
- フロント単体 / コンポーネントテスト: Vitest + Testing Library
- バックエンドテスト: Pytest

### 3.3 設計原則への対応
- 中央キャンバス最優先: キャンバス編集 UI は Client Component に閉じ込め、周辺 UI は責務ごとに分割する
- 編集責務分離: 左上パレットはモード切替、右パネルは詳細編集、上部バーは全体操作として固定する
- データ一貫性: カード / リンク / 背景 / ロック / 色 / 添付要約は 1 キャンバス単位で保存する
- Undo/Redo と自動保存の整合: 保存対象は「現在の確定状態」、履歴はクライアントセッション内で管理する

---

## 4. 全体アーキテクチャ

### 4.1 論理構成
1. Next.js フロントエンド
2. FastAPI バックエンド
3. Supabase Auth
4. Supabase Postgres
5. Supabase Storage
6. Supabase CLI / Migration

### 4.2 責務分割

#### Next.js
- 画面描画
- 認証済みルートの制御
- キャンバス編集 UI
- クライアント内の一時状態、履歴、ビューポート、選択状態
- バックエンド API の呼び出し

#### FastAPI
- ドメインルールの集約
- JSON 入出力のバリデーション
- 添付メタデータ更新
- キャンバス保存 API
- 整列や一括操作の将来的なサーバ側移譲余地

#### Supabase
- ユーザー認証
- RLS 付きデータ永続化
- 添付ファイル保存
- マイグレーション適用

### 4.3 なぜ BFF 方式にするか
Supabase はフロントから直接利用できるが、本アプリでは次の理由から FastAPI を併設する。

- ロック、循環禁止、重複リンク禁止などの業務ルールを一箇所へ集約したい
- JSON インポート / エクスポートのバリデーション責務を API 側へ置きたい
- 将来的に整列、サムネイル生成、AI 補助などをサーバ処理へ寄せやすくしたい
- フロントを薄い UI と状態同期に寄せたい

---

## 5. フロントエンド仕様

### 5.1 ルーティング構成
Next.js App Router を採用する。大枠は次のように分ける。

```text
src/app/
  (public)/
    login/page.tsx
  (app)/
    canvases/page.tsx
    canvases/[canvasId]/page.tsx
  api/
```

### 5.2 Server Component と Client Component の分離
- 認証境界、初期データ取得、メタデータは Server Component 側で扱う
- キャンバス編集 UI は Client Component 側で扱う
- `React Flow`、ドラッグ、選択、モーダル、ショートカットは Client Component に限定する

### 5.3 画面ごとの責務

#### ログイン画面
- メール / パスワードログイン
- Google ログイン
- セッション切れ時の再ログイン導線

#### キャンバス一覧画面
- キャンバス取得
- 新規作成
- 名前変更
- 削除
- 複製
- JSON インポート
- エクスポート開始

#### キャンバス画面
- 上部バー
- React Flow ベースの無限キャンバス
- 左上クイック操作パレット
- 右詳細パネル
- 右下ミニマップ
- 複数選択バー

### 5.4 コンポーネント分割
- `features/auth`
- `features/canvas-list`
- `features/canvas-editor`
- `features/card-detail`
- `features/import-export`
- `features/attachments`

`canvas-editor` はさらに次へ分ける。

- `editor-shell`
- `flow-canvas`
- `quick-palette`
- `detail-panel`
- `selection-toolbar`
- `modals`
- `shortcuts`

---

## 6. キャンバス描画仕様

### 6.1 採用技術
`@xyflow/react` を採用する。

採用理由:
- 無限に近いビューポートを扱える
- `MiniMap` と `Controls` を標準提供する
- カスタムノード / カスタムエッジが作りやすい
- 初期 `fitView`、ズーム、パン、表示最適化の API が揃う
- ノードベース UI に対する実績が高い

### 6.2 ノード表現
カード 1 枚を React Flow の Node 1 件として扱う。  
Node の `data` に、タイトル、色、ロック状態、添付有無、子リンク数などの描画用属性を持たせる。

### 6.3 エッジ表現
- 階層リンク: カスタム矢印付きエッジ
- 通常リンク: カスタム無向エッジ

保存上は別テーブルに分けるが、画面描画上は React Flow Edge へ変換する。

### 6.4 パン・ズーム
- 初期表示時に `fitView` を有効化する
- `minZoom` / `maxZoom` を設定する
- 空白つかみでパン
- カードクリック時はカード操作を優先する
- ズームリセット、全体表示は上部バーと `Controls` の両方から呼べる構造にする

推奨初期値:
- `minZoom`: `0.2`
- `maxZoom`: `2.0`
- `snapToGrid`: `false`

### 6.5 ミニマップ
- React Flow `MiniMap` を利用する
- カード色を反映する `nodeColor` を定義する
- ロック状態の視認性を落とさないため、輪郭色は固定トーンを持たせる

### 6.6 パフォーマンス
- `onlyRenderVisibleElements` は大量ノード時のみ有効化候補とする
- 初版では 300〜500 ノード規模を実用目標とする
- ノードとエッジの derived state はメモ化し、不要な再生成を避ける

---

## 7. 状態管理仕様

### 7.1 ストア分割
Zustand を使い、少なくとも次のスライスへ分ける。

- `canvasDocumentSlice`
- `viewportSlice`
- `selectionSlice`
- `uiSlice`
- `historySlice`
- `saveSlice`

### 7.2 永続化する状態
- キャンバス名
- 背景色
- グリッド表示
- カード
- リンク
- 色
- ロック
- 添付メタ情報

### 7.3 永続化しない状態
- 右パネル開閉
- 左パレット開閉
- 検索入力途中
- モーダル表示
- 選択状態
- 現在のリンク追加モード
- ビューポート位置

### 7.4 セッション越しに保持する状態
Zustand `persist` は全面採用しない。  
保持するのは、将来的に必要が確認された場合のみ次へ限定する。

- ミニマップ表示 / 非表示
- パレット開閉状態

キャンバス編集中のドキュメント本文そのものは、ローカル永続化よりもサーバ保存を正とする。

---

## 8. Undo / Redo 仕様

### 8.1 採用方式
Immer `produceWithPatches` を用いたパッチ履歴方式を採用する。  
履歴 1 件は次の構造を持つ。

- `patches`
- `inversePatches`
- `label`
- `createdAt`

### 8.2 対象操作
- カード追加 / 削除
- カード移動
- 色変更
- ロック / 解除
- タグ変更
- 本文変更
- リンク追加 / 削除
- 整列

### 8.3 履歴粒度
- ドラッグ移動は `drag start` から `drag end` を 1 操作として記録する
- 本文入力は 500ms デバウンス、または blur 時に 1 操作へまとめる
- 一括操作は 1 履歴として記録する

### 8.4 履歴件数
初版は 100 件を上限とする。  
必要に応じて後続で設定化する。

### 8.5 保存との関係
- Undo/Redo はクライアントセッションの履歴
- 自動保存は現在状態を保存する
- サーバ復元時に履歴は復元しない

---

## 9. 自動保存・手動保存仕様

### 9.1 保存単位
1 キャンバス単位で保存する。

### 9.2 自動保存の発火条件
- ドキュメント状態に dirty フラグが立つ
- 最後の変更から 1000ms 無操作
- 保存中でない
- インポートや一括整列など長い処理中でない

### 9.3 手動保存
- 上部バーに保存ボタンを置く
- 手動保存は dirty 状態を即時送信する
- 保存失敗時はトーストで通知し、dirty 状態は維持する

### 9.4 送信方式
FastAPI へキャンバス全体のスナップショットを送る方式を初版採用する。

理由:
- 循環禁止や重複禁止の再検証がしやすい
- 変更差分 API を早期に設計しなくてよい
- JSON エクスポート用の整形ロジックと近い

将来的に差分保存へ移行する場合でも、内部の履歴方式とは独立して改善できる。

---

## 10. データモデル仕様

### 10.1 テーブル一覧
- `profiles`
- `canvases`
- `cards`
- `hierarchy_links`
- `related_links`
- `card_attachments`
- `canvas_import_jobs`（任意、後続）

### 10.2 canvases
- `id uuid pk`
- `user_id uuid`
- `name text`
- `background_color text`
- `grid_enabled boolean`
- `thumbnail_path text null`
- `duplicate_warning_suppressed boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

### 10.3 cards
- `id uuid pk`
- `canvas_id uuid`
- `title text not null`
- `body text not null default ''`
- `color text not null`
- `is_locked boolean not null default false`
- `x double precision`
- `y double precision`
- `tag_names text[] not null default '{}'`
- `child_count integer not null default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

### 10.4 hierarchy_links
- `id uuid pk`
- `canvas_id uuid`
- `parent_card_id uuid`
- `child_card_id uuid`
- `created_at timestamptz`

制約:
- `parent_card_id != child_card_id`
- `(canvas_id, parent_card_id, child_card_id)` unique

### 10.5 related_links
- `id uuid pk`
- `canvas_id uuid`
- `card_a_id uuid`
- `card_b_id uuid`
- `created_at timestamptz`

制約:
- `card_a_id != card_b_id`
- 無向重複防止のため、保存時に `least(card_a_id, card_b_id)` / `greatest(...)` へ正規化する

### 10.6 card_attachments
- `id uuid pk`
- `card_id uuid`
- `storage_path text`
- `file_name text`
- `mime_type text`
- `size_bytes bigint`
- `kind text`
- `created_at timestamptz`

### 10.7 補助ルール
- タグは別テーブルへ正規化しない
- 同名カードは許可する
- 子リンク数は derived だが、描画最適化のため列として保持してもよい

---

## 11. 認証・認可仕様

### 11.1 認証
Supabase Auth を使う。

初版で必須:
- メール + パスワード

初版で追加余地を残す:
- Google OAuth

### 11.2 Next.js との接続
`@supabase/ssr` を使い、次の 2 クライアントを使い分ける。

- Browser Client
- Server Client

### 11.3 認可
Supabase の `public` スキーマ上の業務テーブルには RLS を有効化する。

基本ポリシー:
- 自分の `user_id` に紐づくキャンバスだけ読める
- 自分のキャンバス配下のカード / リンク / 添付メタだけ読める
- 書き込みも同条件

### 11.4 FastAPI 側の認証
- フロントは Supabase セッションを持つ
- FastAPI は Bearer Token を受け取り、Supabase JWT を検証してユーザーを特定する
- 業務 API は必ず認証必須とする

---

## 12. 添付仕様

### 12.1 対応形式
- 画像
- PDF
- TXT

### 12.2 保存先
Supabase Storage に `card-attachments` バケットを作成する。

推奨パス:
`{userId}/{canvasId}/{cardId}/{attachmentId}-{sanitizedFileName}`

### 12.3 アップロード経路
初版ではフロントから直接 Supabase Storage へアップロードせず、FastAPI 経由に統一する。

理由:
- MIME / サイズ / 件数チェックをサーバ側で一元化できる
- メタデータ登録を同一トランザクション感覚で扱いやすい
- 将来的なウイルススキャンや変換処理を差し込みやすい

### 12.4 バリデーション
- 1 ファイルごとに MIME と拡張子を両方確認する
- 1 カード最大 10 件
- 合計 10MB を超える場合は拒否する

### 12.5 表示
- 画像: 署名付き URL で右パネル内プレビュー
- PDF / TXT: 署名付き URL で新規タブ表示

---

## 13. 検索仕様

### 13.1 初版の検索方式
キャンバス編集画面では、クライアントメモリ上のカード配列に対する全文字列検索を採用する。

対象:
- `title`
- `body`

対象外:
- `tag_names`

### 13.2 検索アルゴリズム
初版は正規化済み部分一致で十分とする。

正規化:
- trim
- 小文字化
- 全角 / 半角ゆらぎの最小吸収は後続課題

### 13.3 並び順
- `updated_at desc`

### 13.4 将来拡張
キャンバス一覧や大規模検索が必要になった場合のみ、PostgreSQL Full Text Search + GIN index を検討する。

---

## 14. タグ仕様

### 14.1 保持形式
カード単位の `text[]` とする。

### 14.2 正規化
- 前後空白除去
- 空文字除外
- 完全一致重複除外
- 大文字小文字は区別しない運用を推奨するが、保存値は lower-case へ統一する

### 14.3 強調 / 絞り込み
どちらもクライアント側 derived state で実現する。  
永続化しない。

---

## 15. リンク仕様

### 15.1 検証責務

#### クライアント
- 自己リンク禁止
- 同種重複リンク禁止
- ロック対象の変更禁止
- UI 上の即時エラーフィードバック

#### FastAPI
- 同じ検証を再実施する
- 階層リンク循環を最終的に拒否する

### 15.2 循環判定
初版は保存前またはリンク追加時に、クライアント上の `hierarchy_links` を DFS / BFS で走査して判定する。  
FastAPI でも同じロジックを持ち、最終防衛線とする。

---

## 16. 整列仕様

### 16.1 初版採用
Dagre を使い、階層リンクを基準に上から下のレイアウトを生成する。

### 16.2 適用方針
- MVP はキャンバス全体整列のみ
- ロックカードは位置固定
- 通常リンクは配置計算の主軸に使わない

### 16.3 実装方法
1. 現在のカード / 階層リンクから Dagre グラフを作成
2. 非ロックカードのみレイアウト結果を適用
3. 重なりやズレが目立つ場合のみオフセット調整
4. 結果を 1 履歴として保存

### 16.4 将来拡張
複雑なグラフでより柔軟な配置が必要になったら ELK へ切り替える。

---

## 17. JSON インポート / エクスポート仕様

### 17.1 ペイロード構造
```json
{
  "version": "1.0",
  "canvas": {},
  "cards": [],
  "hierarchyLinks": [],
  "relatedLinks": []
}
```

### 17.2 エクスポート
- FastAPI で現在のキャンバスを取得して JSON 化する
- 添付メタ情報も含めない
- エクスポート時に「添付ファイルは含まれない」説明を表示する

### 17.3 インポート
- FastAPI で JSON Schema 相当の検証を行う
- 問題がなければ新規キャンバスとして追加する
- ID は原則再採番する
- 重複や壊れた参照がある場合はエラーで拒否する

### 17.4 version 戦略
文字列バージョン `1.0` を持たせる。  
将来互換時は `migrate_import_payload()` をバックエンドに追加する。

---

## 18. サムネイル仕様

### 18.1 初版方針
フロントエンドで保存成功後にサムネイル更新ジョブを発火し、React Flow ラッパ要素を `html-to-image` で PNG 化してアップロードする。

### 18.2 保存先
Supabase Storage `canvas-thumbnails` バケット

推奨パス:
`{userId}/{canvasId}/latest.png`

### 18.3 更新タイミング
- 手動保存成功後
- 自動保存成功後、前回サムネイル更新から一定時間以上経過している場合

### 18.4 将来拡張
クライアント性能や再現性に課題が出た場合は、Playwright ベースのサーバ側画像生成へ移行する。

---

## 19. バックエンド API 仕様

### 19.1 主要エンドポイント
- `GET /api/canvases`
- `POST /api/canvases`
- `PATCH /api/canvases/{id}`
- `DELETE /api/canvases/{id}`
- `POST /api/canvases/{id}/duplicate`
- `GET /api/canvases/{id}/document`
- `PUT /api/canvases/{id}/document`
- `POST /api/canvases/{id}/attachments`
- `DELETE /api/attachments/{id}`
- `GET /api/canvases/{id}/export`
- `POST /api/canvases/import`

### 19.2 レスポンス方針
- ドキュメント保存 API は保存済みドキュメント全体を返す
- エラーはコードとユーザー向けメッセージを分ける
- バリデーションエラーは 422
- 認証エラーは 401 / 403

### 19.3 FastAPI 実装方針
- `app/api/routes`
- `app/services`
- `app/domain`
- `app/schemas`
- `app/infrastructure`

業務ルールは `services` と `domain` に置き、ルート層は薄くする。

---

## 20. テスト仕様

### 20.1 フロント単体テスト
- タイトル未入力でカード作成不可
- 同名警告表示
- ロック時 UI 非活性
- タグ強調 / 絞り込み
- Undo / Redo

### 20.2 フロント統合 / E2E
- ログイン
- キャンバス新規作成
- カード作成、移動、色変更
- リンク追加
- 保存
- JSON エクスポート / インポート
- 添付アップロード

### 20.3 バックエンドテスト
- キャンバス CRUD
- リンク重複拒否
- 階層循環拒否
- JSON バリデーション
- 添付制約

### 20.4 DB テスト
- RLS ポリシー
- 外部キー
- unique 制約

---

## 21. 運用・CI 仕様

### 21.1 既存 CI の拡張
現在の CI を次へ拡張する。

- backend: `ruff`, `pytest`
- frontend: `biome`, `tsc --noEmit`, `vitest`, `next build`
- database: `supabase db reset`, `supabase db lint`
- e2e: Playwright

### 21.2 環境変数

#### frontend
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `BACKEND_INTERNAL_URL`
- `NEXT_PUBLIC_API_BASE_URL`

#### backend
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET` または JWT 検証に必要な設定
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENV`

### 21.3 ログ
初版は次で十分とする。
- FastAPI アクセスログ
- アプリケーションエラーログ
- フロントの例外監視は後続で Sentry を検討

---

## 22. 実装順序

### フェーズ 1
- プロダクト名とルーティング骨格の置換
- Supabase Auth 接続
- キャンバス一覧 CRUD

### フェーズ 2
- React Flow ベースのキャンバス画面
- カード作成、選択、移動
- 右パネル、左パレット

### フェーズ 3
- リンク追加
- ロック
- タグ
- 一括選択

### フェーズ 4
- 自動保存
- Undo / Redo
- JSON 入出力

### フェーズ 5
- 添付
- サムネイル
- 整列
- E2E 強化

---

## 23. 未解決事項
- FastAPI で Supabase JWT をどのライブラリで検証するか
- サムネイル生成をクライアント起点にする場合の失敗時リトライ方針
- 本文編集の履歴粒度をどこまで細かくするか
- 検索の日本語正規化を初版でどこまで対応するか

---

## 24. 結論
初版の実装方針としては、既存の Next.js / FastAPI / Supabase を活かしつつ、キャンバス編集の中核を `React Flow + Zustand + Immer` で構成するのが最も妥当である。  
これにより、仕様で求められている無限キャンバス、ミニマップ、ノード中心 UI、Undo/Redo、自動保存、RLS 付き永続化を、過剰な独自実装なしで段階的に成立させられる。
