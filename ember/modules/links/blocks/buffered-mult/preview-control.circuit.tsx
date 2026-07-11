import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { BufferedMultControl } from "../buffered-mult/control.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <BufferedMultControl />
  </EurorackPCB>
);
