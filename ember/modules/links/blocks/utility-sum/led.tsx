import { WP937EGW } from "../../../../primitives/leds/wp937egw.tsx";

export interface UtilitySumLedConnections {
  /** Drive signal — connects to LED anode */
  IN: string;
}

export interface UtilitySumLedProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  connections: UtilitySumLedConnections;
}

/**
 * LED indicator with 1k series resistor to GND. Renders as a group so it
 * shares the parent's net/scope (cross-sub refs work).
 */
export const UtilitySumLed = ({
  name = "led",
  pcbX = 0,
  pcbY = 14.6,
  connections,
}: UtilitySumLedProps) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <WP937EGW name="LED2" pcbX={0} pcbY={0} />
    <resistor name="R11" resistance="1k" footprint="0603"
      pcbX={3.5} pcbY={0} />

    <trace from={connections.IN} to=".LED2 > .anode" />
    <trace from=".LED2 > .cathode" to=".R11 > .pin1" />
    <trace from=".R11 > .pin2" to="net.GND" />
  </group>
);

export default UtilitySumLed;
