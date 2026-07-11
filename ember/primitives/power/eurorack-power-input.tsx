import { DoepferHeader } from "./doepfer-header.tsx";

export interface EurorackPowerInputProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
}

export const EurorackPowerInput = ({
  name = "PWR",
  pcbX,
  pcbY,
}: EurorackPowerInputProps) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    {/* JP1 mounts on the BOTTOM (rear) face: in the two-board stack the
       component side faces the panel, and the ribbon must plug in from the
       rack rear. layer="bottom" flips the part as a unit (holes, body, key,
       pin1), so the keyed ribbon's red stripe still lands on the VEE column
       — but note the VEE column moves to +x in board coords. */}
    <DoepferHeader name="JP1" pcbX={0} pcbY={0} layer="bottom" />
    {/* Bulk caps sit on each rail's column side (flipped header: VCC at -x,
       VEE at +x). */}
    <capacitor
      name="C1"
      capacitance="22uF"
      maxVoltageRating="25V"
      footprint="0805"
      polarized
      connections={{ pin1: "net.VCC", pin2: "net.GND" }}
      pcbX={-7.68}
      pcbY={-2.64}
      pcbRotation={90}
    />
    <capacitor
      name="C2"
      capacitance="22uF"
      maxVoltageRating="25V"
      footprint="0805"
      polarized
      connections={{ pin1: "net.GND", pin2: "net.VEE" }}
      pcbX={7.83}
      pcbY={-6.3}
      pcbRotation={90}
    />

    {/* −12V (red ribbon stripe) side marker — on the bottom silk next to the
       flipped header. The Y-axis flip mirrors the VEE column to +x. */}
    <silkscreenline
      x1={7.4}
      y1={4.19}
      x2={7.4}
      y2={-4.19}
      strokeWidth={0.3}
      layer="bottom"
    />
    <silkscreentext
      text="RED"
      pcbX={8.5}
      pcbY={0}
      fontSize={1}
      pcbRotation={90}
      layer="bottom"
    />

    <trace from=".JP1 > .VEE_A" to="net.VEE" />
    <trace from=".JP1 > .VEE_B" to="net.VEE" />
    <trace from=".JP1 > .GND_A" to="net.GND" />
    <trace from=".JP1 > .GND_B" to="net.GND" />
    <trace from=".JP1 > .GND_C" to="net.GND" />
    <trace from=".JP1 > .GND_D" to="net.GND" />
    <trace from=".JP1 > .GND_E" to="net.GND" />
    <trace from=".JP1 > .GND_F" to="net.GND" />
    <trace from=".JP1 > .VCC_A" to="net.VCC" />
    <trace from=".JP1 > .VCC_B" to="net.VCC" />
  </group>
);

export default EurorackPowerInput;
