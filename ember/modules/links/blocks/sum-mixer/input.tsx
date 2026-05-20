/**
 * 3-input summing resistor bank.
 *
 * Ports (via `connections`):
 *   IN_A → R_A.pin1
 *   IN_B → R_B.pin1
 *   IN_C → R_C.pin1
 *   SUM  → R_A.pin2 (shared east node)
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
  pcbY = 0,
  resistance = "100k",
}: SumMixerInputProps = {}) => (
  <group
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    showAsSchematicBox
    connections={{
      IN_A: ".R_A > .pin1",
      IN_B: ".R_B > .pin1",
      IN_C: ".R_C > .pin1",
      SUM:  ".R_A > .pin2",
    }}
  >
    {/* Two near input jacks (north), one near third input jack (south) */}
    <resistor name="R_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={5.7} />
    <resistor name="R_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={5.7} />
    <resistor name="R_C" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={-5.7} />
    <trace from=".R_A > .pin2" to=".R_B > .pin2" />
    <trace from=".R_A > .pin2" to=".R_C > .pin2" />
  </group>
);

export default SumMixerInput;
