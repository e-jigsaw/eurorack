import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { BufferedMultMain } from "../buffered-mult/main.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <BufferedMultMain />
  </EurorackPCB>
);
