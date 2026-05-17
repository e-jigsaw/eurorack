import { DoepferHeader } from "./doepfer-header"

export interface EurorackPowerInputProps {
  name?: string
}

export const EurorackPowerInput = ({ name = "PWR" }: EurorackPowerInputProps) => (
  <subcircuit name={name}>
    <DoepferHeader name="JP1" />

    <diode
      name="D1"
      footprint="sod123"
      manufacturerPartNumber="1N5819HW-7-F"
      connections={{ anode: "net.VEE", cathode: "net.VEE_RAW" }}
    />
    <diode
      name="D2"
      footprint="sod123"
      manufacturerPartNumber="1N5819HW-7-F"
      connections={{ anode: "net.VCC_RAW", cathode: "net.VCC" }}
    />

    <capacitor
      name="C1"
      capacitance="47uF"
      maxVoltageRating="25V"
      footprint="0805"
      polarized
      connections={{ pin1: "net.VCC", pin2: "net.GND" }}
    />
    <capacitor
      name="C2"
      capacitance="47uF"
      maxVoltageRating="25V"
      footprint="0805"
      polarized
      connections={{ pin1: "net.GND", pin2: "net.VEE" }}
    />

    <trace from=".JP1 > .VEE_A" to="net.VEE_RAW" />
    <trace from=".JP1 > .VEE_B" to="net.VEE_RAW" />
    <trace from=".JP1 > .GND_A" to="net.GND" />
    <trace from=".JP1 > .GND_B" to="net.GND" />
    <trace from=".JP1 > .GND_C" to="net.GND" />
    <trace from=".JP1 > .GND_D" to="net.GND" />
    <trace from=".JP1 > .GND_E" to="net.GND" />
    <trace from=".JP1 > .GND_F" to="net.GND" />
    <trace from=".JP1 > .VCC_A" to="net.VCC_RAW" />
    <trace from=".JP1 > .VCC_B" to="net.VCC_RAW" />
  </subcircuit>
)

export default EurorackPowerInput
