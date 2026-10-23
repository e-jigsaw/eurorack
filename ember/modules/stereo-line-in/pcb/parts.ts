import {parts, type Part} from '../model';
import {shapes} from './footprints';
import construction from '../mechanical/construction.json';
export type BoardName='control'|'main';
export type PhysicalPart=Part&{shapeKey:string,board:BoardName};
const circuitParts:PhysicalPart[]=parts.map(p=>{
 let shapeKey=p.procurement!.package;
 if(p.ref.startsWith('RV_'))shapeKey='Tayda';
 else if(p.ref.startsWith('J_OUT_'))shapeKey='WQP';
 else if(p.ref.startsWith('J_IN_'))shapeKey='NJ3FD-V';
 else if(p.kind==='LED')shapeKey='LED3';
 else if(p.ref==='J_PWR')shapeKey='DC3';
 else if(p.kind==='C'&&p.value==='1uF')shapeKey='WIMA';
 if(!shapes[shapeKey])throw Error('No footprint '+p.ref+': '+shapeKey);
 return {...p,shapeKey,board:p.procurement!.board as BoardName};
});
export const wireNets=construction.interconnect.nets;
export const linkParts=(board:BoardName):PhysicalPart[]=>['TOP','BOTTOM'].map((end,i)=>({
 ref:'J_LINK_'+end,kind:'CONNECTOR',value:'2x4 board interconnect',
 pins:Object.fromEntries((i===0?wireNets.slice(8):wireNets.slice(0,8)).map((n,p)=>[String(p+1),n])),
 section:'interconnect',shapeKey:board==='control'?'TSW-2x4':'SSW-2x4',board,
 procurement:{mpn:board==='control'?'TSW-104-07-L-D':'SSW-104-01-F-D',manufacturer:'Samtec',package:board==='control'?'TSW-2x4':'SSW-2x4',assembly:'user hand solder',board,source:board==='control'?'https://www.samtec.com/products/tsw-104-07-l-d':'https://www.samtec.com/products/ssw-104-01-f-d'},
 note:'Logical pin IDs follow mated coordinates. Unkeyed: both rows are horizontal; align marked board tops before inserting.'
}));
export const physicalParts:PhysicalPart[]=[...circuitParts,...linkParts('control'),...linkParts('main')];
