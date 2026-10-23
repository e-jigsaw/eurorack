# Stereo Line In rev A — JLCPCB在庫確認

確認日: 2026-09-12 JST。JLCPCBの部品詳細ページで実在庫・発注可能数・PCBA対応を確認。これは在庫監査で、発注用BOMではない。

## 確認できた部品

| 部品 | JLCPCB | 数/台 | パッケージ・値 | 実在庫 | 発注可能数 | 区分 | 状態 |
|---|---|---:|---|---:|---:|---|---|
| INA1650IPWR | [C553130](https://jlcpcb.com/partdetail/C553130) | 1 | TSSOP-14 | 875 | 845 | Extended | 回路の指定型番 |
| OPA1679IPWR | [C2057264](https://jlcpcb.com/partdetail/C2057264) | 2 | TSSOP-14 | 13,146 | 13,061 | Extended | 回路の指定型番 |
| OPA1678IDGKR | [C2863133](https://jlcpcb.com/partdetail/C2863133) | 1 | VSSOP-8 | 2,945 | 2,913 | Extended | 回路の指定型番 |
| LM339BIPWR | [C7430196](https://jlcpcb.com/partdetail/C7430196) | 2 | TSSOP-14 | 4,368 | 4,021 | Extended | 回路の指定型番 |
| TL431BIDBZR | [C41283](https://jlcpcb.com/partdetail/C41283) | 1 | SOT-23-3 | 119,826 | 118,961 | Extended | 回路の指定型番 |
| 1N4148W (ST/Semtech) | [C81598](https://jlcpcb.com/partdetail/C81598) | 6 | SOD-123 | 3,348,302 | 3,079,137 | Basic | 実装候補・未適用 |
| SS14 (MDD) | [C2480](https://jlcpcb.com/partdetail/C2480) | 2 | SMA/DO-214AC | 1,419,052 | 1,330,883 | Basic | 実装候補・未適用 |
| RT1206BRE0790KL | [C871504](https://jlcpcb.com/partdetail/C871504) | 2 | 1206; 90k 0.1% | 4,174 | 3,887 | Extended | 実装候補・未適用 |
| RT0603BRD0750KL | [C861451](https://jlcpcb.com/partdetail/C861451) | 2 | 0603; 50k 0.1% | 246,709 | 219,629 | Extended | 実装候補・未適用 |
| GRM31C5C1H104JA01L | [C97946](https://jlcpcb.com/partdetail/C97946) | 2 | 1206; 100nF 50V C0G 5% | 109,215 | 101,112 | Extended | 実装候補・未適用 |
| RT0805BRD07240KL | [C784586](https://jlcpcb.com/partdetail/C784586) | 1 | 0805; 240k 0.1% | 717 | 624 | Extended | 239kの代替案・未適用 |

上表は全てSMT Assembly / Economic and Standard対応。指定済みICは5型番・計7個すべて在庫あり。候補部品はメーカー・フットプリントの回路への適用前。

## 調達上の未確定点

- 239kΩは上記2検索で該当なし。240kΩ 0.1%の在庫候補があり、最下段閾値は約0.501→0.499 Vpeak。回路変更は未実施。
- 入力AC結合: 1µF、50V以上、5%フィルム×4。型番・実装方式・外形・在庫が未確定。MLCCへの無断置換はしない。
- 電源バルク: 22µF×2、47µF×1、25V以上の電解。型番未選定。
- その他の抵抗、デカップリング100nF×10、帰還10pF C0G×2、LED×8は型番・パッケージ未選定。在庫未確認。
- 6.35mm TRS×2、3.5mm TS×2、10kΩの2連オーディオテーパーポット×1、2x5電源ヘッダ×1は型番未選定。4HPへの収まりとJLCPCBでの実装可否も未確認。
- 全100リファレンスの確認状態を下表とJSONに収録。未確認は在庫ゼロを意味しない。

## 全部品の照合状態

| Ref | 値 | 状態 | 候補 |
|---|---|---|---|
| J_PWR | Eurorack 2x5 keyed | mpn_unselected_stock_unverified | — |
| D_PWR_P | SS14 | package_candidate_not_applied | C2480 |
| D_PWR_N | SS14 | package_candidate_not_applied | C2480 |
| C_BULK_P | 22uF | mpn_unselected_stock_unverified | — |
| C_BULK_N | 22uF | mpn_unselected_stock_unverified | — |
| R_LED_SUPPLY | 47 | mpn_unselected_stock_unverified | — |
| C_LED_BULK | 47uF | mpn_unselected_stock_unverified | — |
| R_REFERENCE | 2.2k | mpn_unselected_stock_unverified | — |
| U_REF | TL431BIDBZR | exact_mpn_stock_verified | C41283 |
| R_TH_TOP_1 | 239k | value_change_candidate_not_applied | C784586 |
| R_TH_BOTTOM_1 | 10k | mpn_unselected_stock_unverified | — |
| R_TH_TOP_2 | 52.3k | mpn_unselected_stock_unverified | — |
| R_TH_BOTTOM_2 | 10k | mpn_unselected_stock_unverified | — |
| R_TH_TOP_3 | 15k | mpn_unselected_stock_unverified | — |
| R_TH_BOTTOM_3 | 10k | mpn_unselected_stock_unverified | — |
| R_TH_TOP_4 | 5.62k | mpn_unselected_stock_unverified | — |
| R_TH_BOTTOM_4 | 10k | mpn_unselected_stock_unverified | — |
| U_RX | INA1650IPWR | exact_mpn_stock_verified | C553130 |
| C_RX_P | 100nF | mpn_unselected_stock_unverified | — |
| C_RX_N | 100nF | mpn_unselected_stock_unverified | — |
| RV1 | 10k dual-gang audio taper | mpn_unselected_stock_unverified | — |
| U_ENV | OPA1678IDGKR | exact_mpn_stock_verified | C2863133 |
| C_ENV_P | 100nF | mpn_unselected_stock_unverified | — |
| C_ENV_N | 100nF | mpn_unselected_stock_unverified | — |
| J_IN_L | 6.35mm TRS | mpn_unselected_stock_unverified | — |
| R_L_P_BLEED | 1M | mpn_unselected_stock_unverified | — |
| R_L_P_SERIES | 1k | mpn_unselected_stock_unverified | — |
| C_L_P_AC | 1uF | mpn_unselected_stock_unverified | — |
| R_L_N_BLEED | 1M | mpn_unselected_stock_unverified | — |
| R_L_N_SERIES | 1k | mpn_unselected_stock_unverified | — |
| C_L_N_AC | 1uF | mpn_unselected_stock_unverified | — |
| U_L | OPA1679IPWR | exact_mpn_stock_verified | C2057264 |
| C_L_VP | 100nF | mpn_unselected_stock_unverified | — |
| C_L_VN | 100nF | mpn_unselected_stock_unverified | — |
| R_L_WIPER_FAIL | 1M | mpn_unselected_stock_unverified | — |
| R_L_GAIN_G | 10k | mpn_unselected_stock_unverified | — |
| R_L_GAIN_F | 90k | package_candidate_not_applied | C871504 |
| C_L_GAIN_F | 10pF | mpn_unselected_stock_unverified | — |
| R_L_OUT | 100 | mpn_unselected_stock_unverified | — |
| R_L_OUT_BLEED | 1M | mpn_unselected_stock_unverified | — |
| J_OUT_L | 3.5mm TS | mpn_unselected_stock_unverified | — |
| R_L_HALF_IN | 100k | mpn_unselected_stock_unverified | — |
| R_L_HALF_FB | 100k | mpn_unselected_stock_unverified | — |
| D_L_HALF_CLAMP | 1N4148W | package_candidate_not_applied | C81598 |
| D_L_HALF_RECT | 1N4148W | package_candidate_not_applied | C81598 |
| R_L_ABS_RAW | 100k | mpn_unselected_stock_unverified | — |
| R_L_ABS_HALF | 50k | package_candidate_not_applied | C861451 |
| R_L_ABS_FB | 20k | mpn_unselected_stock_unverified | — |
| D_L_PEAK | 1N4148W | package_candidate_not_applied | C81598 |
| R_L_ATTACK | 1k | mpn_unselected_stock_unverified | — |
| C_L_HOLD | 100nF | package_candidate_not_applied | C97946 |
| R_L_RELEASE | 1M | mpn_unselected_stock_unverified | — |
| U_METER_L | LM339BIPWR | exact_mpn_stock_verified | C7430196 |
| C_L_CMP | 100nF | mpn_unselected_stock_unverified | — |
| R_L_LED_1 | 10k | mpn_unselected_stock_unverified | — |
| LED_L_1 | green | mpn_unselected_stock_unverified | — |
| R_L_LED_2 | 10k | mpn_unselected_stock_unverified | — |
| LED_L_2 | green | mpn_unselected_stock_unverified | — |
| R_L_LED_3 | 10k | mpn_unselected_stock_unverified | — |
| LED_L_3 | amber | mpn_unselected_stock_unverified | — |
| R_L_LED_4 | 10k | mpn_unselected_stock_unverified | — |
| LED_L_4 | red | mpn_unselected_stock_unverified | — |
| J_IN_R | 6.35mm TRS | mpn_unselected_stock_unverified | — |
| R_R_P_BLEED | 1M | mpn_unselected_stock_unverified | — |
| R_R_P_SERIES | 1k | mpn_unselected_stock_unverified | — |
| C_R_P_AC | 1uF | mpn_unselected_stock_unverified | — |
| R_R_N_BLEED | 1M | mpn_unselected_stock_unverified | — |
| R_R_N_SERIES | 1k | mpn_unselected_stock_unverified | — |
| C_R_N_AC | 1uF | mpn_unselected_stock_unverified | — |
| U_R | OPA1679IPWR | exact_mpn_stock_verified | C2057264 |
| C_R_VP | 100nF | mpn_unselected_stock_unverified | — |
| C_R_VN | 100nF | mpn_unselected_stock_unverified | — |
| R_R_WIPER_FAIL | 1M | mpn_unselected_stock_unverified | — |
| R_R_GAIN_G | 10k | mpn_unselected_stock_unverified | — |
| R_R_GAIN_F | 90k | package_candidate_not_applied | C871504 |
| C_R_GAIN_F | 10pF | mpn_unselected_stock_unverified | — |
| R_R_OUT | 100 | mpn_unselected_stock_unverified | — |
| R_R_OUT_BLEED | 1M | mpn_unselected_stock_unverified | — |
| J_OUT_R | 3.5mm TS | mpn_unselected_stock_unverified | — |
| R_R_HALF_IN | 100k | mpn_unselected_stock_unverified | — |
| R_R_HALF_FB | 100k | mpn_unselected_stock_unverified | — |
| D_R_HALF_CLAMP | 1N4148W | package_candidate_not_applied | C81598 |
| D_R_HALF_RECT | 1N4148W | package_candidate_not_applied | C81598 |
| R_R_ABS_RAW | 100k | mpn_unselected_stock_unverified | — |
| R_R_ABS_HALF | 50k | package_candidate_not_applied | C861451 |
| R_R_ABS_FB | 20k | mpn_unselected_stock_unverified | — |
| D_R_PEAK | 1N4148W | package_candidate_not_applied | C81598 |
| R_R_ATTACK | 1k | mpn_unselected_stock_unverified | — |
| C_R_HOLD | 100nF | package_candidate_not_applied | C97946 |
| R_R_RELEASE | 1M | mpn_unselected_stock_unverified | — |
| U_METER_R | LM339BIPWR | exact_mpn_stock_verified | C7430196 |
| C_R_CMP | 100nF | mpn_unselected_stock_unverified | — |
| R_R_LED_1 | 10k | mpn_unselected_stock_unverified | — |
| LED_R_1 | green | mpn_unselected_stock_unverified | — |
| R_R_LED_2 | 10k | mpn_unselected_stock_unverified | — |
| LED_R_2 | green | mpn_unselected_stock_unverified | — |
| R_R_LED_3 | 10k | mpn_unselected_stock_unverified | — |
| LED_R_3 | amber | mpn_unselected_stock_unverified | — |
| R_R_LED_4 | 10k | mpn_unselected_stock_unverified | — |
| LED_R_4 | red | mpn_unselected_stock_unverified | — |

在庫は確認時点の値。発注前の再確認が必要。回路の部品値・接続はこの監査では変更していない。
