// Shared single source of truth for the two-board Links stack.
// Both boards import block Y positions, header placement, and pin order
// from here so the mating interface cannot drift.

// Board outline (identical on both boards — see control.tsx / main.tsx)
export const BOARD_WIDTH = 20;
export const BOARD_HEIGHT = 115;

// Block Y positions (board-center origin, same on both boards)
export const Y_PWR = 52.3;   // main board only
export const Y_1TO3 = 32.37;
export const Y_2X2 = -1.92;
export const Y_3TO1 = -36.25;

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
