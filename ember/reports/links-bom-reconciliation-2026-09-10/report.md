# Links 単板58部品と旧BOMの照合 — 2026-09-10

照合完了。旧選定を対応付けられる部品39個、容量不一致2個、LCSC品番未対応2個、従来どおり別調達・手はんだ15個。発注用BOM/CPLの完成とはしない。

## 根拠

- 旧出力: `ember/fab/links-main/bom.csv`, `links-control/bom.csv` と両方の `hand-solder.csv`。
- 選定表: `.worktrees/links-decoupling/ember/scripts/fab-parts.ts`（2026-07-12選定記録）。在庫数は過去の値であり今回未確認。
- 現行回路: `ember/reports/links-decoupling-2026-09-10/circuit.json`。
- 現行ソース: `.worktrees/links-decoupling/ember/modules/links/single-board/index.tsx`, `reference.json`。
- circuit SHA-256: `7b26c12d2f34e0cb5bc122f700c0f38723d19b57942fef64f65ceb133fd8c7b5`（修正完了レポートと一致）。
- `git fetch me` 後、修正worktree HEADが `me/master` を含むことを確認。回路・配置は変更していない。
- Rill実行記録の読み取りとFyrタスク作成はツールが `user rejected MCP tool call` を返したため未実施。Rillの本文を読めたとは扱わず、ローカル証拠で照合した。Fyr/Rillへの今回結果の記録も未実施。

## 対応結果

|単板部品|個数|旧選定LCSC|判定|
|---|---:|---|---|
|IC1|1|C529553 / OPA4171AIPWR|旧選定対応、TSSOP-14|
|IC2, IC4|2|C4370341 / TL072HIPWR|旧選定の代替品を引継ぎ。ソース表記TL072CPWとの完全品番一致ではない|
|IC3, IC5|2|C9405 / LM321MFX/NOPB|旧選定対応、SOT-23-5|
|R1〜R21|21|C7250, C23197, C21190, C25803, C4216|値別に旧選定対応、0603|
|C3,C4,C5,C7,C8,C10,C11〜C14|10|C14663 / CC0603KRX7R9BB104|100nF、0603。旧選定記録はX7R・50V|
|C6,C9|2|C1634 / CL10C100JB8NNNC|10pF、0603。旧選定記録はC0G・50V|
|JP1|1|C2977596 / DC3-2.54-10PAS|ソースに旧品番を保持|
|C1,C2|2|旧C45783 / CL21A226MAQNNNE|不一致：旧22µF、現行4.7µF。0805は共通。旧品番をそのまま割り当てない|
|D1,D2|2|なし|現行1N5819HW-7-F / SOD-123。旧BOM・選定表に対応なし|
|J1〜J12|12|なし|PJ301M-12、従来どおり別調達・手はんだ|
|LED1〜LED3|3|なし|WP937EGW、従来どおり別調達・手はんだ|

「旧選定対応」は部品値・ソース品番と選定表・宣言フットプリントの照合。メーカー図面によるランド寸法再検証、代替ICの電気特性再評価、現時点の在庫確認を意味しない。

C11〜C14は単板の修正では追加4個だが、旧2枚基板版にはUS-buf/SM-bufのC_VCC/C_VEEが各1個ずつあり、旧版全体も100nFは10個。旧10個にさらに4個足す計算ではない。
旧基板間ヘッダはオス3個（C37208）・メス3個（C2832269）とも単板には不要。旧62部品からヘッダ6個を除き、ダイオード2個を加えると現行58部品になる。

## BOM/CPLへの反映状況

既存 `export-fab.ts` の対象は `links-control` と `links-main` のみ。単板用のBOM/CPLは修正worktree内に見つからず、既存出力は旧2枚基板版の名前・座標のまま。今回の照合表は入稿ファイルではない。

旧exporterは選定表にないコンデンサと未対応のdiodeを `lcsc: null` にし、手はんだ扱いへ落とす。その後の `unresolved` 集計は `lcsc !== null` の部品だけを見るため、この4個の未選定を検出できない。単板対応時は「意図的な手はんだ」と「未選定」を区別して、未選定があれば出力を止める必要がある。

次の作業はC1/C2の4.7µFに合う品番選定（22µF採用なら回路値変更として別途判断）、D1/D2のLCSC品番対応付け、単板用exporterの対応とBOM/CPL生成・部品集合/座標/面/回転照合。JLC入稿プレビュー、DC bias、在庫は未確認。

## 成果物と検査

- [全58部品の照合CSV](comparison.csv): 現行値、フットプリント、既存LCSC、旧参照名、判定、現行座標・面・回転を収録。旧参照名は同一選定品のグループであり回路ノードの一対一対応ではない。
- [集計JSON](summary.json): 入力ハッシュと判定件数。
- 58個の参照名が一意、各source_componentにpcb_componentがちょうど1個、対応39個が旧BOMのLCSC/フットプリントと一致することを検査。回路の変更・再ビルドは行っていない。
