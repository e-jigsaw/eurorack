import { TL072 } from "../../../../primitives/chips/tl072.tsx";

/**
 * 2-stage opamp core (TL072) with feedback A (100k), feedback B (100k + 10pF),
 * inter-stage R10 (100k), and IC2 decoupling.
 *
 * Ports (created via `connections`):
 *   SUM_A → IC2.IN_A_NEG  (where stage-A input summing happens)
 *   OUT_B → IC2.OUT_B     (final output to downstream stages)
 */
export interface UtilitySumAmpProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
}

export const UtilitySumAmp = ({
  name = "amp",
  pcbX = 0,
  pcbY = 0,
}: UtilitySumAmpProps = {}) => (
  <subcircuit
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    autorouter="sequential-trace"
    showAsSchematicBox
    connections={{
      SUM_A: ".IC2 > .IN_A_NEG",
      OUT_B: ".IC2 > .OUT_B",
    }}
  >
    <TL072 name="IC2" pcbX={0} pcbY={0} pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }} />

    {/* Feedback A (south of IC2) */}
    <resistor name="R6" resistance="100k" footprint="0603" pcbX={0} pcbY={-4} />

    {/* Feedback B (north of IC2): R7 + C9 */}
    <resistor name="R7" resistance="100k" footprint="0603" pcbX={0} pcbY={4} />
    <capacitor name="C6" capacitance="10pF" footprint="0603" pcbX={0} pcbY={5.5} />

    {/* Inter-stage 100k (east of IC2, vertical) */}
    <resistor name="R10" resistance="100k" footprint="0603"
      pcbX={3.2} pcbY={0} pcbRotation={90} />

    {/* IC2 decoupling */}
    <capacitor name="C5" capacitance="100nF" footprint="0603" pcbX={-2} pcbY={-9} />
    <capacitor name="C7" capacitance="100nF" footprint="0603" pcbX={2} pcbY={-9} />
    <trace from=".C5 > .pin1" to=".IC2 > .VCC" />
    <trace from=".C5 > .pin2" to="net.GND" />
    <trace from=".C7 > .pin1" to=".IC2 > .VEE" />
    <trace from=".C7 > .pin2" to="net.GND" />

    {/* Internal stage A */}
    <trace from=".IC2 > .IN_A_POS" to="net.GND" />
    <trace from=".IC2 > .IN_A_NEG" to=".R6 > .pin1" />
    <trace from=".R6 > .pin2" to=".IC2 > .OUT_A" />

    {/* Inter-stage + stage B */}
    <trace from=".IC2 > .OUT_A" to=".R10 > .pin1" />
    <trace from=".R10 > .pin2" to=".IC2 > .IN_B_NEG" />
    <trace from=".IC2 > .IN_B_POS" to="net.GND" />
    <trace from=".IC2 > .IN_B_NEG" to=".R7 > .pin1" />
    <trace from=".R7 > .pin2" to=".IC2 > .OUT_B" />
    <trace from=".IC2 > .IN_B_NEG" to=".C6 > .pin1" />
    <trace from=".C6 > .pin2" to=".IC2 > .OUT_B" />
  </subcircuit>
);

export default UtilitySumAmp;
