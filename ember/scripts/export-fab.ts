// JLCPCB fab-export pipeline for the Links two-board stack.
//
// For each board entry (<entry>.circuit.tsx / dist/<entry>/circuit.json):
//   1. Shells out to `tsci export --format gerbers` for the gerber+drill zip
//      (fab/<entry>/gerbers.zip). tsci's own bundled bom.csv/pick_and_place.csv
//      inside that zip are NOT used — they're missing Comment/Value/Footprint
//      for most parts and have duplicate designators (three blocks each name
//      a header "HDR", etc.) — unusable for a JLCPCB upload as-is.
//   2. Regenerates fab/<entry>/bom.csv + fab/<entry>/cpl.csv directly from
//      dist/<entry>/circuit.json (ground truth), assigning unique designators,
//      resolving each part's LCSC number, and excluding hand-solder-only
//      parts (jacks, LEDs — no JLC library part exists for them) to
//      fab/<entry>/hand-solder.csv instead.
//
// Usage: bun scripts/export-fab.ts
export {};

declare const Bun: {
  file: (path: string) => { text: () => Promise<string>; exists: () => Promise<boolean> };
  write: (path: string, data: string) => Promise<number>;
  spawn: (
    cmd: string[],
    opts?: { stdout?: "pipe" | "inherit"; stderr?: "pipe" | "inherit" },
  ) => {
    exited: Promise<number>;
  };
};
declare const process: {
  argv: string[];
  exit: (code: number) => never;
};

import {
  lookupChip,
  lookupCapacitor,
  lookupResistor,
  type FabPart,
} from "./fab-parts.ts";

type Json = Record<string, unknown>;

type SourceComponent = Json & {
  type: "source_component";
  source_component_id: string;
  ftype: string;
  name: string;
  source_group_id: string;
  manufacturer_part_number?: string;
  resistance?: number;
  display_resistance?: string;
  capacitance?: number;
  display_capacitance?: string;
  pin_count?: number;
  gender?: "male" | "female";
  supplier_part_numbers?: { jlcpcb?: string[] };
};

type SourceGroup = Json & {
  type: "source_group";
  source_group_id: string;
  name?: string;
  is_subcircuit?: boolean;
  parent_source_group_id?: string;
};

type PcbComponent = Json & {
  type: "pcb_component";
  pcb_component_id: string;
  source_component_id: string;
  center: { x: number; y: number };
  rotation: number;
  layer: "top" | "bottom";
};

const load = async (path: string): Promise<Json[]> =>
  JSON.parse(await Bun.file(path).text());

// --- designator scheme ------------------------------------------------------
//
// Prefix a component's own name with the names of every named source_group
// it's nested under, innermost-last, e.g. a resistor named "C5" inside
// group "amp" inside subcircuit "US" becomes "US-amp-C5". This is derived
// straight from circuit.json's source_group parent chain, so it's exact for
// links-main (every block subcircuit is declared with an explicit
// name="BM"/"US"/"SM" — see modules/links/blocks/*/main.tsx).
//
// links-control's per-block <subcircuit> is NOT given a `name` prop (see
// modules/links/blocks/*/control.tsx) — group.name is absent there. Falls
// back to positional labelling: the three direct-child subcircuits of the
// board root are declared in control.tsx in the same BM, US, SM order as
// main.tsx (BufferedMultControl, UtilitySumControl, SumMixerControl —
// mirroring BufferedMultMain, UtilitySumMain, SumMixerMain), so the
// numerically-first unnamed root-child subcircuit is labelled "BM", the
// second "US", the third "SM". If that assumption ever breaks (block count
// changes, or declaration order stops matching main.tsx) this throws rather
// than silently mislabelling — designator uniqueness would still hold either
// way (the fallback labels are still distinct per block), only the
// human-readable BM/US/SM mapping could go stale.
const BLOCK_LABELS = ["BM", "US", "SM"];

const idNum = (id: string): number => {
  const m = /(\d+)$/.exec(id);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
};

const buildGroupPathResolver = (cj: Json[]) => {
  const groups = new Map<string, SourceGroup>(
    (cj.filter((e) => e.type === "source_group") as SourceGroup[]).map((g) => [
      g.source_group_id,
      g,
    ]),
  );

  const root = [...groups.values()].find(
    (g) => g.parent_source_group_id === undefined,
  );
  if (!root) throw new Error("no root source_group found in circuit.json");

  const unnamedRootChildren = [...groups.values()]
    .filter(
      (g) =>
        g.parent_source_group_id === root.source_group_id &&
        g.is_subcircuit &&
        !g.name,
    )
    .sort((a, b) => idNum(a.source_group_id) - idNum(b.source_group_id));

  if (unnamedRootChildren.length > 0 && unnamedRootChildren.length !== BLOCK_LABELS.length) {
    throw new Error(
      `expected ${BLOCK_LABELS.length} unnamed top-level block subcircuits ` +
        `(BM/US/SM positional fallback), found ${unnamedRootChildren.length}`,
    );
  }

  const fallbackLabel = new Map(
    unnamedRootChildren.map((g, i) => [g.source_group_id, BLOCK_LABELS[i]!]),
  );

  return (groupId: string): string[] => {
    const path: string[] = [];
    let gid: string | undefined = groupId;
    while (gid) {
      const g: SourceGroup | undefined = groups.get(gid);
      if (!g) break;
      if (g.parent_source_group_id === undefined) break; // hit the (unnamed) board root — stop
      const label = g.name && g.name.length > 0 ? g.name : fallbackLabel.get(g.source_group_id);
      if (!label) {
        throw new Error(
          `source_group ${g.source_group_id} has no name and no positional fallback label`,
        );
      }
      path.unshift(label);
      gid = g.parent_source_group_id;
    }
    return path;
  };
};

