import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { SumMixerControl } from "./control.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <SumMixerControl />
  </EurorackPCB>
);
