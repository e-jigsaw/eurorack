"""Deterministic placement, panel coordinates in mm. Copper checked separately after routing."""
import json, math, sys
from pathlib import Path
from shapely.geometry import box
from shapely.affinity import rotate,translate
D=Path(__file__).parent
j=json.loads((D/'physical-input.json').read_text()); shapes=j['shapes']; parts=j['parts']
layouts=json.loads((D/'layout.json').read_text()) if len(sys.argv)>1 else {}
for board in sys.argv[1:] or ['control','main']:
 ps={p['ref']:p for p in parts if p['board']==board}; cy=46.5 if board=='control' else 64; height=77 if board=='control' else 110
 placed={}; geoms={}; padnets={}
 def geometry(ref,pos):
  s=shapes[ps[ref]['shapeKey']];x,y,r,layer=pos; mirror=-1 if layer=='bottom' else 1
  def tx(g):
   from shapely.affinity import scale
   return translate(rotate(scale(g,xfact=mirror,yfact=1,origin=(0,0)),r,origin=(0,0)),x,y)
  w,h=s['body']; ox,oy=s.get('offset',[0,0]); body=tx(box(ox-w/2,oy-h/2,ox+w/2,oy+h/2))
  pads=[]
  for p in s['pads']:
   w,h=p.get('outer',[p.get('w'),p.get('h')]);g=tx(box(p['x']-w/2,p['y']-h/2,p['x']+w/2,p['y']+h/2));pads.append((g,bool(p.get('drill') or p.get('slot')),ps[ref]['pins'].get(p['pin'])))
  return body,pads,layer
 edge=box(-8.7,-height/2+.3,8.7,height/2-.3)
 spacer=box(0,0,0,0).buffer(0)
 def check(ref,pos):
  body,pads,layer=geometry(ref,pos)
  if body.intersects(spacer):return False
  if not edge.covers(body) or any(not edge.covers(g) for g,t,n in pads):return False
  for ob,ops,ol in geoms.values():
   if layer==ol and body.distance(ob)<.3:return False
   for g,t,n in pads:
    # SMT cannot hide below a through-hole lead on either face.
    if t and g.distance(ob)<.2:return False
    if layer==ol and g.distance(ob)<.15:return False
    for og,ot,on in ops:
     if (t or ot or layer==ol) and g.distance(og)<.2:return False
   for og,ot,on in ops:
    if (ot or layer==ol) and body.distance(og)<.2:return False
  return True
 def add(ref,px,py,r=0,layer='top',fixed=True):
  pos=[round(px-10,3),round(cy-py,3),r,layer];placed[ref]=pos;geoms[ref]=geometry(ref,pos)
 def targets(ref):
  nets=set(ps[ref]['pins'].values())-{'GND','VP','VN','VLED','VREF'}
  pts=[]
  for ob,ops,ol in geoms.values():
   for g,t,n in ops:
    if n in nets:pts.append((g.centroid.x,g.centroid.y))
  if pts:return sum(x for x,y in pts)/len(pts),sum(y for x,y in pts)/len(pts)
  if ref.startswith('C_RX'):return 0,cy-81
  if ref.startswith('C_ENV'):return 0,cy-69
  if ref.startswith('C_L'):return 0,cy-(64 if 'CMP' in ref else 56)
  if ref.startswith('C_R'):return 0,cy-(22 if 'CMP' in ref else 14)
  return 0,cy-35
 if board=='control':
  for ch,x in [('L',5),('R',15)]:
   add('J_OUT_'+ch,x,22)
   for i in range(1,5):add(f'LED_{ch}_{i}',x,52-i*5)
  add('RV_L',10,56,0);add('RV_R',10,69.5,0)
  add('J_LINK_TOP',10,12,90,'bottom');add('J_LINK_BOTTOM',10,81,90,'bottom')
  add('C_LED_BULK',10,56,0,'bottom')
 else:
  add('J_IN_L',10,93);add('J_IN_R',10,111)
  for ch,yy in [('L',39),('R',74)]:
   for pol,xx in [('P',5.5),('N',14.5)]:add(f'C_{ch}_{pol}_AC',xx,yy)
  add('J_LINK_TOP',10,12,90);add('J_LINK_BOTTOM',10,81,90)
  add('J_PWR',10,52,0,'bottom')
  add('U_METER_R',10,20,0,'bottom')
  add('C_BULK_P',5,23);add('C_BULK_N',15,23)
 # Place largest first, except local bypass caps have priority.
 def priority(ref):
  return (0 if ps[ref]['kind']=='IC' else 1,-math.prod(shapes[ps[ref]['shapeKey']]['body']))
 for ref in sorted(set(ps)-set(placed),key=priority):
  tx,ty=targets(ref); opts=[]
  for layer in ['bottom','top'] if board=='main' else ['bottom']:
   for r in [0,90,180,270]:
    for yi in range(int((-height/2+1)*2),int((height/2-1)*2)+1):
     y=yi/2
     for xi in range(-16,17):
      x=xi/2;score=math.hypot(x-tx,y-ty)+(0 if layer=='bottom' else 2)
      opts.append((score,x,y,r,layer))
  for _,x,y,r,layer in sorted(opts):
   if check(ref,[x,y,r,layer]):
    placed[ref]=[x,y,r,layer];geoms[ref]=geometry(ref,placed[ref]);break
  else:raise RuntimeError('Cannot place '+board+' '+ref)
 if board=='main':
  pass # Placement selected above; no stale revision-E route escape override.
 # Explicit fixed-to-fixed audit, allowing panel hardware body overhang but not copper.
 errors=[]
 for ref,(b,pads,l) in geoms.items():
  for g,t,n in pads:
   if not edge.covers(g):errors.append(ref+' pad outside copper inset')
  if b.intersects(spacer):errors.append(ref+' spacer collision')
  for other,(ob,ops,ol) in geoms.items():
   if ref>=other:continue
   if l==ol and b.distance(ob)<.15:errors.append(ref+' body '+other)
   for g,t,n in pads:
    for og,ot,on in ops:
     if (t or ot or l==ol) and g.distance(og)<.15:errors.append(ref+' pad '+other)
   if l!=ol:
    if any(t and g.distance(ob)<.15 for g,t,n in pads) or any(t and g.distance(b)<.15 for g,t,n in ops):errors.append(ref+' through lead into '+other)
 layouts[board]={'width':18,'height':height,'panelCenter':[10,cy],'placements':placed,'placementErrors':sorted(set(errors))}
 print(board,len(placed),sorted(set(errors)))
(D/'layout.json').write_text(json.dumps(layouts,indent=2)+'\n')
