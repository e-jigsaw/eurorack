/**
 * 3× independent 51Ω series output resistors.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   channel A: src → `.outputs > .R_A > .pin1`, out → `.outputs > .R_A > .pin2`
 *   channel B: src → `.outputs > .R_B > .pin1`, out → `.outputs > .R_B > .pin2`
 *   channel C: src → `.outputs > .R_C > .pin1`, out → `.outputs > .R_C > .pin2`
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
    <resistor name="R_A" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={5} />
    <resistor name="R_B" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={-5} />
    <resistor name="R_C" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={-5} />
  </group>
);

export default BufferedMultOutputs;
