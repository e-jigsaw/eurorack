import { BufferedMultAmp } from "./amp.tsx";
import { BufferedMultInputBias } from "./input-bias.tsx";
import { BufferedMultOutputs } from "./outputs.tsx";
import { InterconnectHeader1x6 } from "../../../../primitives/headers/interconnect-header.tsx";
import { BM_PINS, HEADER_Y_LOCAL, mainPinOrder } from "../../interconnect.ts";

export interface BufferedMultMainProps {
  pcbX?: number;
  pcbY?: number;
}

/** Main-board half: buffer circuitry + LED series resistor + female socket. */
export const BufferedMultMain = ({ pcbX, pcbY }: BufferedMultMainProps = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <BufferedMultAmp name="amp" />
    <BufferedMultInputBias name="bias" />
    <BufferedMultOutputs name="outputs" />
    <resistor name="R_led" resistance="1k" footprint="0603" pcbX={6.5} pcbY={-14} />
    <InterconnectHeader1x6
      name="HDR"
      gender="female"
      pinLabels={mainPinOrder(BM_PINS)}
      pcbY={HEADER_Y_LOCAL}
    />

    {/* input: header → bias + amp */}
    <trace from=".HDR > .IN" to=".bias > .IO" />
    <trace from=".HDR > .IN" to=".amp > .IN" />

    {/* amp outputs → 51Ω → header (channel mapping preserved from v1) */}
    <trace from=".amp > .OUT_C" to=".outputs > .SRC_A" />
    <trace from=".outputs > .OUT_A" to=".HDR > .OUT_A" />
    <trace from=".amp > .OUT_D" to=".outputs > .SRC_B" />
    <trace from=".outputs > .OUT_B" to=".HDR > .OUT_B" />
    <trace from=".amp > .OUT_A" to=".outputs > .SRC_C" />
    <trace from=".outputs > .OUT_C" to=".HDR > .OUT_C" />

    {/* LED drive: current-limited before crossing the header */}
    <trace from=".amp > .OUT_B" to=".R_led > .pin1" />
    <trace from=".R_led > .pin2" to=".HDR > .LED" />
    <trace from=".HDR > .GND" to="net.GND" />
  </subcircuit>
);

export default BufferedMultMain;
