// DFM gate: assert the routed copper on a built circuit.json clears
// JLCPCB's 2-layer minimums (trace width, via hole/pad, different-net
// spacing). See primitives/pcb/fab-limits.ts for why the board's
// minTraceWidth/minVia* props alone don't guarantee this — every block
// root is a <subcircuit>, and those need the same props spread on them.
//
// Usage: bun scripts/check-dfm.ts <circuit.json>

export {};

declare const Bun: { file: (path: string) => { text: () => Promise<string> } };
declare const process: {
  argv: string[];
  exit: (code: number) => never;
};

import {
  FLOOR_TRACE_WIDTH_MM,
  FLOOR_VIA_HOLE_MM,
  FLOOR_VIA_PAD_MM,
  FLOOR_CLEARANCE_MM,
} from "../primitives/pcb/fab-limits.ts";

type CircuitEntry = Record<string, unknown>;

type RoutePoint = {
  route_type?: string;
  x?: number;
  y?: number;
  width?: number;
  layer?: string;
  from_layer?: string;
  to_layer?: string;
};

type Segment = {
  traceId: string;
  netId: string;
  layer: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
};

const load = async (path: string): Promise<CircuitEntry[]> =>
  JSON.parse(await Bun.file(path).text());

const [circuitPath] = process.argv.slice(2);
if (!circuitPath) {
  console.error("usage: bun scripts/check-dfm.ts <circuit.json>");
  process.exit(2);
}

const cj = await load(circuitPath);

// --- 1. trace width -------------------------------------------------------

const pcbTraces = cj.filter((e) => e.type === "pcb_trace");
const pcbVias = cj.filter((e) => e.type === "pcb_via");
const sourceTraces = new Map(
  cj
    .filter((e) => e.type === "source_trace")
    .map((e) => [e.source_trace_id as string, e]),
);

let failures: string[] = [];

let minTraceWidth = Infinity;
let minTraceWidthWhere = "";
for (const t of pcbTraces) {
  const route = (t.route as RoutePoint[] | undefined) ?? [];
  for (const r of route) {
    if (r.route_type !== "wire") continue;
    const w = r.width;
    if (typeof w !== "number") continue;
    if (w < minTraceWidth) {
      minTraceWidth = w;
      minTraceWidthWhere = `${t.pcb_trace_id} @ (${r.x}, ${r.y})`;
    }
  }
}
if (minTraceWidth < FLOOR_TRACE_WIDTH_MM) {
  failures.push(
    `trace width ${minTraceWidth}mm < floor ${FLOOR_TRACE_WIDTH_MM}mm (${minTraceWidthWhere})`,
  );
}

// --- 2. via hole / pad -----------------------------------------------------

let minViaHole = Infinity;
let minViaHoleWhere = "";
let minViaPad = Infinity;
let minViaPadWhere = "";
for (const v of pcbVias) {
  const hole = v.hole_diameter as number | undefined;
  const pad = v.outer_diameter as number | undefined;
  if (typeof hole === "number" && hole < minViaHole) {
    minViaHole = hole;
    minViaHoleWhere = v.pcb_via_id as string;
  }
  if (typeof pad === "number" && pad < minViaPad) {
    minViaPad = pad;
    minViaPadWhere = v.pcb_via_id as string;
  }
}
if (pcbVias.length > 0) {
  if (minViaHole < FLOOR_VIA_HOLE_MM) {
    failures.push(
      `via hole ${minViaHole}mm < floor ${FLOOR_VIA_HOLE_MM}mm (${minViaHoleWhere})`,
    );
  }
  if (minViaPad < FLOOR_VIA_PAD_MM) {
    failures.push(
      `via pad ${minViaPad}mm < floor ${FLOOR_VIA_PAD_MM}mm (${minViaPadWhere})`,
    );
  }
} else {
  minViaHole = NaN;
  minViaPad = NaN;
}

// --- 3. different-net trace spacing ----------------------------------------

// Net identity: source_trace.subcircuit_connectivity_map_key, keyed via
// pcb_trace.source_trace_id. A trace with no resolvable key is its own net
// (so it's checked against everything else, including other keyless
// traces, but never against its own segments).
//
// This alone over-splits at every block<->board stitch point: a block's
// local net (e.g. "BM_connectivity_net0") and the board-level net it feeds
// (e.g. "..._connectivity_net5") get different map keys even though the two
// pcb_traces are physically the SAME copper node — they meet exactly at one
// shared pcb_port (the stitch pad). Two traces literally joined at a shared
// port are never a clearance violation against each other, so traces are
// additionally unioned whenever they share a start/end pcb_port_id.
const initialNetId = (t: CircuitEntry): string => {
  const srcId = t.source_trace_id as string | undefined;
  const src = srcId ? sourceTraces.get(srcId) : undefined;
  const mapKey = src?.subcircuit_connectivity_map_key as string | undefined;
  return mapKey ?? `own:${t.pcb_trace_id as string}`;
};

const parent = new Map<string, string>();
const find = (x: string): string => {
  let root = x;
  while (parent.get(root) !== undefined && parent.get(root) !== root) {
    root = parent.get(root)!;
  }
  parent.set(x, root);
  return root;
};
const union = (a: string, b: string) => {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
};

