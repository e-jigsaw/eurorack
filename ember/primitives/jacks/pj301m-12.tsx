import type { ChipProps } from "tscircuit";

const pinLabels = {
  pin1: "TIP",
  pin2: ["NORM_TIP", "SWITCH"],
  pin3: ["SLEEVE", "GND"],
} as const;

export type PJ301M12Props = ChipProps<typeof pinLabels>;

export const PJ301M12 = (props: PJ301M12Props) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    manufacturerPartNumber="PJ301M-12"
    footprint={
      <footprint>
        <silkscreencircle radius={3.6} pcbX={0} pcbY={-0.5} layer="bottom" />

        <platedhole
          portHints={["pin1", "TIP"]}
          pcbX={0}
          pcbY={-4.8}
          shape="circle"
          holeDiameter={1.6}
          outerDiameter={2}
        />

        <platedhole
          portHints={["pin2", "NORM_TIP"]}
          pcbX={0}
          pcbY={3.3}
          shape="circle"
          holeDiameter={1.6}
          outerDiameter={2}
        />

        <platedhole
          portHints={["pin3", "SLEEVE"]}
          pcbX={0}
          pcbY={5.7}
          shape="circular_hole_with_rect_pad"
          holeDiameter={1.6}
          rectPadWidth={2}
          rectPadHeight={2}
        />

        <silkscreenrect pcbX={0} pcbY={-0.4} width={9.8} height={10.9} layer="bottom" />
      </footprint>
    }
  />
);

export default PJ301M12;
