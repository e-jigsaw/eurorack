import {routingSignature} from './cached-router';
import {readFileSync,writeFileSync} from 'node:fs';
import type {BoardName} from './parts';
const saved:any={};for(const board of ['control','main'] as BoardName[]){
 const j=JSON.parse(readFileSync(new URL(`../generated/pcb/${board}/circuit.json`,import.meta.url),'utf8'));
 const nets=Object.fromEntries(j.filter((e:any)=>e.type==='source_net').map((e:any)=>[e.source_net_id,e.name]));
 const drc=JSON.parse(readFileSync(new URL(`../generated/pcb/${board}/copper-validation.json`,import.meta.url),'utf8'));
 if(['shorts','clearanceViolations','geometryErrors','unconnected'].some(k=>drc[k].length))throw Error('Unvalidated copper');
 saved[board]={signature:routingSignature(board),traces:j.filter((e:any)=>e.type==='pcb_trace').map((e:any)=>({net:nets[e.source_net_id],sourceTraceId:e.source_trace_id,route:e.route})),vias:j.filter((e:any)=>e.type==='pcb_via').map((e:any)=>({...e,net:nets[e.source_net_id],sourceTraceId:j.find((t:any)=>t.type==='source_trace'&&t.connected_source_net_ids?.includes(e.source_net_id))?.source_trace_id}))};
}writeFileSync(new URL('./routing-cache.json',import.meta.url),JSON.stringify(saved,null,2)+'\n');
