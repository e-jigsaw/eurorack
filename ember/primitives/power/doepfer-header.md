# DoepferHeader

Eurorack 電源バスに接続する 2×5 ピン box header。Amphenol/FCI **67996-410HLF** が de facto 標準。

## ピン配列 (Doepfer A-100、10-pin)

赤ストライプ = pin 1 = −12V 側。`pinLabels` は GND を区別可能にするため `GND_A` 〜 `GND_F` の別 alias を付けてある (`.JP1 > .GND_A` のように個別に trace を引ける)。

| Pin | Label | 信号 | 備考 |
|---|---|---|---|
| 1 | `VEE_A` | −12V | 赤ストライプ |
| 2 | `VEE_B` | −12V | |
| 3 | `GND_A` | GND | |
| 4 | `GND_B` | GND | |
| 5 | `GND_C` | GND | 16p 接続時は CV bus |
| 6 | `GND_D` | GND | 16p 接続時は Gate bus |
| 7 | `GND_E` | GND | 16p 接続時は +5V (10p では不使用) |
| 8 | `GND_F` | GND | 同上 |
| 9 | `VCC_A` | +12V | |
| 10 | `VCC_B` | +12V | |

## フットプリント

| 項目 | 値 |
|---|---|
| ピッチ | 2.54 mm |
| Drill | Ø1.0 mm |
| Pad | Ø1.7 mm |
| Body silkscreen | 12.7 × 8.38 mm |
| Pin 1 マーカー | silkscreen text "1" (左下) |

ピン番号は IDC 標準: notch を上にして左下が pin 1、右へ pin 2、ジグザグで pin 10。

## 単独使用 vs 保護回路込み

通常はリバース保護とセットで使うので [`EurorackPowerInput`](eurorack-power-input.md) を使うのが便利。Header 単体が欲しい場合のみこの `DoepferHeader` を直接使う。

## 出典

- Doepfer A-100 technical: https://doepfer.de/a100_man/a100t_e.htm
- Mouser 67996-410HLF: https://www.mouser.com/ProductDetail/Amphenol-FCI/67996-410HLF
- David Haillant 16↔10 pin: https://www.davidhaillant.com/how-to-link-16-pin-eurorack-power-connector-to-10-pin-connector/

## 関連 Linear

- CMS-260
