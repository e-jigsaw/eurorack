/**
 * Single 51Ω series output resistor.
 *
 * Ports (via `connections`):
 *   SRC → R.pin1
 *   OUT → R.pin2
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
  <group
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    showAsSchematicBox
    connections={{
      SRC: ".R > .pin1",
      OUT: ".R > .pin2",
    }}
  >
    <resistor name="R" resistance={resistance} footprint="0603" pcbX={0} pcbY={0} />
  </group>
);

export default SumMixerOutput;
