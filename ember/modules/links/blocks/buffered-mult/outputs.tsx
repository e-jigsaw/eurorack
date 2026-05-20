/**
 * 3× independent 51Ω series output resistors.
 *
 * Ports (via `connections`):
 *   SRC_A → R_A.pin1,  OUT_A → R_A.pin2
 *   SRC_B → R_B.pin1,  OUT_B → R_B.pin2
 *   SRC_C → R_C.pin1,  OUT_C → R_C.pin2
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
  <group
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    showAsSchematicBox
    connections={{
      SRC_A: ".R_A > .pin1",
      OUT_A: ".R_A > .pin2",
      SRC_B: ".R_B > .pin1",
      OUT_B: ".R_B > .pin2",
      SRC_C: ".R_C > .pin1",
      OUT_C: ".R_C > .pin2",
    }}
  >
    {/* Channel A → J2 (NE), B → J3 (SW), C → J4 (SE) */}
    <resistor name="R_A" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={5} />
    <resistor name="R_B" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={-5} />
    <resistor name="R_C" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={-5} />
  </group>
);

export default BufferedMultOutputs;
