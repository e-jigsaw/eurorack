import { EurorackPCB } from "../../primitives/pcb/eurorack-pcb.tsx";
import { EurorackPowerInput } from "../../primitives/power/eurorack-power-input.tsx";
import { BufferedMultMain } from "./blocks/buffered-mult/main.tsx";
import { UtilitySumMain } from "./blocks/utility-sum/main.tsx";
import { SumMixerMain } from "./blocks/sum-mixer/main.tsx";
import { Y_PWR, Y_1TO3, Y_2X2, Y_3TO1 } from "./interconnect.ts";

/**
 * Main board: circuitry + power + female sockets (SMD parts PCBA'd).
 * Mates flipped onto the control board — pin order handled by mainPinOrder
 * inside each block's main half.
 *
 * Blocks are <subcircuit>s, whose net scopes are isolated — each block's
 * GND/VCC/VEE is stitched to the board nets below via one real pad per net
 * (pad-level traces cross subcircuit boundaries; net names do not).
 */
export const LinksMainBoard = () => (
  <EurorackPCB width={20} height={115}>
    <net name="GND" />
    <net name="VCC" />
    <net name="VEE" />

    <EurorackPowerInput name="PWR" pcbY={Y_PWR} />
    <BufferedMultMain pcbY={Y_1TO3} />
    <UtilitySumMain pcbY={Y_2X2} />
    <SumMixerMain pcbY={Y_3TO1} />

    {/* per-block GND stitch (header GND pad) */}
    <trace from=".BM > .HDR > .GND" to="net.GND" />
    <trace from=".US > .HDR > .GND" to="net.GND" />
    <trace from=".SM > .HDR > .GND" to="net.GND" />

    {/* per-block power stitch (opamp supply pads) */}
    <trace from=".BM > .amp > .IC1 > .VCC" to="net.VCC" />
    <trace from=".BM > .amp > .IC1 > .VEE" to="net.VEE" />
    <trace from=".US > .amp > .IC2 > .VCC" to="net.VCC" />
    <trace from=".US > .amp > .IC2 > .VEE" to="net.VEE" />
    <trace from=".SM > .amp > .IC4 > .VCC" to="net.VCC" />
    <trace from=".SM > .amp > .IC4 > .VEE" to="net.VEE" />
  </EurorackPCB>
);

export default LinksMainBoard;
