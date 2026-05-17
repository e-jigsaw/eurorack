export interface WP937EGWProps {
  name: string
  color?: "red" | "green"
  pcbX?: number
  pcbY?: number
  pcbRotation?: number
}

export const WP937EGW = ({
  name,
  color = "green",
  pcbX,
  pcbY,
  pcbRotation,
}: WP937EGWProps) => (
  <led
    name={name}
    color={color}
    pcbX={pcbX}
    pcbY={pcbY}
    pcbRotation={pcbRotation}
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
        <silkscreencircle pcbX={0} pcbY={0} radius={1.5} />
      </footprint>
    }
  />
)

export default WP937EGW
