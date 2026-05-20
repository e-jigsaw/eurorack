import type { ChipProps } from "tscircuit"

const pinLabels = {
  pin1: "OUT_A",
  pin2: "IN_A_NEG",
  pin3: "IN_A_POS",
  pin4: "VEE",
  pin5: "IN_B_POS",
  pin6: "IN_B_NEG",
  pin7: "OUT_B",
  pin8: "VCC",
} as const

export type TL072Props = ChipProps<typeof pinLabels>

export const TL072 = (props: TL072Props) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    footprint="tssop8_p0.65mm"
    manufacturerPartNumber="TL072CPW"
    pinAttributes={{
      VCC: { requiresPower: true },
      VEE: { requiresPower: true },
    }}
  />
)

export default TL072
