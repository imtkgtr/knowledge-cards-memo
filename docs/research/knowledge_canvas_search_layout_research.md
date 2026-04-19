# 知識キャンバス 検索・整列・入出力調査

## 1. 調査目的
検索、整列、JSON 入出力の技術方式を、初版実装と将来拡張の両面から整理する。

---

## 2. 検索

### 2.1 クライアント検索
初版採用候補: 推奨

適合点:
- 現在のキャンバス全体がメモリ上にある前提と相性が良い
- 仕様の「検索は見に行く導線」に十分対応できる
- インデックスや追加サービスが不要

適用範囲:
- タイトル
- 本文
- 並び順は `updated_at desc`

### 2.2 PostgreSQL Full Text Search
将来候補

適合点:
- 大規模データで有利
- GIN index による高速化が可能

初版で採用しない理由:
- キャンバス単位の検索では過剰
- 日本語対応や辞書設計まで踏み込む必要が出る

---

## 3. 整列

### 3.1 Dagre
初版採用候補: 推奨

適合点:
- 階層リンク主体のグラフに向く
- 実装が軽い
- React Flow 公式でも組み合わせ例がある

### 3.2 ELK
将来候補

適合点:
- 複雑なグラフへの対応力が高い

初版で採用しない理由:
- 設定と検証のコストが高い

---

## 4. JSON 入出力

### 4.1 バックエンド変換
初版採用候補: 推奨

適合点:
- 破損 JSON を API 側で弾ける
- 参照整合性を一箇所で検証できる
- `version` ごとの migration を持ちやすい

### 4.2 フロントのみで完結
初版では採用しない

理由:
- 業務ルールの重複が増える
- エラーハンドリングが散る

---

## 5. サムネイルとエクスポート補足

### 5.1 画像化
`html-to-image` をサムネイル生成に使う。  
React Flow 側でもこの組み合わせの example がある。

### 5.2 将来のサーバ生成
Playwright によるサーバ側スクリーンショット生成は、クライアント依存が問題になった場合の移行先として有効。

---

## 6. 採用結論
- 検索: クライアント部分一致
- 大規模化時の候補: PostgreSQL Full Text Search + GIN
- 整列: Dagre
- 高度整列: ELK
- JSON 入出力: FastAPI 集約

---

## 7. 参考 URL
- PostgreSQL full text search: https://www.postgresql.org/docs/current/textsearch.html
- PostgreSQL preferred index types for text search: https://www.postgresql.org/docs/current/textsearch-indexes.html
- React Flow layouting overview: https://reactflow.dev/learn/layouting/layouting
- React Flow ELK example: https://reactflow.dev/examples/layout/elkjs
- React Flow download image example: https://reactflow.dev/examples/misc/download-image
- html-to-image: https://github.com/bubkoo/html-to-image
- Playwright screenshots: https://playwright.dev/docs/screenshots
