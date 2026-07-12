import { EurorackPCB } from "../../primitives/pcb/eurorack-pcb.tsx";
import { BufferedMultControl } from "./blocks/buffered-mult/control.tsx";
import { UtilitySumControl } from "./blocks/utility-sum/control.tsx";
import { SumMixerControl } from "./blocks/sum-mixer/control.tsx";
import { BOARD_WIDTH, BOARD_HEIGHT, Y_1TO3, Y_2X2, Y_3TO1 } from "./interconnect.ts";

/**
 * Control board: jacks + LEDs + male headers only (100% THT, ordered as a
 * bare PCB). Same 19×108.4mm outline as the main board; power stays on main.
 */
export const LinksControlBoard = () => (
  <EurorackPCB width={BOARD_WIDTH} height={BOARD_HEIGHT}>
    <BufferedMultControl pcbY={Y_1TO3} />
    <UtilitySumControl pcbY={Y_2X2} />
    <SumMixerControl pcbY={Y_3TO1} />
  </EurorackPCB>
);

export default LinksControlBoard;
