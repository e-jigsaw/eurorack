"""Geometric GND-plane and physical supply-route gate. Requires Shapely 2.x.
Run: python check-links-decoupling.py circuit.json [report.json]
No electrical/EM simulation; lengths are copper centre lines in the PCB plane.
"""
import json, sys, math, heapq, collections
from shapely.geometry import Polygon, Point
c=json.load(open(sys.argv[1]))
def entries(t): return [e for e in c if e['type']==t]
components={e['source_component_id']:e['name'] for e in entries('source_component')}
sp={e['source_port_id']:f"{components[e['source_component_id']]}.pin{e['pin_number']}" for e in entries('source_port')}
pp={e['pcb_port_id']:sp[e['source_port_id']] for e in entries('pcb_port')}
positions={sp[e['source_port_id']]:e for e in entries('pcb_port')}
graph=collections.defaultdict(list)
stitches={}
for t in entries('pcb_trace'):
 r=t['route']; ends=[]
 for p in r:
  for k in ['start_pcb_port_id','end_pcb_port_id']:
   if p.get(k) and p[k] not in ends: ends.append(p[k])
 if len(ends)==1:
  assert t['pcb_trace_id'].startswith('stitch_')
  if r[0]['layer']=='top':r=list(reversed(r))
  a=pp[ends[0]];q=positions[a];assert math.hypot(r[0]['x']-q['x'],r[0]['y']-q['y'])<1e-6
  vs=[p for p in r if p['route_type']=='via'];assert len(vs)==1
  assert r[0]['layer']=='bottom' and r[-1]['layer']=='top'
  length=sum(math.hypot(a['x']-b['x'],a['y']-b['y']) for a,b in zip(r,r[1:]))
  assert length<=1.6+1e-6 and min(p['width'] for p in r if p['route_type']=='wire')>=.3
  stitches[a]=dict(length_mm=length,via=vs[0]);continue
 assert len(ends)==2
 for pid,p in zip(ends,[r[0],r[-1]]):
  q=positions[pp[pid]];assert math.hypot(p['x']-q['x'],p['y']-q['y'])<1e-6
 a,b=map(pp.get,ends); d=sum(math.hypot(a['x']-b['x'],a['y']-b['y']) for a,b in zip(r,r[1:]));v=sum(p['route_type']=='via' for p in r)
 graph[a].append((b,d,v));graph[b].append((a,d,v))
def shortest(a,b):
 q=[(0,a,0)];seen=set()
 while q:
  d,n,v=heapq.heappop(q)
  if n in seen:continue
  seen.add(n)
  if n==b:return dict(from_pin=a,to_pin=b,length_mm=d,vias=v)
  for m,l,w in graph[n]:heapq.heappush(q,(d+l,m,v+w))
 raise AssertionError((a,b))
pairs=[('IC1.pin4','C3.pin1'),('IC1.pin11','C4.pin2'),('IC2.pin8','C5.pin1'),('IC2.pin4','C7.pin2'),('IC4.pin8','C8.pin1'),('IC4.pin4','C10.pin2'),('IC3.pin5','C11.pin1'),('IC3.pin2','C12.pin1'),('IC5.pin5','C13.pin1'),('IC5.pin2','C14.pin1')]
routes=[shortest(a,b) for a,b in pairs]
for r in routes:assert r['length_mm']<=5 and r['vias']==0,r
net=next(e['source_net_id'] for e in entries('source_net') if e['name']=='GND')
pours=[]
for e in entries('pcb_copper_pour'):
 if e['layer']!='bottom' or e['source_net_id']!=net:continue
 b=e['brep_shape']; poly=Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]);assert poly.is_valid
 pours.append(poly)
power=positions['JP1.pin3'];main=next(p for p in pours if p.covers(Point(power['x'],power['y'])))
top=next(e for e in entries('pcb_copper_pour') if e['layer']=='top' and e['source_net_id']==net)
b=top['brep_shape'];top_poly=Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']])
assert top_poly.is_valid
# The 0.3mm local stubs reach the main top plane within 1.6mm. Its eroded
# component proves a >=0.5mm corridor from each stitching via to the header.
eroded=top_poly.buffer(-.25);regions=list(eroded.geoms) if hasattr(eroded,'geoms') else [eroded]
wide=next(p for p in regions if p.covers(Point(power['x'],power['y'])))
grounds={}
for pin in ['C3.pin2','C4.pin1','C5.pin2','C7.pin1','C8.pin2','C10.pin1','C11.pin2','C12.pin2','C13.pin2','C14.pin2']:
 p=positions[pin];pt=Point(p['x'],p['y']);assert main.covers(pt),pin
 stitch=stitches[pin];via=stitch['via'];assert wide.covers(Point(via['x'],via['y'])),f'{pin}: top plane corridor narrower than 0.5mm'
 grounds[pin]=dict(same_polygon_as_power_header=True,centre_to_boundary_mm=main.boundary.distance(pt),stitch_length_mm=stitch["length_mm"],top_corridor_min_width_mm=.5)
report=dict(supply_routes=routes,ground_pads=grounds,bottom_main_area_mm2=main.area,limits='Geometric plane connectivity only; no impedance, noise, fabrication or physical measurements.')
print(json.dumps(report,indent=2))
if len(sys.argv)>2:open(sys.argv[2],'w').write(json.dumps(report,indent=2)+'\n')
