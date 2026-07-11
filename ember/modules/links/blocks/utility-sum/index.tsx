import { EurorackJack } from "../../../../primitives/jacks/eurorack-jack.tsx";
import { UtilitySumAmp } from "./amp.tsx";
import { UtilitySumBuffer } from "./buffer.tsx";
import { UtilitySumLed } from "./led.tsx";
import { UtilitySumInput } from "./input.tsx";
import { UtilitySumOutput } from "./output.tsx";

export interface UtilitySum2x2Props {
  pcbX?: number;
  pcbY?: number;
}

export const UtilitySum2x2 = ({ pcbX, pcbY }: UtilitySum2x2Props = {}) => (
  <subcircuit pcbX={pcbX} pcbY={pcbY} autorouter="sequential-trace">
    <EurorackJack name="J5" pcbX={-5} pcbY={6.35} />
    <EurorackJack name="J6" pcbX={5} pcbY={6.35} />
    <EurorackJack name="J7" pcbX={-5} pcbY={-6.35} />
    <EurorackJack name="J8" pcbX={5} pcbY={-6.35} />

    <UtilitySumInput name="input" pcbY={7} />
    <UtilitySumAmp name="amp" />
    <UtilitySumOutput name="output" pcbY={-7} />
    <UtilitySumBuffer name="buf" />
    <UtilitySumLed connections={{ IN: ".buf > .IC > .OUT" }} />

    {/* Input jacks → input summing resistors */}
    <trace from=".J5 > .TIP" to=".input > .R_in_A > .pin1" />
    <trace from=".J6 > .TIP" to=".input > .R_in_B > .pin1" />
    {/* SUM bus → IC2.IN_A_NEG: manual Manhattan path on bottom layer to dodge
       jack bushings.  pcbPath coords are anchor body-center relative (here
       R_in_A, rotation 0). R_in_A.pin2 sits at body+( 0.85, 0); IC2.IN_A_NEG
       is at body+(2.275, -13.625) relative to R_in_A body. */}
    <trace
      from=".input > .R_in_A > .pin2"
      to=".amp > .IC2 > .IN_A_NEG"
      pcbPath={[
        { x: 0.85, y: 0,        via: true, fromLayer: "top",    toLayer: "bottom" },
        { x: 0.85, y: -13.625 },
        { x: 2.275, y: -13.625, via: true, fromLayer: "bottom", toLayer: "top" },
      ]}
    />

    {/* Amp OUT_B → output resistors + buffer */}
    <trace from=".amp > .IC2 > .OUT_B" to=".output > .R_out_A > .pin1" />
    {/* OUT_B → IC.IN_POS: bottom-layer Manhattan path with anchor on the
       buffer's IC (rotation 0). LM321 body at block (0,-12); IC2.OUT_B at
       block (-0.325, +1.625); so relative offset is (-0.325, +13.625). */}
    <trace
      from=".amp > .IC2 > .OUT_B"
      to=".buf > .IC > .IN_POS"
      pcbPathRelativeTo=".buf > .IC > .IN_POS"
      pcbPath={[
        { x: -1.1375, y: -0.95,  via: true, fromLayer: "top",    toLayer: "bottom" },
        { x: -1.1375, y: 13.625 },
        { x: -0.325,  y: 13.625, via: true, fromLayer: "bottom", toLayer: "top" },
      ]}
    />

    {/* Output resistors → output jacks */}
    <trace from=".output > .R_out_A > .pin2" to=".J7 > .TIP" />
    <trace from=".output > .R_out_B > .pin2" to=".J8 > .TIP" />

    {/* SLEEVE GND chains */}
    <trace from=".J5 > .SLEEVE" to=".J7 > .SLEEVE" />
    <trace from=".J6 > .SLEEVE" to=".J8 > .SLEEVE" />
    <trace from=".J7 > .SLEEVE" to="net.GND" />
    <trace from=".J8 > .SLEEVE" to="net.GND" />
  </subcircuit>
);

export default UtilitySum2x2;
