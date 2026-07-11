import { LM321 } from "../../../../primitives/chips/lm321.tsx";

export interface SumMixerBufferProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
}

/**
 * Unity-gain follower (LM321).
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   input  → `.buf > .IC > .IN_POS`
 *   output → `.buf > .IC > .OUT`
 */
export const SumMixerBuffer = ({
  name = "buf",
  pcbX = 0,
  pcbY = -12,
}: SumMixerBufferProps = {}) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    {/* Rotated 90° so the SOT-23 pads sit in north/south rows instead of
        east/west columns — with columns, the VEE feed and the IN_POS feed
        fight over the same (west) face and one always fails to route.
        Rot 90 rows: south = OUT / VEE / IN_POS, north = VCC / IN_NEG. */}
    <LM321 name="IC" pcbX={0} pcbY={0} pcbRotation={90} />

    {/* IC decoupling — each cap beside its supply pad (VCC on the NW pad,
        VEE on the south row). Both rotated 180° so pin1 (supply side)
        faces the chip. */}
    <capacitor name="C_VCC" capacitance="100nF" footprint="0603"
      pcbX={-3.5} pcbY={2} pcbRotation={180} />
    {/* C_VEE y=-3.4 (was -4): with the interconnect header at
        HEADER_Y_LOCAL=-17.8 the old spot overlapped the header courtyard
        by 0.2mm; -3.4 clears it by ~0.4mm while staying beside VEE. */}
    <capacitor name="C_VEE" capacitance="100nF" footprint="0603"
      pcbX={-2.5} pcbY={-3.4} pcbRotation={180} />
    <trace from=".C_VCC > .pin1" to=".IC > .VCC" />
    <trace from=".C_VEE > .pin1" to=".IC > .VEE" />
    {/* C_VEE grounds via C_VCC's GND pad (same net) — a short pad-to-pad
        hop routes reliably where a second net.GND island did not. C_VCC's
        own ground is stitched by the block (main.tsx bridges it to the
        header's GND pin). */}
    <trace from=".C_VEE > .pin2" to=".C_VCC > .pin2" />

    {/* Unity-gain feedback */}
    <trace from=".IC > .IN_NEG" to=".IC > .OUT" />

    {/* Supply hookup last (explicit traces instead of a `connections` prop
        on the chip) so the long net sweeps route after the local traces —
        the sequential router runs in document order. Same nets/topology. */}
    <trace from=".IC > .VCC" to="net.VCC" />
    <trace from=".IC > .VEE" to="net.VEE" />
  </group>
);

export default SumMixerBuffer;
