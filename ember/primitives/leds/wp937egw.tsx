export interface WP937EGWProps {
  name: string
  color?: "red" | "green"
  pcbX?: number
  pcbY?: number
  pcbRotation?: number
  schX?: number
  schY?: number
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
  schX,
  schY,
  connections,
}: WP937EGWProps) => (
  <led
    name={name}
    color={color}
    pcbX={pcbX}
    pcbY={pcbY}
    pcbRotation={pcbRotation}
    schX={schX}
    schY={schY}
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
        {/* Silk on the component face. Straight bar = cathode. */}
        <silkscreencircle pcbX={0} pcbY={0} radius={1.5} />
        <silkscreenline
          x1={1.9}
          y1={-1.1}
          x2={1.9}
          y2={1.1}
          strokeWidth={0.25}
        />
      </footprint>
    }
  />
)

export default WP937EGW
