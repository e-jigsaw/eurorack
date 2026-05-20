/**
 * Output section: pair of 51Ω series resistors from a shared signal source
 * to two separate output jacks.
 *
 * Ports (created via `connections`):
 *   SRC   → R_A.pin1 (== R_B.pin1, shared)
 *   OUT_A → R_A.pin2
 *   OUT_B → R_B.pin2
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
  <group
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    showAsSchematicBox
    connections={{
      SRC:   ".R_A > .pin1",
      OUT_A: ".R_A > .pin2",
      OUT_B: ".R_B > .pin2",
    }}
  >
    <resistor name="R_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={0} />
    <resistor name="R_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={0} />
    <trace from=".R_A > .pin1" to=".R_B > .pin1" />
  </group>
);

export default UtilitySumOutput;
