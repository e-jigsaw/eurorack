import type { ChipProps } from "tscircuit"

const pinLabels = {
  pin1: "OUT",
  pin2: "VEE",
  pin3: "IN_POS",
  pin4: "IN_NEG",
  pin5: "VCC",
} as const

export type LM321Props = ChipProps<typeof pinLabels>

export const LM321 = (props: LM321Props) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    footprint="sot23_5"
    manufacturerPartNumber="LM321MFX/NOPB"
    pinAttributes={{
      VCC: { requiresPower: true },
      VEE: { requiresPower: true },
    }}
  />
)

export default LM321
