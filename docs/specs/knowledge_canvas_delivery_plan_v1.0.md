# 知識キャンバス 実装フェーズ仕様 v1.0

## 1. 目的
実装順序、PR 単位、各フェーズの完了条件を定義する。

---

## 2. フェーズ 1 認証と一覧

### 実装内容
- Supabase Auth 接続
- protected layout
- login page
- canvas list page
- canvas CRUD API
- 初期 migration

### 完了条件
- ログイン後に一覧へ入れる
- 新規作成 / 名前変更 / 削除 / 複製ができる

---

## 3. フェーズ 2 編集画面骨格

### 実装内容
- editor route
- React Flow 組み込み
- top bar
- quick palette
- detail panel
- minimap

### 完了条件
- 空のキャンバス画面が表示される
- パン / ズーム / ミニマップが動く

---

## 4. フェーズ 3 カード CRUD

### 実装内容
- create card modal
- card node
- select / move
- detail panel title/body/tags/color

### 完了条件
- カード作成、編集、移動、削除ができる

---

## 5. フェーズ 4 保存

### 実装内容
- get document
- save document
- dirty state
- manual save
- auto save

### 完了条件
- 再読み込み後に状態が復元される

---

## 6. フェーズ 5 リンク / ロック / 複数選択

### 実装内容
- hierarchy link
- related link
- cycle validation
- lock
- multi selection

### 完了条件
- 仕様どおりの編集制御が効く

---

## 7. フェーズ 6 履歴 / JSON

### 実装内容
- undo / redo
- export
- import

### 完了条件
- 主要操作が戻せる
- JSON 往復ができる

---

## 8. フェーズ 7 添付 / サムネイル / 整列

### 実装内容
- attachment upload
- access URL
- thumbnail upload
- dagre layout

### 完了条件
- 添付が閲覧できる
- 一覧サムネイルが更新される
- 整列が機能する

---

## 9. テスト追加順
1. backend health から canvas API へ拡張
2. frontend page smoke test
3. editor unit tests
4. save tests
5. e2e

---

## 10. コミット / PR 単位
- フェーズごとに分ける
- DB migration と API 実装は同一 PR 可
- editor UI と state は同一 PR 可
- attach / thumbnail は別 PR 推奨
