// Sibling imports use the "../<block>/" specifier form: @tscircuit/eval caches
// modules by raw specifier string, so a bare "./amp.tsx" would collide with
// other blocks' same-named files when several blocks load in one eval session.
import { SumMixerAmp } from "../sum-mixer/amp.tsx";
import { SumMixerBuffer } from "../sum-mixer/buffer.tsx";
import { SumMixerInput } from "../sum-mixer/input.tsx";
import { SumMixerOutput } from "../sum-mixer/output.tsx";
import { InterconnectHeader1x6 } from "../../../../primitives/headers/interconnect-header.tsx";
import { SM_PINS, HEADER_Y_LOCAL, mainPinOrder } from "../../interconnect.ts";
import { CLEARANCE, FAB_ROUTING_PROPS } from "../../../../primitives/pcb/fab-limits.ts";

export interface SumMixerMainProps {
  pcbX?: number;
  pcbY?: number;
}

/** Main-board half: mixing circuitry + LED series resistor + female socket. */
export const SumMixerMain = ({ pcbX, pcbY }: SumMixerMainProps = {}) => (
  <subcircuit
    name="SM"
    pcbX={pcbX}
    pcbY={pcbY}
    {...FAB_ROUTING_PROPS}
    autorouter={{ preset: "sequential_trace", traceClearance: CLEARANCE }}
  >
    {/* Declared explicitly so nested group references reuse one net (lazy-create race) */}
    <net name="GND" />
    <net name="VCC" />
    <net name="VEE" />

    <SumMixerInput name="input" pcbY={8} />
    <SumMixerAmp name="amp" />
    {/* output sits low, just above the header: OUT_B's descent runs down
        the center column to R.pin1, and the buffer's IN_POS tap branches
        from that same pad going up-west — putting R below the tap point
        keeps the tap from crossing the OUT descent. */}
    <SumMixerOutput name="output" pcbX={-1.5} pcbY={-15} />
    {/* buf + R_led sit south-west, near the header's LED pad — the east
        side carries the IN_A/IN_B/IN_C ascents and the center column the
        OUT_B descent, so the LED chain gets the west. */}
    <SumMixerBuffer name="buf" pcbX={-4.4} pcbY={-11.5} />
    <resistor name="R_led" resistance="1k" footprint="0603" pcbX={-7.5} pcbY={-11.8} pcbRotation={90} />
    <InterconnectHeader1x6
      name="HDR"
      gender="female"
      pinLabels={mainPinOrder(SM_PINS)}
      pcbY={HEADER_Y_LOCAL}
    />

    {/* IN_B_POS ground stitch routed first (before the south side fills up
        with the output/buffer/LED traces below) — it's a short local hop
        from the chip's south row to C8's GND pad, and the sequential
        router needs the clear channel while it's still empty. */}
    <trace from=".amp > .IC4 > .IN_B_POS" to=".amp > .C8 > .pin2" />

    {/* header → input summing resistors → amp SUM node.
        The SUM hop is short (IN_A_NEG faces north, toward the input unit)
        and listed first so it routes before the header feeds wall it in
        (document order = routing order). */}
    <trace from=".input > .R_A > .pin2" to=".amp > .IC4 > .IN_A_NEG" />
    <trace from=".HDR > .IN_C" to=".input > .R_C > .pin1" />
    <trace from=".HDR > .IN_B" to=".input > .R_B > .pin1" />
    <trace from=".HDR > .IN_A" to=".input > .R_A > .pin1" />

    {/* amp OUT_B → output resistor + buffer. OUT_B faces south (chip
        rotated for it); the buffer taps the pre-resistor node at R.pin1
        (same net) so OUT_B itself stays at ≤2 traces. */}
    <trace from=".amp > .IC4 > .OUT_B" to=".output > .R > .pin1" />
    <trace from=".output > .R > .pin1" to=".buf > .IC > .IN_POS" />

    {/* output resistor → header */}
    <trace from=".output > .R > .pin2" to=".HDR > .OUT" />

    {/* LED drive: buffered, current-limited before crossing the header.
        R_led is vertical: north pad (pin2) faces the buffer output, south
        pad (pin1) faces the header's LED pin. */}
    <trace from=".buf > .IC > .OUT" to=".R_led > .pin2" />
    <trace from=".R_led > .pin1" to=".HDR > .LED" />

    {/* GND stitches (all one net) — IN_B_POS's own stitch to C8's GND pad
        is routed first (above); the header's GND pin picks the net up
        from the VCC-cap GND pad. net.GND itself is anchored inside the
        amp unit (C8/C10 GND pads) — an explicit anchor here would sweep
        along the board edge. The C_VEE→C10 run ties the buffer/header
        ground group to the amp's net.GND-anchored pads: without that
        copper they are two disjoint islands (and the header pin is this
        block's only ground return to the control board). */}
    <trace from=".buf > .C_VEE > .pin2" to=".amp > .C10 > .pin2" />
    <trace from=".buf > .C_VCC > .pin2" to=".HDR > .GND" />
  </subcircuit>
);

export default SumMixerMain;
