# EurorackPCB

Eurorack モジュールの PCB ルート要素。`<board>` を Eurorack 文脈に合わせた最小ラッパで包む。

## 仕様

- **外形**: 指定しない。中に置いた部材 (ジャック、ヘッダ、IC 等) のバウンディングから tscircuit が自動算出。「部材を置いてから必要最小限のサイズに」という方針
- **厚み**: デフォルト 1.6 mm (Eurorack 慣行、JLCPCB の標準)
- **取付穴**: 持たない (PCB はパネルにジャックのナットで固定する方針 — Mutable Links 含めて Eurorack 小〜中規模モジュールの一般的な構造)

## API

```tsx
import { EurorackPCB } from "ember/primitives/pcb/eurorack-pcb"

export default () => (
  <EurorackPCB>
    {/* 部材を置く */}
  </EurorackPCB>
)
```

| Prop | Default | 用途 |
|---|---|---|
| `thickness` | `1.6` | PCB 厚み (mm) |
| `children` | — | 部材 |

## Export される定数

| 名前 | 値 | 用途 |
|---|---|---|
| `HP_MM` | `5.08` | HP 公称ピッチ (Eurorack 規格上の論理単位) |
| `PANEL_MM_PER_HP` | `5.0` | Doepfer 慣行のパネル実物 mm/HP (例: 4 HP パネル = 20 mm) |

PCB 幅は通常 panel 幅より一回り小さく取りたいが、本ラッパでは「部材から自動算出」を優先する設計。明示的に幅を制御したい場合は内部の `<board width=...>` を直接使うか、別途ラッパを足す。

## 関連方針

- パネルと PCB の固定: [memory: モジュール取り付け方針](../../../../.claude/projects/-Users-jigsaw-dev-github-com-pichenettes-eurorack/memory/feedback_mounting_hole_slot.md) (Claude memory 側に詳細)

## 関連 Linear

- CMS-261
