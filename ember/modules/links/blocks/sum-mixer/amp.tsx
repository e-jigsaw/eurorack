import { TL072 } from "../../../../primitives/chips/tl072.tsx";

/**
 * 3:1 summing-mixer opamp core (TL072) with feedback A (R15 = 33k),
 * feedback B (100k + 10pF), inter-stage R14 (100k), and IC4 decoupling.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   input (stage-A summing node) → `.amp > .IC4 > .IN_A_NEG`
 *   output (final, to downstream stages) → `.amp > .IC4 > .OUT_B`
 *
 * PCB orientation: the TL072 is rotated 270° so stage A's pads (IN_A_NEG,
 * fed from the input unit above) face north and stage B's pads (OUT_B,
 * feeding the output/buffer units below) face south — the two block-level
 * signals then never have to cross the chip. Each passive sits on the side
 * of the chip its pads face.
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
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <TL072 name="IC4" pcbX={0} pcbY={0} pcbRotation={270} />

    {/* Feedback A (north of IC4, stage-A side): R15 = 33k */}
    <resistor name="R15" resistance="33k" footprint="0603" pcbX={0} pcbY={4} />

    {/* Feedback B (south of IC4, stage-B side): R16 + C9 in parallel */}
    <resistor name="R16" resistance="100k" footprint="0603" pcbX={0} pcbY={-4.5} />
    <capacitor name="C9" capacitance="10pF" footprint="0603" pcbX={0} pcbY={-6} />

    {/* Inter-stage 100k (west of IC4, vertical): bridges OUT_A (north row)
        to IN_B_NEG (south row) around the chip's west flank */}
    <resistor name="R14" resistance="100k" footprint="0603"
      pcbX={-3.2} pcbY={0} pcbRotation={90} />

    {/* IC4 decoupling — each cap flanks the chip on the side of its supply
        pad (rot 270: VEE on the NW pad, VCC on the SE pad). C10 is rotated
        180° so its pin1 (VEE side) faces the chip. */}
    <capacitor name="C8" capacitance="100nF" footprint="0603" pcbX={4.5} pcbY={-3} />
    <capacitor name="C10" capacitance="100nF" footprint="0603" pcbX={-4.5} pcbY={3}
      pcbRotation={180} />
    <trace from=".C8 > .pin1" to=".IC4 > .VCC" />
    <trace from=".C8 > .pin2" to="net.GND" />
    <trace from=".C10 > .pin1" to=".IC4 > .VEE" />
    <trace from=".C10 > .pin2" to="net.GND" />

    {/* Ground reference for IN_A_POS: short hop to C10's GND pad (same net).
        IN_B_POS is grounded by the block (main.tsx stitches it to C8's
        GND pad). */}
    <trace from=".IC4 > .IN_A_POS" to=".C10 > .pin2" />

    {/* Internal stage A (north row) */}
    <trace from=".IC4 > .IN_A_NEG" to=".R15 > .pin1" />
    <trace from=".R15 > .pin2" to=".IC4 > .OUT_A" />

    {/* Inter-stage + stage B. R14's pin usage matches its geometry:
        north pad (pin2) ← OUT_A (north row), south pad (pin1) → IN_B_NEG
        (south row), so neither trace has to round the resistor. */}
    <trace from=".IC4 > .OUT_A" to=".R14 > .pin2" />
    <trace from=".R14 > .pin1" to=".IC4 > .IN_B_NEG" />
    <trace from=".IC4 > .IN_B_NEG" to=".R16 > .pin1" />
    <trace from=".R16 > .pin2" to=".IC4 > .OUT_B" />
    {/* C9 parallels R16 pad-to-pad (same net) — terminating it on R16's pads
        instead of IN_B_NEG/OUT_B keeps those chip pads at ≤2 traces each,
        which the sequential router needs to escape the fanout */}
    <trace from=".C9 > .pin1" to=".R16 > .pin1" />
    <trace from=".C9 > .pin2" to=".R16 > .pin2" />

    {/* Supply hookup last (explicit traces instead of a `connections` prop
        on the chip): the sequential router runs in document order, and the
        long VCC/VEE net sweeps must not wall off the short local traces
        above. Same nets/topology either way. */}
    <trace from=".IC4 > .VCC" to="net.VCC" />
    <trace from=".IC4 > .VEE" to="net.VEE" />
  </group>
);

export default SumMixerAmp;
