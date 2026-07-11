import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { BufferedMultAmp } from "./amp.tsx";
import { BufferedMultLed } from "./led.tsx";
import { BufferedMultInputBias } from "./input-bias.tsx";
import { BufferedMultOutputs } from "./outputs.tsx";

export interface BufferedMultProps {
  pcbX?: number;
  pcbY?: number;
}

export const BufferedMult = ({ pcbX, pcbY }: BufferedMultProps = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <EurorackJack name="J1" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J2" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J3" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J4" pcbX={5} pcbY={-6.35} />

    <BufferedMultAmp name="amp" />
    <BufferedMultInputBias name="bias" />
    <BufferedMultOutputs name="outputs" />
    <BufferedMultLed connections={{ IN: ".amp > .IC1 > .OUT_B" }} />

    {/* J1 input → bias resistor + amp input (any IN_x_POS, all shorted) */}
    <trace from=".J1 > .TIP" to=".bias > .R > .pin1" />
    <trace from=".J1 > .TIP" to=".amp > .IC1 > .IN_A_POS" />

    {/* amp outputs → 51Ω → output jacks */}
    <trace from=".amp > .IC1 > .OUT_A" to=".outputs > .R_out_C > .pin1" />
    <trace from=".outputs > .R_out_C > .pin2" to=".J4 > .TIP" />
    <trace from=".amp > .IC1 > .OUT_C" to=".outputs > .R_out_A > .pin1" />
    <trace from=".outputs > .R_out_A > .pin2" to=".J2 > .TIP" />
    <trace from=".amp > .IC1 > .OUT_D" to=".outputs > .R_out_B > .pin1" />
    <trace from=".outputs > .R_out_B > .pin2" to=".J3 > .TIP" />

    {/* SLEEVE GND chains */}
    <trace from=".J1 > .SLEEVE" to=".J3 > .SLEEVE" />
    <trace from=".J2 > .SLEEVE" to=".J4 > .SLEEVE" />
    <trace from=".J3 > .SLEEVE" to=".J4 > .SLEEVE" />
    <trace from=".J4 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default BufferedMult;
