export const BOARD_REVISION = "v0.1";

export interface LinksMarkingProps {
  board: "control" | "main";
  /** Marking block center (board coords). Lines stack upward from here. */
  pcbX?: number;
  pcbY?: number;
}

/**
 * Board identification silk, on the bottom (rear-facing) layer — the top
 * faces of both boards are hidden in the assembled stack. The JLCJLCJLCJLC
 * line is JLCPCB's order-number placeholder: pick "Specify a location" when
 * ordering and their id gets printed there instead of a random spot.
 */
export const LinksMarking = ({ board, pcbX = 0, pcbY = 0 }: LinksMarkingProps) => (
  <group name={`marking_${board}`} pcbX={pcbX} pcbY={pcbY}>
    <silkscreentext text="Nok Audio" pcbX={0} pcbY={1.8} fontSize={1.2} layer="bottom" />
    <silkscreentext
      text={`Links ${BOARD_REVISION} ${board}`}
      pcbX={0}
      pcbY={0}
      fontSize={1}
      layer="bottom"
    />
    <silkscreentext text="JLCJLCJLCJLC" pcbX={0} pcbY={-1.8} fontSize={1} layer="bottom" />
  </group>
);

export default LinksMarking;
