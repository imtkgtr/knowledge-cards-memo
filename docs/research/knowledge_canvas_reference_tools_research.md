# 類似ツール調査メモ v1.0

## 目的
- 知識カードキャンバスに近い既存ツールを把握し、UI と機能差分の判断材料にする。
- 2026-04-22 時点で、公式サイトまたは公式ドキュメントで確認できた内容だけを簡潔に整理する。

## 近いツール

### Heptabase
- 近さ:
  カードと whiteboard を中心に知識を視覚整理する点がかなり近い。
- 公式で確認できたこと:
  Heptabase は whiteboard 上で cards, sections, text elements, images などを扱う前提で設計されている。
  deeplink、公開 whiteboard、version history、MCP 連携もある。
- 参考:
  https://support.heptabase.com/en/articles/12679581-how-to-use-heptabase-mcp
  https://support.heptabase.com/en/articles/11176386-how-to-use-deeplinks-in-heptabase
  https://support.heptabase.com/en/articles/12121546-how-do-i-publish-whiteboards-with-a-public-link
  https://support.heptabase.com/en/articles/11430704-troubleshooting-performance-and-lag-issues-in-heptabase
- 今回プロダクトへの示唆:
  `カード本文 + whiteboard + AI 連携` は強い競合軸になる。
  一方で公式ヘルプでは whiteboard のカード数が増えると lag が出やすい前提も見えており、MVP 段階から描画性能と分割戦略を意識する価値がある。

### Obsidian Canvas
- 近さ:
  無限キャンバス上で note / media / web page を置いて整理する点が近い。
- 公式で確認できたこと:
  infinite space、note と media の混在、入れ子 canvas、open JSON Canvas format を採用している。
- 参考:
  https://obsidian.md/canvas
  https://help.obsidian.md/Plugins/Canvas
- 今回プロダクトへの示唆:
  open format と export 互換は長期的に価値が高い。
  一方で Obsidian は汎用 knowledge base なので、こちらは `階層リンク中心の知識カード整理` に寄せた方が差が出しやすい。

### Milanote
- 近さ:
  ビジュアルボード、資料添付、自由配置という意味では近い。
- 公式で確認できたこと:
  notes, images, videos, sketches, PDFs などを board に並べる前提で、クリエイティブ案件の整理に強い。
- 参考:
  https://milanote.com/
- 今回プロダクトへの示唆:
  board の見た目や添付の扱いは参考になるが、知識グラフやカード間の意味リンクは弱い。
  こちらは `構造知識の編集` に寄せる方が立ち位置が明確。

### Capacities
- 近さ:
  知識を connected objects として扱う思想が近い。
- 公式で確認できたこと:
  notes を file ではなく object として扱い、graph や object linking を重視している。
- 参考:
  https://capacities.io/
- 今回プロダクトへの示唆:
  object-first な設計は参考になる。
  ただし UI の主戦場は page / object 側で、canvas 中心ではないため、こちらは `キャンバス上での関係編集` を前面に出しやすい。

### Napkin AI
- 近さ:
  `テキストから視覚構造を作る` という方向性が、本文からカード生成の参考になる。
- 公式で確認できたこと:
  text を入力すると visual を生成し、要素を編集できる。team collaboration や export もある。
- 参考:
  https://www.napkin.ai/
  https://help.napkin.ai/en/articles/10010139-is-napkin-ai-free-to-use
- 今回プロダクトへの示唆:
  本文からカードを自動生成する体験は、単なる note app との差別化に使える。
  ただし Napkin は図解寄りなので、こちらは `知識カード + 階層関係 + 保存可能な編集履歴` を主軸にした方がよい。

## 現時点の差別化候補
- 本文の箇条書きや見出しから子カードを自動生成し、そのまま階層リンクへ反映する。
- Markdown 本文、カード配置、階層関係、添付を同じ編集面で扱う。
- AI 連携を前提に、カード単位・キャンバス単位の入出力を分ける。
- Notion 風の読みやすさと whiteboard 操作を両立し、情報密度を高く保つ。

## 次に見るべき論点
- Heptabase の whiteboard / card 編集体験のどこまでを MVP で取り込むか。
- Obsidian Canvas の export 互換や JSON Canvas 対応を将来検討するか。
- 本文からの自動カード生成を、単純な箇条書き抽出で進めるか、AI 補助前提まで広げるか。
