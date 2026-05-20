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
    <SumMixerLed connections={{ IN: ".buf > .OUT" }} />

    {/* Input jacks → input section */}
    <trace from=".J9 > .TIP" to=".input > .IN_A" />
    <trace from=".J10 > .TIP" to=".input > .IN_B" />
    <trace from=".J11 > .TIP" to=".input > .IN_C" />
    <trace from=".input > .SUM" to=".amp > .SUM_A" />

    {/* amp.OUT_B → output → J12, and → buffer */}
    <trace from=".amp > .OUT_B" to=".output > .SRC" />
    <trace from=".amp > .OUT_B" to=".buf > .IN" />
    <trace from=".output > .OUT" to=".J12 > .TIP" />

    {/* SLEEVE GND chains */}
    <trace from=".J9 > .SLEEVE" to=".J11 > .SLEEVE" />
    <trace from=".J10 > .SLEEVE" to=".J12 > .SLEEVE" />
    <trace from=".J11 > .SLEEVE" to="net.GND" />
    <trace from=".J12 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default SumMixer3to1;
