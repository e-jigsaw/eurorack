import json,math
from pathlib import Path
from shapely.geometry import box,Point
from shapely.affinity import rotate,translate,scale
D=Path(__file__).parent;j=json.loads((D/'physical-input.json').read_text());layouts=json.loads((D/'layout.json').read_text())
errors=[];checks=0
for board,l in layouts.items():
 parts={p['ref']:p for p in j['parts'] if p['board']==board};geoms={}
 data=json.loads((D.parent/'generated'/'pcb'/board/'placement.json').read_text())
 src={e['source_component_id']:e['name'] for e in data if e['type']=='source_component'}
 comps={e['pcb_component_id']:src[e['source_component_id']] for e in data if e['type']=='pcb_component'}
 sp={e['source_port_id']:e for e in data if e['type']=='source_port'};ports={e['pcb_port_id']:e for e in data if e['type']=='pcb_port'}
 actual={}
 for e in data:
  if e['type'] in ['pcb_smtpad','pcb_plated_hole']:
   p=ports[e['pcb_port_id']];actual[comps[e['pcb_component_id']],str(sp[p['source_port_id']]['pin_number'])]=(e['x'],e['y'])
 for ref,pos in l['placements'].items():
  s=j['shapes'][parts[ref]['shapeKey']];x,y,r,layer=pos;mirror=-1 if layer=='bottom' else 1
  def tx(g):return translate(rotate(scale(g,xfact=mirror,yfact=1,origin=(0,0)),r,origin=(0,0)),x,y)
  w,h=s['body'];ox,oy=s.get('offset',[0,0]);body=tx(box(ox-w/2,oy-h/2,ox+w/2,oy+h/2));pads=[]
  for p in s['pads']:
   point=tx(Point(p['x'],p['y']));ap=actual[ref,p['pin']];checks+=1
   if point.distance(Point(*ap))>1e-5:errors.append(f'{board} {ref}.{p["pin"]} expected {(point.x,point.y)} actual {ap}')
   w,h=p.get('outer',[p.get('w'),p.get('h')]);pads.append((tx(box(p['x']-w/2,p['y']-h/2,p['x']+w/2,p['y']+h/2)),bool(p.get('drill') or p.get('slot'))))
  geoms[ref]=(body,pads,layer)
 edge=box(-8.7,-l['height']/2+.3,8.7,l['height']/2-.3);spacer=Point(0,0).buffer(0)
 for ref,(b,pads,layer) in geoms.items():
  if b.intersects(spacer):errors.append(f'{board} {ref} spacer')
  if any(not edge.covers(g) for g,t in pads):errors.append(f'{board} {ref} edge')
  for other,(ob,ops,ol) in geoms.items():
   if ref>=other:continue
   if layer==ol and b.distance(ob)<.149:errors.append(f'{board} {ref}/{other} body')
   for g,t in pads:
    for og,ot in ops:
     if (t or ot or layer==ol) and g.distance(og)<.149:errors.append(f'{board} {ref}/{other} copper')
   if layer!=ol and (any(t and g.distance(ob)<.149 for g,t in pads) or any(t and g.distance(b)<.149 for g,t in ops)):errors.append(f'{board} {ref}/{other} through lead/body')
report={'padCoordinateChecks':checks,'errors':errors};(D.parent/'generated'/'pcb'/'placement-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
raise SystemExit(bool(errors))
