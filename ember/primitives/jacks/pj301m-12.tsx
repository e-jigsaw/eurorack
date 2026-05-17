import type { ChipProps } from "tscircuit"

const pinLabels = {
  pin1: "TIP",
  pin2: ["NORM_TIP", "SWITCH"],
  pin3: ["SLEEVE", "GND"],
} as const

export type PJ301M12Props = ChipProps<typeof pinLabels>

export const PJ301M12 = (props: PJ301M12Props) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    manufacturerPartNumber="PJ301M-12"
    footprint={
      <footprint>
        <platedhole
          portHints={["pin1", "TIP"]}
          pcbX={0}
          pcbY={-4.92}
          shape="circle"
          holeDiameter={1.6}
          outerDiameter={1.8}
        />
        <platedhole
          portHints={["pin2", "NORM_TIP"]}
          pcbX={0}
          pcbY={3.38}
          shape="circle"
          holeDiameter={1.6}
          outerDiameter={1.8}
        />
        <platedhole
          portHints={["pin3", "SLEEVE"]}
          pcbX={0}
          pcbY={6.48}
          shape="circle"
          holeDiameter={1.6}
          outerDiameter={1.8}
        />
        <hole diameter={3} pcbX={0} pcbY={0} />
        <silkscreenrect pcbX={0} pcbY={0} width={9} height={9} />
      </footprint>
    }
  />
)

export default PJ301M12
