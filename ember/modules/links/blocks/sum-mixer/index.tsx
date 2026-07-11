import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { SumMixerAmp } from "./amp.tsx";
import { SumMixerBuffer } from "./buffer.tsx";
import { SumMixerLed } from "./led.tsx";
import { SumMixerInput } from "./input.tsx";
import { SumMixerOutput } from "./output.tsx";

export interface SumMixer3to1Props {
  pcbX?: number;
  pcbY?: number;
}

export const SumMixer3to1 = ({ pcbX, pcbY }: SumMixer3to1Props = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <EurorackJack name="J9" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J10" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J11" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J12" pcbX={5} pcbY={-6.35} />

    <SumMixerInput name="input" />
    <SumMixerAmp name="amp" />
    <SumMixerOutput name="output" pcbX={2.6} pcbY={-7} />
    <SumMixerBuffer name="buf" />
    <SumMixerLed connections={{ IN: ".buf > .IC > .OUT" }} />

    {/* Input jacks → input summing resistors */}
    <trace from=".J9 > .TIP" to=".input > .R_in_A > .pin1" />
    <trace from=".J10 > .TIP" to=".input > .R_in_B > .pin1" />
    <trace from=".J11 > .TIP" to=".input > .R_in_C > .pin1" />
    {/* SUM bus → IC4.IN_A_NEG: same Manhattan path as utility-sum. */}
    <trace
      from=".input > .R_in_A > .pin2"
      to=".amp > .IC4 > .IN_A_NEG"
      pcbPath={[
        { x: 0.85, y: 0,        via: true, fromLayer: "top",    toLayer: "bottom" },
        { x: 0.85, y: -13.625 },
        { x: 2.275, y: -13.625, via: true, fromLayer: "bottom", toLayer: "top" },
      ]}
    />

    {/* Amp OUT_B → output resistor + buffer */}
    <trace from=".amp > .IC4 > .OUT_B" to=".output > .R_out > .pin1" />
    <trace from=".amp > .IC4 > .OUT_B" to=".buf > .IC > .IN_POS" />
    <trace from=".output > .R_out > .pin2" to=".J12 > .TIP" />

    {/* SLEEVE GND chains */}
    <trace from=".J9 > .SLEEVE" to=".J11 > .SLEEVE" />
    <trace from=".J10 > .SLEEVE" to=".J12 > .SLEEVE" />
    <trace from=".J11 > .SLEEVE" to="net.GND" />
    <trace from=".J12 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default SumMixer3to1;
