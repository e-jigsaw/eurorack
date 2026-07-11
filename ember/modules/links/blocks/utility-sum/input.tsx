/**
 * Input section: pair of 100k summing resistors that mix two inputs into
 * a single inverting-input node.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   IN_A → `.input > .R_A > .pin1`
 *   IN_B → `.input > .R_B > .pin1`
 *   SUM  → `.input > .R_A > .pin2` (== `.R_B > .pin2`, shorted internally)
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
    <resistor name="R_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={0} />
    <resistor name="R_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={0} />
    {/* SUM node: both east pins shorted */}
    <trace from=".R_A > .pin2" to=".R_B > .pin2" />
  </group>
);

export default UtilitySumInput;
