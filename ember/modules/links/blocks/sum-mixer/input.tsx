/**
 * 3-input summing resistor bank.
 *
 * External wiring uses through-selectors:
 *   IN_A → .input > .R_in_A > .pin1
 *   IN_B → .input > .R_in_B > .pin1
 *   IN_C → .input > .R_in_C > .pin1
 *   SUM  → .input > .R_in_A > .pin2  (shared east node)
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
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    {/* A/B placed north of jacks J9/J10 (bushing center Y=+5.85, r=3.6mm) so
       J*.TIP→R.pin1 traces can detour around the bushings. C placed near
       south jack J11 but off the X=-5 column to dodge that bushing too. */}
    <resistor name="R_in_A" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={12} />
    <resistor name="R_in_B" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={12} />
    <resistor name="R_in_C" resistance={resistance} footprint="0603"
      pcbX={-2.5} pcbY={-3} pcbRotation={90} />
    <trace from=".R_in_A > .pin2" to=".R_in_B > .pin2" />
    <trace from=".R_in_A > .pin2" to=".R_in_C > .pin2" />
  </group>
);

export default SumMixerInput;
