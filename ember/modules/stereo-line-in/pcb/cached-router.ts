import {physicalParts,type BoardName} from './parts';
import {shapes} from './footprints';
import layouts from './layout.json';
import stored from './routing-cache.json';
const stable=(x:any):string=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function routingSignature(board:BoardName){
 const parts=physicalParts.filter(p=>p.board===board);const layout=layouts[board];
 return stable({parts:parts.map(({ref,pins,shapeKey})=>({ref,pins,shapeKey})),shapes:Object.fromEntries([...new Set(parts.map(p=>p.shapeKey))].map(k=>[k,shapes[k]])),layout:{width:layout.width,height:layout.height,placements:layout.placements}});
}
/** Replays reviewed offline routes, refusing changed geometry/nets. No remote service. */
export function cachedRouter(board:BoardName,netNames:string[]){return async (_input:any)=>{
 const saved=(stored as any)[board];if(!saved||saved.signature!==routingSignature(board))throw Error('PCB routing is stale; reroute and validate the changed design.');
 const id=(net:string)=>{const i=netNames.indexOf(net);if(i<0)throw Error('Unknown route net '+net);return `source_net_${i}`;};
 const traces=saved.traces.map((t:any,i:number)=>({type:'pcb_trace',pcb_trace_id:`offline_${board}_${i}`,source_trace_id:t.sourceTraceId,connection_name:id(t.net),route:structuredClone(t.route)}));
 for(const v of saved.vias){
  const same=(p:any)=>p&&Math.hypot(p.x-v.x,p.y-v.y)<1e-6;
  const t=traces.find((t:any)=>t.source_trace_id===v.sourceTraceId&&same(t.route.at(-1)))??traces.find((t:any)=>t.source_trace_id===v.sourceTraceId&&same(t.route[0]));
  if(!t)throw Error('Via has no matching routed endpoint');
  if(!same(t.route.at(-1)))t.route.reverse();
  const from=t.route.at(-1).layer;
  t.route.push({route_type:'via',x:v.x,y:v.y,from_layer:from,to_layer:from==='top'?'bottom':'top',via_diameter:v.outer_diameter,via_hole_diameter:v.hole_diameter});
 }
 const listeners:Record<string,(v:any)=>void>={};return{on:(name:string,fn:(v:any)=>void)=>{listeners[name]=fn;},start:()=>{listeners.complete({traces:structuredClone(traces)});},stop:()=>{}};
};}
