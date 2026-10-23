import {Circuit} from 'tscircuit';
import Control from '../control.circuit';
import Main from '../main.circuit';
import {physicalParts} from './parts';
import {readFileSync,writeFileSync} from 'node:fs';
function copper(j:any[]){
 const nets=Object.fromEntries(j.filter(e=>e.type==='source_net').map(e=>[e.source_net_id,e.name]));
 const trnet=Object.fromEntries(j.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,nets[e.connected_source_net_ids?.[0]]]));
 const traces=j.filter(e=>e.type==='pcb_trace');const traceNet=Object.fromEntries(traces.map(e=>[e.pcb_trace_id,nets[e.source_net_id]??trnet[e.source_trace_id]??nets[e.source_trace_id]]));
 const pt=(p:any)=>`${p.x.toFixed(5)},${p.y.toFixed(5)}`;
 const segments=traces.flatMap(t=>t.route.slice(1).flatMap((b:any,i:number)=>{const a=t.route[i];return a.route_type==='wire'&&b.route_type==='wire'?[`${traceNet[t.pcb_trace_id]}:${a.layer}:${a.width.toFixed(5)}:${[pt(a),pt(b)].sort().join('|')}`]:[]})).sort();
 const vias=j.filter(e=>e.type==='pcb_via').map(e=>`${nets[e.source_net_id]??traceNet[e.pcb_trace_id]}:${pt(e)}:${e.outer_diameter}:${e.hole_diameter}`).sort();
 return {segments,vias};
}
for(const [name,Component] of [['control',Control],['main',Main]] as const){
 const circuit=new Circuit({platform:{partsEngineDisabled:true,schematicDisabled:true}});circuit.add(<Component/>);await circuit.renderUntilSettled();const j=circuit.getCircuitJson();const traces=j.filter((e:any)=>e.type==='pcb_trace'&&e.route.some((p:any)=>p.route_type==='wire')).length;const errors=j.filter(e=>e.type.endsWith('_error'));
 const canonical=JSON.parse(readFileSync(new URL(`../generated/pcb/${name}/circuit.json`,import.meta.url),'utf8'));
 const matches=JSON.stringify(copper(canonical))===JSON.stringify(copper(j));
 const cadModels=j.filter((e:any)=>e.type==='cad_component'&&e.model_jscad);
 const expectedCadModels=physicalParts.filter(p=>p.board===name).length;
 if(cadModels.length!==expectedCadModels)throw Error(`Missing CAD models on ${name}: ${cadModels.length}/${expectedCadModels}`);
 const report={board:name,traces,viaCount:j.filter(e=>e.type==='pcb_via').length,cadModels:cadModels.length,copperMatchesManufacturingSource:matches,errors};
 writeFileSync(new URL(`../generated/pcb/${name}/preview-validation.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));if(traces===0||errors.length||!matches)throw Error('Routed preview mismatch');
}
