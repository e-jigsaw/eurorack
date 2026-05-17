import { PJ301M12 } from "./pj301m-12.tsx"
import type { PJ301M12Props } from "./pj301m-12.tsx"

// High-level Eurorack jack wrapper. The default ("mono") maps to the
// PJ301M-12 (Thonkiconn) 3.5 mm vertical mono switching jack. Future
// types (stereo, switched stereo, panel-mount Switchcraft, etc.) will
// dispatch to other primitive implementations under this same name.
export type EurorackJackType = "mono"

export type EurorackJackProps = PJ301M12Props & {
  type?: EurorackJackType
}

export const EurorackJack = ({ type = "mono", ...rest }: EurorackJackProps) => {
  if (type === "mono") return <PJ301M12 {...rest} />
  // Exhaustive guard (future stereo etc.)
  return null
}

export default EurorackJack
