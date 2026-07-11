/**
 * Single 51Ω series output resistor.
 *
 * External wiring uses through-selectors:
 *   SRC → .output > .R_out > .pin1
 *   OUT → .output > .R_out > .pin2
 */
export interface SumMixerOutputProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  resistance?: string;
}

export const SumMixerOutput = ({
  name = "output",
  pcbX = 0,
  pcbY = -7,
  resistance = "51",
}: SumMixerOutputProps = {}) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <resistor name="R_out" resistance={resistance} footprint="0603" pcbX={0} pcbY={0} />
  </group>
);

export default SumMixerOutput;
