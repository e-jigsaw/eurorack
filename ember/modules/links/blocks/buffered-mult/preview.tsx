import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { BufferedMult } from "./index.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <BufferedMult />
  </EurorackPCB>
);
