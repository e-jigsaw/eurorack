import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { WP937EGW } from "../../../../primitives/leds/wp937egw.tsx";
import { InterconnectHeader1x6 } from "../../../../primitives/headers/interconnect-header.tsx";
import { US_PINS, HEADER_Y_LOCAL } from "../../interconnect.ts";
import { CLEARANCE, FAB_ROUTING_PROPS } from "../../../../primitives/pcb/fab-limits.ts";

export interface UtilitySumControlProps {
  pcbX?: number;
  pcbY?: number;
}

/** Control-board half: jacks + LED + male interconnect header. 100% THT. */
export const UtilitySumControl = ({ pcbX, pcbY }: UtilitySumControlProps = {}) => (
  <subcircuit
    pcbX={pcbX}
    pcbY={pcbY}
    {...FAB_ROUTING_PROPS}
    autorouter={{ preset: "sequential_trace", traceClearance: CLEARANCE }}
  >
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

    {/* SLEEVE GND chains (mirrors buffered-mult's pattern): explicit
        adjacent-jack hops keep every SLEEVE pad on one connected copper
        island so the router's own traces carry the net — leaving jacks
        independently tied to net.GND left three separate single-pad
        islands that only tscircut's net-island "backup" stitcher (which
        does not consult the subcircuit's minTraceWidth/clearance props)
        would join, producing an unmeasurable/unfixable 0.1mm trace. */}
    <trace from=".J5 > .SLEEVE" to=".J7 > .SLEEVE" />
    <trace from=".J6 > .SLEEVE" to=".J8 > .SLEEVE" />
    <trace from=".J7 > .SLEEVE" to=".J8 > .SLEEVE" />
    <trace from=".J8 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default UtilitySumControl;
