import { EurorackJack } from "../../../primitives/jacks/eurorack-jack.tsx";
import { TL072 } from "../../../primitives/chips/tl072.tsx";
import { LM321 } from "../../../primitives/chips/lm321.tsx";
import { WP937EGW } from "../../../primitives/leds/wp937egw.tsx";

export interface SumMixer3to1Props {
  pcbX?: number;
  pcbY?: number;
}

export const SumMixer3to1 = ({ pcbX, pcbY }: SumMixer3to1Props = {}) => (
  <group pcbX={pcbX} pcbY={pcbY}>
    <WP937EGW name="LED3" pcbX={0} pcbY={14.6} />

    <EurorackJack name="J9" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J10" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J11" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J12" pcbX={5} pcbY={-6.35} />

    <TL072
      name="IC4"
      pcbX={-0.17}
      pcbY={-6.25}
      pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }}
    />
    <LM321
      name="IC5"
      pcbX={0.12}
      pcbY={7.48}
      pcbRotation={90}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }}
    />
    <capacitor
      name="C8"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC4.VCC"
      decouplingTo="net.GND"
      pcbX={-5.93}
      pcbY={6.8}
      pcbRotation={90}
    />
    <capacitor
      name="C10"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC4.VEE"
      decouplingTo="net.GND"
      pcbX={1.98}
      pcbY={-11.24}
      pcbRotation={180}
    />
    <capacitor
      name="C_DEC_VCC_IC5"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC5.VCC"
      decouplingTo="net.GND"
      pcbX={4.25}
      pcbY={14.54}
    />
    <capacitor
      name="C_DEC_VEE_IC5"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="IC5.VEE"
      decouplingTo="net.GND"
      pcbX={-6.37}
      pcbY={-5.75}
      pcbRotation={180}
    />
    <capacitor
      name="C9"
      capacitance="10pF"
      footprint="0603"
      pcbX={3.42}
      pcbY={-8.03}
      pcbRotation={90}
    />
    <resistor
      name="R14"
      resistance="100k"
      footprint="0603"
      pcbX={7.38}
      pcbY={-13.89}
    />
    <resistor
      name="R15"
      resistance="33k"
      footprint="0603"
      pcbX={-5.25}
      pcbY={-8.86}
    />
    <resistor
      name="R16"
      resistance="100k"
      footprint="0603"
      pcbX={6.97}
      pcbY={-8.11}
      pcbRotation={90}
    />
    <resistor
      name="R17"
      resistance="100k"
      footprint="0603"
      pcbX={-2.13}
      pcbY={-11.36}
    />
    <resistor
      name="R18"
      resistance="100k"
      footprint="0603"
      pcbX={-3.41}
      pcbY={-5.96}
      pcbRotation={-90}
    />
    <resistor
      name="R19"
      resistance="1k"
      footprint="0603"
      pcbX={-1.65}
      pcbY={-0.44}
      pcbRotation={180}
    />
    <resistor
      name="R20"
      resistance="100k"
      footprint="0603"
      pcbX={-6.63}
      pcbY={-13.71}
    />
    <resistor
      name="R21"
      resistance="51"
      footprint="0603"
      pcbX={5.16}
      pcbY={-5.29}
    />

    <trace from=".J9 > .TIP" to="net.IN9" />
    <trace from=".J10 > .TIP" to="net.IN10" />
    <trace from=".J11 > .TIP" to="net.IN11" />

    <trace from="net.IN9" to=".R18 > .pin1" />
    <trace from=".R18 > .pin2" to=".IC4 > .IN_A_NEG" />
    <trace from="net.IN10" to=".R20 > .pin1" />
    <trace from=".R20 > .pin2" to=".IC4 > .IN_A_NEG" />
    <trace from="net.IN11" to=".R17 > .pin1" />
    <trace from=".R17 > .pin2" to=".IC4 > .IN_A_NEG" />
    <trace from=".IC4 > .IN_A_POS" to="net.GND" />
    <trace from=".IC4 > .IN_A_NEG" to=".R15 > .pin1" />
    <trace from=".R15 > .pin2" to=".IC4 > .OUT_A" />

    <trace from=".IC4 > .OUT_A" to=".R14 > .pin1" />
    <trace from=".R14 > .pin2" to=".IC4 > .IN_B_NEG" />
    <trace from=".IC4 > .IN_B_POS" to="net.GND" />
    <trace from=".IC4 > .IN_B_NEG" to=".R16 > .pin1" />
    <trace from=".R16 > .pin2" to=".IC4 > .OUT_B" />
    <trace from=".IC4 > .IN_B_NEG" to=".C9 > .pin1" />
    <trace from=".C9 > .pin2" to=".IC4 > .OUT_B" />

    <trace from=".IC4 > .OUT_B" to=".R21 > .pin1" />
    <trace from=".R21 > .pin2" to=".J12 > .TIP" />

    <trace from=".IC4 > .OUT_B" to=".IC5 > .IN_POS" />
    <trace from=".IC5 > .IN_NEG" to=".IC5 > .OUT" />
    <trace from=".IC5 > .OUT" to=".LED3 > .pin1" />
    <trace from=".LED3 > .pin2" to=".R19 > .pin1" />
    <trace from=".R19 > .pin2" to="net.GND" />

    <trace from=".J9 > .SLEEVE" to="net.GND" />
    <trace from=".J10 > .SLEEVE" to="net.GND" />
    <trace from=".J11 > .SLEEVE" to="net.GND" />
    <trace from=".J12 > .SLEEVE" to="net.GND" />
  </group>
);

export default SumMixer3to1;
