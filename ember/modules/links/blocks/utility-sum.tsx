import { EurorackJack } from "../../../primitives/jacks/eurorack-jack.tsx";
import { TL072 } from "../../../primitives/chips/tl072.tsx";
import { LM321 } from "../../../primitives/chips/lm321.tsx";
import { WP937EGW } from "../../../primitives/leds/wp937egw.tsx";

export interface UtilitySum2x2Props {
  pcbX?: number;
  pcbY?: number;
}

export const UtilitySum2x2 = ({ pcbX, pcbY }: UtilitySum2x2Props = {}) => (
  <group pcbX={pcbX} pcbY={pcbY}>
    <WP937EGW name="LED2" pcbX={0} pcbY={14.6} />

    <EurorackJack name="J5" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J6" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J7" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J8" pcbX={5} pcbY={-6.35} />

    <TL072
      name="IC2"
      pcbX={-0.06}
      pcbY={-4.45}
      pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }}
    />
    <LM321
      name="IC3"
      pcbX={-0.02}
      pcbY={8.51}
      pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }}
    />
    <capacitor
      name="C5"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC2.VCC"
      decouplingTo="net.GND"
      pcbX={-7.91}
      pcbY={-2.12}
    />
    <capacitor
      name="C7"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC2.VEE"
      decouplingTo="net.GND"
      pcbX={-0.03}
      pcbY={-10.13}
      pcbRotation={180}
    />
    <capacitor
      name="C_DEC_VCC_IC3"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC3.VCC"
      decouplingTo="net.GND"
      pcbX={0.22}
      pcbY={2.04}
    />
    <capacitor
      name="C_DEC_VEE_IC3"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC3.VEE"
      decouplingTo="net.GND"
      pcbX={-0.11}
      pcbY={-13.48}
    />
    <capacitor
      name="C6"
      capacitance="10pF"
      footprint="0603"
      pcbX={0.2}
      pcbY={-0.17}
    />
    <resistor
      name="R6"
      resistance="100k"
      footprint="0603"
      pcbX={-5.03}
      pcbY={-8.44}
    />
    <resistor
      name="R7"
      resistance="100k"
      footprint="0603"
      pcbX={-4.98}
      pcbY={4.87}
    />
    <resistor
      name="R8"
      resistance="100k"
      footprint="0603"
      pcbX={-5.05}
      pcbY={-5.76}
    />
    <resistor
      name="R9"
      resistance="100k"
      footprint="0603"
      pcbX={4.13}
      pcbY={-6.54}
      pcbRotation={180}
    />
    <resistor
      name="R10"
      resistance="100k"
      footprint="0603"
      pcbX={-5.04}
      pcbY={-13.31}
    />
    <resistor
      name="R11"
      resistance="1k"
      footprint="0603"
      pcbX={1.85}
      pcbY={12.31}
    />
    <resistor
      name="R12"
      resistance="51"
      footprint="0603"
      pcbX={0.72}
      pcbY={4.21}
    />
    <resistor
      name="R13"
      resistance="51"
      footprint="0603"
      pcbX={4.88}
      pcbY={4.93}
    />

    <trace from=".J5 > .TIP" to="net.IN5" />
    <trace from=".J6 > .TIP" to="net.IN6" />

    <trace from="net.IN5" to=".R8 > .pin1" />
    <trace from=".R8 > .pin2" to=".IC2 > .IN_A_NEG" />
    <trace from="net.IN6" to=".R9 > .pin1" />
    <trace from=".R9 > .pin2" to=".IC2 > .IN_A_NEG" />
    <trace from=".IC2 > .IN_A_POS" to="net.GND" />
    <trace from=".IC2 > .IN_A_NEG" to=".R6 > .pin1" />
    <trace from=".R6 > .pin2" to=".IC2 > .OUT_A" />

    <trace from=".IC2 > .OUT_A" to=".R10 > .pin1" />
    <trace from=".R10 > .pin2" to=".IC2 > .IN_B_NEG" />
    <trace from=".IC2 > .IN_B_POS" to="net.GND" />
    <trace from=".IC2 > .IN_B_NEG" to=".R7 > .pin1" />
    <trace from=".R7 > .pin2" to=".IC2 > .OUT_B" />
    <trace from=".IC2 > .IN_B_NEG" to=".C6 > .pin1" />
    <trace from=".C6 > .pin2" to=".IC2 > .OUT_B" />

    <trace from=".IC2 > .OUT_B" to=".R12 > .pin1" />
    <trace from=".R12 > .pin2" to=".J7 > .TIP" />
    <trace from=".IC2 > .OUT_B" to=".R13 > .pin1" />
    <trace from=".R13 > .pin2" to=".J8 > .TIP" />

    <trace from=".IC2 > .OUT_B" to=".IC3 > .IN_POS" />
    <trace from=".IC3 > .IN_NEG" to=".IC3 > .OUT" />
    <trace from=".IC3 > .OUT" to=".LED2 > .pin1" />
    <trace from=".LED2 > .pin2" to=".R11 > .pin1" />
    <trace from=".R11 > .pin2" to="net.GND" />

    <trace from=".J5 > .SLEEVE" to="net.GND" />
    <trace from=".J6 > .SLEEVE" to="net.GND" />
    <trace from=".J7 > .SLEEVE" to="net.GND" />
    <trace from=".J8 > .SLEEVE" to="net.GND" />
  </group>
);

export default UtilitySum2x2;
