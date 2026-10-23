import { Fragment } from 'react';
export type Pad = {pin:string,x:number,y:number,w?:number,h?:number,drill?:number,slot?:[number,number],outer?:[number,number]};
export type Shape = {pads:Pad[],body:[number,number],offset?:[number,number],height:number,source:string};
const sm=(pin:string,x:number,y:number,w:number,h:number):Pad=>({pin,x,y,w,h});
const ph=(pin:string,x:number,y:number,drill:number,diameter:number):Pad=>({pin,x,y,drill,outer:[diameter,diameter]});
const two=(gap:number,w:number,h:number,body:[number,number],height:number):Shape=>({pads:[sm('1',-gap/2,0,w,h),sm('2',gap/2,0,w,h)],body,height,source:'IPC nominal land pattern; selected package dimensions'});
const dual=(n:number,pitch:number,span:number,pl:number,pw:number,body:[number,number]):Shape=>({pads:Array.from({length:n},(_,i)=>i<n/2?sm(String(i+1),-span/2,(n/4-.5-i)*pitch,pl,pw):sm(String(i+1),span/2,(i-n/2-(n/4-.5))*pitch,pl,pw)),body,height:1.2,source:'TI PW0014A / DGK0008A land pattern, OPA167x datasheet pp48/54'});
export const shapes:Record<string,Shape>={
 '0603':two(1.6,.9,1.0,[1.6,.8],.9),
 '0805':two(2.0,1.1,1.4,[2,1.25],1.4),
 '1206':two(3.1,1.2,1.8,[3.2,1.6],1.8),
 'TSSOP-14':dual(14,.65,5.8,1.5,.45,[4.4,5]),
 'VSSOP-8':dual(8,.65,4.4,1.4,.45,[3,3]),
 'SOT-23-3':{pads:[sm('1',-.95,-1.1,.8,1),sm('2',.95,-1.1,.8,1),sm('3',0,1.1,.8,1)],body:[2.9,1.3],height:1.2,source:'TI DBZ SOT23-3; K/REF shorted in this circuit'},
 'SOD-123':two(3.2,1.0,1.2,[2.7,1.6],1.35),
 'SMA(DO-214AC)':two(4.3,2.0,2.0,[4.5,2.8],2.5),
 'SMD,D5xL5.4mm':two(4.4,2.6,1.6,[5.3,5.3],5.4),
 'SMD,D6.3xL5.4mm':two(5.4,2.8,1.8,[6.6,6.6],5.4),
 'WIMA':{pads:[ph('1',-2.5,0,.8,1.5),ph('2',2.5,0,.8,1.5)],body:[7.2,5],height:10,source:'WIMA MKS2 C041001F00, 7.2x5x10, P5; e_WIMA_MKS_2.pdf'},
 'Tayda':{pads:[ph('1',-2.5,-7.5,1.2,1.9),ph('2',0,-7.5,1.2,1.9),ph('3',2.5,-7.5,1.2,1.9),{pin:'4',x:-5.65,y:0,slot:[2,1.4],outer:[2.7,2.1]},{pin:'5',x:5.65,y:0,slot:[2,1.4],outer:[2.7,2.1]}],body:[12.1,10.8],offset:[0,-.6],height:10,source:'Tayda A-5622.pdf; front view signal pins; signal pitch2.5, retention11.3, setback7.5'},
 'WQP':{pads:[ph('1',0,4.92,1.8,2.4),ph('2',0,-6.48,1.8,2.4),ph('3',0,-3.38,1.8,2.4)],body:[9,12.5],offset:[0,-.25],height:9,source:'WQP-WQP518MA.pdf TOP VIEW: logical1->physical3 tip; logical2->physical1 sleeve; physical2 normal NC'},
 'NJ3FD-V':{pads:[ph('1',0,-5.72,1.2,1.9),ph('2',-5.08,0,1.6,2.3),ph('3',5.08,0,1.6,2.3),ph('4',3.18,6.35,1.6,2.3),ph('5',-3.81,-3.81,2.1,2.8)],body:[12.8,15],height:24,source:'Neutrik3102 St0715 component-side layout; logical1=T,2=R,3=S; two mechanical solder pads'},
 'LED3':{pads:[ph('1',1.27,0,.9,1.6),ph('2',-1.27,0,.9,1.6)],body:[4.3,4.3],height:11.9,source:'XINGLIGHT XL-302 / TUOZHAN: 2.54 pitch, logical1 cathode,2 anode'},
 'DC3':{pads:Array.from({length:10},(_,i)=>ph(String(i+1),(i%2===0?-1:1)*1.27,(Math.floor(i/2)-2)*2.54,1.0,1.7)),body:[8.4,20.3],height:8.6,source:'ZHOURI DC3-2.54-10PAS: PCB pitch2.54, housing8.4x20.3, height8.6'},
 'TSW-2x4':{pads:Array.from({length:8},(_,i)=>ph(String(i+1),(i%2===0?-1:1)*1.27,(1.5-Math.floor(i/2))*2.54,1.02,1.7)),body:[5.08,10.16],height:8.38,source:'Samtec tsw_th.pdf: housing2.54, post5.84, tail2.54; 0.635 square pins; 2.54 pitch. Envelope includes exposed post.'},
 'SSW-2x4':{pads:Array.from({length:8},(_,i)=>ph(String(i+1),(i%2===0?1:-1)*1.27,(1.5-Math.floor(i/2))*2.54,1.02,1.7)),body:[4.95,10.67],height:8.51,source:'Samtec ssw_th.pdf: housing8.51, tail2.64, 2.54 pitch; insertion3.68..6.35. Logical IDs mirror the mating header viewed from opposite faces.'},
 'WIRE':{pads:Array.from({length:16},(_,i)=>ph(String(i+1),(i%2===0?-1:1)*1.27,(3.5-Math.floor(i/2))*2.54,.9,1.7)),body:[4.5,20],height:2,source:'2x8 labelled wire solder pads, 2.54pitch; not an IDC connector'},
};
export function Footprint({shape}:{shape:Shape}) {return <footprint>{shape.pads.map(p=><Fragment key={p.pin}>{p.drill?<platedhole portHints={[`pin${p.pin}`]} pcbX={p.x} pcbY={p.y} shape="circle" holeDiameter={p.drill} outerDiameter={p.outer![0]}/>:p.slot?<platedhole portHints={[`pin${p.pin}`]} pcbX={p.x} pcbY={p.y} shape="pill" holeWidth={p.slot[0]} holeHeight={p.slot[1]} outerWidth={p.outer![0]} outerHeight={p.outer![1]}/>:<smtpad portHints={[`pin${p.pin}`]} pcbX={p.x} pcbY={p.y} shape="rect" width={p.w!} height={p.h!}/>}</Fragment>)}<silkscreenrect pcbX={shape.offset?.[0]??0} pcbY={shape.offset?.[1]??0} width={shape.body[0]} height={shape.body[1]} strokeWidth={.12}/></footprint>}
