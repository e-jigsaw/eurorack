/**
 * Input section: three 100k summing resistors that mix three inputs into
 * a single inverting-input node.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   IN_A → `.input > .R_A > .pin1`
 *   IN_B → `.input > .R_B > .pin1`
 *   IN_C → `.input > .R_C > .pin1`
 *   SUM  → `.input > .R_A > .pin2` (== `.R_B > .pin2` == `.R_C > .pin2`, shorted internally)
 */
export interface SumMixerInputProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  resistance?: string;
}

export const SumMixerInput = ({
  name = "input",
  pcbX = 0,
  pcbY = 8,
  resistance = "100k",
}: SumMixerInputProps = {}) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    {/* R_A/R_B in the south row (directly above the amp), R_C centered in a
        second row north of them — the header feeds arrive from the east and
        cross above the rows, so stacking rows keeps all pin1s reachable
        without threading between the summed pin2s. */}
    <resistor name="R_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={0} />
    <resistor name="R_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={0} />
    <resistor name="R_C" resistance={resistance} footprint="0603" pcbX={0} pcbY={2.7} />
    {/* SUM node: all pin2s shorted. R_C ties in via R_B so no single pad
        carries more than two traces (R_A.pin2 still has to host the block's
        hop down to the amp's IN_A_NEG). */}
    <trace from=".R_A > .pin2" to=".R_B > .pin2" />
    <trace from=".R_C > .pin2" to=".R_B > .pin2" />
  </group>
);

export default SumMixerInput;
