# ember

Mutable Instruments モジュール群を tscircuit (TypeScript / React ベースの回路 + PCB 設計) に順次再構築するアセット集。

## 方針

- 単発移植ではなく、Eurorack 共通プリミティブと回路ブロックをアセットとして積み上げる
- EAGLE 資産を高忠実度で持ち上げる方向は採らない (PDF 再構築や Eagle 変換ツールは `../archive/` 配下)
- 「KiCad で書いたほうが速い」と感じても、アセット化を優先

## 試作台

Mutable Instruments **Links** v4.0 (4 HP、3 ブロック + 電源) を最初の実装ターゲットとする。

## 構成

- `primitives/` — 再利用コンポーネント (ジャック、電源ヘッダ、パネル等)
  - `jacks/pj301m-12.tsx` — Thonkiconn 3.5mm vertical mono jack ([詳細](primitives/jacks/pj301m-12.md))
- `links-control.circuit.tsx` — 制御面ボード。ジャック / LED / オス側インターコネクトヘッダのみ (100% THT、裸基板発注)
- `links-main.circuit.tsx` — メインボード。回路 / 電源 / メス側インターコネクトソケット (SMD、実装済み基板発注)

2 枚は `primitives/headers/interconnect-header.tsx` のヘッダ列で嵌合する (メインボードを裏返して制御面ボードに重ねる想定)。整合性は `bun run check:interconnect` で検証する (要ビルド後の `circuit.json`)。

## Links 単板試作

`links-single.circuit.tsx` は 19 × 108.4 mm・2層の単板版。ジャックと LED が表、回路と電源コネクタが裏。既存2枚基板の entry は残してある。

原典 EAGLE **回路図**から54部品・34ネットを抽出し、新しい配置を tscircuit で配線する。2026-09-10の修正でIC3/IC5の各電源に100nF（C11〜C14）を追加し、単板は58部品になった。原典 PCB の配線は取り込まない。入力ジャックの normal→GND、LED を含む帰還回路、電源の逆接保護を原典に合わせた。LM321 のピン番号と TSSOP の4.4 mm本体幅は単板版で明示している。

```bash
python3 scripts/extract-links-reference.py --check  # 原典と抽出データを照合
bun run typecheck
bun run build:single                              # 単板ビルド + 導通/DRC/DFM
bun run preview:single                            # 上記 + PCB/回路図 PNG
```

出力先は `dist/links-single/`。`check:single` は部品数・抵抗/容量値・原典とのネット一致に加え、実配線の導通と DRC を検証する。CLI がエラーを含んだまま終了コード0を返しても検証側で落とす。空の配線を DFM 合格として扱わない。

これは回路・配線の試作。両面GND面と10本の近接GNDビア接続を追加済み。各IC電源→100nFの実配線は1.725〜3.294 mm・ビア0、GNDパッド→近接ビアは0.9〜1.6 mm・幅0.3 mm。ビアから電源ヘッダまではtop GND面内に0.5 mm以上の幅の経路があることを幾何検査する。

配線長警告10件は残るが、GND面と近接ビアを含まない既存GND枝の長さであり、局所戻りの検査は別のゲートで行う。コネクタ向き警告5件は垂直挿入ジャックに対する既知の警告。製造承認や実機の発振・ノイズ検証を意味しない。

`modules/links/single-board/fixed-routes.json` はローカルルータ出力のビア間隔を個別修正し、GND接続を追加した経路入力。`fixed-router.ts` から通常のtscircuitインポート・銅箔生成・DRCに渡す。配線入力のbounds/障害物/ネットが変わるとSHA-256ガードで停止するため、部品配置・接続を変更した場合は経路を再生成・レビューして更新する。生成済みcircuit.jsonのエラーを書き換えて合格させる方式ではない。

GND面と局所経路の追加検査（Shapely 2.1.2、Python 3）:

```bash
python3 -m venv /tmp/links-geometry-venv
/tmp/links-geometry-venv/bin/pip install -r scripts/requirements-links-geometry.txt
/tmp/links-geometry-venv/bin/python scripts/check-links-decoupling.py dist/links-single/circuit.json
bunx tsci check shorts dist/links-single/circuit.json --mode gerber --pixels-per-mm 40
```

C1/C2 は原典と同じ公称4.7 µFを0805セラミックとして配置しており、実部品のDCバイアス特性と調達品番は未確定。ジャック寸法・パネル適合・部品の高さ・実機動作は現物検証が必要。旧2枚基板には旧LM321ピン定義と廃止された `sequential_trace` 設定が残っているため、旧版の過去のDRC合格を電気的正しさの証明として扱わない。

## 開発

```bash
bunx tsci dev      # http://localhost:3020 でライブプレビュー
bunx tsci build    # ビルド検証
bunx tsci snapshot # PCB / schematic SVG を __snapshots__/ に出力
```

## Linear

[tscircuit Eurorack](https://linear.app/cmsn/project/tscircuit-eurorack-cd01aea01d05) (Nok Audio initiative)