// --- part resolution ---------------------------------------------------------

type Resolved = {
  designator: string;
  comment: string;
  footprint: string;
  lcsc: string | null; // null => hand-solder, no JLC part
};

const footprintForCapacitor = (farads: number): string =>
  farads >= 1e-6 ? "0805" : "0603";

const resolvePart = (sc: SourceComponent): Resolved => {
  const explicit = sc.supplier_part_numbers?.jlcpcb?.[0];
  const explicitLcsc = explicit
    ? explicit.startsWith("C")
      ? explicit
      : `C${explicit}`
    : undefined;

  switch (sc.ftype) {
    case "simple_resistor": {
      const ohms = sc.resistance ?? NaN;
      const part: FabPart | undefined = lookupResistor(ohms);
      return {
        designator: sc.name,
        comment: sc.display_resistance ?? String(ohms),
        footprint: "0603",
        lcsc: part?.lcsc ?? null,
      };
    }
    case "simple_capacitor": {
      const farads = sc.capacitance ?? NaN;
      const footprint = footprintForCapacitor(farads);
      const part = lookupCapacitor(farads, footprint);
      return {
        designator: sc.name,
        comment: sc.display_capacitance ?? String(farads),
        footprint,
        lcsc: part?.lcsc ?? null,
      };
    }
    case "simple_chip": {
      const mpn = sc.manufacturer_part_number ?? "";
      if (explicitLcsc) {
        // JP1-style: chip with its own explicit supplier part number.
        return {
          designator: sc.name,
          comment: mpn || sc.name,
          footprint: mpn === "DC3-2.54-10PAS" ? "THT-2.54mm-10P" : "unknown",
          lcsc: explicitLcsc,
        };
      }
      const part = lookupChip(mpn);
      if (part) {
        return {
          designator: sc.name,
          comment: part.mpn,
          footprint: part.package,
          lcsc: part.lcsc,
        };
      }
      // No LCSC part known (e.g. PJ301M-12 jack) -> hand-solder.
      return {
        designator: sc.name,
        comment: mpn || sc.name,
        footprint: mpn || "unknown",
        lcsc: null,
      };
    }
    case "simple_led": {
      return {
        designator: sc.name,
        comment: (sc.color as string | undefined) ?? "LED",
        footprint: "THT-5mm-LED",
        lcsc: null, // no JLC library part for the WP937EGW LED — hand-solder
      };
    }
    case "simple_pin_header": {
      const gender = sc.gender ?? "male";
      const pins = sc.pin_count ?? 0;
      return {
        designator: sc.name,
        comment: `${pins}-pin ${gender} header`,
        footprint: `THT-2.54mm-1x${pins}-${gender === "male" ? "M" : "F"}`,
        lcsc: explicitLcsc ?? null,
      };
    }
    default:
      return {
        designator: sc.name,
        comment: sc.ftype,
        footprint: "unknown",
        lcsc: explicitLcsc ?? null,
      };
  }
};

// --- CSV helpers --------------------------------------------------------------

const csvField = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvLine = (fields: (string | number)[]): string =>
  fields.map(csvField).join(",");

// --- per-board processing ------------------------------------------------------

interface BoardResult {
  entry: string;
  bomRows: number;
  cplRows: number;
  handSolderRows: number;
  unresolved: string[];
}

const round = (v: number): number => Math.round(v * 1000) / 1000;

