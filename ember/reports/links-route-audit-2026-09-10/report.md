# Links 単板版 配線経路監査 — 2026-09-10

判定: **警告10件は現状のまま一括許容しない。GND配線構成と一部電源デカップリングの修正が必要。** これはレイアウトレビューの判断であり、発振やノイズ不良を実測で確認したという意味ではない。

## 対象と再現性

- fyr task #698 / ember project #91。
- 対象: `/Users/jigsaw/.codex/worktrees/f45b/eurorack/ember/dist/links-single/circuit.json`。
- `codex/links-single-board` HEAD `5d572aa` と未コミット単板実装。fetch後の `me/master` を包含（behind 0 / ahead 44）。元実装・配線は変更していない。
- circuit.json SHA-256: `437baa24a728e65f5eb06f90368c0f1888bbb4d767b8e7bf719f87620b318239`。
- 54部品、34ネット、118配線、80ビア。生成データにGND copper pourなし。
- [全経路図](index.html)、[機械可読測定値](measurements.json)、再実行用 `../../scripts/audit-links-routes.py`。

## 測り方と警告の限界

配線の座標列から平面の中心線長を積算。PCB端子で接続した配線グラフから電源・GND経路を追跡した。端点座標と`connectsTo`が一致することを全118配線で確認した。論理net名だけを使った導通の代用はしていない。

警告値は平面長にビア1個あたり1.6mmを加える。10件すべて1ビア・最小幅0.15mmで、表示値を1e-6mm以内で再現した。以下では「警告値」と「平面長」を区別する。パッド内の電流分布、スルーホール端子のバレル長、銅箔の有限幅による近道は計算していない。グラフ経路は電磁界を解いた最小インピーダンス経路ではない。

ローカル `@tscircuit/core/dist/index.js` の `getMaxLengthFromConnectedComponents` はコンデンサの `max_decoupling_trace_length` をsource traceへ付与し、`@tscircuit/checks/dist/index.js` の `checkPcbTraceLengths` はPCB traceに割り当てられたsource traceの `max_length` を調べる。

**IC1.pin4↔C3.pin1とIC4.pin8↔C8.pin1は、IC側の制限なしsource traceに割り当てられており、長くても警告されない。** IC1側は `source_trace_15`、IC4側は `source_trace_39`。したがって警告ゼロは全ICのデカップリング経路合格を意味しない。

## 10件それぞれの判定

全件「GND再構成の対象」。個々の5mm超過だけを故障判定にしていない。pin2=normal、pin3=sleeve。下記の端子列は同じパッドを接続点に使う銅箔経路で、ジャックのスイッチや抵抗素子を直列に通るという意味ではない。

|図|対象端子|警告値 mm|平面長 mm|判定根拠・修正対象|
|---|---|---:|---:|---|
|[W01](warning-01.svg)|C8.pin2 ↔ J11.pin2|5.66|4.06|局所GNDへ接続し直す。平面長は5mm以内だが、IC4のC8↔C10戻り経路30.45mmの一部。これ単独の短縮だけでは解決しない。|
|[W02](warning-02.svg)|C4.pin1 ↔ J2.pin3|8.32|6.72|出力J2のsleeve枝をC4のデカップリング接地と分離して低インピーダンスGNDへ接続する。|
|[W03](warning-03.svg)|C5.pin2 ↔ J5.pin3|7.88|6.28|C5↔C7のGND戻り20.15mmの一部。入力J5とIC2の基準GNDを経由する構成を改める。|
|[W04](warning-04.svg)|C10.pin1 ↔ J9.pin2|9.26|7.66|C8↔C10のGND戻り30.45mmの一部。入力J9のnormal接地点経由を改める。|
|[W05](warning-05.svg)|C8.pin2 ↔ J12.pin3|8.35|6.75|出力J12のsleeve戻りがC8の接地点を共用。独立した短いGND接続へ改める。|
|[W06](warning-06.svg)|C5.pin2 ↔ J6.pin3|12.64|11.04|入力J6のsleeveとC5を11.04mmの細い枝で接続。共通GNDの再構成対象。|
|[W07](warning-07.svg)|C4.pin1 ↔ J1.pin3|9.89|8.29|C3↔C4のGND戻り19.70mmの一部。入力J1のsleeve接地点を経由する構成を改める。|
|[W08](warning-08.svg)|C7.pin1 ↔ J6.pin2|10.80|9.20|入力J6のnormal接地とC7を9.20mmの枝で接続。局所GNDへ接続し直す。|
|[W09](warning-09.svg)|C3.pin2 ↔ J1.pin2|10.62|9.02|C3↔C4のGND戻り19.70mmの一部。C3の電源側も11.19mmあるため両側を修正する。|
|[W10](warning-10.svg)|C7.pin1 ↔ J4.pin3|16.04|14.44|第1ブロック出力J4と第2ブロックC7を結ぶGND幹線。ブロックを跨ぐ14.44mmの細い戻りを再構成する。|

## IC電源とコンデンサのGND経路

