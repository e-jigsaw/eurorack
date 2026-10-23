"""Independent Shapely connectivity/short/clearance checks on emitted copper, not source net labels alone."""
from pathlib import Path
import json,sys,math
from shapely.geometry import Point,box,LineString
from shapely.affinity import rotate
from shapely.strtree import STRtree
D=Path(__file__).parent

def geometry(board):
 out=D.parent/'generated'/'pcb'/board;j=json.loads((out/'circuit.json').read_text());layout=json.loads((D/'layout.json').read_text())[board]
 ts=lambda t:[e for e in j if e['type']==t]
 nets={e['source_net_id']:e['name'] for e in ts('source_net')};spnet={};trnet={}
 for t in ts('source_trace'):
  if t.get('connected_source_net_ids'):
   n=nets[t['connected_source_net_ids'][0]];trnet[t['source_trace_id']]=n
   for p in t['connected_source_port_ids']:spnet[p]=n
 src={e['source_component_id']:e['name'] for e in ts('source_component')};sp={e['source_port_id']:e for e in ts('source_port')};ports={e['pcb_port_id']:e for e in ts('pcb_port')}
 layers=['top','inner1','inner2','bottom'] if board=='main' else ['top','bottom'];items=[];terminals={};bridges={}
 def add(g,n,layer,id,terminal=False,bridge=False):
  idx=len(items);items.append(dict(g=g,net=n,layer=layer,id=id))
  if terminal:terminals.setdefault(n,[]).append(idx)
  if bridge:bridges.setdefault(id,[]).append(idx)
 for e in ts('pcb_smtpad')+ts('pcb_plated_hole'):
  port=ports[e['pcb_port_id']];p=sp[port['source_port_id']];ref=src[p['source_component_id']];id=f'{ref}.{p["pin_number"]}';n=spnet.get(p['source_port_id'],'NC:'+id);through=e['type']=='pcb_plated_hole'
  if through:
   if e['shape']=='circle':g=Point(e['x'],e['y']).buffer(e['outer_diameter']/2,quad_segs=24)
   else:
    w,h=e['outer_width'],e['outer_height'];rr=min(w,h)/2
    ends=[(e['x']-(w/2-rr),e['y']),(e['x']+(w/2-rr),e['y'])] if w>=h else [(e['x'],e['y']-(h/2-rr)),(e['x'],e['y']+(h/2-rr))]
    g=LineString(ends).buffer(rr,quad_segs=24)
    g=rotate(g,e.get('ccw_rotation',0),origin=(e['x'],e['y']))
  else:
   w,h=e['width'],e['height'];g=box(e['x']-w/2,e['y']-h/2,e['x']+w/2,e['y']+h/2)
   if e['shape']=='rotated_rect':g=rotate(g,e['ccw_rotation'],origin=(e['x'],e['y']))
  for l in layers if through else [e['layer']]:add(g,n,l,id,True,through)
 for e in ts('pcb_trace'):
  n=nets.get(e.get('source_net_id')) or trnet[e['source_trace_id']];route=e['route']
  for k,(a,b) in enumerate(zip(route,route[1:])):
   if a['route_type']!='wire' or b['route_type']!='wire':raise ValueError('Unexpected route format')
   assert a['layer']==b['layer'];assert a['width']>=.15-1e-8, 'Trace below 0.15 mm';g=LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=12)
   add(g,n,a['layer'],e['pcb_trace_id']+':'+str(k))
 for e in ts('pcb_via'):
  n=nets[e['source_net_id']];g=Point(e['x'],e['y']).buffer(e['outer_diameter']/2,quad_segs=24)
  for l in layers:add(g,n,l,e['pcb_via_id'],False,True)
 return items,terminals,bridges,layout

def check(board):
 items,terminals,bridges,layout=geometry(board);parents=list(range(len(items)))
 def root(i):
  while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
  return i
 def union(a,b):parents[root(b)]=root(a)
 for group in bridges.values():
  for b in group[1:]:union(group[0],b)
 errors=[];clear=[];short=[];minclear=999;edge=box(-layout['width']/2+.3,-layout['height']/2+.3,layout['width']/2-.3,layout['height']/2-.3);spacer=Point(0,0).buffer(0)
 for l in set(i['layer'] for i in items):
  ids=[k for k,e in enumerate(items) if e['layer']==l];gs=[items[k]['g'] for k in ids];tree=STRtree(gs)
  for ai,g in enumerate(gs):
   i=ids[ai];e=items[i]
   if not edge.buffer(.0002).covers(g):errors.append({'type':'edge','id':e['id'],'layer':l})
   if g.intersects(spacer.buffer(-.0002)):errors.append({'type':'spacer','id':e['id'],'layer':l})
   for bi in tree.query(g.buffer(.16)):
    if bi<=ai:continue
    b=ids[bi];o=items[b];dist=g.distance(gs[bi])
    if e['net']==o['net']:
     if dist<.00015:union(i,b)
    else:
     minclear=min(minclear,dist)
     if dist<.1498:
      violation={'a':e['id'],'b':o['id'],'nets':[e['net'],o['net']],'layer':l,'gap':round(dist,5)}
      (short if dist<.00001 else clear).append(violation)
 unconnected=[]
 for net,indices in terminals.items():
  if net.startswith('NC:'):continue
  groups={}
  for i in indices:groups.setdefault(root(i),set()).add(items[i]['id'])
  if len(groups)>1:unconnected.append({'net':net,'groups':[sorted(v) for v in groups.values()]})
 report={'board':board,'copperPrimitives':len(items),'nets':len([n for n in terminals if not n.startswith('NC:')]),'minimumDifferentNetClearanceInLocalSearch':round(minclear,5),'shorts':short,'clearanceViolations':clear,'geometryErrors':errors,'unconnected':unconnected}
 out=D.parent/'generated'/'pcb'/board/'copper-validation.json';out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v if not isinstance(v,list) else len(v) for k,v in report.items()}))
 return report
if __name__=='__main__':
 r=check(sys.argv[1]);raise SystemExit(any(r[k] for k in ['shorts','clearanceViolations','geometryErrors','unconnected']))
