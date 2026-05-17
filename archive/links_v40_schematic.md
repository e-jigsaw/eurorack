# Links v4.0 回路図リコンストラクション メモ

公開 PDF (`links_v40.pdf`, cc-by-sa, Émilie Gillet, 2019-02-04) と BOM (`Links.xlsx`) を突合して整理した構成情報。KiCad 10 で新規に `.kicad_sch` を起こす際の出発点。

## モジュール概要

Mutable Instruments Links — ユーティリティ "Multiples"。1 枚の sch に 3 ブロック + 電源部を同居。

| ブロック | 機能 | 主要 IC | 入力 | 出力 |
|---|---|---|---|---|
| **1 to 3** | バッファードマルチ (1 入力を 3 分岐) | IC1 (OPA4171 quad) A/C/D | J1 | J2, J3, J4 |
| **2 to 2** | ユーティリティ加算 (2 入力 sum → 2 出力に分配) | IC2 (TL072) + IC3 (LM321) | J5, J6 | J7, J8 |
| **3 to 1** | 加算ミキサ (3 入力 → 1 出力) | IC4 (TL072) + IC5 (LM321) | J9, J10, J11 | J12 |
| **Power** | ±12V 逆接保護 + バルク/デカップリング | D1, D2, C1–C10 | JP1 (2×5) | — |

各ブロックの LED (WP937EGW, R/G bicolor 2 端子) は単 op-amp (IC1B / IC3 / IC5) + 1kΩ (R3/R11/R19) で駆動、アクティビティ表示。

## BOM (PDF 突合済み、不一致ゼロ)

| 種別 | 値 | 個数 | Package | MPN | Refdes |
|---|---|---:|---|---|---|
| R | 10M | 1 | 0603 | RC0603FR-0710ML | R1 |
| R | 51Ω | 6 | 0603 | ERJ-3EKF51R0V | R2, R4, R5, R12, R13, R21 |
| R | 1.0k | 3 | 0603 | ERJ-3EKF1001V | R3, R11, R19 |
| R | 33k | 1 | 0603 | ERJ-3EKF3302V | R15 |
| R | 100k 0.1% | 10 | 0603 | ERA-3AEB104V | R6–R10, R14, R16–R18, R20 |
| C | 10p C0G | 2 | 0603 | GRM185C1H100JA01J | C6, C9 |
| C | 100n | 6 | 0603 | GRM188R71E104JA1J | C3–C5, C7, C8, C10 |
| C | 4.7µF 電解 ≥25V | 2 | Panasonic A (3mm) | UWX1E4R7MCL2GB | C1, C2 |
| D | 1N5819HW | 2 | SOD123 | 1N5819HW-7-F | D1, D2 |
| IC | OPA4171 | 1 | TSSOP14 | OPA4171AIPW | IC1 |
| IC | TL072 | 2 | TSSOP8 | TL072CPW | IC2, IC4 |
| IC | LM321 | 2 | SOT23-5 | LM321MFX/NOPB | IC3, IC5 |
| LED | R/G 2-term | 3 | 3mm THT | WP937EGW | LED1, LED2, LED3 |
| J | 3.5mm vertical jack | 12 | — | PJ301M-12 | J1–J12 |
| Header | 2×5 male 2.54mm | 1 | — | 67996-410HLF | JP1 |

PCB: 19.0 × 108.4 mm、2 層。

## 主要 net (確定版)

### 電源 (JP1 2×5 Doepfer 標準)

```
JP1.1, JP1.2  → VEE_IN (−12V ribbon stripe 側)
JP1.9, JP1.10 → VCC_IN (+12V)
JP1.3–8       → GND (中央 6 pin)

VEE_IN → D2 1N5819HW (cathode=VEE_IN) → VEE
VCC_IN → D1 1N5819HW (anode=VCC_IN)   → VCC

C1 4.7µF: VCC–GND バルク (+ 極が VCC)
C2 4.7µF: VEE–GND バルク (+ 極が GND)
C3, C5, C8: 100n × 3 を VCC–GND (IC1, IC2+IC3, IC4+IC5 近傍)
C4, C7, C10: 100n × 3 を VEE–GND (同上)

IC1  (OPA4171 TSSOP14): V+ = pin 4, V− = pin 11 → VCC, VEE
IC2  (TL072  TSSOP8):   V+ = pin 8, V− = pin 4  → VCC, VEE
IC4  (TL072  TSSOP8):   V+ = pin 8, V− = pin 4  → VCC, VEE
IC3  (LM321  SOT23-5):  V+ = pin 5, V− = pin 2  → VCC, VEE
IC5  (LM321  SOT23-5):  V+ = pin 5, V− = pin 2  → VCC, VEE
```

