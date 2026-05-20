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
    <BufferedMultLed connections={{ IN: ".amp > .OUT_B" }} />

    {/* J1 input → bias resistor + amp IN */}
    <trace from=".J1 > .TIP" to=".bias > .IO" />
    <trace from=".J1 > .TIP" to=".amp > .IN" />

    {/* amp outputs → 51Ω → output jacks */}
    <trace from=".amp > .OUT_A" to=".outputs > .SRC_C" />
    <trace from=".outputs > .OUT_C" to=".J4 > .TIP" />
    <trace from=".amp > .OUT_C" to=".outputs > .SRC_A" />
    <trace from=".outputs > .OUT_A" to=".J2 > .TIP" />
    <trace from=".amp > .OUT_D" to=".outputs > .SRC_B" />
    <trace from=".outputs > .OUT_B" to=".J3 > .TIP" />

    {/* SLEEVE GND chains */}
    <trace from=".J1 > .SLEEVE" to=".J3 > .SLEEVE" />
    <trace from=".J2 > .SLEEVE" to=".J4 > .SLEEVE" />
    <trace from=".J3 > .SLEEVE" to=".J4 > .SLEEVE" />
    <trace from=".J4 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default BufferedMult;
