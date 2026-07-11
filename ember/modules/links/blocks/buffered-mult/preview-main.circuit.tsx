import { EurorackPCB } from "../../../../primitives/pcb/eurorack-pcb.tsx";
import { BufferedMultMain } from "./main.tsx";

export default () => (
  <EurorackPCB width={20} height={50}>
    <BufferedMultMain />
  </EurorackPCB>
);
