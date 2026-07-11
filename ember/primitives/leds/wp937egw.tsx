export interface WP937EGWProps {
  name: string
  color?: "red" | "green"
  pcbX?: number
  pcbY?: number
  pcbRotation?: number
  connections?: {
    pin1?: string
    anode?: string
    pin2?: string
    cathode?: string
  }
}

export const WP937EGW = ({
  name,
  color = "green",
  pcbX,
  pcbY,
  pcbRotation,
  connections,
}: WP937EGWProps) => (
  <led
    name={name}
    color={color}
    pcbX={pcbX}
    pcbY={pcbY}
    pcbRotation={pcbRotation}
    connections={connections}
    footprint={
      <footprint>
        <platedhole
          portHints={["pin1", "anode"]}
          pcbX={-1.27}
          pcbY={0}
          shape="circle"
          holeDiameter={0.8}
          outerDiameter={1.6}
        />
        <platedhole
          portHints={["pin2", "cathode"]}
          pcbX={1.27}
          pcbY={0}
          shape="circle"
          holeDiameter={0.8}
          outerDiameter={1.6}
        />
        {/* Assembly silk on the bottom (solder-side) face, like the jacks —
           the top face is hidden behind the panel. Straight bar = cathode. */}
        <silkscreencircle pcbX={0} pcbY={0} radius={1.5} layer="bottom" />
        <silkscreenline
          x1={1.9}
          y1={-1.1}
          x2={1.9}
          y2={1.1}
          strokeWidth={0.25}
          layer="bottom"
        />
      </footprint>
    }
  />
)

export default WP937EGW
