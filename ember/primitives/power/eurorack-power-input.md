# EurorackPowerInput

Doepfer 電源ヘッダ + 直列 Schottky リバース保護 + バルクコンデンサ をひとまとめにした subcircuit。Mutable Instruments 系で繰り返し出てくる標準パターンを再現。

## 構成

- [`DoepferHeader`](doepfer-header.md) (`JP1`)
- D1 / D2: **1N5819HW-7-F** (SOD-123) — 直列ブロッキング Schottky
- C1: 47 µF / 25 V 0805 polarized (VCC バルク)
- C2: 47 µF / 25 V 0805 polarized (VEE バルク)

## トポロジ

```
JP1.VEE_A,B ──◄|── D1 (1N5819HW) ──┬── net.VEE  (= −12V rail)
              anode    cathode      │
                                    └── C2 47µF ── net.GND
JP1.GND_A..F ───────────────────────── net.GND
JP1.VCC_A,B ──|►── D2 (1N5819HW) ──┬── net.VCC  (= +12V rail)
              anode    cathode      │
                                    └── C1 47µF ── net.GND
```

- 正常時: 順バイアスで両 rail に通電 (順方向降下 ≈ 0.3 V)
- 逆挿入時: 両 D が逆バイアスで遮断、IC 群は保護される

## 公開 net

subcircuit の外から接続して使う net (global scope):

| net | 説明 |
|---|---|
| `net.VCC` | +12V rail (D2 cathode 側) |
| `net.VEE` | −12V rail (D1 anode 側) |
| `net.GND` | グラウンド |

内部 net (`net.VCC_RAW` / `net.VEE_RAW`) はヘッダ ↔ ダイオードの間にのみ存在。

## 含まないもの

- **IC ごとの 100 nF デカップリング**: モジュール本体側で IC 近くに置く責務 (`<capacitor decouplingFor="..." />` で自動配置を期待)
- **TVS / ヒューズ / PTC**: Mutable はオリジナルで採用してないので含めない。必要なモジュールごとに追加

## 出典

- Mutable schematic (e.g. リポジトリ内 `links/hardware_design/links_v40.pdf` Sheet 3、`archive/eagle_parser/pdfs/braids_v50.pdf`)
- 1N5819HW datasheet: https://www.diodes.com/assets/Datasheets/1N5819HW.pdf

## 関連 Linear

- CMS-260
