/**
 * Output section: pair of 51Ω series resistors from a shared source to two
 * separate output jacks.
 *
 * External wiring uses through-selectors:
 *   SRC   → .output > .R_out_A > .pin1  (shared with R_out_B.pin1)
 *   OUT_A → .output > .R_out_A > .pin2
 *   OUT_B → .output > .R_out_B > .pin2
 */
export interface UtilitySumOutputProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  resistance?: string;
}

export const UtilitySumOutput = ({
  name = "output",
  pcbX = 0,
  pcbY = -7,
  resistance = "51",
}: UtilitySumOutputProps = {}) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <resistor name="R_out_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={0} />
    <resistor name="R_out_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={0} />
    <trace from=".R_out_A > .pin1" to=".R_out_B > .pin1" />
  </group>
);

export default UtilitySumOutput;
