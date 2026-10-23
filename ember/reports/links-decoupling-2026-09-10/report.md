# Links GND・デカップリング修正 — 2026-09-10

修正・再ビルド完了。実機検証・製造承認ではない。

## 対象と変更

- fyr #698 / ember #91。ブランチ `codex/links-decoupling`、worktree `/Users/jigsaw/dev/github.com/pichenettes/eurorack/.worktrees/links-decoupling`。
- `me/master` をfetchし元ブランチのbehind 0を確認。HEADは `5d572aa`。元のf45b worktreeは保持し、未コミット単板実装をコピーして修正。今回も未コミット・未統合。
- 19 × 108.4 mm、2層。C11〜C14の100nF追加で58部品、34ネット。
- 両面GND面。10個のGNDパッドそれぞれに幅0.3 mm・長さ0.9〜1.6 mmの近接ビア接続。
- C3を0.3 mm近づけ、C9を0.3 mm移動。IC3/IC5の追加コンデンサは配置干渉を除去。
- ビア間隔違反を個別に修正。`fixed-routes.json` を入力として、通常のtscircuitによるインポート・GND面生成・DRCを再実行。配置/障害物/ネットのSHA-256照合ガード付き。生成後のDRCエラー削除はしていない。

## 電源配線の実測（平面中心線）

|IC電源|コンデンサ|長さ mm|ビア|
|---|---|---:|---:|
|IC1.pin4|C3.pin1|1.725|0|
|IC1.pin11|C4.pin2|2.709|0|
|IC2.pin8|C5.pin1|2.035|0|
|IC2.pin4|C7.pin2|2.035|0|
|IC4.pin8|C8.pin1|2.035|0|
|IC4.pin4|C10.pin2|2.035|0|
|IC3.pin5|C11.pin1|2.265|0|
|IC3.pin2|C12.pin1|2.037|0|
|IC5.pin5|C13.pin1|3.294|0|
|IC5.pin2|C14.pin1|2.037|0|

GNDは全10パッドが電源ヘッダと同じbottom銅箔ポリゴン内にあることを確認。さらに近接ビアからヘッダまで、top銅箔を0.25 mm侵食した同じ連結領域に入ることを検査し、0.5 mm以上の幅を持つ経路の存在を確認した。細いbottom領域だけに依存しない。これは幾何学的な接続・幅の検査であり、実電流経路・インピーダンス・ノイズ・ループ面積の電磁界計算ではない。

## 残る配線長警告10件

全件GND。自動チェックは個々の既存GND枝の長さを測り、GND面と近接ビアによる短い別経路を合否に使わない。警告は削除・閾値緩和していない。局所経路は専用の幾何ゲートで検査した。

|枝の端子|警告長 mm|扱い|
|---|---:|---|
| C4.pin1 ↔ J2.pin3 | 5.28 | GND面・近接ビアによる戻りを別検査済み |
| C5.pin2 ↔ J5.pin3 | 12.42 | GND面・近接ビアによる戻りを別検査済み |
| C10.pin1 ↔ J9.pin2 | 7.57 | GND面・近接ビアによる戻りを別検査済み |
| C8.pin2 ↔ J12.pin3 | 6.64 | GND面・近接ビアによる戻りを別検査済み |
| C5.pin2 ↔ J6.pin3 | 10.71 | GND面・近接ビアによる戻りを別検査済み |
| C4.pin1 ↔ J1.pin3 | 10.00 | GND面・近接ビアによる戻りを別検査済み |
| C3.pin2 ↔ J1.pin2 | 10.43 | GND面・近接ビアによる戻りを別検査済み |
| C5.pin2 ↔ J6.pin2 | 9.82 | GND面・近接ビアによる戻りを別検査済み |
| C7.pin1 ↔ J5.pin2 | 10.45 | GND面・近接ビアによる戻りを別検査済み |
| C7.pin1 ↔ C12.pin2 | 10.95 | GND面・近接ビアによる戻りを別検査済み |

コネクタ向き警告5件も残る。垂直挿入ジャックのため回転修正は不要という前回判定を維持。パネル適合は未検証。

## 最終検証

- 原典EAGLEとreference.jsonの再抽出比較: PASS。
- netlist、PCB配置、回路図配置、TypeScript: PASS。配置エラー0、向き警告5。
- 最終ソースからPCB/回路図PNGを含め再ビルド: PASS。
- 58部品・R/C値・原典34ネットと追加4部品の接続・実配線グラフ導通・DRCエラー0: PASS。
- DFM: PASS。最小配線0.15 mm、via hole/pad 0.3/0.6 mm、異net配線間隔0.1453 mm（DFM閾値の検査。全箇所0.15 mm以上の独立証明とはしていない）。
- 全10電源配線5 mm以下・ビア0、全10局所GND接続と銅箔ポリゴン検査: PASS。
- Gerberモード短絡検査、40 px/mm（25 µm/px）: No shorts detected。画像解像度以下の欠陥や実製造の検査ではない。
- 検査コードが容量誤り、C5の近接ビア配線削除、GND面削除の3つをそれぞれ拒否することを確認。
- 最終PCB全体・bottom拡大図・回路図を目視確認。回路図配置検査には配線の曲がりを減らす提案が残るが配置違反はない。

## 成果物・再現

- [最終回路データ](circuit.json)、[PCB](pcb.png)、[bottom拡大図](inspection-bottom.png)、[回路図](schematic.png)、[測定値](measurements.json)。同じフォルダに各検証ログを保存。

`circuit.json` SHA-256: `7b26c12d2f34e0cb5bc122f700c0f38723d19b57942fef64f65ceb133fd8c7b5`

worktreeの `ember/` で `bun run preview:single`。GND面の追加検査はREADMEのShapely環境手順と `scripts/check-links-decoupling.py` を使う。配置・ネット変更時は固定配線入力を再生成・レビューする必要がある。

未実施: 発注・製造・実機での発振/ノイズ/負荷測定・パネル適合。コンデンサDC biasと調達品番の確定も残る。
