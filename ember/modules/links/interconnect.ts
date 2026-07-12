// Shared single source of truth for the two-board Links stack.
// Both boards import block Y positions, header placement, and pin order
// from here so the mating interface cannot drift.

// Board outline (identical on both boards — see control.tsx / main.tsx).
//
// Resized from the original 20×115 to match the real Mutable Links v4.0.9
// envelope (19.03×108.43mm, measured from links/hardware_design/pcb/
// links_v40.9.brd), which is proven to clear 3U rack rails and neighboring
// modules — our old 20mm width/115mm height did not have that guarantee.
// Jack-column spacing (x=±5) and all jack/LED coordinates are UNCHANGED —
// this is a custom panel, not real-panel-compatible, and only the outline
// and the Y_PWR/Y_1TO3/Y_2X2/Y_3TO1 block positions moved.
export const BOARD_WIDTH = 19;
export const BOARD_HEIGHT = 108.4;

// Block Y positions (board-center origin, same on both boards).
//
// Derivation (half-height = 54.2, required pad-to-edge clearance ≥0.3mm on
// both the top and bottom edge, so content must stay within Y ∈
// [-53.9, +53.9]):
//
// - Top extreme: PWR's JP1 header, top pad row at Y_PWR + 1.27 (pitch/2),
//   pad radius 0.85 (Ø1.7mm plated hole) → top edge = Y_PWR + 2.12.
//   (The DoepferHeader's plastic shroud body is 8.38mm tall, i.e. ±4.19
//   from Y_PWR — at the chosen Y_PWR below its top sits at ~52.7, ~1.5mm
//   INSIDE the board's +54.2 edge. That physical clearance matters for the
//   fab panel: the panel rides top/bottom rails and the top edge carries
//   breakaway tabs + mouse bites, so the shroud must stay clear of the
//   break line — both for the bite drill row and for the post-break
//   cleanup pass.)
// - Bottom extreme: SM's interconnect header (bottommost block), bottom
//   pad row at Y_3TO1 + HEADER_Y_LOCAL - 0.85 (Ø1.7mm plated hole).
//
// At the original values (Y_PWR=52.3, Y_3TO1=-36.25, HEADER_Y_LOCAL=-17.8)
// these come to +54.42 / -54.9 (span 109.32mm) — both outside the new
// ±53.9 window, so two independent moves are needed:
//
// 1. Y_PWR drops from 52.3 to 48.5 (our choice — the power header position
//    isn't jack-grid-locked; first lowered to 50.0 for the resize, then to
//    48.5 so the shroud clears the panel's top break line, see above). New
//    top pad edge = 48.5 + 2.12 = 50.62, margin to the +54.2 edge = 3.58mm
//    — this is the copper-free zone the panel's top-edge tabs and mouse
//    bites drill into, so the generous margin is load-bearing, not just
//    manufacturing slack.
// 2. Y_1TO3/Y_2X2/Y_3TO1 shift by a COMMON delta Δ=+1.5 (their spacing is
//    jack-grid-frozen, only a uniform shift is allowed). New Y_3TO1 =
//    -36.25 + 1.5 = -34.75, new bottom edge = -34.75 - 17.8 - 0.85 = -53.4,
//    margin to the -54.2 edge = 0.8mm.
//
// HEADER_Y_LOCAL is left untouched (see its own comment) — the bottom-edge
// margin above already clears with room to spare without touching it.
export const Y_PWR = 48.5;   // main board only
export const Y_1TO3 = 33.87;
export const Y_2X2 = -0.42;
export const Y_3TO1 = -34.75;

// Interconnect header row: block-local Y, centered at x=0.
// Centering keeps hole positions x-symmetric, so board mating (a flip
// around the Y axis) only reverses pin order — see mainPinOrder.
//
// The value is bounded by neighboring-block clearances on the control
// board: at magnitude ≥ ~17.95 the header pins collide with the NEXT
// block's LED pads (block pitch ~34.3mm − LED offset 14.6mm − 17.95mm <
// 1.75mm = header pad radius 0.85 + LED pad radius 0.8 + 0.1mm min
// clearance — and the header's ±1.27mm middle pins land exactly on the
// LED's ±1.27mm pads). The main-board side (buffer caps / output R around
// block-local y ≈ −15) is kept clear by those units' own placement.
export const HEADER_Y_LOCAL = -17.8;

export type HeaderPins = readonly [string, string, string, string, string, string];

export const BM_PINS: HeaderPins = ["IN", "OUT_A", "OUT_B", "OUT_C", "LED", "GND"];
export const US_PINS: HeaderPins = ["IN_A", "IN_B", "OUT_A", "OUT_B", "LED", "GND"];
export const SM_PINS: HeaderPins = ["IN_A", "IN_B", "IN_C", "OUT", "LED", "GND"];

// Both boards face the panel with their component side, so their XY frames
// coincide in the rack and mating is direct (x, y) equality. The control
// board's male header is rear-mounted (layer="bottom"), which mirrors its
// label-to-hole mapping; the main side compensates by reversing its
// pinLabels with this helper. Hole rows stay x-symmetric (centered at x=0).
export const mainPinOrder = (pins: HeaderPins): string[] => [...pins].reverse();
