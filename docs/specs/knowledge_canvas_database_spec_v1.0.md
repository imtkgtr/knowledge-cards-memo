# 知識キャンバス DB 詳細仕様 v1.0

## 1. 目的
知識キャンバス初版で必要な Supabase Postgres のテーブル、制約、インデックス、RLS 方針を定義する。

---

## 2. テーブル一覧
- `profiles`
- `canvases`
- `cards`
- `hierarchy_links`
- `related_links`
- `card_attachments`

---

## 3. 共通方針
- 主キーは `uuid`
- 時刻は `timestamptz`
- `created_at` と `updated_at` を持つ
- `updated_at` は trigger で自動更新する
- 業務テーブルは全て RLS 有効

---

## 4. profiles

### 4.1 役割
アプリ独自のユーザープロフィール保持。

### 4.2 カラム
- `id uuid primary key`
- `email text not null`
- `display_name text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 4.3 関係
- `id` は `auth.users.id` と同一値を使う

### 4.4 備考
- 初版では最小限。後続でアイコン等を追加可能

---

## 5. canvases

### 5.1 役割
キャンバス一覧の親エンティティ。

### 5.2 カラム
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `name text not null`
- `background_color text not null default '#ffffff'`
- `grid_enabled boolean not null default false`
- `thumbnail_path text null`
- `duplicate_warning_suppressed boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 5.3 制約
- `foreign key (user_id) references profiles(id) on delete cascade`
- `check (char_length(trim(name)) > 0)`

### 5.4 インデックス
- `index on canvases(user_id, updated_at desc)`

---

## 6. cards

### 6.1 役割
知識カード本体。

### 6.2 カラム
- `id uuid primary key default gen_random_uuid()`
- `canvas_id uuid not null`
- `title text not null`
- `body text not null default ''`
- `tag_names text[] not null default '{}'`
- `color text not null default '#f4f1e8'`
- `is_locked boolean not null default false`
- `x double precision not null`
- `y double precision not null`
- `child_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 6.3 制約
- `foreign key (canvas_id) references canvases(id) on delete cascade`
- `check (char_length(trim(title)) > 0)`
- `check (child_count >= 0)`

### 6.4 インデックス
- `index on cards(canvas_id)`
- `index on cards(canvas_id, updated_at desc)`
- `gin index on cards using gin(tag_names)`

### 6.5 備考
- 同名カードは禁止しない
- タグは別テーブル化しない

---

## 7. hierarchy_links

### 7.1 役割
階層リンク。

### 7.2 カラム
- `id uuid primary key default gen_random_uuid()`
- `canvas_id uuid not null`
- `parent_card_id uuid not null`
- `child_card_id uuid not null`
- `created_at timestamptz not null default now()`

### 7.3 制約
- `foreign key (canvas_id) references canvases(id) on delete cascade`
- `foreign key (parent_card_id) references cards(id) on delete cascade`
- `foreign key (child_card_id) references cards(id) on delete cascade`
- `check (parent_card_id <> child_card_id)`
- `unique (canvas_id, parent_card_id, child_card_id)`

### 7.4 インデックス
- `index on hierarchy_links(canvas_id)`
- `index on hierarchy_links(parent_card_id)`
- `index on hierarchy_links(child_card_id)`

### 7.5 備考
- 循環禁止は DB 制約ではなく API / service で担保する

---

## 8. related_links

### 8.1 役割
通常リンク。

### 8.2 カラム
- `id uuid primary key default gen_random_uuid()`
- `canvas_id uuid not null`
- `card_a_id uuid not null`
- `card_b_id uuid not null`
- `created_at timestamptz not null default now()`

### 8.3 制約
- `foreign key (canvas_id) references canvases(id) on delete cascade`
- `foreign key (card_a_id) references cards(id) on delete cascade`
- `foreign key (card_b_id) references cards(id) on delete cascade`
- `check (card_a_id <> card_b_id)`
- `check (card_a_id::text < card_b_id::text)`
- `unique (canvas_id, card_a_id, card_b_id)`

### 8.4 備考
- API 層で `min/max` 正規化してから保存する

---

## 9. card_attachments

### 9.1 役割
カード添付のメタ情報。

### 9.2 カラム
- `id uuid primary key default gen_random_uuid()`
- `card_id uuid not null`
- `storage_path text not null`
- `file_name text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `kind text not null`
- `created_at timestamptz not null default now()`

### 9.3 制約
- `foreign key (card_id) references cards(id) on delete cascade`
- `check (size_bytes > 0)`
- `check (kind in ('image', 'pdf', 'txt'))`

### 9.4 インデックス
- `index on card_attachments(card_id, created_at asc)`

### 9.5 備考
- 1 カード 10 件制限、合計 10MB 制限は service 層で担保する

---

## 10. Trigger / Function

### 10.1 updated_at 更新
対象:
- `profiles`
- `canvases`
- `cards`

### 10.2 child_count 更新
対象:
- `hierarchy_links` の insert / delete

方針:
- 初版は DB trigger ではなく service 側再計算でよい
- パフォーマンス問題が出たら trigger 化する

---

## 11. RLS 方針

### 11.1 profiles
- 自分だけ `select`
- 自分だけ `update`

### 11.2 canvases
- `user_id = auth.uid()`

### 11.3 cards / links / attachments
- 親 `canvas` または `card` が自分の所有物であること

### 11.4 備考
- 初版はアプリ API を経由する前提だが、DB 側も閉じる
- policy 名は読みやすく統一する

---

## 12. 初期 migration に含める内容
1. `pgcrypto` 有効化
2. `updated_at` trigger function
3. 各テーブル作成
4. index 作成
5. RLS 有効化
6. 基本 policy 作成

---

## 13. 実装時の注意
- `related_links` は順序正規化して保存する
- `cards.tag_names` は lower-case 正規化して保存する
- `body` は null にしない
- `thumbnail_path` は失敗時 null のままで許容する
