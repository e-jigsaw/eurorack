import { TL072 } from "../../../../primitives/chips/tl072.tsx";

/**
 * 2-stage opamp core (TL072) with feedback A (100k), feedback B (100k + 10pF),
 * inter-stage R10 (100k), and IC2 decoupling.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   input (stage-A summing node) → `.amp > .IC2 > .IN_A_NEG`
 *   output (final, to downstream stages) → `.amp > .IC2 > .OUT_B`
 *
 * PCB orientation: the TL072 is rotated 270° so stage A's pads (IN_A_NEG,
 * fed from the input unit above) face north and stage B's pads (OUT_B,
 * feeding the output/buffer units below) face south — the two block-level
 * signals then never have to cross the chip. Each passive sits on the side
 * of the chip its pads face.
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
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <TL072 name="IC2" pcbX={0} pcbY={0} pcbRotation={270} />

    {/* Feedback A (north of IC2, stage-A side) */}
    <resistor name="R6" resistance="100k" footprint="0603" pcbX={0} pcbY={4} />

    {/* Feedback B (south of IC2, stage-B side): R7 + C6 in parallel */}
    <resistor name="R7" resistance="100k" footprint="0603" pcbX={0} pcbY={-4.5} />
    <capacitor name="C6" capacitance="10pF" footprint="0603" pcbX={0} pcbY={-6} />

    {/* Inter-stage 100k (west of IC2, vertical): bridges OUT_A (north row)
        to IN_B_NEG (south row) around the chip's west flank */}
    <resistor name="R10" resistance="100k" footprint="0603"
      pcbX={-3.2} pcbY={0} pcbRotation={90} />

    {/* IC2 decoupling — each cap flanks the chip on the side of its supply
        pad (rot 270: VEE on the NW pad, VCC on the SE pad). C7 is rotated
        180° so its pin1 (VEE side) faces the chip. C5's pcbY was -4 (moved
        to -3, matching sum-mixer's C8): after the 19×108.4mm resize
        (block Y positions moved) the IN_B_POS→C5.pin2 ground stitch below
        — a long west-to-east hop across the chip's south row — went from
        marginal to unroutable; pulling C5 closer to that row (same offset
        sum-mixer already uses for the equivalent C8) restores the margin
        with no other layout change. */}
    <capacitor name="C5" capacitance="100nF" footprint="0603" pcbX={4.5} pcbY={-3} />
    <capacitor name="C7" capacitance="100nF" footprint="0603" pcbX={-4.5} pcbY={3}
      pcbRotation={180} />
    <trace from=".C5 > .pin1" to=".IC2 > .VCC" />
    <trace from=".C5 > .pin2" to="net.GND" />
    <trace from=".C7 > .pin1" to=".IC2 > .VEE" />
    <trace from=".C7 > .pin2" to="net.GND" />

    {/* Ground reference for IN_A_POS: short hop to C7's GND pad (same net).
        IN_B_POS is grounded by the block (main.tsx stitches it to C5's
        GND pad). */}
    <trace from=".IC2 > .IN_A_POS" to=".C7 > .pin2" />

    {/* Internal stage A (north row) */}
    <trace from=".IC2 > .IN_A_NEG" to=".R6 > .pin1" />
    <trace from=".R6 > .pin2" to=".IC2 > .OUT_A" />

    {/* Inter-stage + stage B. R10's pin usage matches its geometry:
        north pad (pin2) ← OUT_A (north row), south pad (pin1) → IN_B_NEG
        (south row), so neither trace has to round the resistor. */}
    <trace from=".IC2 > .OUT_A" to=".R10 > .pin2" />
    <trace from=".R10 > .pin1" to=".IC2 > .IN_B_NEG" />
    <trace from=".IC2 > .IN_B_NEG" to=".R7 > .pin1" />
    <trace from=".R7 > .pin2" to=".IC2 > .OUT_B" />
    {/* C6 parallels R7 pad-to-pad (same net) — terminating it on R7's pads
        instead of IN_B_NEG/OUT_B keeps those chip pads at ≤2 traces each,
        which the sequential router needs to escape the fanout */}
    <trace from=".C6 > .pin1" to=".R7 > .pin1" />
    <trace from=".C6 > .pin2" to=".R7 > .pin2" />

    {/* Supply hookup last (explicit traces instead of a `connections` prop
        on the chip): the sequential router runs in document order, and the
        long VCC/VEE net sweeps must not wall off the short local traces
        above. Same nets/topology either way. */}
    <trace from=".IC2 > .VCC" to="net.VCC" />
    <trace from=".IC2 > .VEE" to="net.VEE" />
  </group>
);

export default UtilitySumAmp;
