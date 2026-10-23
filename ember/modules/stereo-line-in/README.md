# Stereo Line In / PCB rev F

2ch・4HPの試作用PCB。パネル平行の操作基板18×77mm（2層）とメイン基板18×110mm（4層）。

- 回路・値・接続: `model.ts`。部品選定: `procurement/selected-parts.json`。
- tscircuit PCB: `pcb/index.tsx`、`footprints.tsx`、`layout.json`。
- 配線済みの入口: `control.circuit.tsx` / `main.circuit.tsx`。`bun run dev` で開く。
- 全体図・出力: `generated/pcb/review.html`。各基板のGerber ZIP、JLC BOM/CPL、全実装表、KiCad PCB、実装図、検証JSONを同じフォルダに収録。
- 設計仕様・計画はRillのemberプロジェクト: `docs/superpowers/specs/2026-09-12-stereo-line-in-design.md`、`docs/superpowers/specs/2026-09-13-stereo-line-in-jack-mounting-design.md`、`docs/superpowers/plans/2026-09-13-stereo-line-in-pcb.md`。初期実装はFyr #712、ソケット化はFyr #716、上下端配置はFyr #717、ポット下向きはFyr #719。Rillは今回の接合変更を未反映（ページCRUDツールが未公開）。

## 再生成

このディレクトリで実行する。BunとKiCad 9 CLIが必要。macOSの標準KiCad配置を既定にしている。

```sh
bun install --frozen-lockfile
python3 -m venv .venv
.venv/bin/pip install -r requirements-pcb.txt
.venv/bin/python pcb/rebuild.py
```

`pcb/rebuild.py` は部品値とカタログ属性、全パッド座標、実際の銅箔接続/短絡/隙間、tscircuitの表示と製造用銅箔の一致、KiCad DRCを確認してから出力する。Gerber、ドリル、CPLは基板左下原点（X右、Y上）。CPLの部品ゼロ角度は独自フットプリント基準なので、JLCの実装プレビューで品番ごとの向きを確認する。

配線はローカルFreerouting 2.4.1 / Java 25で生成したDSN/SESを固定。`pcb/cached-router.ts` がその検証済み銅箔をtscircuitへ戻す。部品配置・ランド・接続の変更を検出したら古い配線の再利用を拒否する。新たに配線するときは `pcb/dsn.py` でDSNを作り、Freeroutingへ渡す。既存の固定経路 `route-fixes.json` と局所修正 `route-adjustments.json` は変更後の形状へ再確認が必要。検査を通した新しい配線についてのみ `frozen-routes.json` と `routing-cache.json` を更新する。

## 検証範囲

全105部品、323パッド、基板別83ネットの接続を確認。2枚とも短絡・未配線・クリアランス違反0、KiCad DRC 0。71個の抵抗・コンデンサは公称値と保存済みJLC属性が一致。LED電源のR_LED_SUPPLYは47Ω / C23182へ修正済み。JLC対象は30型番87部品、LED8個を含む18部品は別途手実装（ヘッダ2個・ソケット2個を含む）。在庫の根拠は2026-09-13の保存データで、予約ではない。

これは試作用の製造データで、JLCへのアップロード・実装向き/DFM確認、現物のジャックとポットの座面、ソケットの保持力・嵌合公差/はんだ高さ、実機の音声性能は未確認。機能SPICEの7ケースは `generated/verification.json` に記録済みで、メーカー実部品モデルによる検証ではない。3Dタブには `pcb/cad-models.ts` の公称外形・高さによる簡略モデルを表示する。ジャック・ポットは外形ブロック、端子は模式形状で、メーカーSTEP、軸・口金・実際のLED取付高さを再現した完成品CADではない。

## 基板間の接合（rev F）

