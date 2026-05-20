/**
 * Input section: pair of 100k summing resistors that mix two inputs into
 * a single inverting-input node.
 *
 * Ports (created via `connections`):
 *   IN_A → R_A.pin1
 *   IN_B → R_B.pin1
 *   SUM  → R_A.pin2 (== R_B.pin2, shared)
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
  <group
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    showAsSchematicBox
    connections={{
      IN_A: ".R_A > .pin1",
      IN_B: ".R_B > .pin1",
      SUM:  ".R_A > .pin2",
    }}
  >
    <resistor name="R_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={0} />
    <resistor name="R_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={0} />
    {/* SUM node: both east pins shorted */}
    <trace from=".R_A > .pin2" to=".R_B > .pin2" />
  </group>
);

export default UtilitySumInput;
