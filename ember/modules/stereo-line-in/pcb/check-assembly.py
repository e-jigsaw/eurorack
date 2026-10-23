"""Nominal stacked-body and trimmed solder-tail check in panel coordinates.
No assertion about unmeasured manufacturing tolerances or connector retention.
"""
from pathlib import Path
import json,math
from shapely.geometry import box,Point
from shapely.affinity import rotate,translate,scale
D=Path(__file__).parent
physical=json.loads((D/'physical-input.json').read_text());layouts=json.loads((D/'layout.json').read_text());construction=json.loads((D.parent/'mechanical/construction.json').read_text());boards={b['name']:b for b in construction['boards']}
body={};tails={};pinmap={};errors=[]
max_tail=1.5
for p in physical['parts']:
 b=p['board'];ref=p['ref'];s=physical['shapes'][p['shapeKey']];x,y,r,side=layouts[b]['placements'][ref];pc=layouts[b]['panelCenter'];front=boards[b]['z'];back=front+boards[b]['thickness']
 def tx(g):return translate(scale(translate(rotate(scale(g,xfact=-1 if side=='bottom' else 1,yfact=1,origin=(0,0)),r,origin=(0,0)),x,y),xfact=1,yfact=-1,origin=(0,0)),pc[0],pc[1])
 w,h=s['body'];ox,oy=s.get('offset',[0,0]);g=tx(box(ox-w/2,oy-h/2,ox+w/2,oy+h/2));z=(front-s['height'],front) if side=='top' else (back,back+s['height'])
 body[b,ref]=(g,z)
 for pad in s['pads']:
  point=tx(Point(pad['x'],pad['y']));pinmap[b,ref,pad['pin']]={'x':point.x,'y':point.y,'net':p['pins'].get(pad['pin'])}
  if pad.get('drill') or pad.get('slot'):
   pw,ph=pad['outer'];g=tx(box(pad['x']-pw/2,pad['y']-ph/2,pad['x']+pw/2,pad['y']+ph/2))
   z=(back,back+max_tail) if side=='top' else (front-max_tail,front)
   tails[b,ref,pad['pin']]=(g,z)
def intersects(a,b):return min(a[1][1],b[1][1])-max(a[1][0],b[1][0])>1e-6 and a[0].intersection(b[0]).area>1e-6
for (b,ref),a in body.items():
 if b!='control':continue
 for (ob,oref),o in body.items():
  if ob!='main' or ref==oref and ref.startswith('J_LINK_'):continue
  if intersects(a,o):errors.append({'kind':'body','control':ref,'main':oref})
for (b,ref,pin),tail in tails.items():
 for (ob,oref),o in body.items():
  if ob==b or ref==oref and ref.startswith('J_LINK_'):continue
  if intersects(tail,o):errors.append({'kind':'trimmed-tail','from':f'{b}:{ref}.{pin}','to':f'{ob}:{oref}'})
# Include the PCB substrates, not only the parts: a board extension can hit a jack.
for b,board in boards.items():
 substrate=(box(board['x'],board['y'],board['x']+board['width'],board['y']+board['height']),(board['z'],board['z']+board['thickness']))
 for (ob,oref),o in body.items():
  if ob!=b and intersects(substrate,o):errors.append({'kind':'body-to-other-pcb','part':f'{ob}:{oref}','pcb':b})
connections=[]
for ref in ['J_LINK_TOP','J_LINK_BOTTOM']:
 for pin in map(str,range(1,9)):
  a=pinmap['control',ref,pin];b=pinmap['main',ref,pin];error=math.hypot(a['x']-b['x'],a['y']-b['y'])
  if error>1e-6 or a['net']!=b['net']:errors.append({'kind':'mating-pin','ref':ref,'pin':pin,'control':a,'main':b})
  connections.append({'ref':ref,'pin':pin,**a,'xy_error_mm':round(error,9)})
gap=boards['main']['z']-boards['control']['z']-boards['control']['thickness'];insert=2.54+5.84+8.51-gap
if not 3.68<=insert<=6.35:errors.append({'kind':'insertion','mm':insert})
capacitors=[]
for ref in ['C_BULK_P','C_BULK_N','C_L_P_AC','C_L_N_AC','C_R_P_AC','C_R_N_AC']:
 a=body['main',ref];caps={'ref':ref,'body_z_mm':a[1],'control_pcb_clearance_mm':round(a[1][0]-11.6,3),'clearance_after_1_5mm_tail_mm':round(a[1][0]-11.6-max_tail,3)};capacitors.append(caps)
report={'status':'nominal geometry checked; physical tolerances/retention not measured','board_gap_mm':gap,'pin_insertion_mm':round(insert,3),'permitted_pin_insertion_mm':[3.68,6.35],'connector_housing_gap_mm':round(gap-2.54-8.51,3),'max_solder_tail_including_solder_mm':max_tail,'mating_pin_checks':connections,'capacitors':capacitors,'errors':errors,'not_verified':['Combined panel/jack/pot/connector tolerances','Mated retention under handling and shock','Actual lead trimming and solder protrusion','Real hardware assembly']}
(D.parent/'generated/pcb/assembly-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2));raise SystemExit(bool(errors))
