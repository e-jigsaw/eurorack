import type {Shape} from './footprints';

// Nominal package envelopes, not manufacturer STEP models. Origin is the
// footprint origin on the component-side board surface; all dimensions are mm.
export function cadModelFor(shapeKey:string, shape:Shape, ref:string, rotation=0, layer='top') {
 if(shapeKey==='WIRE') return null;
 const [w,d]=shape.body, h=shape.height;
 const [x,y]=shape.offset??[0,0];
 const cylinder=(radius:number,height:number,center:number[])=>({type:'cylinder',radius,height,center});
 const box=(size:number[],center:number[])=>({type:'cuboid',size,center});
 const paint=(color:number[],body:object)=>({type:'colorize',color,shape:body});
 // Core anchors CAD at the pad-bounds centre. Our geometry uses the footprint
 // origin, which differs for asymmetric jack and potentiometer land patterns.
 const a=rotation*Math.PI/180, mirror=layer==='bottom'?-1:1;
 const bounds=shape.pads.map(p=>{
  const x=p.x*mirror*Math.cos(a)-p.y*Math.sin(a),y=p.x*mirror*Math.sin(a)+p.y*Math.cos(a);
  const [w,h]=p.outer??[p.w!,p.h!];
  return [x-w/2,y-h/2,x+w/2,y+h/2];
 });
 const origin={positionOffset:{x:-(Math.min(...bounds.map(b=>b[0]))+Math.max(...bounds.map(b=>b[2])))/2,y:-(Math.min(...bounds.map(b=>b[1]))+Math.max(...bounds.map(b=>b[3])))/2,z:0},modelOriginPosition:{x:0,y:0,z:0}};
 if(shapeKey==='TSW-2x4'||shapeKey==='SSW-2x4') {
  const header=shapeKey==='TSW-2x4';
  const housing=header?2.54:8.51, tail=header?2.54:2.64;
  let plastic:object=box([w,d,housing],[0,0,housing/2]);
  if(!header) plastic={type:'subtract',shapes:[plastic,...shape.pads.map(p=>box([.9,.9,6.36],[p.x,p.y,housing-3.17]))]};
  return {...origin,jscad:{type:'union',shapes:[paint([.12,.13,.15],plastic),...shape.pads.map(p=>paint([.8,.65,.25],box([.635,.635,header?tail+8.38:tail],[p.x,p.y,header?(8.38-tail)/2:-tail/2])))]},modelUnitToMmScale:1};
 }
 let body:object=box([w,d,h],[x,y,h/2]);
 let color=[.12,.13,.15];
 if(shapeKey.startsWith('SMD,D')) {
  body=cylinder(Number(shapeKey.match(/D([\d.]+)/)![1])/2,h,[x,y,h/2]);
  color=[.65,.68,.72];
 } else if(shapeKey==='LED3') {
  body=cylinder(w/2,h,[x,y,h/2]);
  color=ref.endsWith('_4')?[.95,.08,.06]:ref.endsWith('_3')?[1,.55,.04]:[.12,.8,.25];
 } else if(shapeKey==='WIMA') color=[.8,.08,.06];
 else if(shapeKey==='Tayda') color=[.15,.4,.22];
 else if(ref.startsWith('C')) color=[.65,.45,.25];
 const shapes:object[]=[paint(color,body)];
 // Leads use the existing pad locations. These are illustrative terminals,
 // not a source for solder-tail or mechanical-clearance dimensions.
 for(const p of shape.pads) {
  if(p.drill) shapes.push(paint([.7,.72,.75],cylinder(Math.min(p.drill*.3,.35),2,[p.x,p.y,-.8])));
  else if(p.w&&p.h) shapes.push(paint([.7,.72,.75],box([p.w*.8,p.h*.8,.2],[p.x,p.y,.1])));
 }
 return {...origin,jscad:{type:'union',shapes},modelUnitToMmScale:1};
}
