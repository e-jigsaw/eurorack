import { EurorackPCB } from "./primitives/pcb/eurorack-pcb"
import { PJ301M12 } from "./primitives/jacks/pj301m-12"

export default () => (
  <EurorackPCB>
    <PJ301M12 name="J1" />
  </EurorackPCB>
)
