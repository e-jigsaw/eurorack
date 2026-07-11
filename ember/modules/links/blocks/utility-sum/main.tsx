import { UtilitySumAmp } from "./amp.tsx";
import { UtilitySumBuffer } from "./buffer.tsx";
import { UtilitySumInput } from "./input.tsx";
import { UtilitySumOutput } from "./output.tsx";
import { InterconnectHeader1x6 } from "../../../../primitives/headers/interconnect-header.tsx";
import { US_PINS, HEADER_Y_LOCAL, mainPinOrder } from "../../interconnect.ts";

export interface UtilitySumMainProps {
  pcbX?: number;
  pcbY?: number;
}

/** Main-board half: summing circuitry + LED series resistor + female socket. */
export const UtilitySumMain = ({ pcbX, pcbY }: UtilitySumMainProps = {}) => (
  <subcircuit name="US" pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    {/* Declared explicitly so nested group references reuse one net (lazy-create race) */}
    <net name="GND" />
    <net name="VCC" />
    <net name="VEE" />

    <UtilitySumInput name="input" pcbY={8} />
    <UtilitySumAmp name="amp" />
    <UtilitySumOutput name="output" pcbY={-8} />
    {/* buf + R_led sit south-west, near the header's LED pad — the east
        side carries the IN_A/IN_B ascents and OUT_A descent, the center
        column the OUT_B descent, so the LED chain gets the west. buf's x
        puts IN_POS directly below R_D.pin1 for a straight tap. */}
    <UtilitySumBuffer name="buf" pcbX={-4.4} pcbY={-11.5} />
    <resistor name="R_led" resistance="1k" footprint="0603" pcbX={-7.5} pcbY={-12} pcbRotation={90} />
    <InterconnectHeader1x6
      name="HDR"
      gender="female"
      pinLabels={mainPinOrder(US_PINS)}
      pcbY={HEADER_Y_LOCAL}
    />

    {/* header → input summing resistors → amp SUM node.
        The SUM hop is short (IN_A_NEG faces north, toward the input unit)
        and listed first so it routes before the header feeds wall it in
        (document order = routing order). */}
    <trace from=".input > .R_A > .pin2" to=".amp > .IC2 > .IN_A_NEG" />
    <trace from=".HDR > .IN_A" to=".input > .R_A > .pin1" />
    <trace from=".HDR > .IN_B" to=".input > .R_B > .pin1" />

    {/* amp OUT_B → output resistors (R_C.pin1 == R_D.pin1, unit 内で短絡済) + buffer.
        OUT_B faces south (chip rotated for it) so both hops are short:
        down-west to R_D.pin1, and on down to the buffer input. */}
    <trace from=".amp > .IC2 > .OUT_B" to=".output > .R_D > .pin1" />
    <trace from=".output > .R_D > .pin1" to=".buf > .IC > .IN_POS" />

    {/* output resistors → header */}
    <trace from=".output > .R_C > .pin2" to=".HDR > .OUT_A" />
    <trace from=".output > .R_D > .pin2" to=".HDR > .OUT_B" />

    {/* LED drive: buffered, current-limited before crossing the header.
        R_led is vertical: north pad (pin2) faces the buffer output, south
        pad (pin1) faces the header's LED pin. */}
    <trace from=".buf > .IC > .OUT" to=".R_led > .pin2" />
    <trace from=".R_led > .pin1" to=".HDR > .LED" />

    {/* GND stitches (all one net) — IN_B_POS reaches ground at C5's GND
        pad just east of it, and the header's GND pin picks the net up
        from the VCC-cap GND pad. net.GND itself is anchored inside the
        amp unit (C5/C7 GND pads) — an explicit anchor here would sweep
        along the board edge. */}
    <trace from=".amp > .IC2 > .IN_B_POS" to=".amp > .C5 > .pin2" />
    <trace from=".buf > .C_VCC > .pin2" to=".HDR > .GND" />
  </subcircuit>
);

export default UtilitySumMain;
