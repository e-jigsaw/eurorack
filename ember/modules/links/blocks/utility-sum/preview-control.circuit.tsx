import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { UtilitySumControl } from "../utility-sum/control.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <UtilitySumControl />
  </EurorackPCB>
);
