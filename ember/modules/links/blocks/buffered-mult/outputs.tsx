/**
 * 3× independent 51Ω series output resistors.
 *
 * External wiring uses through-selectors:
 *   SRC_A/OUT_A → .outputs > .R_out_A > .pin1 / .pin2
 *   SRC_B/OUT_B → .outputs > .R_out_B > .pin1 / .pin2
 *   SRC_C/OUT_C → .outputs > .R_out_C > .pin1 / .pin2
 */
export interface BufferedMultOutputsProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  resistance?: string;
}

export const BufferedMultOutputs = ({
  name = "outputs",
  pcbX = 0,
  pcbY = 0,
  resistance = "51",
}: BufferedMultOutputsProps = {}) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    {/* Channel A → J2 (NE), B → J3 (SW), C → J4 (SE) */}
    <resistor name="R_out_A" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={5} />
    <resistor name="R_out_B" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={-5} />
    <resistor name="R_out_C" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={-5} />
  </group>
);

export default BufferedMultOutputs;
