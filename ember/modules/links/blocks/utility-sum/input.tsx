/**
 * Input section: pair of 100k summing resistors that mix two inputs into
 * a single inverting-input node.
 *
 * External wiring uses through-selectors:
 *   IN_A → .input > .R_in_A > .pin1
 *   IN_B → .input > .R_in_B > .pin1
 *   SUM  → .input > .R_in_A > .pin2  (== R_in_B.pin2, shared)
 */
export interface UtilitySumInputProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  resistance?: string;
}

export const UtilitySumInput = ({
  name = "input",
  pcbX = 0,
  pcbY = 7,
  resistance = "100k",
}: UtilitySumInputProps = {}) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    {/* Placed north of the input jacks (jack bushing center Y=+5.85, r=3.6mm)
       so traces from J5/J6 TIPs can detour around the bushings without
       getting trapped. */}
    <resistor name="R_in_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={5} />
    <resistor name="R_in_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={5} />
    <trace from=".R_in_A > .pin2" to=".R_in_B > .pin2" />
  </group>
);

export default UtilitySumInput;
