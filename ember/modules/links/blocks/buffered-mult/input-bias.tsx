/**
 * Input bias resistor (10M to GND). Provides high-Z pulldown for floating inputs.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   signal side → `.bias > .R > .pin1` (other side hardwired to net.GND)
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
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <resistor name="R" resistance={resistance} footprint="0603" pcbX={0} pcbY={0} />
    <trace from=".R > .pin2" to="net.GND" />
  </group>
);

export default BufferedMultInputBias;
