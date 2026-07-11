import type { HeaderPins } from "../../modules/links/interconnect.ts";

// Kept as named constants (rather than literals repeated below and inside
// `footprint`) so the pitch/hole/plated-diameter props and the footprint
// string can't silently drift apart.
const PITCH = "2.54mm";
const HOLE_DIAMETER = "1mm";
const PLATED_DIAMETER = "1.7mm";

export interface InterconnectHeader1x6Props {
  name: string;
  /** male on the control board (rear-mounted), female socket on the main board */
  gender: "male" | "female";
  pinLabels: HeaderPins | string[];
  pcbX?: number;
  pcbY?: number;
  /**
   * Both boards face the panel with their component side, so the control
   * board's male header must mount on its rear face (layer="bottom") for the
   * pins to reach the main board. The side-flip mirrors the label→hole
   * mapping, which is what mates with the main side's mainPinOrder reversal.
   */
  layer?: "top" | "bottom";
}

export const InterconnectHeader1x6 = ({
  name,
  gender,
  pinLabels,
  pcbX = 0,
  pcbY = 0,
  layer = "top",
}: InterconnectHeader1x6Props) => (
  <pinheader
    name={name}
    pinCount={6}
    pitch={PITCH}
    gender={gender}
    pcbOrientation="horizontal"
    holeDiameter={HOLE_DIAMETER}
    platedDiameter={PLATED_DIAMETER}
    footprint={`pinrow6_p${PITCH}_id${HOLE_DIAMETER}_od${PLATED_DIAMETER}_${gender}`}
    showSilkscreenPinLabels
    pinLabels={[...pinLabels]}
    pcbX={pcbX}
    pcbY={pcbY}
    layer={layer}
  />
);

export default InterconnectHeader1x6;
