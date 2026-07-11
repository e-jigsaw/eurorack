import type { ReactNode } from "react"
import { CLEARANCE, FAB_ROUTING_PROPS, TRACE_WIDTH } from "./fab-limits.ts"

export const HP_MM = 5.08
export const PANEL_MM_PER_HP = 5.0

export interface EurorackPCBProps {
  width?: number
  height?: number
  thickness?: number
  children?: ReactNode
}

export const EurorackPCB = ({
  width,
  height,
  thickness = 1.6,
  children,
}: EurorackPCBProps) => (
  <board
    width={width}
    height={height}
    thickness={thickness}
    layers={2}
    defaultTraceWidth={TRACE_WIDTH}
    {...FAB_ROUTING_PROPS}
    minTraceToPadEdgeClearance="0.13mm"
    autorouter={{ preset: "sequential_trace", traceClearance: CLEARANCE }}
  >
    {children}
  </board>
)

export default EurorackPCB
