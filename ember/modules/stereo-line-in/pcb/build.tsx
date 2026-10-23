import {Circuit} from 'tscircuit';
import {convertCircuitJsonToPcbSvg} from 'circuit-to-svg';
import {StereoPCB} from './index';
import type {BoardName} from './parts';
import {mkdir,writeFile} from 'node:fs/promises';
const boards=(process.argv[2]?[process.argv[2]]:['control','main']) as BoardName[];
for(const board of boards){
 const routing=process.argv.includes('--routed');
 const out=new URL(`../generated/pcb/${board}/`,import.meta.url);await mkdir(out,{recursive:true});
 const circuit=new Circuit({platform:{partsEngineDisabled:true,schematicDisabled:true}});
 circuit.add(<StereoPCB board={board} routing={routing}/>);
 const t=Date.now();await circuit.renderUntilSettled();const json=circuit.getCircuitJson();
 await writeFile(new URL(routing?'preview.json':'placement.json',out),JSON.stringify(json,null,2)+'\n');
 for(const layer of ['top','bottom'] as const)await writeFile(new URL(`${routing?"":"placement-"}${layer}.svg`,out),convertCircuitJsonToPcbSvg(json,{layer}));
 const errors=json.filter(e=>e.type.endsWith('_error'));const warnings=json.filter(e=>e.type.endsWith('_warning'));
 await writeFile(new URL(routing?'build-report.json':'placement-report.json',out),JSON.stringify({board,routing,seconds:(Date.now()-t)/1000,errors,warnings,counts:Object.fromEntries([...new Set(json.map(e=>e.type))].map(t=>[t,json.filter(e=>e.type===t).length]))},null,2)+'\n');
 console.log(JSON.stringify({board,seconds:(Date.now()-t)/1000,errors:errors.length,warnings:warnings.length,traces:json.filter(e=>e.type==='pcb_trace').length}));
 if(errors.length)process.exitCode=1;
}
