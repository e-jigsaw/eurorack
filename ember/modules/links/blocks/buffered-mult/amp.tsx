import { OPA4171 } from "../../../../primitives/chips/opa4171.tsx";

/**
 * 4-channel unity-gain buffer core (OPA4171 IC1).
 * Each channel's IN_NEG is internally connected to its OUT (unity gain);
 * all 4 IN_POS are shorted internally → single input node.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   input  → `.amp > .IC1 > .IN_A_POS`
 *   output → `.amp > .IC1 > .OUT_A` .. `.OUT_D`
 */
export interface BufferedMultAmpProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
}

export const BufferedMultAmp = ({
  name = "amp",
  pcbX = 0,
  pcbY = 0,
}: BufferedMultAmpProps = {}) => (
  <subcircuit
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    autorouter="sequential-trace"
  >
    <OPA4171 name="IC1" pcbX={0} pcbY={0} pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }} />

    {/* IC1 decoupling */}
    <capacitor name="C3" capacitance="100nF" footprint="0603" pcbX={-2} pcbY={-9} />
    <capacitor name="C4" capacitance="100nF" footprint="0603" pcbX={2} pcbY={-9} />
    <trace from=".C3 > .pin1" to=".IC1 > .VCC" />
    <trace from=".C3 > .pin2" to="net.GND" />
    <trace from=".C4 > .pin1" to=".IC1 > .VEE" />
    <trace from=".C4 > .pin2" to="net.GND" />

    {/* All 4 IN_POS shorted to one input node (consumers tap IC1.IN_A_POS) */}
    <trace from=".IC1 > .IN_A_POS" to=".IC1 > .IN_B_POS" />
    <trace from=".IC1 > .IN_A_POS" to=".IC1 > .IN_C_POS" />
    <trace from=".IC1 > .IN_A_POS" to=".IC1 > .IN_D_POS" />

    {/* Each channel's IN_NEG ↔ OUT (unity-gain feedback) */}
    <trace from=".IC1 > .IN_A_NEG" to=".IC1 > .OUT_A" />
    <trace from=".IC1 > .IN_B_NEG" to=".IC1 > .OUT_B" />
    <trace from=".IC1 > .IN_C_NEG" to=".IC1 > .OUT_C" />
    <trace from=".IC1 > .IN_D_NEG" to=".IC1 > .OUT_D" />
  </subcircuit>
);

export default BufferedMultAmp;
