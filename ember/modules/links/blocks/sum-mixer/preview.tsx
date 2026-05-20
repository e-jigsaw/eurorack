import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { SumMixer3to1 } from "./index.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <SumMixer3to1 />
  </EurorackPCB>
);
