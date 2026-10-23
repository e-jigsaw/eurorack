"""Export exact tscircuit copper pads to Specctra for offline Freerouting.
Placements remain in tscircuit; DSN images contain absolute top-view pad geometry.
"""
from pathlib import Path
import json,sys
D=Path(__file__).parent
board=sys.argv[1];out=D.parent/'generated'/'pcb'/board
j=json.loads((out/'placement.json').read_text());layout=json.loads((D/'layout.json').read_text())[board]
bytype=lambda t:[e for e in j if e['type']==t]
src={e['source_component_id']:e['name'] for e in bytype('source_component')}
comps={e['pcb_component_id']:src[e['source_component_id']] for e in bytype('pcb_component')}
sports={e['source_port_id']:e for e in bytype('source_port')};ports={e['pcb_port_id']:e for e in bytype('pcb_port')}
nets={e['source_net_id']:e['name'] for e in bytype('source_net')};spnet={}
for t in bytype('source_trace'):
 for p in t['connected_source_port_ids']:
  if t.get('connected_source_net_ids'):spnet[p]=nets[t['connected_source_net_ids'][0]]
layers=['top','inner1','inner2','bottom'] if board=='main' else ['top','bottom']
q=lambda s:str(s)
f=lambda n:f'{n:.6f}'.rstrip('0').rstrip('.') or '0'
lines=[f'(pcb {q(board)}','(parser (string_quote ") (space_in_quoted_tokens on))','(resolution mm 10000)','(unit mm)','(structure']
for i,l in enumerate(layers):lines.append(f'(layer {l} (type signal) (property (index {i})))')
w,h=layout['width']/2,layout['height']/2
# Boundary inset + 0.16 mm router clearance = 0.30 mm physical edge clearance.
w-=.14;h-=.14
lines += [f'(boundary (path pcb 0 {-w} {-h} {w} {-h} {w} {h} {-w} {h} {-w} {-h}))','(via VIA_06)','(rule (width 0.15) (clearance 0.16))']
lines.append(')')
images={r:[] for r in comps.values()};pads=[];netpins={}
for i,e in enumerate(bytype('pcb_smtpad')+bytype('pcb_plated_hole')):
 ref=comps[e['pcb_component_id']];port=ports.get(e.get('pcb_port_id'));sp=sports.get(port['source_port_id']) if port else None
 pin=str(sp['pin_number']) if sp else str(100+i)
 padid=f'PAD{i}'
 images[ref].append(f'(pin {padid} {pin} {f(e["x"])} {f(e["y"])} )')
 if sp and sp['source_port_id'] in spnet:netpins.setdefault(spnet[sp['source_port_id']],[]).append(f'{ref}-{pin}')
 if e['type']=='pcb_smtpad':
  if e['shape']=='rect':
   pw,ph=e['width'],e['height'];geos=[f'(shape (rect {e["layer"]} {f(-pw/2)} {f(-ph/2)} {f(pw/2)} {f(ph/2)}))']
  elif e['shape']=='rotated_rect':
   import math
   pw,ph=e['width'],e['height'];a=math.radians(e['ccw_rotation']);v=[]
   for x,y in [(-pw/2,-ph/2),(pw/2,-ph/2),(pw/2,ph/2),(-pw/2,ph/2)]:v.extend([f(x*math.cos(a)-y*math.sin(a)),f(x*math.sin(a)+y*math.cos(a))])
   geos=[f'(shape (polygon {e["layer"]} 0 '+ ' '.join(v)+'))']
  else:raise ValueError(e)
 else:
  if e['shape']=='circle':geos=[f'(shape (circle {l} {e["outer_diameter"]}))' for l in layers]
  else:
   pw,ph=e['outer_width'],e['outer_height'];angle=e.get('ccw_rotation',0)%180
   assert angle in [0,90], 'Only orthogonal slots supported'
   if angle==90:pw,ph=ph,pw
   geos=[f'(shape (rect {l} {f(-pw/2)} {f(-ph/2)} {f(pw/2)} {f(ph/2)}))' for l in layers]
 pads.append(f'(padstack {padid} '+''.join(geos)+' (attach off))')
lines += ['(placement']+[f'(component {q(r)} (place {q(r)} 0 0 front 0))' for r in images]+[')','(library']
lines += [f'(image {q(r)} '+''.join(p)+')' for r,p in images.items()]
lines+=pads+[f'(padstack VIA_06 '+''.join(f'(shape (circle {l} 0.6))' for l in layers)+' (attach off))',')','(network']
for net,pins in netpins.items():lines.append(f'(net {q(net)} (pins '+ ' '.join(q(p) for p in pins)+'))')
lines.append('(class default '+ ' '.join(q(n) for n in netpins)+' (circuit (use_via VIA_06)) (rule (width 0.15) (clearance 0.16)))')
lines+=[')','(wiring']
if board=='main' and (D/'route-fixes.json').exists():
 for fix in json.loads((D/'route-fixes.json').read_text()):
  for t in fix['traces']:
   coords=' '.join(f(v) for point in t['points'] for v in point)
   lines.append(f"(wire (path {t['layer']} {t['width']} {coords}) (net {fix['net']}) (type protect))")
  for x,y in fix['vias']:lines.append(f"(via VIA_06 {x} {y} (net {fix['net']}) (type protect))")
if '--seed' in sys.argv:
 routed=json.loads((out/'circuit.json').read_text());names={e['source_net_id']:e['name'] for e in routed if e['type']=='source_net'}
 for e in routed:
  if e['type']=='pcb_trace':
   ps=e['route'];coords=' '.join(f(v) for p in ps for v in [p['x'],p['y']]);lines.append(f"(wire (path {ps[0]['layer']} {ps[0]['width']} {coords}) (net {names[e['source_net_id']]}) (type protect))")
  elif e['type']=='pcb_via':lines.append(f"(via VIA_06 {e['x']} {e['y']} (net {names[e['source_net_id']]}) (type protect))")
lines+=[')',')']
(out/f'{board}.dsn').write_text('\n'.join(lines)+'\n')
print(board,len(images),'components',len(pads),'pads',len(netpins),'nets')
