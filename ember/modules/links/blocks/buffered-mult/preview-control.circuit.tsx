import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { BufferedMultControl } from "./control.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <BufferedMultControl />
  </EurorackPCB>
);
