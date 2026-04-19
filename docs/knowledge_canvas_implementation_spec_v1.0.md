# 知識キャンバスアプリ 実装仕様書 v1.0

## 1. 文書の位置づけ
本書は、[技術仕様書 v1.0](./knowledge_canvas_technical_spec_v1.0.md) を実装開始可能な粒度まで分解した実装仕様書である。  
ここでは、DB、API、フロントエンド、編集挙動、実装順序を、担当者が迷わず着手できるレベルで定義する。

本書は次の詳細仕様への入口でもある。

- [DB 詳細仕様](./specs/knowledge_canvas_database_spec_v1.0.md)
- [API 詳細仕様](./specs/knowledge_canvas_api_spec_v1.0.md)
- [フロントエンド詳細仕様](./specs/knowledge_canvas_frontend_spec_v1.0.md)
- [編集挙動詳細仕様](./specs/knowledge_canvas_editor_interaction_spec_v1.0.md)
- [実装フェーズ仕様](./specs/knowledge_canvas_delivery_plan_v1.0.md)

---

## 2. 実装の前提
- 初版は PC 向け Web を対象にする
- 既存スタックは維持する
- 認証は Supabase Auth を使う
- DB / Storage は Supabase を使う
- 業務 API は FastAPI を経由する
- キャンバス描画は React Flow を使う
- 画面状態は Zustand を使う
- Undo / Redo は Immer patches を使う

---

## 3. 実装単位

### 3.1 まず実装する単位
1. 認証基盤
2. キャンバス一覧
3. キャンバス編集画面の骨格
4. カード CRUD
5. 保存

### 3.2 次に実装する単位
1. リンク
2. タグ
3. ロック
4. 複数選択
5. Undo / Redo

### 3.3 その後で実装する単位
1. JSON 入出力
2. 添付
3. サムネイル
4. 自動整列
5. E2E 強化

---

## 4. 各詳細仕様の使い分け

### 4.1 DB 詳細仕様
次を決める時に参照する。
- migration
- テーブル
- インデックス
- 外部キー
- RLS

### 4.2 API 詳細仕様
次を決める時に参照する。
- FastAPI route
- request / response schema
- エラーコード
- 保存 API の粒度

### 4.3 フロントエンド詳細仕様
次を決める時に参照する。
- ディレクトリ構成
- ルーティング
- component tree
- Zustand store
- query / mutation 境界

### 4.4 編集挙動詳細仕様
次を決める時に参照する。
- クリック
- ドラッグ
- リンク追加モード
- 複数選択
- 右パネル
- モーダル
- 履歴粒度

### 4.5 実装フェーズ仕様
次を決める時に参照する。
- 実装順序
- テスト追加順
- マージ単位

---

## 5. 実装開始の判断
本書と詳細仕様群の範囲で、次は追加確認なしで着手してよい。

- Supabase migration の作成
- FastAPI API の追加
- Next.js route / layout の再編
- Zustand store の実装
- React Flow ベースのキャンバス画面の実装

一方で、次は大きな設計変更に当たるため、方針転換時のみ再確認する。

- 認証を Clerk に切り替える
- FastAPI を廃止して Supabase 直結にする
- React Flow をやめて独自描画にする
- スマホ UI を先行実装に切り替える

---

## 6. 実装開始時の優先参照順
1. [基盤仕様書 v1.1](./knowledge_canvas_base_spec_v1.1.md)
2. [技術仕様書 v1.0](./knowledge_canvas_technical_spec_v1.0.md)
3. [DB 詳細仕様](./specs/knowledge_canvas_database_spec_v1.0.md)
4. [API 詳細仕様](./specs/knowledge_canvas_api_spec_v1.0.md)
5. [フロントエンド詳細仕様](./specs/knowledge_canvas_frontend_spec_v1.0.md)
6. [編集挙動詳細仕様](./specs/knowledge_canvas_editor_interaction_spec_v1.0.md)
7. [実装フェーズ仕様](./specs/knowledge_canvas_delivery_plan_v1.0.md)
