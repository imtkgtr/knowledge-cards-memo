# 知識キャンバス 認証・DB・添付調査

## 1. 調査目的
認証、永続化、アクセス制御、添付保存の実装基盤を、既存の Supabase 前提で整理する。

---

## 2. 認証

### 2.1 Supabase Auth
採用候補: 最有力

適合点:
- メール / パスワード認証を標準で提供
- Google OAuth を追加可能
- Next.js 向け SSR 用クライアント生成手順が明確

採用方針:
- 初版必須: メール / パスワード
- 初版追加余地: Google OAuth

### 2.2 Next.js 側の実装形
`@supabase/ssr` を使い、Browser Client / Server Client を分ける。

理由:
- 認証済みページのサーバレンダリングとクライアント継続セッションの両立がしやすい

---

## 3. データベース

### 3.1 Supabase Postgres
採用候補: 最有力

適合点:
- 既存 repo に `supabase/` がある
- migration と seed の運用が既にある
- Auth と Storage と一体で扱える

### 3.2 RLS
採用候補: 必須

適合点:
- ブラウザからアクセスしうるテーブルの安全性を担保できる
- 1 ユーザー = 自分のキャンバスのみアクセス可能という要件に合う

方針:
- `public` スキーマの業務テーブルは全て RLS 有効
- `user_id` に基づくアクセス制御をポリシー化

---

## 4. 添付ファイル

### 4.1 Supabase Storage
採用候補: 最有力

適合点:
- 認証 / DB と同一基盤
- バケット単位でアクセス制御できる
- 署名付き URL を発行できる

### 4.2 アップロード経路
初版推奨:
- FastAPI が multipart を受け取る
- FastAPI が Supabase Storage に保存する
- 保存後に `card_attachments` へメタ情報を書く

理由:
- MIME とサイズ制限をサーバ側で統一しやすい
- 将来の変換やスキャンを差し込みやすい

### 4.3 署名付き URL
用途:
- PDF / TXT の新規タブ表示
- 非公開バケットでの画像プレビュー

---

## 5. FastAPI の役割

### 5.1 直接 Supabase 参照だけでは不足する点
- リンク循環禁止
- 重複禁止
- JSON インポートの厳密検証
- 添付の制約集約

### 5.2 API 層が持つべきもの
- JWT 検証
- 業務ルール
- 失敗時の明確なエラーレスポンス

---

## 6. 採用結論
- 認証: Supabase Auth
- SSR 連携: `@supabase/ssr`
- DB: Supabase Postgres
- セキュリティ: RLS 必須
- 添付: Supabase Storage
- 業務 API: FastAPI

---

## 7. 実装メモ
- Google ログインは初版の段階で provider 設定だけ準備してよい
- 添付 MIME 検証は拡張子だけに依存しない
- バケットは `card-attachments` と `canvas-thumbnails` を分ける

---

## 8. 参考 URL
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords
- Supabase social login: https://supabase.com/docs/guides/auth/social-login
- Supabase Google auth: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase SSR client for Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs
- Supabase row level security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase storage overview: https://supabase.com/docs/guides/storage
- Supabase standard uploads: https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Supabase signed URLs: https://supabase.com/docs/reference/javascript/storage-from-createsignedurls
- Supabase serving / downloads: https://supabase.com/docs/guides/storage/serving/downloads
- FastAPI request files: https://fastapi.tiangolo.com/tutorial/request-files/
- FastAPI background tasks: https://fastapi.tiangolo.com/tutorial/background-tasks/
- FastAPI bigger applications / APIRouter: https://fastapi.tiangolo.com/tutorial/bigger-applications/
