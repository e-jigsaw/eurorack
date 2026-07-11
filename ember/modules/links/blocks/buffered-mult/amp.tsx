import { OPA4171 } from "../../../../primitives/chips/opa4171.tsx";

/**
 * 4-channel unity-gain buffer core (OPA4171 IC1). All 4 IN_POS share one
 * input node; each channel's IN_NEG is tied to its OUT (unity gain).
 *
 * External wiring uses through-selectors:
 *   IN    → .amp > .IC1 > .IN_A_POS  (or any IN_x_POS, they are shorted)
 *   OUT_A → .amp > .IC1 > .OUT_A
 *   OUT_B → .amp > .IC1 > .OUT_B
 *   OUT_C → .amp > .IC1 > .OUT_C
 *   OUT_D → .amp > .IC1 > .OUT_D
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

    {/* All 4 IN_POS shorted to one input node (IC1.IN_A_POS exposed as IN port) */}
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
