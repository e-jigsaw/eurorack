import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { SumMixerMain } from "../sum-mixer/main.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <SumMixerMain />
  </EurorackPCB>
);
