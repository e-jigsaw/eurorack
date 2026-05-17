import type { ChipProps } from "tscircuit"

const pinLabels = {
  pin1: "OUT_A",
  pin2: "IN_A_NEG",
  pin3: "IN_A_POS",
  pin4: "VCC",
  pin5: "IN_B_POS",
  pin6: "IN_B_NEG",
  pin7: "OUT_B",
  pin8: "OUT_C",
  pin9: "IN_C_NEG",
  pin10: "IN_C_POS",
  pin11: "VEE",
  pin12: "IN_D_POS",
  pin13: "IN_D_NEG",
  pin14: "OUT_D",
} as const

export type OPA4171Props = ChipProps<typeof pinLabels>

export const OPA4171 = (props: OPA4171Props) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    footprint="tssop14"
    manufacturerPartNumber="OPA4171AIPW"
    pinAttributes={{
      VCC: { requiresPower: true },
      VEE: { requiresPower: true },
    }}
  />
)

export default OPA4171
