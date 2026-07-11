import { TL072 } from "../../../../primitives/chips/tl072.tsx";

/**
 * 3:1 summing-mixer opamp core (TL072): R15=33k stage-A feedback,
 * 100k stage-B feedback + 10pF, IC4 decoupling.
 *
 * External wiring uses through-selectors:
 *   .amp > .IC4 > .IN_A_NEG  (3-way summing junction)
 *   .amp > .IC4 > .OUT_B     (final output)
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
  >
    <TL072 name="IC4" pcbX={0} pcbY={0} pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }} />

    {/* Feedback A (south): R15=33k */}
    <resistor name="R15" resistance="33k" footprint="0603" pcbX={0} pcbY={-4} />

    {/* Feedback B/inter-stage/decoupling — pushed out to X=±8 so they sit
       clearly outside the jack column (X=±5 ±1 pad) and outside the IC4
       leads (X=±2). R_in_C (placed near X=-3) gets the central west slot. */}
    <resistor name="R16" resistance="100k" footprint="0603" pcbX={-8} pcbY={4} />
    <capacitor name="C9" capacitance="10pF" footprint="0603" pcbX={8} pcbY={4} />
    <resistor name="R14" resistance="100k" footprint="0603"
      pcbX={-8} pcbY={0} pcbRotation={90} />
    <capacitor name="C8" capacitance="100nF" footprint="0603" pcbX={8} pcbY={0} />
    <capacitor name="C10" capacitance="100nF" footprint="0603" pcbX={8} pcbY={-3} />
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
    {/* R16 (X=-8) → IC4.OUT_B (X=-0.325): explicit L-path via Y=4 row to keep
       trace clear of IC4 body (Y range ±1.625). Coords relative to R16
       body, rotation 0; IC4.OUT_B offset = (+7.675, -2.375). */}
    <trace
      from=".R16 > .pin2"
      to=".IC4 > .OUT_B"
      pcbPath={[
        { x: 7.675, y: 0 },
      ]}
    />
    <trace from=".IC4 > .IN_B_NEG" to=".C9 > .pin1" />
    <trace from=".C9 > .pin2" to=".IC4 > .OUT_B" />
  </subcircuit>
);

export default SumMixerAmp;
