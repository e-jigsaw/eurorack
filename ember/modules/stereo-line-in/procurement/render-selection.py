"""Reconcile selected parts against the generated netlist and saved live evidence."""
from pathlib import Path
import json,csv,collections,re,math
root=Path(__file__).parent.parent
parts=json.loads((root/'generated/netlist.json').read_text())['parts']
sel=json.loads((root/'procurement/selected-parts.json').read_text())
assert {p['ref'] for p in parts}==set(sel)
groups={}
for p in parts:
 e=sel[p['ref']];key=e.get('jlc',e['mpn']);g=groups.setdefault(key,dict(e,refs=[],values=set()))
 g['refs'].append(p['ref']);g['values'].add(p['value'])
connectors=[p for p in json.loads((root/'pcb/physical-input.json').read_text())['parts'] if p['ref'].startswith('J_LINK_')]
for p in connectors:
 e=p['procurement'];g=groups.setdefault(e['mpn'],dict(e,refs=[],values=set()))
 g['refs'].append(p['ref']);g['values'].add(p['value'])
# Match electrical nominal values to catalog attributes, not just MPN text/counts.
def scalar(value):
 value=value.replace('Ω','').replace('F','').replace('µ','u').replace('μ','u').strip()
 match=re.fullmatch(r'([0-9.]+)([pnumkKM]?)',value)
 assert match,value
 return float(match[1])*{'':1,'p':1e-12,'n':1e-9,'u':1e-6,'m':1e-3,'k':1e3,'K':1e3,'M':1e6}[match[2]]
nominal_checks=[]
for p in parts:
 e=sel[p['ref']]
 if p['kind'] in ['R','C'] and e.get('jlc'):
  live=json.loads((root/'procurement/live'/f"{e['jlc']}.json").read_text())
  attr='Resistance' if p['kind']=='R' else 'Capacitance'
  value=next(a['attribute_value_name'] for a in live['attributes'] if a['attribute_name_en']==attr)
  assert math.isclose(scalar(value),scalar(p['value']),rel_tol=1e-9),(p['ref'],p['value'],value,e['jlc'])
  nominal_checks.append(p['ref'])
records=[]
for key,g in groups.items():
 g['values']=sorted(g['values']);g['quantity']=len(g['refs'])
 if 'jlc' in g:
  live=json.loads((root/'procurement/live'/f'{key}.json').read_text())
  assert live['componentModelEn']==g['mpn']
  assert live['overseasStockCount']>=g['quantity'] and live['canPresaleNumber']>=g['quantity']
  g.update(in_stock=live['overseasStockCount'],available_order_qty=live['canPresaleNumber'],checked_at=live['checked_at'],jlc_assembly=live['assemblyMode'],library=live['componentLibraryType'],description=live.get('describe'))
 records.append(g)
counts=collections.Counter(e['assembly'] for e in sel.values())
counts.update(p['procurement']['assembly'] for p in connectors)
summary=dict(revision='E',nominal_value_checks=len(nominal_checks),parts=len(parts)+len(connectors),electrical_parts=len(parts),jlc_types=sum('jlc' in g for g in records),jlc_parts=sum(g['quantity'] for g in records if 'jlc' in g),assembly_counts=dict(counts),all_jlc_selected_types_in_stock=True,order_ready=False,source='JLCPCB public part-detail server-rendered data, 2026-09-13 UTC',limitations=['No stock reservation or purchase','Routed PCB and per-board BOM/CPL generated; JLC upload/assembly preview still pending','LEDs are user soldered and separately purchased; saved JLC stock is not loose-part availability','JLC assembly DFM for remaining parts is pending','Domestic NJ3FD-V inventory last checked in preceding turn, not refreshed here'],groups=records)
(root/'procurement/selection-audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lines=['# Stereo Line In rev D — 選定部品と在庫照合','',f'2026-09-13確認。101部品を全件照合。JLCPCB調達は{summary["jlc_types"]}型番・{summary["jlc_parts"]}部品、全型番に必要数以上の在庫あり。ほかは手持ちポット/出力ジャック、国内購入NJ3FD-V、別途購入して自前実装するLED8個。','', '在庫数は公式部品詳細の公開データから取得。旧rev Aの在庫表は更新せず履歴として保持。BOM/CPLのアップロード、発注・予約は未実施。','', '| 用途 / Ref | 値 | メーカー / 型番 | JLC | 数/台 | 在庫 / 発注可能数 | 実装 |','|---|---|---|---|---:|---:|---|']
for g in records:
 code=g.get('jlc','—');link=f'[{code}]({g["source"]})' if code!='—' else '—'
 lines.append('| '+ ' | '.join([', '.join(g['refs']),', '.join(g['values']),g['manufacturer']+' / '+g['mpn'],link,str(g['quantity']),f'{g["in_stock"]:,} / {g["available_order_qty"]:,}' if 'jlc' in g else '別途購入・在庫未確認' if g['assembly']=='user_hand_solder' else '手持ち / 国内調達',g['assembly']])+' |')
lines+=['','実装区分: smtWeld = JLC表面実装、manualWeld = JLC手はんだ対応。LED8個はユーザ手はんだに変更。パネルでレンズ先端を揃えてからはんだ付けする（操作基板面より前方11.9mmが公称値）。JLC実装対象から除外し、LEDは別途購入。保存済みJLC在庫は単品調達の在庫確認ではない。','', '電気仕様: 精度指定抵抗は0.1%、その他は1%。入力フィルム1µF/63V/5%、保持100nF/50V/C0G/5%、帰還10pF/50V/C0G/5%、デカップリング100nF/50V/X7R/10%、電解25V/20%。出力100Ωは1206/0.5Wを採用（連続短絡の実機試験は別途）。','', '変更: 最下段の239kΩを240kΩに変更、理想閾値は0.499 Vpeak。Tayda/Neutrik/QingPuの型番と選定パッケージをmodel.tsのprocurement属性へ紐付けた。PCB配置・配線は実装済み。rev DでR_LED_SUPPLYの誤紐付けをC23182 (47Ω)に修正し、全抵抗・コンデンサの公称値を在庫データの属性と照合。']
(root/'procurement/selected-parts.md').write_text('\n'.join(lines)+'\n')
with (root/'procurement/selected-bom.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['Designators','Quantity','Value','Manufacturer','MPN','Package','JLCPCB','Board','Assembly'])
 for g in records:w.writerow([','.join(g['refs']),g['quantity'],','.join(g['values']),g['manufacturer'],g['mpn'],g['package'],g.get('jlc',''),g['board'],g['assembly']])
print(json.dumps({k:v for k,v in summary.items() if k!='groups'},ensure_ascii=False,indent=2))

for filename,keep in [('jlc-assembly-bom.csv',lambda g:'jlc' in g),('hand-assembly-bom.csv',lambda g:'jlc' not in g)]:
 with (root/'procurement'/filename).open('w') as f:
  w=csv.writer(f);w.writerow(['Designators','Quantity','Value','Manufacturer','MPN','Package','JLCPCB','Board','Assembly'])
  for g in records:
   if keep(g):w.writerow([','.join(g['refs']),g['quantity'],','.join(g['values']),g['manufacturer'],g['mpn'],g['package'],g.get('jlc',''),g['board'],g['assembly']])
assert summary['jlc_parts']==87 and summary['jlc_types']==30
assert sum(g['quantity'] for g in records if g['assembly']=='user_hand_solder')==8
