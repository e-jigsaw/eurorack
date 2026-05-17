import { EurorackJack } from "../../../primitives/jacks/eurorack-jack.tsx";
import { OPA4171 } from "../../../primitives/chips/opa4171.tsx";
import { WP937EGW } from "../../../primitives/leds/wp937egw.tsx";

export interface BufferedMultProps {
  pcbX?: number;
  pcbY?: number;
}

// Local layout (origin = block center):
//   LED     y=+15
//   J1  J2  y=+6   (x=-5, x=+5)
//   J3  J4  y=-6
//   IC+R+C  y=-15  (grid)
export const BufferedMult = ({ pcbX, pcbY }: BufferedMultProps = {}) => (
  <group pcbX={pcbX} pcbY={pcbY}>
    <WP937EGW name="LED1" pcbX={0} pcbY={14.6} />

    <EurorackJack name="J1" pcbX={-5.07} pcbY={6.8} />
    <EurorackJack name="J2" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J3" pcbX={-5.04} pcbY={-5.9} />
    <EurorackJack name="J4" pcbX={5} pcbY={-6.35} />

    <OPA4171
      name="IC1"
      pcbX={-0.35}
      pcbY={4.95}
      pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }}
    />
    <capacitor
      name="C3"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC1.VCC"
      decouplingTo="net.GND"
      pcbX={-5.65}
      pcbY={-5.43}
    />
    <capacitor
      name="C4"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC1.VEE"
      decouplingTo="net.GND"
      pcbX={0.61}
      pcbY={9.3}
    />
    <resistor
      name="R1"
      resistance="10M"
      footprint="0603"
      pcbX={1.12}
      pcbY={-1.18}
      pcbRotation={270}
    />
    <resistor
      name="R2"
      resistance="51"
      footprint="0603"
      pcbX={5.12}
      pcbY={7.22}
    />
    <resistor
      name="R3"
      resistance="1k"
      footprint="0603"
      pcbX={3.14}
      pcbY={13.89}
      pcbRotation={90}
    />
    <resistor
      name="R4"
      resistance="51"
      footprint="0603"
      pcbX={-7.46}
      pcbY={8.73}
      pcbRotation={90}
    />
    <resistor
      name="R5"
      resistance="51"
      footprint="0603"
      pcbX={-1.4}
      pcbY={-1.26}
      pcbRotation={270}
    />

    <trace from=".J1 > .TIP" to="net.IN1" />
    <trace from=".R1 > .pin1" to="net.IN1" />
    <trace from=".R1 > .pin2" to="net.GND" />
    <trace from=".IC1 > .IN_A_POS" to="net.IN1" />
    <trace from=".IC1 > .IN_B_POS" to="net.IN1" />
    <trace from=".IC1 > .IN_C_POS" to="net.IN1" />
    <trace from=".IC1 > .IN_D_POS" to="net.IN1" />

    <trace from=".IC1 > .IN_A_NEG" to=".IC1 > .OUT_A" />
    <trace from=".IC1 > .IN_B_NEG" to=".IC1 > .OUT_B" />
    <trace from=".IC1 > .IN_C_NEG" to=".IC1 > .OUT_C" />
    <trace from=".IC1 > .IN_D_NEG" to=".IC1 > .OUT_D" />

    <trace from=".IC1 > .OUT_A" to=".R5 > .pin1" />
    <trace from=".R5 > .pin2" to=".J4 > .TIP" />
    <trace from=".IC1 > .OUT_C" to=".R2 > .pin1" />
    <trace from=".R2 > .pin2" to=".J2 > .TIP" />
    <trace from=".IC1 > .OUT_D" to=".R4 > .pin1" />
    <trace from=".R4 > .pin2" to=".J3 > .TIP" />

    <trace from=".IC1 > .OUT_B" to=".LED1 > .pin1" />
    <trace from=".LED1 > .pin2" to=".R3 > .pin1" />
    <trace from=".R3 > .pin2" to="net.GND" />

    <trace from=".J1 > .SLEEVE" to="net.GND" />
    <trace from=".J2 > .SLEEVE" to="net.GND" />
    <trace from=".J3 > .SLEEVE" to="net.GND" />
    <trace from=".J4 > .SLEEVE" to="net.GND" />
  </group>
);

export default BufferedMult;
