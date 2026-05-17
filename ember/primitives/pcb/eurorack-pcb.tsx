import type { ReactNode } from "react"

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
  <board width={width} height={height} thickness={thickness}>
    {children}
  </board>
)

export default EurorackPCB
