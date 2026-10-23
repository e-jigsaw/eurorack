import { Fragment } from "react";
import reference from "./reference.json";
import layout from "./layout.json";
import { opa4171Pins, tl072Pins, lm321Pins } from "./pinouts.ts";
import { PJ301M12 } from "../../../primitives/jacks/pj301m-12.tsx";
import { DoepferHeader } from "../../../primitives/power/doepfer-header.tsx";
import { WP937EGW } from "../../../primitives/leds/wp937egw.tsx";

// Separate prototype: existing two-board circuits deliberately retain their layout.
// The schematic, not the former routing order, defines every electrical net.
const connectionsFor = (ref: string): Record<string, string> => Object.fromEntries(
  Object.entries(reference.nets).flatMap(([net, pins]) => pins
    .filter(pin => pin.startsWith(`${ref}.`))
    .map(pin => [pin.split(".")[1]!, `net.${net}`])),
);

type Placement = [x: number, y: number, rotation?: number];
const resistorNames = Array.from({ length: 21 }, (_, i) => `R${i + 1}`);
const capacitorRotations: Record<string, number> = {
  C1: 0, C2: 0, C3: 270, C4: 270, C5: 90, C7: 90, C6: 0,
  C8: 90, C10: 90, C9: 0,
};
const jackPositions: Record<string, Placement> = {
  J1: [-4.683, 33.43, 180], J2: [4.683, 33.43, 180],
  J3: [-4.683, 20.73, 180], J4: [4.683, 20.73, 180],
  J5: [-4.683, -0.86, 180], J6: [4.683, -0.86, 180],
  J7: [-4.683, -13.56, 180], J8: [4.683, -13.56, 180],
  J9: [-4.683, -35.15, 0], J10: [4.683, -35.15, 0],
  J11: [-4.683, -47.929, 0], J12: [4.683, -47.85, 0],
};

export function LinksSingleBoard() {
  return <board width={19} height={108.4} thickness={1.6} layers={2}
    minTraceWidth="0.15mm" minViaHoleDiameter="0.3mm" minViaPadDiameter="0.6mm"
    minTraceToPadEdgeClearance="0.15mm" minViaEdgeToPadEdgeClearance="0.15mm" minBoardEdgeClearance="0.3mm"
    autorouter={{ local: true, groupMode: "subcircuit" }}>
    <schematicsheet name="Links" sheetWidth={297} sheetHeight={320}>
    {Object.keys(reference.nets).map(name => <Fragment key={name}><net name={name} /></Fragment>)}
    <DoepferHeader name="JP1" pcbX={0} pcbY={50} layer="bottom"
      schX={-12} schY={40} connections={connectionsFor("JP1")} />
    {["D1", "D2"].map((name, i) => <diode key={name} name={name}
      footprint="sod123" manufacturerPartNumber="1N5819HW-7-F"
      pcbX={i === 0 ? -5 : 5} pcbY={43.7} layer="bottom"
      schX={-5 + i * 10} schY={40} connections={connectionsFor(name)} />)}
    <chip name="IC1" footprint="tssop14_w4.4mm_p0.65mm_pl1.5mm_pw0.35mm" manufacturerPartNumber="OPA4171AIPW" pinLabels={opa4171Pins} pcbX={0} pcbY={30.5} pcbRotation={90} layer="bottom"
      schX={0} schY={25} connections={connectionsFor("IC1")} />
    {["IC2", "IC4"].map((name, i) => <chip key={name} name={name} footprint="tssop8_w4.4mm_p0.65mm_pl1.5mm_pw0.35mm" manufacturerPartNumber="TL072CPW" pinLabels={tl072Pins}
      pcbX={0} pcbY={-4 - 34 * i} pcbRotation={90} layer="bottom"
      schX={0} schY={-5 - 30 * i} connections={connectionsFor(name)} />)}
    {["IC3", "IC5"].map((name, i) => <chip key={name} name={name}
      footprint="sot23_5" schHeight={0.6} pinLabels={lm321Pins} manufacturerPartNumber="LM321MFX/NOPB"
      pcbX={0} pcbY={12 - 34 * i} layer="bottom"
      schX={10} schY={-5 - 30 * i} connections={connectionsFor(name)} />)}
    {resistorNames.map((name, i) => <resistor key={name}
      name={name} resistance={reference.values[name as keyof typeof reference.values]}
      footprint="0603" layer="bottom"
      schX={25 + (i % 4) * 5} schY={40 - Math.floor(i / 4) * 8}
      connections={connectionsFor(name)} {...layout[name as keyof typeof layout]} />)}
    {Object.entries(capacitorRotations).map(([name, rotation], i) => <capacitor key={name}
      name={name} schOrientation="vertical" capacitance={reference.values[name as keyof typeof reference.values]}
      maxVoltageRating="25V" maxDecouplingTraceLength={name === "C1" || name === "C2" ? "10mm" : name === "C6" || name === "C9" ? undefined : "5mm"}
      footprint={name === "C1" || name === "C2" ? "0805" : "0603"}
      pcbRotation={rotation} layer="bottom"
      schX={25 + (i % 4) * 5} schY={-12 - Math.floor(i / 4) * 8}
      connections={connectionsFor(name)} {...layout[name as keyof typeof layout]} />)}
    {Object.entries(jackPositions).map(([name, [x, y, rotation]], i) => <PJ301M12 key={name}
      name={name} pcbX={x} pcbY={y} pcbRotation={rotation} layer="top"
      schHeight={0.4}
      schX={-20 + (i % 2) * 8} schY={25 - Math.floor(i / 2) * 12}
      connections={connectionsFor(name)} />)}
    {[41.685, 7.395, -26.895].map((y, i) => <WP937EGW key={i} name={`LED${i + 1}`}
      pcbX={0} pcbY={y} schX={16} schY={25 - i * 30} connections={connectionsFor(`LED${i + 1}`)} />)}
    </schematicsheet>
  </board>;
}
