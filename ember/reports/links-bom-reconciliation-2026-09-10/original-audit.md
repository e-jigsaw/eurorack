# Links 原本基準の追加突合 — 2026-09-10

正は上流 Links v4.0 の `links/hardware_design/Links.xlsx` と `pcb/links_v40.sch` / `.brd`。旧2枚基板BOMとJLCPCB代替選定資料は補助資料。前回の「39個対応」は原本仕様への適合を意味しない。

## 原本の特定

`git fetch me` 成功後、修正worktree HEADが me/master を含むことを確認。既定ブランチは master。
ローカル原本3ファイルのGit blobは me/master の同じパスと一致した。

- SCH: `87cdf1aeac8272cbb83b68481ef08129e7bfac1a`
- BRD: `73a7887839367d29f7b59c993f4b2bf2685257b7`
- XLSX: `94445a426c3df237c209458760546d80df7a46cb`

`links_v40.9.sch` / `.brd` は上流masterに存在せず、ローカル履歴の `8354eca` で追加されたEAGLE 9.7 XML変換版。同コミットにはJLCPCB代替選定資料もある。変換版を無条件に上流原本と同一とは扱わない。

## 原本BOMと現行の比較

原本xlsxの `xl/worksheets/sheet1.xml` をsharedStringsとともに直接読み取り。対象は部品行4〜18・21。行19にはLEDホルダー3個が別にある。

|対象|原本|現行ソース・旧選定との差分|
|---|---|---|
|R2,R4,R5,R12,R13,R21|51Ω 1% 0603|現行値・サイズ一致。旧選定は別メーカー品|
|R3,R11,R19|1kΩ 1% 0603|現行値・サイズ一致。旧選定は別メーカー品|
|R15|33kΩ 1% 0603|現行値・サイズ一致。旧選定は別メーカー品|
|R1|10MΩ 1% 0603|現行値・サイズ一致。旧選定は別メーカー品|
|R6,R7,R8,R9,R10,R14,R16,R17,R18,R20|100kΩ **0.1% 薄膜** 0603、ERA-3AEB104V|現行値・サイズ一致だが旧選定C25803は **1% 厚膜**。原本仕様不一致|
|C1,C2|4.7µF **電解 ≥25V Panasonic A (3mm径)**、UWX1E4R7MCL2GB|現行4.7µF・25Vは一致、0805に変更。原本パーツは現行ランドへそのまま実装できない。22µFへ戻す根拠にはならない|
|C3,C4,C5,C7,C8,C10|100nF ≥16V 0603|現行公称値・耐圧宣言・サイズ一致。旧選定C14663は代替メーカー品|
|C6,C9|10pF ≥16V ≤5% C0G 0603|現行公称値・耐圧宣言・サイズ一致。旧選定C1634は代替メーカー品|
|D1,D2|1N5819HW-7-F SOD123|現行MPN・宣言パッケージ一致。`links_v40_jlcpcb_bom.md` に **C82544** の選定記録あり。現在の調達可否・実ランド未検証|
|IC1|OPA4171AIPW TSSOP14|現行一致。旧選定は末尾Rのリール品|
|IC2,IC4|TL072CPW TSSOP8|現行ソース一致。旧選定TL072HIPWRは異品番で電気特性の代替評価が必要|
|IC3,IC5|LM321MFX/NOPB SOT23-5|現行MPN・宣言パッケージ一致|
|J1〜J12|PJ-301-M-12|現行PJ301M-12。実装・パネル適合未検証|
|LED1〜LED3|WP937EGW|現行品番一致。原本のLED3-10ホルダー3個は回路58部品に含まれない|
|JP1|67996-410HLF、2×5 2.54mm|現行は別ヘッダー。番号変換あり。機械寸法・ケーブル向きの最終照合が必要|
|C11〜C14|原本にない|100nFの局所デカップリング4個を意図的に追加|

C25803の1%・厚膜は2026-09-10に[LCSC製品仕様](https://www.lcsc.com/product-detail/C25803.html)で確認。原本xlsx行7の0.1%・薄膜を満たさない。部品在庫の一括再確認はしていない。

## 接続検証の到達点

次の既存検査を再実行してPASS。

```text
python3 .worktrees/links-decoupling/ember/scripts/extract-links-reference.py --check
bun .worktrees/links-decoupling/ember/scripts/check-links-single.ts ember/reports/links-decoupling-2026-09-10/circuit.json --netlist-only
```

確認できたのは、変換版 `.9.sch` → `reference.json` → 生成済み58部品・34ネットのソース接続とR/C値の一致（追加4個は独立チェック）。既存スクリプトの出力にある「original EAGLE schematic」は実際には `.9.sch` を指す。

上流バイナリ `.sch` / `.brd` からの独立した全ピン・全ネット突合は未完。既存バイナリparserは試行で80要素を返し、電源記号などを含む一方D1/D2を集計できなかったため、完全性の証拠には使わない。EAGLE変換の同一性確認または信頼できる原本ネットリスト取得が残る。

今回は回路・配線・BOM/CPLの変更と再ビルドはしていない。既存DRC結果を原本適合の証拠に置き換えない。

## 残件

- 原本バイナリと変換版の全接続同一性。
- 100kΩ抵抗10個の選定修正は完了（下記追記）。単板発注用BOMへの出力は残る。
- C1/C2の電解からMLCCへの変更の評価（実効容量を含む）、IC2/IC4の代替評価。
- 原本基準の仕様・MPN対応を確定して単板BOM/CPLへ反映。LEDホルダーなど機械部品も別調達表で追跡。

Fyr task 700に進捗を記録。原本突合全体は未完。

## 2026-09-10 追記: 100kΩの選定修正

ユーザー依頼により、現行worktreeの `ember/scripts/fab-parts.ts` の100kΩ選定をC25803から **Panasonic ERA3AEB104V / C190609** に変更した。原本表記ERA-3AEB104Vと同じ品番。抵抗値による共通マップなので、このworktreeの旧2枚基板exporterにも同じ選定が適用される。

- [Panasonic公式仕様](https://industrial.panasonic.com/ww/products/pt/high-precision-chip-resistors/models/ERA3AEB104V): 100kΩ、0.1%、薄膜、0603（1.6×0.8mm）、0.1W、±25ppm/K。
- [LCSC対応](https://www.lcsc.com/product-detail/C190609.html)、[JLCPCB掲載](https://jlcpcb.com/partdetail/PANASONIC-ERA3AEB104V/C190609): ERA3AEB104V = C190609。ライブ実装在庫・basic区分は未確認のためmap上はnull。検索キャッシュの数量を現在在庫として記録しない。
- R6,R7,R8,R9,R10,R14,R16,R17,R18,R20のちょうど10個が生成済み回路の100kΩ部品集合と一致し、新mapで全てC190609へ解決することをBunで検査してPASS。`git diff --check`もPASS。
- [10個の選定CSV](precision-resistors.csv)を出力。これは抵抗の選定一覧で、全58部品の入稿BOMではない。

今回変更したのは調達マップのみ。回路値・接続・ランド・配置・CPLは変更していないため、基板の再ビルド・目視検証は実施していない。既存fab CSVと旧照合CSVは過去記録として保持し、単板BOM/CPLの完成とは扱わない。
