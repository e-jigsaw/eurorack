# Stereo Line In rev D — 選定部品と在庫照合

2026-09-13確認。101部品を全件照合。JLCPCB調達は30型番・87部品、全型番に必要数以上の在庫あり。ほかは手持ちポット/出力ジャック、国内購入NJ3FD-V、別途購入して自前実装するLED8個。

在庫数は公式部品詳細の公開データから取得。旧rev Aの在庫表は更新せず履歴として保持。BOM/CPLのアップロード、発注・予約は未実施。

| 用途 / Ref | 値 | メーカー / 型番 | JLC | 数/台 | 在庫 / 発注可能数 | 実装 |
|---|---|---|---|---:|---:|---|
| J_PWR | Eurorack 2x5 keyed | ZHOURI / DC3-2.54-10PAS | [C2977596](https://jlcpcb.com/partdetail/C2977596) | 1 | 8,155 / 7,970 | manualWeld |
| D_PWR_P, D_PWR_N | SS14 | MDD(Microdiode Semiconductor) / SS14 | [C2480](https://jlcpcb.com/partdetail/C2480) | 2 | 1,417,596 / 1,329,186 | smtWeld |
| C_BULK_P, C_BULK_N | 22uF | Honor Elec / RVT1E220M0505 | [C15848](https://jlcpcb.com/partdetail/C15848) | 2 | 6,301 / 5,527 | smtWeld |
| R_LED_SUPPLY | 47 | UNI-ROYAL(Uniroyal Elec) / 0603WAF470JT5E | [C23182](https://jlcpcb.com/partdetail/C23182) | 1 | 1,584,477 / 1,406,144 | smtWeld |
| C_LED_BULK | 47uF | Honor Elec / RVT1E470M0605 | [C30034](https://jlcpcb.com/partdetail/C30034) | 1 | 11,306 / 11,094 | smtWeld |
| R_REFERENCE | 2.2k | UNI-ROYAL(Uniroyal Elec) / 0603WAF2201T5E | [C4190](https://jlcpcb.com/partdetail/C4190) | 1 | 6,412,821 / 5,990,433 | smtWeld |
| U_REF | TL431BIDBZR | Texas Instruments / TL431BIDBZR | [C41283](https://jlcpcb.com/partdetail/C41283) | 1 | 119,776 / 118,938 | smtWeld |
| R_TH_TOP_1 | 240k | YAGEO / RT0805BRD07240KL | [C784586](https://jlcpcb.com/partdetail/C784586) | 1 | 617 / 520 | smtWeld |
| R_TH_BOTTOM_1, R_TH_BOTTOM_2, R_TH_BOTTOM_3, R_TH_BOTTOM_4, R_L_GAIN_G, R_R_GAIN_G | 10k | YAGEO / RT0603BRD0710KL | [C95204](https://jlcpcb.com/partdetail/C95204) | 6 | 1,765,348 / 971,109 | smtWeld |
| R_TH_TOP_2 | 52.3k | YAGEO / RT0603BRD0752K3L | [C861462](https://jlcpcb.com/partdetail/C861462) | 1 | 18,813 / 18,785 | smtWeld |
| R_TH_TOP_3 | 15k | YAGEO / RT0603BRD0715KL | [C326733](https://jlcpcb.com/partdetail/C326733) | 1 | 96,651 / 82,823 | smtWeld |
| R_TH_TOP_4 | 5.62k | YAGEO / RT0603BRD075K62L | [C705789](https://jlcpcb.com/partdetail/C705789) | 1 | 22,889 / 22,851 | smtWeld |
| U_RX | INA1650IPWR | Texas Instruments / INA1650IPWR | [C553130](https://jlcpcb.com/partdetail/C553130) | 1 | 2,875 / 2,845 | smtWeld |
| C_RX_P, C_RX_N, C_ENV_P, C_ENV_N, C_L_VP, C_L_VN, C_L_CMP, C_R_VP, C_R_VN, C_R_CMP | 100nF | YAGEO / CC0603KRX7R9BB104 | [C14663](https://jlcpcb.com/partdetail/C14663) | 10 | 53,786,465 / 42,114,372 | smtWeld |
| RV_L, RV_R | 10k single-gang linear (B10K) | Tayda / RV9312NO-KQ15A6.0-B10K-060 | — | 2 | 手持ち / 国内調達 | user_stock_hand_solder |
| U_ENV | OPA1678IDGKR | Texas Instruments / OPA1678IDGKR | [C2863133](https://jlcpcb.com/partdetail/C2863133) | 1 | 2,945 / 2,914 | smtWeld |
| J_IN_L, J_IN_R | 6.35mm TRS | Neutrik / NJ3FD-V | — | 2 | 手持ち / 国内調達 | domestic_purchase_hand_solder |
| R_L_P_BLEED, R_L_N_BLEED, R_L_WIPER_FAIL, R_L_OUT_BLEED, R_L_RELEASE, R_R_P_BLEED, R_R_N_BLEED, R_R_WIPER_FAIL, R_R_OUT_BLEED, R_R_RELEASE | 1M | UNI-ROYAL(Uniroyal Elec) / 0603WAF1004T5E | [C22935](https://jlcpcb.com/partdetail/C22935) | 10 | 7,762,105 / 7,229,995 | smtWeld |
| R_L_P_SERIES, R_L_N_SERIES, R_R_P_SERIES, R_R_N_SERIES | 1k | YAGEO / RT0603BRD071KL | [C110776](https://jlcpcb.com/partdetail/C110776) | 4 | 523,796 / 427,099 | smtWeld |
| C_L_P_AC, C_L_N_AC, C_R_P_AC, C_R_N_AC | 1uF | WIMA / MKS2C041001F00JSSD | [C92673](https://jlcpcb.com/partdetail/C92673) | 4 | 7,228 / 7,101 | manualWeld |
| U_L, U_R | OPA1679IPWR | Texas Instruments / OPA1679IPWR | [C2057264](https://jlcpcb.com/partdetail/C2057264) | 2 | 13,146 / 13,061 | smtWeld |
| R_L_GAIN_F, R_R_GAIN_F | 90k | YAGEO / RT1206BRE0790KL | [C871504](https://jlcpcb.com/partdetail/C871504) | 2 | 4,164 / 3,879 | smtWeld |
| C_L_GAIN_F, C_R_GAIN_F | 10pF | Samsung Electro-Mechanics / CL10C100JB8NNNC | [C1634](https://jlcpcb.com/partdetail/C1634) | 2 | 1,871,070 / 1,652,687 | smtWeld |
| R_L_OUT, R_R_OUT | 100 | UNI-ROYAL(Uniroyal Elec) / HP06W2F1000T5E | [C2765755](https://jlcpcb.com/partdetail/C2765755) | 2 | 16,681 / 16,403 | smtWeld |
| J_OUT_L, J_OUT_R | 3.5mm TS | QingPu / WQP-WQP518MA | — | 2 | 手持ち / 国内調達 | user_stock_hand_solder |
| R_L_HALF_IN, R_L_HALF_FB, R_L_ABS_RAW, R_R_HALF_IN, R_R_HALF_FB, R_R_ABS_RAW | 100k | YAGEO / RT0603BRD07100KL | [C122538](https://jlcpcb.com/partdetail/C122538) | 6 | 1,285,091 / 1,190,009 | smtWeld |
| D_L_HALF_CLAMP, D_L_HALF_RECT, D_L_PEAK, D_R_HALF_CLAMP, D_R_HALF_RECT, D_R_PEAK | 1N4148W | ST(Semtech) / 1N4148W | [C81598](https://jlcpcb.com/partdetail/C81598) | 6 | 3,306,317 / 3,037,417 | smtWeld |
| R_L_ABS_HALF, R_R_ABS_HALF | 50k | YAGEO / RT0603BRD0750KL | [C861451](https://jlcpcb.com/partdetail/C861451) | 2 | 245,646 / 218,733 | smtWeld |
| R_L_ABS_FB, R_R_ABS_FB | 20k | YAGEO / RT0603BRD0720KL | [C723637](https://jlcpcb.com/partdetail/C723637) | 2 | 692,817 / 659,736 | smtWeld |
| R_L_ATTACK, R_R_ATTACK | 1k | UNI-ROYAL(Uniroyal Elec) / 0603WAF1001T5E | [C21190](https://jlcpcb.com/partdetail/C21190) | 2 | 26,040,250 / 21,648,298 | smtWeld |
| C_L_HOLD, C_R_HOLD | 100nF | Murata Electronics / GRM31C5C1H104JA01L | [C97946](https://jlcpcb.com/partdetail/C97946) | 2 | 109,687 / 101,364 | smtWeld |
| U_METER_L, U_METER_R | LM339BIPWR | Texas Instruments / LM339BIPWR | [C7430196](https://jlcpcb.com/partdetail/C7430196) | 2 | 4,368 / 4,044 | smtWeld |
| R_L_LED_1, R_L_LED_2, R_L_LED_3, R_L_LED_4, R_R_LED_1, R_R_LED_2, R_R_LED_3, R_R_LED_4 | 10k | UNI-ROYAL(Uniroyal Elec) / 0603WAF1002T5E | [C25804](https://jlcpcb.com/partdetail/C25804) | 8 | 26,971,295 / 20,720,709 | smtWeld |
| LED_L_1, LED_L_2, LED_R_1, LED_R_2 | green | XINGLIGHT / XL-302UGD | — | 4 | 別途購入・在庫未確認 | user_hand_solder |
| LED_L_3, LED_R_3 | amber | TUOZHAN / TZ-L2-03YYBY2YDJ30-001 | — | 2 | 別途購入・在庫未確認 | user_hand_solder |
| LED_L_4, LED_R_4 | red | XINGLIGHT / XL-302SURD | — | 2 | 別途購入・在庫未確認 | user_hand_solder |
| J_LINK_TOP, J_LINK_BOTTOM | 2x4 board interconnect | Samtec / TSW-104-07-L-D | — | 2 | 手持ち / 国内調達 | user hand solder |
| J_LINK_TOP, J_LINK_BOTTOM | 2x4 board interconnect | Samtec / SSW-104-01-F-D | — | 2 | 手持ち / 国内調達 | user hand solder |

実装区分: smtWeld = JLC表面実装、manualWeld = JLC手はんだ対応。LED8個はユーザ手はんだに変更。パネルでレンズ先端を揃えてからはんだ付けする（操作基板面より前方11.9mmが公称値）。JLC実装対象から除外し、LEDは別途購入。保存済みJLC在庫は単品調達の在庫確認ではない。

電気仕様: 精度指定抵抗は0.1%、その他は1%。入力フィルム1µF/63V/5%、保持100nF/50V/C0G/5%、帰還10pF/50V/C0G/5%、デカップリング100nF/50V/X7R/10%、電解25V/20%。出力100Ωは1206/0.5Wを採用（連続短絡の実機試験は別途）。

変更: 最下段の239kΩを240kΩに変更、理想閾値は0.499 Vpeak。Tayda/Neutrik/QingPuの型番と選定パッケージをmodel.tsのprocurement属性へ紐付けた。PCB配置・配線は実装済み。rev DでR_LED_SUPPLYの誤紐付けをC23182 (47Ω)に修正し、全抵抗・コンデンサの公称値を在庫データの属性と照合。