const processBoard = async (entry: string): Promise<BoardResult> => {
  const gerberDir = `fab/${entry}`;
  await Bun.spawn(["mkdir", "-p", gerberDir]).exited;

  console.log(`\n=== ${entry} ===`);
  console.log(`exporting gerbers -> ${gerberDir}/gerbers.zip ...`);
  const exportProc = Bun.spawn(
    [
      "bunx",
      "tsci",
      "export",
      `${entry}.circuit.tsx`,
      "--format",
      "gerbers",
      "-o",
      `${gerberDir}/gerbers.zip`,
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  const code = await exportProc.exited;
  if (code !== 0) {
    throw new Error(`tsci export failed for ${entry} (exit ${code})`);
  }

  const cj = await load(`dist/${entry}/circuit.json`);
  const groupPath = buildGroupPathResolver(cj);

  const sourceComponents = cj.filter(
    (e) => e.type === "source_component",
  ) as SourceComponent[];
  const scById = new Map(sourceComponents.map((s) => [s.source_component_id, s]));
  const pcbComponents = cj.filter(
    (e) => e.type === "pcb_component",
  ) as PcbComponent[];

  type Placed = Resolved & PcbComponent & { fullDesignator: string };

  const placed: Placed[] = [];
  const seenDesignators = new Set<string>();
  for (const pc of pcbComponents) {
    const sc = scById.get(pc.source_component_id);
    if (!sc) throw new Error(`pcb_component ${pc.pcb_component_id} has no source_component`);
    const resolved = resolvePart(sc);
    const path = groupPath(sc.source_group_id);
    const fullDesignator = [...path, resolved.designator].join("-");
    if (seenDesignators.has(fullDesignator)) {
      throw new Error(`duplicate designator ${fullDesignator} in ${entry}`);
    }
    seenDesignators.add(fullDesignator);
    placed.push({ ...pc, ...resolved, fullDesignator });
  }

  const pcba = placed.filter((p) => p.lcsc !== null);
  const handSolder = placed.filter((p) => p.lcsc === null);
  const unresolved = pcba.filter((p) => !p.lcsc).map((p) => p.fullDesignator);

  // --- BOM: aggregate by (lcsc, comment, footprint) ---
  const bomGroups = new Map<
    string,
    { lcsc: string; comment: string; footprint: string; designators: string[] }
  >();
  for (const p of pcba) {
    const key = `${p.lcsc}|${p.comment}|${p.footprint}`;
    let g = bomGroups.get(key);
    if (!g) {
      g = { lcsc: p.lcsc!, comment: p.comment, footprint: p.footprint, designators: [] };
      bomGroups.set(key, g);
    }
    g.designators.push(p.fullDesignator);
  }
  const bomLines = [csvLine(["Comment", "Designator", "Footprint", "LCSC Part #"])];
  for (const g of bomGroups.values()) {
    bomLines.push(
      csvLine([g.comment, g.designators.join(","), g.footprint, g.lcsc]),
    );
  }
  await Bun.write(`${gerberDir}/bom.csv`, bomLines.join("\n") + "\n");

  // --- CPL: one row per placed (PCBA) component ---
  // Rotation is taken directly from circuit.json's pcb_component.rotation
  // (ground truth — verified against tsci's own pick_and_place.csv output,
  // which for this design already carries the same values; JLC's order
  // preview still needs a manual per-part-origin rotation-offset check,
  // this only guarantees the rotation *tscircuit* placed the part at is
  // preserved through export).
  const cplLines = [csvLine(["Designator", "Mid X", "Mid Y", "Layer", "Rotation"])];
  for (const p of pcba) {
    cplLines.push(
      csvLine([
        p.fullDesignator,
        round(p.center.x),
        round(p.center.y),
        p.layer,
        p.rotation,
      ]),
    );
  }
  await Bun.write(`${gerberDir}/cpl.csv`, cplLines.join("\n") + "\n");

  // --- hand-solder list (excluded from BOM/CPL) ---
  const handLines = [
    csvLine(["Designator", "Comment", "Footprint", "Mid X", "Mid Y", "Layer"]),
  ];
  for (const p of handSolder) {
    handLines.push(
      csvLine([p.fullDesignator, p.comment, p.footprint, round(p.center.x), round(p.center.y), p.layer]),
    );
  }
  await Bun.write(`${gerberDir}/hand-solder.csv`, handLines.join("\n") + "\n");

  console.log(
    `PCBA rows (BOM lines): ${bomGroups.size}  |  CPL rows: ${pcba.length}  |  hand-solder rows: ${handSolder.length}${
      unresolved.length > 0 ? `  |  UNRESOLVED LCSC: ${unresolved.join(", ")}` : ""
    }`,
  );
  console.table(
    [...bomGroups.values()].map((g) => ({
      Comment: g.comment,
      Footprint: g.footprint,
      LCSC: g.lcsc,
      Designators: g.designators.join(", "),
    })),
  );
  if (handSolder.length > 0) {
    console.log("hand-solder parts:", handSolder.map((p) => p.fullDesignator).join(", "));
  }

  return {
    entry,
    bomRows: bomGroups.size,
    cplRows: pcba.length,
    handSolderRows: handSolder.length,
    unresolved,
  };
};

// --- main ----------------------------------------------------------------------

const ENTRIES = ["links-control", "links-main"];

const results: BoardResult[] = [];
for (const entry of ENTRIES) {
  results.push(await processBoard(entry));
}

console.log("\n=== summary ===");
console.table(
  results.map((r) => ({
    board: r.entry,
    "BOM rows": r.bomRows,
    "CPL rows": r.cplRows,
    "hand-solder rows": r.handSolderRows,
    "unresolved LCSC": r.unresolved.length,
  })),
);

const anyUnresolved = results.some((r) => r.unresolved.length > 0);
if (anyUnresolved) {
  console.error("FAIL: some PCBA parts have no resolved LCSC number.");
  process.exit(1);
}
