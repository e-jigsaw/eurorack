"""Import Freerouting's physical copper, preserving original tscircuit components/nets."""
import json,re,sys,hashlib,importlib.util
from pathlib import Path
D=Path(__file__).parent

def parse_sexpr(text):
 tokens=re.findall(r'"(?:\\.|[^"\\])*"|[^\s()]+|[()]',text);stack=[];root=[];cur=root
 for token in tokens:
  if token=='(':v=[];cur.append(v);stack.append(cur);cur=v
  elif token==')':cur=stack.pop()
  else:cur.append(json.loads(token) if token.startswith('"') else token)
 return root[0]
def children(node,name):return [x for x in node if isinstance(x,list) and x and x[0]==name]
def child(node,name):return children(node,name)[0]
if __name__=='__main__':
 board=sys.argv[1];out=D.parent/'generated'/'pcb'/board
 spec=importlib.util.spec_from_file_location('routing_inputs',D/'routing-inputs.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 if '--candidate' not in sys.argv:
  frozen=json.loads((D/'frozen-routes.json').read_text())[board]
  assert module.digest(board)==frozen['geometry_and_nets_sha256'], 'Routing cache is stale: geometry or nets changed'
  for ext in ['dsn','ses']:
   assert hashlib.sha256((out/f'{board}.{ext}').read_bytes()).hexdigest()==frozen[ext+'_sha256'], 'Routing file changed; revalidate and refresh frozen-routes.json'
 if '--candidate' not in sys.argv:
  for name in ['additional-copper.json','route-removals.json','route-adjustments.json']:
   assert hashlib.sha256((D/name).read_bytes()).hexdigest()==frozen[name+'_sha256'], 'Routing repair data changed; revalidate'
 j=json.loads((out/'placement.json').read_text());ses=parse_sexpr((out/f'{board}.ses').read_text());routes=child(ses,'routes');res=child(routes,'resolution');assert res[1]=='mm';scale=float(res[2]);network=child(routes,'network_out')
 nets={e['name']:e['source_net_id'] for e in j if e['type']=='source_net'}
 traces={}
 for e in j:
  if e['type']=='source_trace':
   for n in e.get('connected_source_net_ids',[]):traces.setdefault(n,e['source_trace_id'])
 layers=['top','inner1','inner2','bottom'] if board=='main' else ['top','bottom'];nt=nv=0
 for net in children(network,'net'):
  name=net[1];nid=nets[name]
  for wire in children(net,'wire'):
   p=child(wire,'path');layer=p[1];width=max(.15,float(p[2])/scale);coords=[float(n)/scale for n in p[3:]];assert len(coords)%2==0
   route=[{'route_type':'wire','x':coords[i],'y':coords[i+1],'width':width,'layer':layer} for i in range(0,len(coords),2)]
   j.append({'type':'pcb_trace','pcb_trace_id':f'fr_trace_{nt}','source_trace_id':traces[nid],'source_net_id':nid,'route':route,'subcircuit_id':'subcircuit_source_group_0'});nt+=1
  for via in children(net,'via'):
   assert via[1]=='VIA_06'
   j.append({'type':'pcb_via','pcb_via_id':f'fr_via_{nv}','x':float(via[2])/scale,'y':float(via[3])/scale,'outer_diameter':.6,'hole_diameter':.3,'layers':layers,'source_net_id':nid,'subcircuit_id':'subcircuit_source_group_0'});nv+=1
 adjustments=json.loads((D/'route-adjustments.json').read_text()).get(board,{})
 for id,a in adjustments.items():
  t=next(e for e in j if e.get('pcb_trace_id')==id)
  assert t['source_net_id']==nets[a['net']] and [[p['x'],p['y']] for p in t['route']]==a['expected'], 'Routing adjustment is stale'
  layer=t['route'][0]['layer'];t['route']=[{'route_type':'wire','x':x,'y':y,'width':.15,'layer':layer} for x,y in a['points']]
 for removed in json.loads((D/'route-removals.json').read_text()).get(board,[]):
  current=next(e for e in j if e.get('pcb_trace_id')==removed['pcb_trace_id'])
  assert current==removed, 'Removed routing segment changed; revalidate'
  j.remove(current)
 j.extend(json.loads((D/'additional-copper.json').read_text()).get(board,[]))
 for e in j:
  if e['type']=='pcb_plated_hole':e['layers']=layers
 (out/'circuit.json').write_text(json.dumps(j,indent=2)+'\n')
 (out/'routing-provenance.json').write_text(json.dumps({'engine':'Freerouting 2.4.1, local Java 25','tscircuit':'0.0.2046','layers':layers,'traces':nt,'vias':nv,'adjustments_sha256':hashlib.sha256((D/'route-adjustments.json').read_bytes()).hexdigest(),'placement_sha256':hashlib.sha256((out/'placement.json').read_bytes()).hexdigest(),'dsn_sha256':hashlib.sha256((out/f'{board}.dsn').read_bytes()).hexdigest(),'ses_sha256':hashlib.sha256((out/f'{board}.ses').read_bytes()).hexdigest()},indent=2)+'\n')
 print(board,nt,'traces',nv,'vias')
