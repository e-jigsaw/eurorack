// Validate the generated source netlist against the independently extracted
// EAGLE reference, then reject unrouted or DRC-failing manufacturing artifacts.
import reference from "../modules/links/single-board/reference.json";
export {};
declare const Bun: { file: (path: string) => { text: () => Promise<string> } };
declare const process: { argv: string[]; exit: (code: number) => never };
type Entry = Record<string, any>;
const args = process.argv.slice(2);
const path = args.find(a => !a.startsWith("--")) ?? "dist/links-single/circuit.json";
const circuit: Entry[] = JSON.parse(await Bun.file(path).text());
const parent = new Map<string, string>();
const root = (id: string): string => {
  if (!parent.has(id)) parent.set(id, id);
  if (parent.get(id) !== id) parent.set(id, root(parent.get(id)!));
  return parent.get(id)!;
};
const join = (ids: string[]) => ids.forEach(id => parent.set(root(id), root(ids[0]!)));
const components = new Map(circuit.filter(e => e.type === "source_component")
  .map(e => [e.source_component_id, e.name as string]));
const ports = new Map(circuit.filter(e => e.type === "source_port")
  .map(e => [`${components.get(e.source_component_id)}.pin${e.pin_number}`, e.source_port_id as string]));
for (const e of circuit.filter(e => e.type === "source_trace")) {
  join([...(e.connected_source_port_ids ?? []), ...(e.connected_source_net_ids ?? [])]);
}
const failures: string[] = [];
const actualRefs = [...components.values()].sort();
const expectedRefs = Object.keys(reference.values).sort();
if (JSON.stringify(actualRefs) !== JSON.stringify(expectedRefs)) failures.push("component set differs from the 54-part reference");
const numericValue = (s: string) => {
  const match = /^([\d.]+)([Mkunp]?)/.exec(s);
  if (!match) return NaN;
  const scale: Record<string, number> = { M: 1e6, k: 1e3, u: 1e-6, n: 1e-9, p: 1e-12, "": 1 };
  return Number(match[1]) * scale[match[2]!]!;
};
for (const component of circuit.filter(e => e.type === "source_component")) {
  const name = component.name as keyof typeof reference.values;
  const property = /^R\d+$/.test(name) ? "resistance" : /^C\d+$/.test(name) ? "capacitance" : undefined;
  if (!property) continue;
  const expected = numericValue(reference.values[name]);
  const actual = component[property];
  if (typeof actual !== "number" || Math.abs(actual - expected) > expected * 1e-9) failures.push(`${name} ${property} differs from the reference`);
}
const netRoots = new Map<string, string>();
for (const [net, members] of Object.entries(reference.nets)) {
  const roots = new Set<string>();
  for (const member of members) {
    const id = ports.get(member);
    if (!id) failures.push(`missing pin ${member}`);
    else roots.add(root(id));
  }
  if (roots.size !== 1) failures.push(`${net} is split across ${roots.size} networks`);
  for (const r of roots) {
    const other = netRoots.get(r);
    if (other && other !== net) failures.push(`${net} is shorted to ${other}`);
    netRoots.set(r, net);
  }
}
// Output jack switch contacts are the only intentionally unconnected pins.
const expectedPins = new Set(Object.values(reference.nets).flat());
for (const [pin, id] of ports) {
  if (!expectedPins.has(pin) && netRoots.has(root(id))) failures.push(`unexpected connected pin ${pin}`);
}
const board = circuit.find(e => e.type === "pcb_board");
if (!args.includes("--netlist-only")) {
  if (!board || board.num_layers !== 2 || board.width !== 19 || board.height !== 108.4) failures.push("board must be 19 x 108.4mm, 2 layers");
  const traces = circuit.filter(e => e.type === "pcb_trace");
  if (!traces.some(e => e.route?.some((p: Entry) => p.route_type === "wire"))) failures.push("no routed copper");
  // Build a separate copper graph. Never union by source_trace_id or net name:
  // those describe intent and can conceal a missing physical route.
  const pointId = (p: Entry) => `copper:xy:${p.x.toFixed(6)},${p.y.toFixed(6)},${p.layer}`;
  traces.forEach((trace, i) => {
    const ids = [`copper:trace:${i}`];
    for (const p of trace.route ?? []) {
      if (p.route_type !== "wire") continue;
      ids.push(pointId(p));
      if (p.start_pcb_port_id) ids.push(`copper:port:${p.start_pcb_port_id}`);
      if (p.end_pcb_port_id) ids.push(`copper:port:${p.end_pcb_port_id}`);
    }
    join(ids);
  });
  const pcbPorts = new Map(circuit.filter(e => e.type === "pcb_port")
    .map(e => [e.source_port_id, e.pcb_port_id]));
  const copperNets = new Map<string, string>();
  for (const [net, members] of Object.entries(reference.nets)) {
    const roots = new Set(members.map(pin => root(`copper:port:${pcbPorts.get(ports.get(pin))}`)));
    if (roots.size !== 1) failures.push(`${net} has ${roots.size} disconnected copper islands`);
    for (const r of roots) {
      const other = copperNets.get(r);
      if (other && other !== net) failures.push(`${net} copper is shorted to ${other}`);
      copperNets.set(r, net);
    }
  }
  for (const e of circuit.filter(e => e.type.endsWith("_error"))) failures.push(`${e.type}: ${e.message ?? e.error_type}`);
}
if (failures.length) {
  console.error(`FAIL: ${path}\n${failures.map(f => `- ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(`PASS: 54 components / 34 reference nets${args.includes("--netlist-only") ? " (source topology only)" : " / routed copper / zero DRC errors"}`);
if (!args.includes("--netlist-only")) {
  const lengthWarnings = circuit.filter(e => e.type === "pcb_trace_too_long_warning");
  if (lengthWarnings.length) console.warn(`WARN: ${lengthWarnings.length} route-length targets exceeded; this prototype is not a manufacturing release`);
}
