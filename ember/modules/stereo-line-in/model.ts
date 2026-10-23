/** Electrical source with selected procurement parts; physical PCB footprints are not yet placed. */
import selectedParts from './procurement/selected-parts.json';
export type Part = { ref: string; kind: 'R'|'C'|'D'|'LED'|'IC'|'CONNECTOR'|'POT'; value: string; pins: Record<string,string>; labels?: Record<string,string>; section: string; note?: string; procurement?: {mpn:string; manufacturer:string; package:string; jlc?:string; assembly:string; source:string; board:string} };
export const parts: Part[] = [];
const add = (ref: string, kind: Part['kind'], value: string, pins: Record<string,string>, section: string, note?: string, labels?: Record<string,string>) => parts.push({ref,kind,value,pins,section,note,labels});
const r = (ref:string,value:string,a:string,b:string,s:string,n?:string) => add(ref,'R',value,{'1':a,'2':b},s,n);
const c = (ref:string,value:string,a:string,b:string,s:string,n?:string) => add(ref,'C',value,{'1':a,'2':b},s,n);
const d = (ref:string,a:string,k:string,s:string) => add(ref,'D','1N4148W',{'1':k,'2':a},s,'pin 1 cathode; pin 2 anode');
const opLabels = {'1':'OUT_A','2':'NEG_A','3':'POS_A','4':'VP','5':'POS_B','6':'NEG_B','7':'OUT_B','8':'OUT_C','9':'NEG_C','10':'POS_C','11':'VN','12':'POS_D','13':'NEG_D','14':'OUT_D'};
add('J_PWR','CONNECTOR','Eurorack 2x5 keyed',{'1':'VN_RAW','2':'VN_RAW','3':'GND','4':'GND','5':'GND','6':'GND','7':'GND','8':'GND','9':'VP_RAW','10':'VP_RAW'},'power','ZHOURI DC3-2.54-10PAS; key and pin-1 orientation to follow mechanical plan');
add('D_PWR_P','D','SS14',{'1':'VP','2':'VP_RAW'},'power','Series reverse-polarity protection; pin 1 cathode');
add('D_PWR_N','D','SS14',{'1':'VN_RAW','2':'VN'},'power','Negative rail diode points towards the header');
c('C_BULK_P','22uF','VP','GND','power','Electrolytic >=25V; positive terminal VP');
c('C_BULK_N','22uF','GND','VN','power','Electrolytic >=25V; positive terminal GND');
r('R_LED_SUPPLY','47','VP','VLED','power');
c('C_LED_BULK','47uF','VLED','GND','power','Electrolytic >=25V');
r('R_REFERENCE','2.2k','VP','VREF','power');
add('U_REF','IC','TL431BIDBZR',{'1':'VREF','2':'VREF','3':'GND'},'power','2.495V shunt; no cathode capacitor (stability region must be respected)',{'1':'K','2':'REF','3':'A'});
const thresholdTops = ['240k','52.3k','15k','5.62k'];
for (let i=0;i<4;i++) {
  r(`R_TH_TOP_${i+1}`,thresholdTops[i],'VREF',`TH_${i+1}`,'power','0.1%');
  r(`R_TH_BOTTOM_${i+1}`,'10k',`TH_${i+1}`,'GND','power','0.1%; shared by L/R');
}
add('U_RX','IC','INA1650IPWR',{'1':'VP','2':'L_RX_P','3':'GND','4':'L_RX_N','5':'R_RX_N','6':'GND','7':'R_RX_P','8':'R_RX_OUT','9':'GND','10':'NC_RX_10','11':'NC_RX_11','12':'GND','13':'L_RX_OUT','14':'VN'},'receiver','VMID pins intentionally open; COM and REF to GND',{'1':'VP','2':'IN_P_L','3':'COM_L','4':'IN_N_L','5':'IN_N_R','6':'COM_R','7':'IN_P_R','8':'OUT_R','9':'REF_R','10':'VMID_OUT_NC','11':'VMID_IN_NC','12':'REF_L','13':'OUT_L','14':'VN'});
c('C_RX_P','100nF','VP','GND','receiver'); c('C_RX_N','100nF','GND','VN','receiver');
for (const ch of ['L','R']) add(`RV_${ch}`,'POT','10k single-gang linear (B10K)',{'1':'GND','2':`${ch}_WIPER`,'3':`${ch}_RX_OUT`},'receiver','User-owned Tayda A-5622 RV9312NO-KQ15A6.0-B10K-060; manufacturer drawing selected. Logical terminals only; CW towards RX_OUT',{'1':'CCW','2':'WIPER','3':'CW'});
// Isolate the high-impedance hold capacitors from the four LM339B input bias currents.
add('U_ENV','IC','OPA1678IDGKR',{'1':'L_ENV_BUF','2':'L_ENV_BUF','3':'L_ENV','4':'VN','5':'R_ENV','6':'R_ENV_BUF','7':'R_ENV_BUF','8':'VP'},'receiver','Dual FET-input envelope buffer; prevents comparator bias from charging hold capacitors',{'1':'OUT_L','2':'NEG_L','3':'POS_L','4':'VN','5':'POS_R','6':'NEG_R','7':'OUT_R','8':'VP'});
c('C_ENV_P','100nF','VP','GND','receiver'); c('C_ENV_N','100nF','GND','VN','receiver');
for (const ch of ['L','R']) {
  const n=(s:string)=>`${ch}_${s}`;
  add(`J_IN_${ch}`,'CONNECTOR','6.35mm TRS',{'1':n('TIP'),'2':n('RING'),'3':'GND'},'receiver','Neutrik NJ3FD-V selected. Logical pin 1 tip, 2 ring, 3 sleeve. TS plug grounds ring. No mono normalization');
  for(const [leg,raw] of [['P','TIP'],['N','RING']]) {
    r(`R_${ch}_${leg}_BLEED`,'1M',n(raw),'GND','receiver');
    r(`R_${ch}_${leg}_SERIES`,'1k',n(raw),n(`${leg}_SERIES`),'receiver','0.1%; matched pair');
    c(`C_${ch}_${leg}_AC`,'1uF',n(`${leg}_SERIES`),n(`RX_${leg}`),'receiver','Film, >=50V, 5%; input DC blocking');
  }
  // A: non-inverting gain; B/C: full-wave rectifier; D: precision peak follower.
  add(`U_${ch}`,'IC','OPA1679IPWR',{'1':n('DRIVE'),'2':n('GAIN_FB'),'3':n('WIPER'),'4':'VP','5':'GND','6':n('HALF_SUM'),'7':n('HALF_DRIVE'),'8':n('ABS'),'9':n('ABS_SUM'),'10':'GND','11':'VN','12':n('ABS'),'13':n('PEAK_FOLLOW'),'14':n('PEAK_DRIVE')},`${ch}-analog`,'TSSOP-14 pin map; all four amplifiers used',opLabels);
  c(`C_${ch}_VP`,'100nF','VP','GND',`${ch}-analog`); c(`C_${ch}_VN`,'100nF','GND','VN',`${ch}-analog`);
  r(`R_${ch}_WIPER_FAIL`,'1M',n('WIPER'),'GND',`${ch}-analog`,'Open-wiper bias; potentiometer loaded by <=0.25%');
  r(`R_${ch}_GAIN_G`,'10k',n('GAIN_FB'),'GND',`${ch}-analog`,'0.1%');
  r(`R_${ch}_GAIN_F`,'90k',n('DRIVE'),n('GAIN_FB'),`${ch}-analog`,'0.1%; 1+90k/10k=10');
  c(`C_${ch}_GAIN_F`,'10pF',n('DRIVE'),n('GAIN_FB'),`${ch}-analog`,'C0G');
  r(`R_${ch}_OUT`,'100',n('DRIVE'),n('OUT'),`${ch}-analog`,'Output isolation; 100 ohm 0.5W HP06W2F1000T5E; feedback before this resistor');
  r(`R_${ch}_OUT_BLEED`,'1M',n('OUT'),'GND',`${ch}-analog`);
  add(`J_OUT_${ch}`,'CONNECTOR','3.5mm TS',{'1':n('OUT'),'2':'GND'},`${ch}-analog`,'QingPu WQP-WQP518MA selected. Logical 1=tip maps to physical 3; logical 2=GND maps to physical 1; physical 2 NC unused');
  r(`R_${ch}_HALF_IN`,'100k',n('OUT'),n('HALF_SUM'),`${ch}-analog`,'0.1%; meter senses actual output jack');
  r(`R_${ch}_HALF_FB`,'100k',n('HALF'),n('HALF_SUM'),`${ch}-analog`,'0.1%');
  d(`D_${ch}_HALF_CLAMP`,n('HALF_DRIVE'),n('HALF_SUM'),`${ch}-analog`);
  d(`D_${ch}_HALF_RECT`,n('HALF'),n('HALF_DRIVE'),`${ch}-analog`);
  r(`R_${ch}_ABS_RAW`,'100k',n('OUT'),n('ABS_SUM'),`${ch}-analog`,'0.1%');
  r(`R_${ch}_ABS_HALF`,'50k',n('HALF'),n('ABS_SUM'),`${ch}-analog`,'0.1%');
  r(`R_${ch}_ABS_FB`,'20k',n('ABS'),n('ABS_SUM'),`${ch}-analog`,'0.1%; ABS=-0.2*OUT-0.4*HALF');
  d(`D_${ch}_PEAK`,n('PEAK_DRIVE'),n('PEAK_FOLLOW'),`${ch}-analog`);
  r(`R_${ch}_ATTACK`,'1k',n('PEAK_FOLLOW'),n('ENV'),`${ch}-analog`,'Capacitor isolated outside feedback loop');
  c(`C_${ch}_HOLD`,'100nF',n('ENV'),'GND',`${ch}-analog`,'5% film or C0G');
  r(`R_${ch}_RELEASE`,'1M',n('ENV'),'GND',`${ch}-analog`,'Nominal 100ms release time constant');
  // Package pin names follow LM339B PW figure, NOT the 16-pin WQFN pinout.
  add(`U_METER_${ch}`,'IC','LM339BIPWR',{'1':n('LED_2_K'),'2':n('LED_1_K'),'3':'VP','4':n('ENV_BUF'),'5':'TH_1','6':n('ENV_BUF'),'7':'TH_2','8':n('ENV_BUF'),'9':'TH_3','10':n('ENV_BUF'),'11':'TH_4','12':'GND','13':n('LED_4_K'),'14':n('LED_3_K')},`${ch}-meter`,'Open collector sinks current when ENV exceeds threshold',{'1':'OUT_2','2':'OUT_1','3':'VP','4':'NEG_1','5':'POS_1','6':'NEG_2','7':'POS_2','8':'NEG_3','9':'POS_3','10':'NEG_4','11':'POS_4','12':'GND','13':'OUT_4','14':'OUT_3'});
  c(`C_${ch}_CMP`,'100nF','VP','GND',`${ch}-meter`);
  for(let i=1;i<=4;i++) {
    r(`R_${ch}_LED_${i}`,'10k','VLED',n(`LED_${i}_A`),`${ch}-meter`,'About 0.9mA; brightness to verify');
    add(`LED_${ch}_${i}`,'LED',i<=2?'green':i===3?'amber':'red',{'1':n(`LED_${i}_K`),'2':n(`LED_${i}_A`)},`${ch}-meter`,'pin 1 cathode, pin 2 anode; high-efficiency LED');
  }
}
for (const part of parts) {
  const selected = selectedParts[part.ref as keyof typeof selectedParts];
  if (!selected) throw new Error('Missing procurement selection: '+part.ref);
  part.procurement = selected;
}
export const revision = 'D — 2ch/4HP PCB routed; control 2-layer / main 4-layer; R_LED_SUPPLY 47ohm C23182; physical fit and JLC assembly preview pending';
