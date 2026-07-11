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
  <subcircuit name="BM" pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    {/* declare block nets once up front: without this, each net.X trace
        reference at different tree depths (unit groups vs block level) races
        and creates its own duplicate Net child → pcb_trace_error "Multiple
        immediate children found with name ..." */}
    <net name="GND" />
    <net name="VCC" />
    <net name="VEE" />
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

    {/* input: header → bias + amp (pad-to-pad; alias ports are unroutable) */}
    <trace from=".HDR > .IN" to=".bias > .R > .pin1" />
    <trace from=".HDR > .IN" to=".amp > .IC1 > .IN_A_POS" />

    {/* amp outputs → 51Ω → header (channel mapping preserved from v1) */}
    <trace from=".amp > .IC1 > .OUT_C" to=".outputs > .R_A > .pin1" />
    <trace from=".outputs > .R_A > .pin2" to=".HDR > .OUT_A" />
    <trace from=".amp > .IC1 > .OUT_D" to=".outputs > .R_B > .pin1" />
    <trace from=".outputs > .R_B > .pin2" to=".HDR > .OUT_B" />
    <trace from=".amp > .IC1 > .OUT_A" to=".outputs > .R_C > .pin1" />
    <trace from=".outputs > .R_C > .pin2" to=".HDR > .OUT_C" />

    {/* LED drive: current-limited before crossing the header */}
    <trace from=".amp > .IC1 > .OUT_B" to=".R_led > .pin1" />
    <trace from=".R_led > .pin2" to=".HDR > .LED" />
    <trace from=".HDR > .GND" to="net.GND" />
  </subcircuit>
);

export default BufferedMultMain;
