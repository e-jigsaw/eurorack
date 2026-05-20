import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { UtilitySumAmp } from "./amp.tsx";
import { UtilitySumBuffer } from "./buffer.tsx";
import { UtilitySumLed } from "./led.tsx";
import { UtilitySumInput } from "./input.tsx";
import { UtilitySumOutput } from "./output.tsx";

export interface UtilitySum2x2Props {
  pcbX?: number;
  pcbY?: number;
}

export const UtilitySum2x2 = ({ pcbX, pcbY }: UtilitySum2x2Props = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <EurorackJack name="J5" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J6" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J7" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J8" pcbX={5} pcbY={-6.35} />

    <UtilitySumInput name="input" pcbY={7} />
    <UtilitySumAmp name="amp" />
    <UtilitySumOutput name="output" pcbY={-7} />
    <UtilitySumBuffer name="buf" />
    <UtilitySumLed connections={{ IN: ".buf > .OUT" }} />

    {/* Input jacks → input section (port-to-port) */}
    <trace from=".J5 > .TIP" to=".input > .IN_A" />
    <trace from=".J6 > .TIP" to=".input > .IN_B" />
    <trace from=".input > .SUM" to=".amp > .SUM_A" />

    {/* Amp OUT_B → output section + buffer */}
    <trace from=".amp > .OUT_B" to=".output > .SRC" />
    <trace from=".amp > .OUT_B" to=".buf > .IN" />

    {/* Output section → output jacks */}
    <trace from=".output > .OUT_A" to=".J7 > .TIP" />
    <trace from=".output > .OUT_B" to=".J8 > .TIP" />

    {/* SLEEVE GND chains */}
    <trace from=".J5 > .SLEEVE" to=".J7 > .SLEEVE" />
    <trace from=".J6 > .SLEEVE" to=".J8 > .SLEEVE" />
    <trace from=".J7 > .SLEEVE" to="net.GND" />
    <trace from=".J8 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default UtilitySum2x2;
