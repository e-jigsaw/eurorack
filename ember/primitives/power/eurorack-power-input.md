# EurorackPowerInput

Eurorack モジュールの電源入力 subcircuit。Doepfer 2×5 power header にバルクコンデンサを 2 個ぶら下げただけのシンプルな構成。

## 構成

- [`DoepferHeader`](doepfer-header.md) (`JP1`) — 2×5 box header
- C1: **22 µF / 25 V / 0805 polarized** (VCC バルク)
- C2: **22 µF / 25 V / 0805 polarized** (VEE バルク)

## トポロジ

```
JP1.VEE_A,B ──────┬── net.VEE  (= −12V rail)
                  └── C2 22µF ── net.GND
JP1.GND_A..F ─────── net.GND
JP1.VCC_A,B ──────┬── net.VCC  (= +12V rail)
                  └── C1 22µF ── net.GND
```

## 含まないもの (= 意図的に省略)

- **逆挿入保護**: Doepfer box header の notch + 正規 ribbon ケーブル (Tiptop / Make Noise / Erica / Doepfer 純正等) の IDC コネクタキーで物理的に逆挿し不可、保護回路は冗長。MiniOSC v2.1 等の DIY 流派と同じ判断。Mutable 商用品は保険として 1N5819HW × 2 を入れていたが、ember では省略
- **IC ごと 100 nF デカップリング**: モジュール本体で IC ごとに付ける責務 (下記)

## デカップリングのお作法

各 IC の VCC / VEE ピンに **100 nF X7R 0603 を 1 個ずつ**、IC 近傍に置く。tscircuit の `decouplingFor` / `decouplingTo` props を使うと自動配置される:

```tsx
<chip name="U1" footprint="soic8" pinLabels={{ pin4: "VEE", pin8: "VCC", ... }}
  connections={{ VCC: "net.VCC", VEE: "net.VEE" }} />

<capacitor
  name="C_DEC_VCC_U1"
  capacitance="100nF"
  footprint="0603"
  decouplingFor="U1.VCC"
  decouplingTo="net.GND"
/>
<capacitor
  name="C_DEC_VEE_U1"
  capacitance="100nF"
  footprint="0603"
  decouplingFor="U1.VEE"
  decouplingTo="net.GND"
/>
```

IC が N 個あれば 2N 個のデカップリング。命名規約は `C_DEC_{VCC|VEE}_{IC name}`。

## 公開 net

| net | 説明 |
|---|---|
| `net.VCC` | +12V rail |
| `net.VEE` | −12V rail |
| `net.GND` | グラウンド |

## 出典

- Doepfer A-100 technical: https://doepfer.de/a100_man/a100t_e.htm
- MiniOSC v2.1 schematic (保護なし参考): `/Users/jigsaw/dev/github.com/e-jigsaw/MiniOSC/docs/MiniOSC v2.1 - Schematics.png`

## 関連 Linear

- CMS-260
