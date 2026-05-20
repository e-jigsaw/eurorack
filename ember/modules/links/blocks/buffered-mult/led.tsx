import { WP937EGW } from "../../../../primitives/leds/wp937egw.tsx";

export interface BufferedMultLedConnections {
  /** Drive signal — connects to LED anode */
  IN: string;
}

export interface BufferedMultLedProps {
  name?: string;
  pcbX?: number;
  pcbY?: number;
  connections: BufferedMultLedConnections;
}

/**
 * LED1 indicator driven by IC1.OUT_B (channel B). 1k current-limit resistor R3.
 * Renders as a group so cross-sub trace references resolve.
 */
export const BufferedMultLed = ({
  name = "led",
  pcbX = 0,
  pcbY = 14.6,
  connections,
}: BufferedMultLedProps) => (
  <group name={name} pcbX={pcbX} pcbY={pcbY}>
    <WP937EGW name="LED1" pcbX={0} pcbY={0} />
    <resistor name="R3" resistance="1k" footprint="0603" pcbX={3.5} pcbY={0} />

    <trace from={connections.IN} to=".LED1 > .anode" />
    <trace from=".LED1 > .cathode" to=".R3 > .pin1" />
    <trace from=".R3 > .pin2" to="net.GND" />
  </group>
);

export default BufferedMultLed;