### 1 to 3 (IC1 OPA4171)

```
J1.P1  → IN1
R1 10M : IN1 ↔ GND                 ; 高Zプルダウン

IN1 → IC1A(+)=3, IC1C(+)=10, IC1D(+)=12, IC1B(+)=5   (4 並列分岐)

; 3 系統ボルテージフォロワ
IC1A(−)=2  ↔ IC1A(out)=1  → R5 51 → J4.P1 ; OUT4
IC1C(−)=9  ↔ IC1C(out)=8  → R2 51 → J2.P1 ; OUT2
IC1D(−)=13 ↔ IC1D(out)=14 → R4 51 → J3.P1 ; OUT3

; 活動表示 (bicolor LED driver)
IC1B(−)=6  ↔ IC1B(out)=7
IC1B(out)  → LED1 → R3 1k → GND          ; 出力正=緑側, 負=赤側
```

### 2 to 2 (IC2 TL072 + IC3 LM321)

```
J5.P1 → IN5
J6.P1 → IN6

; Stage 1: IC2A = 反転加算 (ゲイン -1/入力)
IN5 → R8 100k ┐
IN6 → R9 100k ├→ IC2A(−)=2 [SUM_A]
IC2A(+)=3 → GND
R6 100k FB : IC2A(−)=2 ↔ IC2A(out)=1

; Stage 2: IC2B = 反転 (ゲイン -1) で極性戻し
IC2A(out)=1 → R10 100k → IC2B(−)=6 [SUM_B]
IC2B(+)=5 → GND
R7 100k FB : IC2B(−)=6 ↔ IC2B(out)=7
C6 10p ∥ R7 (HF 補償)

; 出力: J7=J8 = +(J5+J6)
IC2B(out)=7 → R12 51 → J7.P1
IC2B(out)=7 → R13 51 → J8.P1

; 活動表示
IC2B(out) → IC3(+)=3
IC3(−)=4 ↔ IC3(out)=1  ; ボルテージフォロワ (LM321)
IC3(out)=1 → LED2 → R11 1k → GND
```

### 3 to 1 (IC4 TL072 + IC5 LM321)

```
J9.P1  → IN9
J10.P1 → IN10
J11.P1 → IN11

; Stage 1: IC4A = 反転加算 (ゲイン -1/3/入力、R15=33k feedback)
IN9  → R18 100k ┐
IN10 → R20 100k ├→ IC4A(−)=2 [SUM3_A]
IN11 → R17 100k ┘
IC4A(+)=3 → GND
R15 33k FB : IC4A(−)=2 ↔ IC4A(out)=1    ; ゲイン -1/3

; Stage 2: IC4B = 反転 (ゲイン -1) で極性戻し
IC4A(out)=1 → R14 100k → IC4B(−)=6 [SUM3_B]
IC4B(+)=5 → GND
R16 100k FB : IC4B(−)=6 ↔ IC4B(out)=7
C9 10p ∥ R16 (HF 補償)

; 出力: J12 = +(J9+J10+J11)/3
IC4B(out)=7 → R21 51 → J12.P1

; 活動表示
IC4B(out) → IC5(+)=3
IC5(−)=4 ↔ IC5(out)=1  ; ボルテージフォロワ
IC5(out)=1 → LED3 → R19 1k → GND
```

## 未確定項目

全て解決済み (PDF + BOM + quickstart マニュアル + データシート突合で確定)。

残課題は **sch 上の LED1/2/3 の向き** (bicolor 2 端子なので A/K を逆転させると色割当が入れ替わる) のみ。quickstart PDF 上で緑点灯が確認できる方向に合わせる。電気的には動作に影響なし。

## 推奨 KiCad シンボル/フットプリント

