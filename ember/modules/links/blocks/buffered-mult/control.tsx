import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { WP937EGW } from "../../../../primitives/leds/wp937egw.tsx";
import { InterconnectHeader1x6 } from "../../../../primitives/headers/interconnect-header.tsx";
import { BM_PINS, HEADER_Y_LOCAL } from "../../interconnect.ts";

export interface BufferedMultControlProps {
  pcbX?: number;
  pcbY?: number;
}

/** Control-board half: jacks + LED + male interconnect header. 100% THT. */
export const BufferedMultControl = ({ pcbX, pcbY }: BufferedMultControlProps = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <EurorackJack name="J1" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J2" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J3" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J4" pcbX={5} pcbY={-6.35} />
    <WP937EGW name="LED1" pcbX={0} pcbY={14.6} />
    <InterconnectHeader1x6 name="HDR" gender="male" pinLabels={BM_PINS} pcbY={HEADER_Y_LOCAL} />

    {/* jack ↔ header */}
    <trace from=".J1 > .TIP" to=".HDR > .IN" />
    <trace from=".HDR > .OUT_A" to=".J2 > .TIP" />
    <trace from=".HDR > .OUT_B" to=".J3 > .TIP" />
    <trace from=".HDR > .OUT_C" to=".J4 > .TIP" />

    {/* LED: series resistor lives on the main board */}
    <trace from=".HDR > .LED" to=".LED1 > .anode" />
    <trace from=".LED1 > .cathode" to="net.GND" />
    <trace from=".HDR > .GND" to="net.GND" />

    {/* SLEEVE GND chains */}
    <trace from=".J1 > .SLEEVE" to=".J3 > .SLEEVE" />
    <trace from=".J2 > .SLEEVE" to=".J4 > .SLEEVE" />
    <trace from=".J3 > .SLEEVE" to=".J4 > .SLEEVE" />
    <trace from=".J4 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default BufferedMultControl;
