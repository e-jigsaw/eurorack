// Single source of truth for fab (routing) constraints across the Links
// two-board stack. Two tiers:
//
// - The FLOOR_* numbers are JLCPCB's hard 2-layer minimums. Anything the
//   router produces below these is unmanufacturable; scripts/check-dfm.ts
//   asserts against these numbers (not the targets below).
// - TRACE_WIDTH/VIA_HOLE/VIA_PAD/CLEARANCE are the values we actually ask
//   the router for — comfortably above the floors so ordinary process
//   variation at the fab doesn't eat the margin.
//
// Why this file exists: a trace's routed width resolves as
//   trace._getExplicitTraceThickness() ?? subcircuit._parsedProps.minTraceWidth ?? 0.1mm
// (@tscircuit/core). The <board> level's minTraceWidth is NOT inherited by
// traces inside a <subcircuit> — every block root in this project IS a
// subcircuit — so the props below must be spread on the board AND on each
// of the six block root subcircuits, not just the board.
//
// Vias are a second, separate gotcha: minViaHoleDiameter/minViaPadDiameter
// only reach `pcb_board.min_via_hole_diameter`/`min_via_pad_diameter`,
// which @tscircuit/core's ASYNC (whole-board) autorouter via-insertion path
// reads (core dist ~line 24047, `board?.min_via_hole_diameter`). Our
// `sequential_trace` preset does NOT go through that path — its own via
// insertion (core dist ~lines 4031/4462) sizes vias from
// `trace.getInheritedMergedProperty("pcbStyle").viaHoleDiameter/viaPadDiameter`
// instead, falling back to the hard 0.2mm/0.3mm defaults if pcbStyle isn't
// set. So via sizing under sequential-trace routing needs `pcbStyle`, not
// minViaHoleDiameter/minViaPadDiameter — both are included below so either
// routing path picks up the same target sizes.

export const TRACE_WIDTH = "0.13mm"
export const VIA_HOLE = "0.3mm"
export const VIA_PAD = "0.6mm"
export const CLEARANCE = "0.15mm"

// JLCPCB 2-layer hard floors (mm, as numbers for scripts/check-dfm.ts).
export const FLOOR_TRACE_WIDTH_MM = 0.127
export const FLOOR_VIA_HOLE_MM = 0.3
export const FLOOR_VIA_PAD_MM = 0.45
export const FLOOR_CLEARANCE_MM = 0.127

/** Spread onto a <board> or <subcircuit> to set its routing minimums. */
export const FAB_ROUTING_PROPS = {
  minTraceWidth: TRACE_WIDTH,
  minViaHoleDiameter: VIA_HOLE,
  minViaPadDiameter: VIA_PAD,
  pcbStyle: {
    viaHoleDiameter: VIA_HOLE,
    viaPadDiameter: VIA_PAD,
  },
}
