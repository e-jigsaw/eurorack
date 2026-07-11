import { LM321 } from "../../../../primitives/chips/lm321.tsx";

export interface SumMixerBufferProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
}

/**
 * Unity-gain follower (LM321). External wiring uses through-selectors:
 *   IN  → .buf > .IC > .IN_POS
 *   OUT → .buf > .IC > .OUT
 */
export const SumMixerBuffer = ({
  name = "buf",
  pcbX = 0,
  pcbY = -12,
}: SumMixerBufferProps = {}) => (
  <subcircuit
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    autorouter="sequential-trace"
  >
    <LM321 name="IC" pcbX={0} pcbY={0}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }} />

    {/* IC decoupling */}
    <capacitor name="C_VCC" capacitance="100nF" footprint="0603"
      pcbX={-2.5} pcbY={-4} />
    <capacitor name="C_VEE" capacitance="100nF" footprint="0603"
      pcbX={2.5} pcbY={-4} />
    <trace from=".C_VCC > .pin1" to=".IC > .VCC" />
    <trace from=".C_VCC > .pin2" to="net.GND" />
    <trace from=".C_VEE > .pin1" to=".IC > .VEE" />
    <trace from=".C_VEE > .pin2" to="net.GND" />

    {/* Unity-gain feedback */}
    <trace from=".IC > .IN_NEG" to=".IC > .OUT" />
  </subcircuit>
);

export default SumMixerBuffer;
