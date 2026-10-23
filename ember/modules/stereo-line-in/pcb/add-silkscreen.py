"""Place readable reference aliases and reserved marking areas without changing copper."""
import json,importlib.util,math
from pathlib import Path
from collections import defaultdict
from shapely.geometry import box
from shapely.affinity import rotate,translate
from shapely.ops import unary_union
D=Path(__file__).parent
spec=importlib.util.spec_from_file_location('cu',D/'verify-copper.py');cu=importlib.util.module_from_spec(spec);spec.loader.exec_module(cu)
physical=json.loads((D/'physical-input.json').read_text());layout=json.loads((D/'layout.json').read_text())
path=D/'reference-aliases.json'
if path.exists(): aliases=json.loads(path.read_text())
else:
 aliases={};counts=defaultdict(int)
 for ref in sorted({p['ref'] for p in physical['parts']}):
  prefix=ref.split('_')[0];counts[prefix]+=1;aliases[ref]=f'{prefix}{counts[prefix]}'
 path.write_text(json.dumps(aliases,indent=2)+'\n')
result={};report={}
for board in ['control','main']:
 items,_,_,_=cu.geometry(board);h=layout[board]['height'];edge=box(-8.65,-h/2+.35,8.65,h/2-.35)
 pads={side:unary_union([e['g'].buffer(.25) for e in items if e['layer']==side and ('.' in e['id'] and ':' not in e['id'])]) for side in ['top','bottom']}
 bodies={side:[] for side in pads}
 for p in physical['parts']:
  if p['board']!=board:continue
  x,y,r,side=layout[board]['placements'][p['ref']];shape=physical['shapes'][p['shapeKey']];w,bh=shape['body'];ox,oy=shape.get('offset',[0,0]);ox*= -1 if side=='bottom' else 1
  g=translate(rotate(box(ox-w/2,oy-bh/2,ox+w/2,oy+bh/2),r,origin=(0,0)),x,y)
  bodies[side].append(g.buffer(.1))
 occupied={side:[] for side in pads};labels=[]
 def place(text,w,hh,side,target,avoidbody=True,kind='text',size=1):
  obstacles=unary_union([pads[side],*occupied[side],*(bodies[side] if avoidbody else [])])
  candidates=[]
  for angle in ([0,90] if kind=='text' and text in aliases.values() else [0]):
   ww,hh2=(hh,w) if angle else (w,hh)
   for iy in range(math.ceil((-h/2+.35+hh2/2)*4),math.floor((h/2-.35-hh2/2)*4)+1):
    y=iy/4
    for ix in range(math.ceil((-8.65+ww/2)*4),math.floor((8.65-ww/2)*4)+1):
     x=ix/4;candidates.append(((x-target[0])**2+(y-target[1])**2+angle/450,x,y,angle,ww,hh2))
  for dist,x,y,angle,ww,hh2 in sorted(candidates):
   g=box(x-ww/2,y-hh2/2,x+ww/2,y+hh2/2)
   if edge.covers(g) and not g.intersects(obstacles):
    occupied[side].append(g.buffer(.12));labels.append(dict(text=text,x=x,y=y,size=size,layer=side,kind=kind,width=ww,height=hh2,rotation=angle));return math.hypot(x-target[0],y-target[1])
  raise RuntimeError(f'No space: {board} {side} {text}')
 # Printed barcode remains exposed after assembly. Reserve before labels.
 place('JLC 5x5',5,5,'bottom',(0,-h/2+12),kind='solid')
 if board=='main':
  place('Nok Audio\nXof v0.1',9,3.5,'bottom',(0,-35),size=1.1)
 # Existing electrical/polarity marks retained as fixed keepouts.
 for l in json.loads((D/'labels.json').read_text())[board]:
  if l['text'].startswith('LINE IN'):continue
  w=len(l['text'])*l['size']+0.3;hh=l['size']+0.3
  occupied[l['layer']].append(box(l['x']-w/2,l['y']-hh/2,l['x']+w/2,l['y']+hh/2));labels.append(l)
 distances={}
 ps=[p for p in physical['parts'] if p['board']==board]
 # Dense small parts first. Reference text may occupy its package body when no nearby exterior space exists.
 for p in sorted(ps,key=lambda p:(0 if p['ref'].startswith('U_') else 1, layout[board]['placements'][p['ref']][1])):
  ref=p['ref'];text=aliases[ref];x,y,r,side=layout[board]['placements'][ref]
  distances[ref]=place(text,len(text)*.8+.3,1.35,side,(x,y),avoidbody=False)
 result[board]=labels;report[board]={'references':len(ps),'maximum_reference_offset_mm':max(distances.values()),'offsets_mm':distances}
(D/'silkscreen.json').write_text(json.dumps(result,indent=2)+'\n')
(D.parent/'generated/pcb/silkscreen-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

from html import escape
rows=[]
for p in physical['parts']:
 ref=p['ref'];rows.append(f"<tr><td>{p['board']}</td><td>{aliases[ref]}</td><td>{escape(ref)}</td><td>{escape(str(p['value']))}</td></tr>")
(D.parent/'generated/reference-guide.html').write_text('<!doctype html><meta charset="utf-8"><title>Silkscreen reference guide</title><style>body{font:16px system-ui;margin:32px}td,th{padding:6px 14px;text-align:left;border-bottom:1px solid #ccc}</style><h1>Silkscreen / schematic reference guide</h1><p>Silkscreen and schematic SVG use the short reference. Source circuit JSON and JLC BOM/CPL retain the internal reference. On four-up panels, P1_ through P4_ prefix the internal reference in BOM/CPL. J_LINK_TOP and J_LINK_BOTTOM are physical board connectors; their signal assignment is in the PCB design, outside the logical audio schematic.</p><table><tr><th>Board</th><th>Silk / schematic</th><th>Source / BOM / CPL</th><th>Value</th></tr>'+''.join(rows)+'</table>')
