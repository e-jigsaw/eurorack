import { EurorackPCB } from "../../primitives/pcb/eurorack-pcb.tsx";
import { EurorackPowerInput } from "../../primitives/power/eurorack-power-input.tsx";
import { BufferedMult } from "./blocks/buffered-mult/index.tsx";
import { UtilitySum2x2 } from "./blocks/utility-sum/index.tsx";
import { SumMixer3to1 } from "./blocks/sum-mixer/index.tsx";

// jack/LED 位置は Mutable Links 実機 (PCB 中央原点に換算) と一致。
const Y_PWR = 52.3;
const Y_1TO3 = 32.37;
const Y_2X2 = -1.92;
const Y_3TO1 = -36.25;

export const LinksModule = () => (
  <EurorackPCB width={20} height={115}>
    <EurorackPowerInput name="PWR" pcbY={Y_PWR} />
    <BufferedMult pcbY={Y_1TO3} />
    <UtilitySum2x2 pcbY={Y_2X2} />
    <SumMixer3to1 pcbY={Y_3TO1} />
  </EurorackPCB>
);

export default LinksModule;
