import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { UtilitySumControl } from "./control.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <UtilitySumControl />
  </EurorackPCB>
);
