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

## 開発

```bash
bunx tsci dev      # http://localhost:3020 でライブプレビュー
bunx tsci build    # ビルド検証
bunx tsci snapshot # PCB / schematic SVG を __snapshots__/ に出力
```

## Linear

[tscircuit Eurorack](https://linear.app/cmsn/project/tscircuit-eurorack-cd01aea01d05) (Nok Audio initiative)
