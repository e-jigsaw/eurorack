import {cachedRouter} from './cached-router';
import {Fragment} from 'react';
import {physicalParts,type BoardName} from './parts';
import {shapes,Footprint} from './footprints';
import {cadModelFor} from './cad-models';
import layout from './layout.json';
export function StereoPCB({board,routing=true}:{board:BoardName,routing?:boolean}){
 const design=layout[board]; const components=physicalParts.filter(p=>p.board===board);
 const nets=[...new Set(components.flatMap(p=>Object.values(p.pins)))].filter(n=>!n.startsWith('NC_'));
 return <board width={design.width} height={design.height} thickness={1.6} layers={board==='main'?4:2}
  minTraceWidth={.15} minViaHoleDiameter={.3} minViaPadDiameter={.6}
  minTraceToPadEdgeClearance={.15} minViaEdgeToPadEdgeClearance={.15} minBoardEdgeClearance={.3}
  
  autorouter={routing?{local:true,groupMode:'subcircuit',algorithmFn:cachedRouter(board,nets)}:undefined} routingDisabled={!routing}>
  {nets.map(name=><Fragment key={name}><net name={name}/></Fragment>)}
  {[-1,1].map(sign=><Fragment key={`edge-x${sign}`}><keepout pcbX={sign*(design.width/2-.15)} pcbY={0} shape="rect" width={.3} height={design.height} layers={["top","bottom"]}/></Fragment>)}
  {[-1,1].map(sign=><Fragment key={`edge-y${sign}`}><keepout pcbX={0} pcbY={sign*(design.height/2-.15)} shape="rect" width={design.width} height={.3} layers={["top","bottom"]}/></Fragment>)}
  {components.map((p,i)=>{
   const [x,y,r,layer]=design.placements[p.ref as keyof typeof design.placements] as [number,number,number,'top'|'bottom'];
   const shape=shapes[p.shapeKey];
   return <chip key={p.ref} name={p.ref} manufacturerPartNumber={p.procurement?.mpn??'wire solder pads'}
    cadModel={cadModelFor(p.shapeKey,shape,p.ref,r,layer)}
    pcbX={x} pcbY={y} pcbRotation={r} layer={layer} schX={(i%6)*12} schY={-Math.floor(i/6)*9}
    pinLabels={Object.fromEntries(shape.pads.map(p=>[`pin${p.pin}`,`P${p.pin}`]))}
    connections={Object.fromEntries(Object.entries(p.pins).filter(([,n])=>!n.startsWith('NC_')).map(([pin,n])=>[`pin${pin}`,`net.${n}`]))}>
    <Footprint shape={shape}/>
   </chip>;
  })}
 </board>;
}