control裏面にTSW-104-07-L-Dを2個、main表面にSSW-104-01-F-Dを2個実装。パネル基準の中心は上側(10,12)mm、下側(10,81)mm。両側とも長軸が横。16本の手配線と中央スペーサを廃止した。両方のポットはパネル正面から見て3本の信号端子が下を向く0度配置。controlの外形は元の18×77mmを維持した。パネル上端からの中心位置は3.5mmジャック22mm、LED32/37/42/47mm、gain L 56mm、gain R 69.5mm。1/4インチ入力は93/111mmを維持。

基板間隔12.4mmはパネルに固定するジャック/ポットの座面で決まる。ヘッダ樹脂2.54mm＋露出ピン5.84mm＋ソケット8.51mmなので挿入量は4.49mm（指定3.68〜6.35mm内）。樹脂同士は1.35mm離れる。樹脂が当たるまで押し込まない。パネル部品を仮組みして間隔を確認してからコネクタを手はんだする。コネクタ保持力・実寸公差の積み上げは現物未検証。

`pcb/check-assembly.py` は上下16ピンの座標・ネット、両基板の部品外形、基板裏に出る足とはんだを含めた突出1.5mmの領域を検査する。フィルムコンデンサとcontrol裏面の公称隙間は2.4mm、突出1.5mmを差し引いた残りは0.9mm。これは公称値の検査で、製造公差を含む保証ではない。検査結果は `generated/pcb/assembly-validation.json`。

コネクタの部品番号・公称寸法・2026-09-14の公式出荷可能数表示は `procurement/interconnect-selection.json`。JLCの実装対象には含めず手実装とする。在庫予約はしていない。

## 面付けデータ

`generated/panels/control/` と `generated/panels/main/` に、それぞれ4枚を同方向に並べたパネルを生成する。controlは92×91mm・2層、mainは92×124mm・4層、厚さは両方1.6mm。四周5mmの捨て板、2mmのルーター間隔、マウスバイト、2mm工具穴、両面fiducialを含む。個片の検証済みパッド・配線・部品面・回転は変更せず複製する。

生成は `pcb/rebuild.py` の後に、同じShapely環境のPythonで `pcb/panelize.py` を実行する。面付けは単板を更新しただけでは再生成されない。`validation.json` の `source_sha256` で入力版を追跡できる。

各 `*-panel-order-files.zip` にGerber ZIP、4枚分のBOM/CPL、両面実装図、検証結果、発注条件をまとめた。JLCへは内包するGerber ZIPをアップロードし、BOM/CPLを別途指定する。外側の一式ZIPをGerberとしてアップロードしない。BOM/CPLのP1_〜P4_は既に4枚分なので、追加の繰り返し指定は不要。発注はPanel by Customer、controlはBottom実装、mainはBoth sides/Standardを想定。数量はパネル単位で、1パネルから各基板4枚を取り出す。

JLC側のルーター加工・タブDFM、部品対応と角度プレビュー、在庫は未確認。分割後はバリを除去して公称18mm幅に仕上げる。保持力と実装済みパネルの分割応力は実物で未検証。Fyr #720、Rill `docs/superpowers/plans/2026-09-14-stereo-line-in-panelization.md` に記録。

### Silkscreen and references

`pcb/reference-aliases.json` maps internal descriptive references to compact printed references (R1, C1, etc.). `generated/schematic.svg` uses the same short references; source JSON and JLC BOM/CPL keep internal names. See `generated/reference-guide.html` for all 105 board placements, including the two connectors on each board that are outside the logical audio schematic. Some labels sit under components and are for assembly identification.

`pcb/add-silkscreen.py` generates `pcb/silkscreen.json` and reserves an exposed 5×5 mm solid bottom silkscreen square on each unit. Select 5×5 mm 2D barcode and Specify Position at JLCPCB; this is not a copper square. Main bottom carries Nok Audio and Xof v0.1. The Japanese product name is 左右波形増幅器. Full rebuild regenerates silkscreen; rerun `pcb/panelize.py` afterward.
