# Links v4.0 JLCPCB PCBA BOM

元 BOM (`links_v40_schematic.md`) から JLCPCB/LCSC 在庫に合わせて代替品を選定。
ジャック (PJ301M-12 J1–J12) と 2×5 ヘッダー (67996-410HLF JP1) は手実装のため除外。

作成日: 2026-04-16

## 変更点

| 箇所 | 元パーツ | 変更 | 理由 |
|---|---|---|---|
| C3-C5,C7,C8,C10 | Murata GRM188R71E104JA1J | → YAGEO CC0603KRX7R9BB104 | LCSC 在庫なし → YAGEO 同等品 (Basic) |
| C1,C2 | Nichicon UWX1E4R7MCL2GB 4.7µF 電解 | → Samsung CL21A106KAYNNNE 10µF 0805 | LCSC 在庫なし → セラミック SMD 化、容量増 (Basic) |
| C6,C9 | Murata GRM185C1H100JA01J 10pF | → Samsung CL10C150JB8NNNC 15pF | LCSC 在庫なし → 15pF (HF 補償カットオフ 159→106kHz、可聴帯域影響なし) |
| IC2,IC4 | TI TL072CPW TSSOP-8 | → TI TL072CDR SOIC-8 | TSSOP-8 在庫僅少 → SOIC-8 (フットプリント変更要) |

## フットプリント変更

| Refs | 元 | 変更後 | KiCad footprint |
|---|---|---|---|
| C1,C2 | Panasonic A radial 3mm | 0805 SMD | `Capacitor_SMD:C_0805_2012Metric` |
| IC2,IC4 | TSSOP-8 (3×3mm P0.65mm) | SOIC-8 (3.9×4.9mm P1.27mm) | `Package_SO:SOIC-8_3.9x4.9mm_P1.27mm` |

## BOM (JLCPCB PCBA 用)

| Refs | Qty | Value | Package | MPN | Manufacturer | LCSC | Type | $/個 |
|---|---:|---|---|---|---|---|---|---|
| R1 | 1 | 10M | 0603 | RC0603FR-0710ML | YAGEO | C114606 | Ext | $0.001 |
| R2,R4,R5,R12,R13,R21 | 6 | 51Ω | 0603 | ERJ-3EKF51R0V | Panasonic | C403260 | Ext | $0.005 |
| R3,R11,R19 | 3 | 1.0k | 0603 | ERJ-3EKF1001V | Panasonic | C118155 | Ext | $0.005 |
| R15 | 1 | 33k | 0603 | ERJ-3EKF3302V | Panasonic | C278619 | Ext | $0.005 |
| R6-R10,R14,R16-R18,R20 | 10 | 100k 0.1% | 0603 | ERA-3AEB104V | Panasonic | C190609 | Ext | $0.086 |
| C6,C9 | 2 | **15pF C0G** | 0603 | **CL10C150JB8NNNC** | **Samsung** | **C1644** | **Basic** | $0.005 |
| C3-C5,C7,C8,C10 | 6 | 100nF X7R | 0603 | **CC0603KRX7R9BB104** | **YAGEO** | **C14663** | **Basic** | $0.002 |
| C1,C2 | 2 | **10µF 25V** | **0805** | **CL21A106KAYNNNE** | **Samsung** | **C15850** | **Basic** | $0.009 |
| D1,D2 | 2 | 1N5819HW | SOD-123 | 1N5819HW-7-F | Diodes Inc. | C82544 | Ext | $0.013 |
| IC1 | 1 | OPA4171 | TSSOP-14 | OPA4171AIPWR | TI | C529553 | Ext | $0.961 |
| IC2,IC4 | 2 | TL072 | **SOIC-8** | **TL072CDR** | **TI** | **C67473** | Ext | $0.094 |
| IC3,IC5 | 2 | LM321 | SOT-23-5 | LM321MFX/NOPB | TI | C9405 | Ext | $0.035 |
| LED1-LED3 | 3 | WP937EGW | 3mm THT | WP937EGW | Kingbright | C5383216 | Ext | $0.286 |

## 手実装パーツ (PCBA 対象外)

| Refs | Qty | Value | Package | MPN |
|---|---:|---|---|---|
| J1-J12 | 12 | 3.5mm jack | THT | PJ301M-12 (Thonkiconn) |
| JP1 | 1 | 2×5 header | 2.54mm THT | 67996-410HLF |

## コスト概算 (1枚あたり、パーツ費のみ)

| カテゴリ | 概算 |
|---|---|
| Basic パーツ (C, 10点) | ~$0.07 |
| Extended パーツ (R, D, IC, LED, 28点) | ~$2.30 |
| Extended setup fee ($3/種 × 9種) | ~$27.00 |
| **パーツ合計** | **~$2.37/枚** |
| **パーツ + setup (初回)** | **~$29.37** |

※ setup fee は種類あたり $3 で初回のみ。複数枚発注で按分される。
※ PCB 製造費、送料は別途。

## 在庫リスク

| パーツ | LCSC 在庫 | 判定 |
|---|---|---|
| R 51Ω (C403260) | 181 | ⚠ 少 (6個/枚 × 30枚 = 180) |
| R 33k (C278619) | 70 | ⚠ 少 |
| R 100k 0.1% (C190609) | 459 | ⚠ 少 |
| LED WP937EGW (C5383216) | 278 | ⚠ 少 |
| 他 | 数千〜数千万 | ✓ |

在庫少のパーツは発注前に再確認推奨。大量発注の場合は LCSC で同等品 (汎用 0603 抵抗) への追加差し替えも検討。
