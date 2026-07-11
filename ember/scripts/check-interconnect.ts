// Verify the two Links boards mate correctly: every interconnect header
// pin on the control board must land on the same-labeled pin of the main
// board when the main board is flipped around the vertical axis (x → -x).
//
// Usage: bun scripts/check-interconnect.ts <control.circuit.json> <main.circuit.json>

export {};

declare const Bun: { file: (path: string) => { text: () => Promise<string> } };
declare const process: {
  argv: string[];
  exit: (code: number) => never;
};

type CircuitEntry = Record<string, unknown>;

type PinAt = { x: number; y: number; label: string };

const load = async (path: string): Promise<CircuitEntry[]> =>
  JSON.parse(await Bun.file(path).text());

const round = (v: number) => Math.round(v * 100) / 100;

const extractHeaderPins = (cj: CircuitEntry[]): PinAt[] => {
  const headers = new Set(
    cj
      .filter((e) => e.type === "source_component" && e.name === "HDR")
      .map((e) => e.source_component_id as string),
  );
  const srcPorts = new Map(
    cj
      .filter(
        (e) =>
          e.type === "source_port" &&
          headers.has(e.source_component_id as string),
      )
      .map((e) => [e.source_port_id as string, e]),
  );
  const pins: PinAt[] = [];
  for (const pp of cj.filter((e) => e.type === "pcb_port")) {
    const sp = srcPorts.get(pp.source_port_id as string);
    if (!sp) continue;
    const hints = (sp.port_hints as string[] | undefined) ?? [];
    const label =
      hints.find((h) => !/^pin\d+$/.test(h)) ?? (sp.name as string);
    pins.push({ x: round(pp.x as number), y: round(pp.y as number), label });
  }
  return pins;
};

const key = (p: PinAt) => `${p.x},${p.y},${p.label}`;
const sorted = (pins: PinAt[]) => pins.map(key).sort();

const [controlPath, mainPath] = process.argv.slice(2);
if (!controlPath || !mainPath) {
  console.error(
    "usage: bun scripts/check-interconnect.ts <control.json> <main.json>",
  );
  process.exit(2);
}

const control = extractHeaderPins(await load(controlPath));
const main = extractHeaderPins(await load(mainPath));

if (control.length !== 18 || main.length !== 18) {
  console.error(
    `FAIL: expected 18 header pins per board, got control=${control.length} main=${main.length}`,
  );
  process.exit(1);
}

// Mirror the control board around the Y axis and compare.
const mirrored = control.map((p) => ({
  ...p,
  x: round(p.x === 0 ? 0 : -p.x),
}));
const a = sorted(mirrored);
const b = sorted(main);
const diff = a.filter((k, i) => k !== b[i]);

if (diff.length > 0) {
  console.error("FAIL: header pin mismatch after mirroring");
  console.error("control (mirrored):", a.join("\n  "));
  console.error("main:", b.join("\n  "));
  process.exit(1);
}

console.log(
  "PASS: 18 header pins mate 1:1 (position + label) after Y-axis flip",
);
