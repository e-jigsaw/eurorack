import type { HeaderPins } from "../../modules/links/interconnect";

export interface InterconnectHeader1x6Props {
  name: string;
  /** male on the control board (back side pins), female socket on the main board */
  gender: "male" | "female";
  pinLabels: HeaderPins | string[];
  pcbX?: number;
  pcbY?: number;
}

export const InterconnectHeader1x6 = ({
  name,
  gender,
  pinLabels,
  pcbX = 0,
  pcbY = 0,
}: InterconnectHeader1x6Props) => (
  <pinheader
    name={name}
    pinCount={6}
    pitch="2.54mm"
    gender={gender}
    pcbOrientation="horizontal"
    holeDiameter="1mm"
    platedDiameter="1.7mm"
    footprint="pinrow6_p2.54mm_id1mm_od1.7mm"
    showSilkscreenPinLabels
    pinLabels={[...pinLabels]}
    pcbX={pcbX}
    pcbY={pcbY}
  />
);

export default InterconnectHeader1x6;
