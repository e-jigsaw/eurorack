/**
 * Output section: single 51Ω series resistor from the amp's output to the
 * interconnect header.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   SRC → `.output > .R > .pin1`
 *   OUT → `.output > .R > .pin2`
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
    <resistor name="R" resistance={resistance} footprint="0603" pcbX={0} pcbY={0} />
  </group>
);

export default SumMixerOutput;
