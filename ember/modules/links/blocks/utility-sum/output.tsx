/**
 * Output section: pair of 51Ω series resistors from a shared signal source
 * to two separate output jacks.
 *
 * Named R_C/R_D (not R_A/R_B) to avoid a refdes collision with the R_A/R_B
 * pair in the input section — both units are siblings under one PCB scope
 * (groups don't get their own namespace, unlike subcircuits), so component
 * names must be unique across the whole block.
 *
 * Consumers wire pad-to-pad (alias ports on groups are unroutable in tscircuit):
 *   SRC   → `.output > .R_C > .pin1` (== `.R_D > .pin1`, shorted internally)
 *   OUT_A → `.output > .R_C > .pin2`
 *   OUT_B → `.output > .R_D > .pin2`
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
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    {/* R_C (→ OUT_A) east, R_D (→ OUT_B) west — matches the main-board
        header's pad order (OUT_A east of OUT_B after the mating flip) so
        both output traces run straight south without crossing */}
    <resistor name="R_C" resistance={resistance} footprint="0603" pcbX={2.6} pcbY={0} />
    <resistor name="R_D" resistance={resistance} footprint="0603" pcbX={-2.6} pcbY={0} />
    <trace from=".R_C > .pin1" to=".R_D > .pin1" />
  </group>
);

export default UtilitySumOutput;