for (const t of pcbTraces) {
  const traceId = t.pcb_trace_id as string;
  if (!parent.has(traceId)) parent.set(traceId, traceId);
}
// Union traces sharing an initial (map-key-derived) net id.
const byInitialNet = new Map<string, string>();
for (const t of pcbTraces) {
  const traceId = t.pcb_trace_id as string;
  const key = initialNetId(t);
  const existing = byInitialNet.get(key);
  if (existing) union(existing, traceId);
  else byInitialNet.set(key, traceId);
}
// Union traces that share a physical pcb_port_id at a route endpoint.
const byPort = new Map<string, string>();
for (const t of pcbTraces) {
  const traceId = t.pcb_trace_id as string;
  const route = (t.route as RoutePoint[] | undefined) ?? [];
  for (const r of route as (RoutePoint & {
    start_pcb_port_id?: string;
    end_pcb_port_id?: string;
  })[]) {
    for (const portId of [r.start_pcb_port_id, r.end_pcb_port_id]) {
      if (!portId) continue;
      const existing = byPort.get(portId);
      if (existing) union(existing, traceId);
      else byPort.set(portId, traceId);
    }
  }
}

const netIdFor = (t: CircuitEntry): string => find(t.pcb_trace_id as string);

const segments: Segment[] = [];
for (const t of pcbTraces) {
  const traceId = t.pcb_trace_id as string;
  const netId = netIdFor(t);
  const route = (t.route as RoutePoint[] | undefined) ?? [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]!;
    const b = route[i + 1]!;
    if (a.route_type !== "wire" || b.route_type !== "wire") continue;
    if (a.layer !== b.layer || !a.layer) continue;
    if (
      typeof a.x !== "number" ||
      typeof a.y !== "number" ||
      typeof b.x !== "number" ||
      typeof b.y !== "number"
    )
      continue;
    segments.push({
      traceId,
      netId,
      layer: a.layer,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      width: typeof a.width === "number" ? a.width : (b.width ?? 0),
    });
  }
}

// Closest distance between two 2D line segments.
const segDist = (
  s: Pick<Segment, "x1" | "y1" | "x2" | "y2">,
  t: Pick<Segment, "x1" | "y1" | "x2" | "y2">,
): number => {
  const d = (
    px: number,
    py: number,
    qx: number,
    qy: number,
    rx: number,
    ry: number,
  ): number => {
    // distance from point (px,py) to segment (qx,qy)-(rx,ry)
    const dx = rx - qx;
    const dy = ry - qy;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - qx, py - qy);
    let u = ((px - qx) * dx + (py - qy) * dy) / len2;
    u = Math.max(0, Math.min(1, u));
    const cx = qx + u * dx;
    const cy = qy + u * dy;
    return Math.hypot(px - cx, py - cy);
  };

  const segSegIntersect = (): boolean => {
    const ccw = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      cx: number,
      cy: number,
    ) => (cy - ay) * (bx - ax) - (by - ay) * (cx - ax);
    const d1 = ccw(s.x1, s.y1, s.x2, s.y2, t.x1, t.y1);
    const d2 = ccw(s.x1, s.y1, s.x2, s.y2, t.x2, t.y2);
    const d3 = ccw(t.x1, t.y1, t.x2, t.y2, s.x1, s.y1);
    const d4 = ccw(t.x1, t.y1, t.x2, t.y2, s.x2, s.y2);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };

  if (segSegIntersect()) return 0;

  return Math.min(
    d(s.x1, s.y1, t.x1, t.y1, t.x2, t.y2),
    d(s.x2, s.y2, t.x1, t.y1, t.x2, t.y2),
    d(t.x1, t.y1, s.x1, s.y1, s.x2, s.y2),
    d(t.x2, t.y2, s.x1, s.y1, s.x2, s.y2),
  );
};

let minClearance = Infinity;
let minClearancePair = "";
for (let i = 0; i < segments.length; i++) {
  const a = segments[i]!;
  for (let j = i + 1; j < segments.length; j++) {
    const b = segments[j]!;
    if (a.traceId === b.traceId) continue;
    if (a.netId === b.netId) continue;
    if (a.layer !== b.layer) continue;
    const dist = segDist(a, b);
    const clearance = dist - (a.width / 2 + b.width / 2);
    if (clearance < minClearance) {
      minClearance = clearance;
      minClearancePair = `${a.traceId} (net ${a.netId}) <-> ${b.traceId} (net ${b.netId})`;
    }
  }
}
if (segments.length > 0 && Number.isFinite(minClearance)) {
  if (minClearance < FLOOR_CLEARANCE_MM) {
    failures.push(
      `different-net spacing ${minClearance.toFixed(4)}mm < floor ${FLOOR_CLEARANCE_MM}mm (${minClearancePair})`,
    );
  }
} else {
  minClearance = NaN;
}

// --- verdict -----------------------------------------------------------

if (failures.length > 0) {
  console.error(`FAIL: ${circuitPath}`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `PASS: ${circuitPath} — min trace width ${minTraceWidth}mm, min via (hole ${minViaHole}mm / pad ${minViaPad}mm), min different-net spacing ${Number.isFinite(minClearance) ? minClearance.toFixed(4) : "n/a"}mm`,
);
