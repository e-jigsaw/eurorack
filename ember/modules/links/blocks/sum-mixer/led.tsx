import { WP937EGW } from "../../../../primitives/leds/wp937egw.tsx";

export interface SumMixerLedConnections {
  /** Drive signal — connects to LED anode */
  IN: string;
}

export interface SumMixerLedProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  connections: SumMixerLedConnections;
}

/**
 * LED indicator with 1k series resistor to GND. Renders as a group so it
 * shares the parent's scope (cross-sub refs work).
 */
export const SumMixerLed = ({
  name = "led",
  pcbX = 0,
  pcbY = 14.6,
  connections,
}: SumMixerLedProps) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <WP937EGW name="LED3" pcbX={0} pcbY={0} />
    <resistor name="R19" resistance="1k" footprint="0603"
      pcbX={3.5} pcbY={0} />

    <trace from={connections.IN} to=".LED3 > .anode" />
    <trace from=".LED3 > .cathode" to=".R19 > .pin1" />
    <trace from=".R19 > .pin2" to="net.GND" />
  </group>
);

export default SumMixerLed;