| 部品 | シンボル (KiCad 10 公式) | フットプリント |
|---|---|---|
| OPA4171 | `Amplifier_Operational:OPA4171AIPWxxx` or 汎用 TL074 互換 | `Package_SO:TSSOP-14_4.4x5mm_P0.65mm` |
| TL072 | `Amplifier_Operational:TL072` | `Package_SO:TSSOP-8_3x3mm_P0.65mm` |
| LM321 | `Amplifier_Operational:LM321` | `Package_TO_SOT_SMD:SOT-23-5` |
| 1N5819HW | `Diode:1N5819` | `Diode_SMD:D_SOD-123` |
| 抵抗 | `Device:R` | `Resistor_SMD:R_0603_1608Metric` |
| セラコン | `Device:C` | `Capacitor_SMD:C_0603_1608Metric` |
| 電解 4.7µF | `Device:C_Polarized` | `Capacitor_THT:CP_Radial_D3.0mm_P1.50mm` |
| LED bicolor | `Device:LED` (2 端子) | `LED_THT:LED_D3.0mm` + ホルダ Multicomp LED3-10 |
| PJ301M-12 | 自作 or mutable-instruments library | Thonkiconn 用フットプリント |
| 2×5 header | `Connector_Generic:Conn_02x05_Odd_Even` | `Connector_PinHeader_2.54mm:PinHeader_2x05_P2.54mm_Vertical` |

PJ301M-12 フットプリントは KiCad 公式に無いので自作必要 (既存 `import/links_v40.9.pretty/` に変換済みのがあるはず)。

## 進捗状況 (2026-04-15 時点)

### 完了: KiCad 10 向け sch scaffold + フル接続

`kicad/` サブディレクトリに以下を生成済み:

- `links_v40.kicad_pro` — プロジェクト設定
- `links_v40.kicad_sch` — 62 シンボル + 146 net label、**ERC 0 エラー / 28 警告**
- `links_v40.kicad_pcb` — 空 (Update PCB from Schematic 待ち)

**sch の特徴**
- KiCad 10 公式標準ライブラリ (`Amplifier_Operational:TL074/TL072/LM321`, `Diode:1N5819`, `Device:R/C/C_Polarized/LED`, `Connector_Audio:AudioJack2_Ground_SwitchT`, `Connector_Generic:Conn_02x05_Odd_Even`) を使用。OPA4171 は TL074 シンボルで代替 (pin 互換)。
- 上記「主要 net (確定版)」セクションの接続をすべて実装済み。
- 未使用の jack スイッチ pin (S, TN) には `(no_connect)` マーカー。
- VCC/VEE/GND は `power:*` シンボル、各ネットに `PWR_FLAG`。
- 部品配置は 4 列グリッド (1:3 / 2:2 / 3:1 / 電源) に 1.27mm スナップ。

**残 28 警告の内訳 (電気的影響なし)**
- 13 × `lib_symbol_mismatch`: 内蔵 lib_symbols と外部ライブラリの差異。GUI で一度保存すれば解消。
- 12 × `footprint_link_issues`: PJ301M-12 フットプリントが KiCad 公式 lib に無い。後述の対処要。
- 3 × `endpoint_off_grid`: PWR_FLAG 配置位置由来、実害なし。

### 次の作業手順

1. **KiCad 10 GUI で sch を開く → 保存**  
   lib_symbol_mismatch 警告が解消される。

2. **PJ301M-12 フットプリント移植**  
   `import/links_v40.9.pretty/PJ301M-12.kicad_mod` 相当が存在するはず。`kicad/links_v40.pretty/` を作成してコピー、`fp-lib-table` に登録。または Thonk/Mutable 公式のフットプリントを別途取得。

3. **PCB 作成**  
   KiCad GUI で sch → Tools → Update PCB from Schematic で部品を PCB に流し込み。  
   レイアウトは以下のいずれか:
   - 完全新規: `import/links_v40.9.kicad_pcb` を隣に並べて視覚参照で手配線
   - 移植: `import/` の PCB から配線 + 配置だけ抽出して新規 PCB にコピペ (可能か未検証)

4. **LED 向き確認**  
   `links_quickstart.pdf` の実機写真で緑点灯状態を確認 → LED1/2/3 の A/K 向きを合わせる。sch では `Device:LED` の向きを反転するだけ。

## 参照

- PDF 回路図: `links_v40.pdf` (本ディレクトリ)
- BOM: `Links.xlsx` (本ディレクトリ)
- KiCad 10 ネイティブプロジェクト: `kicad/links_v40.*` (本ディレクトリ配下)
- 既存 Autodesk 変換 PCB: `import/links_v40.9.kicad_pcb` (参照用、レイアウト逆引きに使う)
- 移行ガイド全体: `../../docs/eagle-to-kicad-migration.md` (ルート A/B/C 比較あり)
