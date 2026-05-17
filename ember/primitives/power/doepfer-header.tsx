import type { ChipProps } from "tscircuit"

const pinLabels = {
  pin1: "VEE_A",
  pin2: "VEE_B",
  pin3: "GND_A",
  pin4: "GND_B",
  pin5: "GND_C",
  pin6: "GND_D",
  pin7: "GND_E",
  pin8: "GND_F",
  pin9: "VCC_A",
  pin10: "VCC_B",
} as const

const PITCH = 2.54

const pinXY = (pin: number): { x: number; y: number } => {
  const idx = pin - 1
  const col = idx % 2
  const row = Math.floor(idx / 2)
  return {
    x: col === 0 ? -PITCH / 2 : PITCH / 2,
    y: (row - 2) * PITCH,
  }
}

export type DoepferHeaderProps = ChipProps<typeof pinLabels>

export const DoepferHeader = (props: DoepferHeaderProps) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    manufacturerPartNumber="67996-410HLF"
    footprint={
      <footprint>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => {
          const { x, y } = pinXY(p)
          return (
            <platedhole
              key={p}
              portHints={[`pin${p}`]}
              pcbX={x}
              pcbY={y}
              shape="circle"
              holeDiameter={1.0}
              outerDiameter={1.7}
            />
          )
        })}
        <silkscreenrect pcbX={0} pcbY={0} width={12.7} height={8.38} />
        <silkscreentext
          text="1"
          pcbX={-PITCH / 2 - 1.5}
          pcbY={-PITCH * 2}
          fontSize={0.8}
        />
      </footprint>
    }
  />
)

export default DoepferHeader
