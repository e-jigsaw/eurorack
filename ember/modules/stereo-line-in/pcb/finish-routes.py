"""Route remaining connections against emitted copper; final independent DRC is mandatory."""
import importlib.util,json,sys,heapq,math,time
from pathlib import Path
import numpy as np
import shapely
from shapely.geometry import Point,box
from shapely.ops import unary_union
D=Path(__file__).parent
spec=importlib.util.spec_from_file_location('copper',D/'verify-copper.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
board=sys.argv[1] if len(sys.argv)>1 else 'main';out=D.parent/'generated'/'pcb'/board
from shapely.strtree import STRtree
patch=[]
for attempt in range(30):
 report=m.check(board)
 if not report['unconnected']:break
 pending=min(report['unconnected'],key=lambda e: {'L_GAIN_FB':0,'VP':1}.get(e['net'],2));net=pending['net'];startref=min(pending['groups'],key=len)[0]
 items,terminals,bridges,layout=m.geometry(board);layers=['top','inner1','inner2','bottom'];step=.05
 # Find the existing connected copper island containing the source terminal.
 parents=list(range(len(items)))
 def root(i):
  while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
  return i
 def join(a,b):parents[root(b)]=root(a)
 for ids in bridges.values():
  for i in ids[1:]:join(ids[0],i)
 for layer in layers:
  ids=[i for i,e in enumerate(items) if e['layer']==layer and e['net']==net];gs=[items[i]['g'] for i in ids];tree=STRtree(gs)
  for a,g in enumerate(gs):
   for b in tree.query(g.buffer(.00015)):
    if g.distance(gs[b])<.00015:join(ids[a],ids[b])
 seed_id=next(i for i,e in enumerate(items) if e['id']==startref)
 island={i for i,e in enumerate(items) if e['net']==net and root(i)==root(seed_id)}
 xs=np.arange(-8.55,8.5501,step);ys=np.arange(-54.55,54.5501,step);X,Y=np.meshgrid(xs,ys);ny,nx=X.shape;N=nx*ny
 blocked=[];goals=[];starts=[]
 allother=[e['g'] for e in items if e['net']!=net]
 # Through vias must stay out of every existing pad, including same-net SMT pads.
 pads=[e['g'] for e in items if not e['id'].startswith('fr_')]
 viaobs=unary_union(allother+pads).buffer(.46)
 viablock=shapely.intersects_xy(viaobs,X,Y)
 spacer=Point(0,0).buffer(0)
 viablock |= shapely.intersects_xy(spacer,X,Y)
 for li,l in enumerate(layers):
  obs=unary_union([e['g'] for e in items if e['layer']==l and e['net']!=net]).buffer(.227)
  mask=shapely.intersects_xy(obs,X,Y) | shapely.intersects_xy(Point(0,0).buffer(0),X,Y)
  blocked.append(mask.ravel())
  target=unary_union([e['g'] for i,e in enumerate(items) if e['layer']==l and e['net']==net and i not in island])
  goals.append(shapely.intersects_xy(target,X,Y).ravel() & ~mask.ravel())
  for i,e in enumerate(items):
   if e['layer']==l and i in island:
    seed=shapely.intersects_xy(e['g'].buffer(-.12),X,Y) & ~mask
    starts.extend((li*N+int(i)) for i in np.flatnonzero(seed))
 blocked=np.concatenate(blocked);goal=np.concatenate(goals);vb=viablock.ravel();targetids=np.flatnonzero(goal)
 if not starts or not len(targetids):raise RuntimeError('No start/goal '+net)
 gy,gx=np.divmod(targetids%N,nx);xmin,xmax,ymin,ymax=gx.min(),gx.max(),gy.min(),gy.max()
 def heuristic(i):
  y,x=divmod(i%N,nx);return max(xmin-x,0,x-xmax,ymin-y,0,y-ymax)
 dist={i:0 for i in starts};prev={};heap=[(heuristic(i),0,i) for i in starts];heapq.heapify(heap);found=None;it=0
 while heap:
  _,cost,i=heapq.heappop(heap)
  if cost!=dist.get(i):continue
  if goal[i]:found=i;break
  it+=1;li,cell=divmod(i,N);y,x=divmod(cell,nx)
  ns=[]
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
   xx,yy=x+dx,y+dy
   if not (0<=xx<nx and 0<=yy<ny):continue
   ni=li*N+yy*nx+xx
   if blocked[ni]:continue
   if dx and dy and (blocked[li*N+y*nx+xx] or blocked[li*N+yy*nx+x]):continue
   ns.append((ni,math.sqrt(2) if dx and dy else 1))
  if not vb[cell]:
   for ll in range(4):
    if ll!=li and not blocked[ll*N+cell]:ns.append((ll*N+cell,50))
  for ni,dc in ns:
   nc=cost+dc
   if nc<dist.get(ni,1e99):dist[ni]=nc;prev[ni]=i;heapq.heappush(heap,(nc+heuristic(ni),nc,ni))
 if found is None:raise RuntimeError(f'No path {net}, visited {it}')
 path=[found]
 while path[-1] in prev:path.append(prev[path[-1]])
 path.reverse();groups=[];vias=[];g=[];lastl=None
 for i in path:
  li,cell=divmod(i,N);yy,xx=divmod(cell,nx);p=[round(float(xs[xx]),5),round(float(ys[yy]),5)]
  if lastl is not None and li!=lastl:
   groups.append((layers[lastl],g));g=[];vias.append(p)
  g.append(p);lastl=li
 groups.append((layers[lastl],g))
 def simplify(ps):
  result=[]
  for p in ps:
   while len(result)>=2:
    a,b=result[-2:];cross=(b[0]-a[0])*(p[1]-b[1])-(b[1]-a[1])*(p[0]-b[0])
    if abs(cross)>1e-8:break
    result.pop()
   result.append(p)
  return result
 record={'net':net,'traces':[{'layer':l,'points':simplify(ps),'width':.15} for l,ps in groups if len(ps)>1],'vias':vias,'grid':step,'visited':it};patch.append(record)
 j=json.loads((out/'circuit.json').read_text());nid=next(e['source_net_id'] for e in j if e['type']=='source_net' and e['name']==net)
 serial=sum(1 for e in j if str(e.get('pcb_trace_id',e.get('pcb_via_id',''))).startswith('fr_finish'))
 tid=next(e['source_trace_id'] for e in j if e['type']=='source_trace' and nid in e.get('connected_source_net_ids',[]))
 for k,t in enumerate(record['traces']):j.append({'type':'pcb_trace','pcb_trace_id':f'fr_finish_{serial}_{k}','source_trace_id':tid,'subcircuit_id':'subcircuit_source_group_0','source_net_id':nid,'route':[{'route_type':'wire','x':x,'y':y,'width':.15,'layer':t['layer']} for x,y in t['points']]})
 for k,(x,y) in enumerate(vias):j.append({'type':'pcb_via','pcb_via_id':f'fr_finish_via_{serial}_{k}','source_net_id':nid,'x':x,'y':y,'outer_diameter':.6,'hole_diameter':.3,'layers':layers})
 (out/'circuit.json').write_text(json.dumps(j,indent=2)+'\n')
 (D/'additional-copper.json').write_text(json.dumps({board:[e for e in j if str(e.get('pcb_trace_id',e.get('pcb_via_id',''))).startswith('fr_finish')]},indent=2)+'\n')
 print(net,'visited',it,'vias',len(vias),'segments',sum(len(t['points'])-1 for t in record['traces']),flush=True)
(out/'routing-completion-log.json').write_text(json.dumps(patch,indent=2)+'\n')
report=m.check(board)
if report['unconnected']:raise RuntimeError('Unresolved routes remain')
