import { EurorackPCB } from "./primitives/pcb/eurorack-pcb"
import { EurorackPowerInput } from "./primitives/power/eurorack-power-input"

export default () => (
  <EurorackPCB>
    <EurorackPowerInput name="PWR" />

    {/* dummy TL072 (SOIC-8) — VCC=pin8, VEE=pin4 */}
    <chip
      name="U1"
      footprint="soic8"
      pinLabels={{
        pin1: "OUT_A",
        pin2: "IN_A_NEG",
        pin3: "IN_A_POS",
        pin4: "VEE",
        pin5: "IN_B_POS",
        pin6: "IN_B_NEG",
        pin7: "OUT_B",
        pin8: "VCC",
      }}
      pinAttributes={{
        VCC: { requiresPower: true },
        VEE: { requiresPower: true },
      }}
      connections={{ VCC: "net.VCC", VEE: "net.VEE" }}
    />

    <capacitor
      name="C_DEC_VCC"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="U1.VCC"
      decouplingTo="net.GND"
    />
    <capacitor
      name="C_DEC_VEE"
      capacitance="100nF"
      footprint="0603"
      decouplingFor="U1.VEE"
      decouplingTo="net.GND"
    />
  </EurorackPCB>
)