数値は平面中心線長、括弧内はビア数。IC3/IC5は同じレールの既存100nFまでの最短グラフ経路を選択した。IC自体には専用のGNDピンがない。±電源のコンデンサ間GND経路は評価対象の一つであり、出力負荷や外部電源を含む全電流ループと同一ではない。

|IC|＋電源→100nF|−電源→100nF|コンデンサ間GND|判定|
|---|---|---|---|---|
|[IC1](ic1.svg)|IC1.pin4 → C3.pin1: 11.19mm (2 vias)|IC1.pin11 → C4.pin2: 2.71mm (0 vias)|C3.pin2 → J1.pin2 → J1.pin3 → C4.pin1: 19.70mm (2 vias)|C3電源側とGND両側の再配置・再配線|
|[IC2](ic2.svg)|IC2.pin8 → C5.pin1: 2.04mm (0 vias)|IC2.pin4 → C7.pin2: 4.58mm (0 vias)|C5.pin2 → J5.pin3 → J5.pin2 → IC2.pin3 → C7.pin1: 20.15mm (2 vias)|電源側は短いがGND戻りを修正|
|[IC4](ic4.svg)|IC4.pin8 → C8.pin1: 5.16mm (2 vias)|IC4.pin4 → C10.pin2: 2.04mm (0 vias)|C8.pin2 → J11.pin2 → J11.pin3 → IC4.pin3 → J9.pin2 → C10.pin1: 30.45mm (3 vias)|C8電源側の2ビアとGND戻りを修正|
|[IC3](ic3.svg)|IC3.pin5 → IC2.pin8 → C5.pin1: 23.92mm (2 vias)|IC3.pin2 → C7.pin2: 15.96mm (2 vias)|C5.pin2 → J5.pin3 → J5.pin2 → IC2.pin3 → C7.pin1: 20.15mm (2 vias)|専用の近接100nFを各電源へ追加する設計修正|
|[IC5](ic5.svg)|IC5.pin5 → C5.pin1: 14.02mm (2 vias)|IC5.pin2 → C10.pin2: 12.90mm (0 vias)|C5.pin2 → R19.pin2 → J7.pin3 → J9.pin3 → J9.pin2 → C10.pin1: 32.38mm (2 vias)|専用の近接100nFを各電源へ追加する設計修正|

## GND幹線・共有経路

GND面がなく、ジャック、IC入力基準、LED帰還抵抗、デカップリングの接地点を0.15mm配線で結ぶ構成。C5↔C7はIC2.pin3、C8↔C10はIC4.pin3を経由する。LED駆動用抵抗R3/R11/R19のGND側や出力ジャックと、電源ヘッダまでの戻り配線を共有する。下表はJP1.pin3を共通観測点として測った経路で、ヘッダ外の配線・外部機器経由の戻りは含まない。

|コンデンサ|JP1.pin3まで mm|R11の戻りとの共有 mm|R19の戻りとの共有 mm|
|---|---:|---:|---:|
|C3|25.81|25.81|25.81|
|C4|45.51|45.51|45.51|
|C5|96.63|55.48|96.63|
|C7|76.49|55.48|76.49|
|C8|144.15|55.48|104.38|
|C10|129.01|55.48|104.38|

この共有銅箔と局所戻りの長さを理由に、現在のGND構成を許容しない。共有経路による電圧誤差や発振の有無・振幅は未測定。図は実配線の投影で、容量内部・IC内部を省略している。実電流のループ面積やインダクタンスを数値的に検証済みとはしていない。

## 判定の根拠資料

メーカーは、各電源端子とGNDの間に100nFを設け、デバイスの近くへ配置することを推奨している。固定の5mmを合否規格とはしていない。

- [TI OPA4171 datasheet Rev.H §7.3–7.4、PDF p25–26](https://www.ti.com/lit/ds/symlink/opa4171.pdf)
- [TI TL072 datasheet Rev.W §8.3–8.4、PDF p32–33](https://www.ti.com/lit/ds/symlink/tl072.pdf)
- [TI LM321 datasheet Rev.C §9–10、PDF p13–14](https://www.ti.com/lit/ds/symlink/lm321.pdf)

## 実施した検証と未実施

- 全10警告の端子、中心線長、ビア、最小幅を抽出・数値照合。
- 全5 ICの±電源経路と100nF間GND経路を作図し、15枚の経路図と既存PCB PNGを目視確認。
- 既存circuit.jsonに対して `check-links-single.ts` を再実行: 54部品 / 原典34net一致 / 配線グラフ導通 / DRCエラー0、長さ警告10件。
- `check-dfm.ts` を再実行: PASS、最小trace 0.15mm / via hole 0.3mm / pad 0.6mm / 異net配線間0.1499mm。
- 今回は再ビルド・再配置・再配線をしていない。既存データの検証であり、保存後のソースからの再生成を証明しない。
- 銅箔ポリゴンからの独立した導通抽出、SPICE/電磁界解析、製造・実機測定は未実施。コネクタ5件の機械的適合は今回の監査対象外。

修正設計と再検証条件はrillの `ember / docs/superpowers/specs/2026-09-10-links-decoupling-audit-design.md` に記録する。監査用成果物は未コミット。
