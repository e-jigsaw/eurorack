"""Render the 2026-09-12 live JLCPCB snapshot; this is not an order BOM.

Input: bun -e 'import {parts} from "./ember/modules/stereo-line-in/model.ts"; console.log(JSON.stringify(parts))'
passed as a JSON file argument. Re-running does not refresh inventory.
"""
import json
import sys
from pathlib import Path

parts = json.loads(Path(sys.argv[1]).read_text())
# MPN, JLC code, package, stock, available order qty, library class, references
rows = [
    ('INA1650IPWR','C553130','TSSOP-14',875,845,'Extended',['U_RX']),
    ('OPA1679IPWR','C2057264','TSSOP-14',13146,13061,'Extended',['U_L','U_R']),
    ('OPA1678IDGKR','C2863133','VSSOP-8',2945,2913,'Extended',['U_ENV']),
    ('LM339BIPWR','C7430196','TSSOP-14',4368,4021,'Extended',['U_METER_L','U_METER_R']),
    ('TL431BIDBZR','C41283','SOT-23-3',119826,118961,'Extended',['U_REF']),
    ('1N4148W (ST/Semtech)','C81598','SOD-123',3348302,3079137,'Basic',[p['ref'] for p in parts if p['value']=='1N4148W']),
    ('SS14 (MDD)','C2480','SMA/DO-214AC',1419052,1330883,'Basic',['D_PWR_P','D_PWR_N']),
    ('RT1206BRE0790KL','C871504','1206; 90k 0.1%',4174,3887,'Extended',['R_L_GAIN_F','R_R_GAIN_F']),
    ('RT0603BRD0750KL','C861451','0603; 50k 0.1%',246709,219629,'Extended',['R_L_ABS_HALF','R_R_ABS_HALF']),
    ('GRM31C5C1H104JA01L','C97946','1206; 100nF 50V C0G 5%',109215,101112,'Extended',['C_L_HOLD','C_R_HOLD']),
    ('RT0805BRD07240KL','C784586','0805; 240k 0.1%',717,624,'Extended',['R_TH_TOP_1']),
]
entries=[]
for i,(mpn,code,package,stock,available,library,refs) in enumerate(rows):
    entries.append(dict(mpn=mpn,jlc=code,package=package,in_stock=stock,available_order_qty=available,library=library,refs=refs,quantity_per_module=len(refs),assembly='SMT Assembly',pcba='Economic and Standard',url=f'https://jlcpcb.com/partdetail/{code}',status='exact_mpn_stock_verified' if i<5 else 'value_change_candidate_not_applied' if i==10 else 'package_candidate_not_applied'))
by_ref={ref:e for e in entries for ref in e['refs']}
coverage=[]
for p in parts:
    e=by_ref.get(p['ref'])
    coverage.append(dict(ref=p['ref'],kind=p['kind'],value=p['value'],requirements=p.get('note',''),status=e['status'] if e else 'mpn_unselected_stock_unverified',candidate_jlc=e['jlc'] if e else None))
assert len(coverage)==100 and len({p['ref'] for p in coverage})==100
snapshot=dict(checked_date='2026-09-12',timezone='Asia/Tokyo',source='Live JLCPCB rendered part-detail pages, In Stock and Available Order Qty',circuit_revision='A',circuit_modified=False,order_ready=False,entries=entries,coverage=coverage,notes=['239k and 239k 0.1% 0603 searches returned no results; not proof of global unavailability.','240k replacement proposal: nominal lowest output threshold 0.501004 -> 0.499 Vpeak. Not applied.','Unselected parts are not confirmed out of stock. Exact package/MPN required.','No PCB footprints assigned. Stock verification does not prove electrical suitability, 4HP fit, BOM/CPL acceptance or completed purchase.','Snapshot only; no reservation, BOM upload or purchase.'])
out=Path(__file__).parent
(out/'2026-09-12-jlcpcb-stock.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
lines=['# Stereo Line In rev A — JLCPCB在庫確認','', '確認日: 2026-09-12 JST。JLCPCBの部品詳細ページで実在庫・発注可能数・PCBA対応を確認。これは在庫監査で、発注用BOMではない。','', '## 確認できた部品','', '| 部品 | JLCPCB | 数/台 | パッケージ・値 | 実在庫 | 発注可能数 | 区分 | 状態 |','|---|---|---:|---|---:|---:|---|---|']
for e in entries:
    status={'exact_mpn_stock_verified':'回路の指定型番','package_candidate_not_applied':'実装候補・未適用','value_change_candidate_not_applied':'239kの代替案・未適用'}[e['status']]
    lines.append(f"| {e['mpn']} | [{e['jlc']}]({e['url']}) | {e['quantity_per_module']} | {e['package']} | {e['in_stock']:,} | {e['available_order_qty']:,} | {e['library']} | {status} |")
lines += ['', '上表は全てSMT Assembly / Economic and Standard対応。指定済みICは5型番・計7個すべて在庫あり。候補部品はメーカー・フットプリントの回路への適用前。','', '## 調達上の未確定点','', '- 239kΩは上記2検索で該当なし。240kΩ 0.1%の在庫候補があり、最下段閾値は約0.501→0.499 Vpeak。回路変更は未実施。','- 入力AC結合: 1µF、50V以上、5%フィルム×4。型番・実装方式・外形・在庫が未確定。MLCCへの無断置換はしない。','- 電源バルク: 22µF×2、47µF×1、25V以上の電解。型番未選定。','- その他の抵抗、デカップリング100nF×10、帰還10pF C0G×2、LED×8は型番・パッケージ未選定。在庫未確認。','- 6.35mm TRS×2、3.5mm TS×2、10kΩの2連オーディオテーパーポット×1、2x5電源ヘッダ×1は型番未選定。4HPへの収まりとJLCPCBでの実装可否も未確認。','- 全100リファレンスの確認状態を下表とJSONに収録。未確認は在庫ゼロを意味しない。','', '## 全部品の照合状態','', '| Ref | 値 | 状態 | 候補 |','|---|---|---|---|']
for p in coverage:
    lines.append(f"| {p['ref']} | {p['value']} | {p['status']} | {p['candidate_jlc'] or '—'} |")
lines += ['', '在庫は確認時点の値。発注前の再確認が必要。回路の部品値・接続はこの監査では変更していない。']
(out/'2026-09-12-jlcpcb-stock.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'total':len(coverage),'status_counts':{s:sum(p['status']==s for p in coverage) for s in sorted({p['status'] for p in coverage})}},indent=2))
