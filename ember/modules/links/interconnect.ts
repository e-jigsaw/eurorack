// Shared single source of truth for the two-board Links stack.
// Both boards import block Y positions, header placement, and pin order
// from here so the mating interface cannot drift.

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

// The main board faces the control board, i.e. it is flipped around the
// vertical axis relative to the control board's top view. Hole positions
// are symmetric (row centered at x=0) but the label-to-hole mapping
// reverses.
export const mainPinOrder = (pins: HeaderPins): string[] => [...pins].reverse();
