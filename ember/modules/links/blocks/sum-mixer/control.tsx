import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { WP937EGW } from "../../../../primitives/leds/wp937egw.tsx";
import { InterconnectHeader1x6 } from "../../../../primitives/headers/interconnect-header.tsx";
import { SM_PINS, HEADER_Y_LOCAL } from "../../interconnect.ts";

export interface SumMixerControlProps {
  pcbX?: number;
  pcbY?: number;
}

/** Control-board half: jacks + LED + male interconnect header. 100% THT. */
export const SumMixerControl = ({ pcbX, pcbY }: SumMixerControlProps = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <EurorackJack name="J9" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J10" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J11" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J12" pcbX={5} pcbY={-6.35} />
    <WP937EGW name="LED3" pcbX={0} pcbY={14.6} />
    <InterconnectHeader1x6 name="HDR" gender="male" layer="bottom" pinLabels={SM_PINS} pcbY={HEADER_Y_LOCAL} />

    {/* jack ↔ header */}
    <trace from=".J9 > .TIP" to=".HDR > .IN_A" />
    <trace from=".J10 > .TIP" to=".HDR > .IN_B" />
    <trace from=".J11 > .TIP" to=".HDR > .IN_C" />
    <trace from=".HDR > .OUT" to=".J12 > .TIP" />

    {/* LED: series resistor lives on the main board */}
    <trace from=".HDR > .LED" to=".LED3 > .anode" />
    <trace from=".LED3 > .cathode" to="net.GND" />
    <trace from=".HDR > .GND" to="net.GND" />

    {/* SLEEVE GND: each jack wired directly to GND (avoids a same-net via
        clash from two independent traces converging on one jack pad) */}
    <trace from=".J9 > .SLEEVE" to="net.GND" />
    <trace from=".J10 > .SLEEVE" to="net.GND" />
    <trace from=".J11 > .SLEEVE" to="net.GND" />
    <trace from=".J12 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default SumMixerControl;
