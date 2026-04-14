# Eagle → KiCad 移行調査レポート

このリポジトリの古い Eagle 形式 (`.brd`/`.sch`) を最新 KiCad で扱えるようにするための移行手順と、試行錯誤で得た知見のまとめ。2026-04 時点の調査。

## 背景

- `hardware_design/pcb/*.brd`, `*.sch` は Autodesk 買収以前の **Eagle v4 バイナリ形式** (2008 年以前の独自バイナリ)
- KiCad 内蔵の Import Non-KiCad Project は Eagle 6.0+ XML 形式前提なので、v4 バイナリは読めない
- 最新 KiCad の現行ファイル形式は `(kicad_pcb (version 20260206))` (日付ベース YYYYMMDD)

最初に試したのは `links` モジュール。以降の記述は links の結果だけど、他モジュールにも同じ傾向が出るはず。

## 試した 2 ルート

### ルート A: Autodesk EAGLE 9.7 で手動変換

- Autodesk EAGLE 9.7 (GUI) で `.brd`/`.sch` を開いて保存し直すと、Eagle v4 バイナリ → Eagle 9.x XML に変換される (`links_v40.9.brd`, `links_v40.9.sch`)
- その XML を KiCad 内蔵 Import Non-KiCad Project に食わせて `.kicad_pcb`/`.kicad_sch` を生成
- 成果物: `links/hardware_design/import/`

### ルート B: pcb-rnd で完全ヘッドレス変換 (Docker)

Eagle v4 バイナリを OSS の pcb-rnd で直読みする構成。`tools/eagle-convert/` に Dockerfile を用意した:

```
Eagle v4 bin
  → pcb-rnd (io_eagle 読み込み)
    → pcb-rnd (io_kicad 書き出し) → kicad_pcb v3 (KiCad 4/5 世代)
      → kicad-cli pcb upgrade → kicad_pcb v20260206
```

使い方:

```bash
docker build --platform linux/amd64 -t eurorack-eagle-convert tools/eagle-convert

docker run --rm --platform linux/amd64 \
  -v "$PWD/links/hardware_design/pcb":/in:ro \
  -v "$PWD/links/hardware_design/out":/out \
  eurorack-eagle-convert \
  /in/links_v40.brd /out/links_v40.kicad_pcb
```

## DRC 比較 (links_v40)

KiCad 10.0.0 の `kicad-cli pcb drc --severity-all --refill-zones` で両方の出力を走査した結果:

| 違反種別 | ルート A (Autodesk) | ルート B (pcb-rnd) |
|---|---:|---:|
| **shorting_items** | 0 | **25** |
| **unconnected_items** | 0 | **13** |
| **clearance** | 0 | **6** |
| **solder_mask_bridge** | 0 | **31** |
| **track_dangling** | 0 | **39** |
| **isolated_copper** | 0 | 2 |
| silk_over_copper | 1 | 199 |
| silk_overlap | 9 | 199 |
| silk_edge_clearance | 1 | 9 |
| nonmirrored_text_on_back_layer | 1 | 4 |
| text_height | 39 | 1 |
| text_thickness | 3 | 1 |
| lib_footprint_mismatch | 29 | 0 |
| **合計** | **83** | **516 + 13 unconnected** |

ルート A は全部 cosmetic/metadata 系 (text 属性, シルク位置, ライブラリ参照差異) で **電気的エラーゼロ**。基板として生きてる。

ルート B は **電気的に壊れてる** (ショート 25, 未接続 13, クリアランス違反 6, マスクブリッジ 31, 宙ぶらりん配線 39)。DRC 以前にそのままでは動かない基板。

## 壊れた箇所の切り分け

pcb-rnd の変換ログで 2 段階のロスを確認:

### [1] 読み込み段階: ネットリスト欠損

```
W: Failed to parse contactref node: missing "element" or "pad" netlist attributes
```

pcb-rnd 3.1.6 の `io_eagle` プラグインが Eagle v4 バイナリの `contactref` ノードの一部を正しくパースできず、ネット接続情報が失われる。→ **unconnected 13 本** の原因。

### [3] 書き出し段階: パッドスタック/レイヤーのダウングレード

pcb-rnd の `io_kicad` プラグインが吐ける KiCad S-expr は **version 3 (KiCad 4/5 世代) 止まり**。KiCad 6 以降の角丸パッド/複雑な padstack を表現できず、以下のワーニングとともに古典的な「round uniform via」に丸められる:

```
padstack-shape: Can not convert padstack to old-style via (×62)
layer: ... (×86)
padstack-nonterm: ... (×12)
text-mirror-x: ... (×5)
```

この丸め込みが shorting / clearance / mask bridge / silk 崩壊の原因。後段の `kicad-cli pcb upgrade` は単なる再保存で、失われた情報は復元できない。

### 迂回路の試行 (失敗)

Eagle XML (v6+) に書き戻してから KiCad 内蔵インポータに回せば [3] を迂回できるかと思ったが、pcb-rnd の `io_eagle` は **read-only**:

```
E: Can't write PCB: internal error: io plugin eagle dru doesn't implement write_pcb()
```

というわけで pcb-rnd ルートでの救済策はなし。

## 結論と推奨

### 移行は Autodesk EAGLE 経由で行う

- Autodesk EAGLE 9.x は Eagle v4 バイナリ → Eagle 9.x XML 変換を正しく行える唯一の現実解
- KiCad 内蔵 Import Non-KiCad Project は Eagle 9.x XML を、**ネットリスト/パッドスタック保持**で `.kicad_pcb` に変換できる
- 残る DRC エラー (links で 83 件) はすべて cosmetic/metadata 系なので、以下の順で処理:
  1. `.kicad_dru` か Board Setup で `text_height`, `text_thickness`, `silk_over_copper`, `silk_overlap`, `silk_edge_clearance`, `nonmirrored_text_on_back_layer`, `lib_footprint_mismatch` を ignore/warning に落とす
  2. Tools → Update Footprints from Library でライブラリ再リンク (またはコンバータ生成ライブラリから KiCad 標準フットプリントへ張り替え)
  3. シルク系は最後に Edit Text & Graphics Properties で一括補正

### Autodesk EAGLE EOL 対策

Autodesk EAGLE は **2026-06 に完全 EOL**、インストーラ配布終了予定。eurorack の他モジュール (全 20 以上) の移行を考えると、EOL までに残りの `.brd`/`.sch` も XML 化しておくのが安全。最低限以下を退避:

- EAGLE 9.7 の macOS/Windows インストーラ (`.dmg`/`.msi`)
- Autodesk ID でのサインイン認証済み設定

### pcb-rnd Docker ツール (`tools/eagle-convert/`) の扱い

このツールは「実用変換ツール」としては使えない (上記の通り)。ただし以下の価値はある:

- Autodesk EAGLE がどうしても入手不能になった場合の最終手段として残す
- ネットリスト欠損とパッドスタック丸め込みを手動でフォローする覚悟が必要

もし残すなら、Dockerfile 冒頭に本ドキュメントへのリンクと「変換品質の注意喚起」を明記すべき。不要なら削除して構わない。

## 参考

- pcb-rnd 公式ドキュメント: http://repo.hu/projects/pcb-rnd/
- KiCad CLI リファレンス: https://docs.kicad.org/master/en/cli/cli.html
- KiCad 公式 Docker イメージ: https://hub.docker.com/r/kicad/kicad
- Debian pcb-rnd パッケージ: https://packages.debian.org/sid/pcb-rnd
