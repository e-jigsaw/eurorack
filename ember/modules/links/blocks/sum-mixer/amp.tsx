import { TL072 } from "../../../../primitives/chips/tl072.tsx";

/**
 * 3:1 summing-mixer opamp core (TL072): R15=33k stage-A feedback,
 * 100k stage-B feedback + 10pF, IC4 decoupling.
 *
 * Ports (via `connections`):
 *   SUM_A → IC4.IN_A_NEG  (3-way input summing node)
 *   OUT_B → IC4.OUT_B     (final output)
 */
export interface SumMixerAmpProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
}

export const SumMixerAmp = ({
  name = "amp",
  pcbX = 0,
  pcbY = 0,
}: SumMixerAmpProps = {}) => (
  <subcircuit
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    autorouter="sequential-trace"
    showAsSchematicBox
    connections={{
      SUM_A: ".IC4 > .IN_A_NEG",
      OUT_B: ".IC4 > .OUT_B",
    }}
  >
    <TL072 name="IC4" pcbX={0} pcbY={0} pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }} />

    {/* Feedback A (south): R15=33k */}
    <resistor name="R15" resistance="33k" footprint="0603" pcbX={0} pcbY={-4} />

    {/* Feedback B (north): R16 + C9 */}
    <resistor name="R16" resistance="100k" footprint="0603" pcbX={0} pcbY={4} />
    <capacitor name="C9" capacitance="10pF" footprint="0603" pcbX={0} pcbY={5.5} />

    {/* R14 west of IC4 (inter-stage) */}
    <resistor name="R14" resistance="100k" footprint="0603"
      pcbX={-3.2} pcbY={0} pcbRotation={90} />

    {/* IC4 decoupling */}
    <capacitor name="C8" capacitance="100nF" footprint="0603" pcbX={-2} pcbY={-9} />
    <capacitor name="C10" capacitance="100nF" footprint="0603" pcbX={2} pcbY={-9} />
    <trace from=".C8 > .pin1" to=".IC4 > .VCC" />
    <trace from=".C8 > .pin2" to="net.GND" />
    <trace from=".C10 > .pin1" to=".IC4 > .VEE" />
    <trace from=".C10 > .pin2" to="net.GND" />

    {/* Stage A */}
    <trace from=".IC4 > .IN_A_POS" to="net.GND" />
    <trace from=".IC4 > .IN_A_NEG" to=".R15 > .pin1" />
    <trace from=".R15 > .pin2" to=".IC4 > .OUT_A" />

    {/* Inter-stage + stage B */}
    <trace from=".IC4 > .OUT_A" to=".R14 > .pin1" />
    <trace from=".R14 > .pin2" to=".IC4 > .IN_B_NEG" />
    <trace from=".IC4 > .IN_B_POS" to="net.GND" />
    <trace from=".IC4 > .IN_B_NEG" to=".R16 > .pin1" />
    <trace from=".R16 > .pin2" to=".IC4 > .OUT_B" />
    <trace from=".IC4 > .IN_B_NEG" to=".C9 > .pin1" />
    <trace from=".C9 > .pin2" to=".IC4 > .OUT_B" />
  </subcircuit>
);

export default SumMixerAmp;
