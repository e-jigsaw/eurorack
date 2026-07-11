import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { WP937EGW } from "../../../../primitives/leds/wp937egw.tsx";
import { InterconnectHeader1x6 } from "../../../../primitives/headers/interconnect-header.tsx";
import { US_PINS, HEADER_Y_LOCAL } from "../../interconnect.ts";

export interface UtilitySumControlProps {
  pcbX?: number;
  pcbY?: number;
}

/** Control-board half: jacks + LED + male interconnect header. 100% THT. */
export const UtilitySumControl = ({ pcbX, pcbY }: UtilitySumControlProps = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <EurorackJack name="J5" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J6" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J7" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J8" pcbX={5} pcbY={-6.35} />
    <WP937EGW name="LED2" pcbX={0} pcbY={14.6} />
    <InterconnectHeader1x6 name="HDR" gender="male" layer="bottom" pinLabels={US_PINS} pcbY={HEADER_Y_LOCAL} />

    {/* jack ↔ header */}
    <trace from=".J5 > .TIP" to=".HDR > .IN_A" />
    <trace from=".J6 > .TIP" to=".HDR > .IN_B" />
    <trace from=".HDR > .OUT_A" to=".J7 > .TIP" />
    <trace from=".HDR > .OUT_B" to=".J8 > .TIP" />

    {/* LED: series resistor lives on the main board */}
    <trace from=".HDR > .LED" to=".LED2 > .anode" />
    <trace from=".LED2 > .cathode" to="net.GND" />
    <trace from=".HDR > .GND" to="net.GND" />

    {/* SLEEVE GND: each jack wired directly to GND (avoids a same-net via
        clash from two independent traces converging on one jack pad) */}
    <trace from=".J5 > .SLEEVE" to="net.GND" />
    <trace from=".J6 > .SLEEVE" to="net.GND" />
    <trace from=".J7 > .SLEEVE" to="net.GND" />
    <trace from=".J8 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default UtilitySumControl;
