/**
 * Input bias resistor (10M to GND). Provides high-Z pulldown for floating inputs.
 *
 * Ports (via `connections`):
 *   IO → R.pin1 (signal side; other side hardwired to net.GND)
 */
export interface BufferedMultInputBiasProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  resistance?: string;
}

export const BufferedMultInputBias = ({
  name = "bias",
  pcbX = -2.6,
  pcbY = 5,
  resistance = "10M",
}: BufferedMultInputBiasProps = {}) => (
  <group
    name={name}
    pcbX={pcbX}
    pcbY={pcbY}
    showAsSchematicBox
    connections={{ IO: ".R > .pin1" }}
  >
    <resistor name="R" resistance={resistance} footprint="0603" pcbX={0} pcbY={0} />
    <trace from=".R > .pin2" to="net.GND" />
  </group>
);

export default BufferedMultInputBias;
