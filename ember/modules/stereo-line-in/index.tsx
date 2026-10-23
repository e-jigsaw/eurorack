import { parts } from './model';
/** Electrical schematic only: never use this as a placed/verified 4HP PCB. */
export const StereoLineIn = () => <board width={160} height={200}>
  {parts.map((p,i) => {
    const connections = Object.fromEntries(Object.entries(p.pins).filter(([,n])=>!n.startsWith('NC_')).map(([pin,n])=>[`pin${pin}`,`net.${n}`]));
    const common = {name:p.ref, schX:(i%6)*12, schY:-Math.floor(i/6)*9, connections, manufacturerPartNumber:p.procurement?.mpn ?? p.value};
    if(p.kind==='R') return <resistor key={p.ref} {...common} resistance={p.value} />;
    if(p.kind==='C') return <capacitor key={p.ref} {...common} capacitance={p.value} />;
    const pinLabels = Object.fromEntries(Object.keys(p.pins).map(pin=>[`pin${pin}`,p.labels?.[pin] ?? ((p.kind==='D'||p.kind==='LED')?(pin==='1'?'K':'A'):`P${pin}`)]));
    return <chip key={p.ref} {...common} pinLabels={pinLabels} />;
  })}
</board>;
export default StereoLineIn;
