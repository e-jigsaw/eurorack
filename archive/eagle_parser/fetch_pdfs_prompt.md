# Claude Code 用 prompt: Mutable Instruments PDF 回路図一括ダウンロード

## 背景

Eagle バイナリ `.sch` → KiCad 10 変換用のパーサを書いている。座標エンコーディングや
配置の当たりをつけるグラウンドトゥルースとして、pichenettes が公開している PDF
回路図を全モジュール分ローカルに落としておきたい。

## タスク

1. 保存先: `eurorack/tools/eagle_parser/pdfs/` (無ければ作る)
2. 以下の URL を全部 DL。404 などで失敗したら、対応モジュールの
   `eurorack/<module>/hardware_design/pcb/` 配下の `.sch` ファイル名からバージョン
   違い (例: `v40` → `v41`, `v50`, `v05` など) を推測して再試行。
   複数 `.sch` があるモジュール (例: shelves, streams) は全部試す。
3. 最終的にどれを取得できたか / 失敗したかを一覧で報告。

## URL リスト (一次試行)

```
https://pichenettes.github.io/mutable-instruments-documentation/modules/blades/downloads/blades_v40.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/blinds/downloads/blinds_v60.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/braids/downloads/braids_v50.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/branches/downloads/branches_v40.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/clouds/downloads/clouds_v30.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/ears/downloads/ears_v40.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/edges/downloads/edges_expander_v01.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/elements/downloads/elements_v02.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/frames/downloads/frames_v03.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/grids/downloads/grids_v02.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/kinks/downloads/kinks_v41.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/marbles/downloads/marbles_v70.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/peaks/downloads/peaks_v30.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/plaits/downloads/plaits_v50.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/rings/downloads/rings_v30.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/ripples/downloads/ripples_v40.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/shades/downloads/shades_v30.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/shelves/downloads/shelves_expander_v10.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/shelves/downloads/shelves_v60.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/stages/downloads/stages_v70.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/streams/downloads/streams_v05.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/tides/downloads/tides_v40.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/tides2/downloads/tides2_v40.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/veils/downloads/veils_v110.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/volts/downloads/volts_v01.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/warps/downloads/warps_v30.pdf
https://pichenettes.github.io/mutable-instruments-documentation/modules/yarns/downloads/yarns_v03.pdf
```

Links は既に `eurorack/links/hardware_design/links_v40.pdf` にあるので対象外。

## 注意

- 既に `pdfs/` 配下に同名ファイルがあればスキップ
- curl なり wget なり好きなツールでいい
- HTTP 200 && file size > 0 で成功判定
- 失敗した URL は、モジュール名 + 手元の `.sch` basename から代替候補 (複数)
  を試してから諦める
