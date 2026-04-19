# 知識キャンバス API 詳細仕様 v1.0

## 1. 目的
FastAPI で実装する API の route、request、response、業務ルール、エラーを定義する。

---

## 2. 共通方針
- 全 API は `/api` 配下
- 認証必須 API は Supabase JWT 必須
- JSON エラー形式は統一する

### 2.1 エラー形式
```json
{
  "error": {
    "code": "canvas_not_found",
    "message": "キャンバスが見つかりません。"
  }
}
```

---

## 3. 認証

### 3.1 認証方式
- `Authorization: Bearer <supabase_access_token>`

### 3.2 サーバ側で取り出す値
- `user_id`
- `email`

---

## 4. Canvas Summary
一覧用の簡易表現。

```json
{
  "id": "uuid",
  "name": "歴史マップ",
  "thumbnailUrl": "https://...",
  "updatedAt": "2026-04-20T01:00:00Z",
  "createdAt": "2026-04-19T10:00:00Z"
}
```

---

## 5. Canvas Document
編集画面用の完全表現。

```json
{
  "canvas": {
    "id": "uuid",
    "name": "歴史マップ",
    "backgroundColor": "#ffffff",
    "gridEnabled": false,
    "duplicateWarningSuppressed": false,
    "createdAt": "2026-04-19T10:00:00Z",
    "updatedAt": "2026-04-20T01:00:00Z"
  },
  "cards": [],
  "hierarchyLinks": [],
  "relatedLinks": [],
  "attachments": []
}
```

---

## 6. エンドポイント

### 6.1 `GET /api/canvases`
一覧取得。

#### response 200
- `CanvasSummary[]`

---

### 6.2 `POST /api/canvases`
新規作成。

#### request
```json
{
  "name": "新しいキャンバス"
}
```

#### rules
- 空文字不可
- 作成後は一覧へ戻る前提なので、document ではなく summary を返してよい

#### response 201
```json
{
  "canvas": {
    "id": "uuid",
    "name": "新しいキャンバス"
  }
}
```

---

### 6.3 `PATCH /api/canvases/{canvasId}`
キャンバス名や背景設定の更新。

#### request
```json
{
  "name": "更新後の名前",
  "backgroundColor": "#ffffff",
  "gridEnabled": true,
  "duplicateWarningSuppressed": true
}
```

#### response 200
- 更新後の `canvas`

---

### 6.4 `DELETE /api/canvases/{canvasId}`
削除。

#### response 204

---

### 6.5 `POST /api/canvases/{canvasId}/duplicate`
複製。

#### rules
- 名前は `元の名前のコピー`
- カード、リンク、背景、ロック、色、タグ、本文、座標を複製
- 添付メタと添付本体は初版では複製しない

#### response 201
- 新しい `CanvasSummary`

---

### 6.6 `GET /api/canvases/{canvasId}/document`
編集画面用データ取得。

#### response 200
- `CanvasDocument`

---

### 6.7 `PUT /api/canvases/{canvasId}/document`
キャンバス全体保存。

#### request
`CanvasDocument` と同等構造。ただし `canvas.id` は path と一致必須。

#### server rules
- title 空文字禁止
- hierarchy self link 禁止
- hierarchy 重複禁止
- related self link 禁止
- related 重複禁止
- hierarchy cycle 禁止
- lock 済みカードの不正変更拒否は初版ではクライアント責務優先。ただしサーバでも差分検証可能なら拒否する

#### response 200
- 保存後の `CanvasDocument`

---

### 6.8 `POST /api/canvases/{canvasId}/attachments`
添付追加。

#### request
- `multipart/form-data`
- `cardId`
- `file`

#### rules
- image / pdf / txt のみ
- 1 カード 10 件まで
- 合計 10MB まで

#### response 201
```json
{
  "attachment": {
    "id": "uuid",
    "cardId": "uuid",
    "fileName": "note.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 12000,
    "kind": "pdf",
    "createdAt": "2026-04-20T01:00:00Z"
  }
}
```

---

### 6.9 `DELETE /api/attachments/{attachmentId}`
添付削除。

#### response 204

---

### 6.10 `GET /api/attachments/{attachmentId}/access`
署名付き URL を返す。

#### response 200
```json
{
  "url": "https://...",
  "expiresIn": 3600
}
```

---

### 6.11 `GET /api/canvases/{canvasId}/export`
JSON エクスポート。

#### response 200
```json
{
  "version": "1.0",
  "canvas": {},
  "cards": [],
  "hierarchyLinks": [],
  "relatedLinks": []
}
```

---

### 6.12 `POST /api/canvases/import`
JSON インポート。

#### request
```json
{
  "payload": {
    "version": "1.0",
    "canvas": {},
    "cards": [],
    "hierarchyLinks": [],
    "relatedLinks": []
  }
}
```

#### rules
- 壊れた参照は禁止
- 添付は無視ではなく payload に含まれていたらエラー
- 新規キャンバスとして追加
- ID は再採番

#### response 201
- 新しい `CanvasSummary`

---

## 7. Pydantic schema 構成
- `CanvasSummarySchema`
- `CanvasSchema`
- `CardSchema`
- `HierarchyLinkSchema`
- `RelatedLinkSchema`
- `AttachmentSchema`
- `CanvasDocumentSchema`
- `CreateCanvasRequest`
- `UpdateCanvasRequest`
- `ImportCanvasRequest`

---

## 8. Service 単位
- `list_canvases`
- `create_canvas`
- `update_canvas`
- `delete_canvas`
- `duplicate_canvas`
- `get_canvas_document`
- `save_canvas_document`
- `add_attachment`
- `delete_attachment`
- `get_attachment_access_url`
- `export_canvas`
- `import_canvas`

---

## 9. 保存 API の注意
- 初版はスナップショット保存
- 保存失敗時は一部成功状態を残さない
- transaction を張れる処理はまとめる

---

## 10. エラーコード候補
- `unauthorized`
- `forbidden`
- `canvas_not_found`
- `card_not_found`
- `attachment_not_found`
- `invalid_payload`
- `invalid_link_cycle`
- `duplicate_link`
- `invalid_file_type`
- `attachment_limit_exceeded`
- `attachment_total_size_exceeded`
