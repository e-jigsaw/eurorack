// KiCad-based panelization pipeline for the Links two-board stack.
//
// tscircuit's own `<panel>` re-autoroutes every copy from scratch instead of
// reusing a board's already-verified routing, which reintroduces real DRC
// violations on links-main (routed at near-zero edge margin by design) --
// see .superpowers/sdd/panel-report.md for the full spike that ruled it out.
//
// This pipeline instead COPIES the verified single-board copper via KiCad
// tooling:
//   1. `tsci export --format kicad_pcb` turns the verified board into a
//      .kicad_pcb (fidelity-checked against circuit.json -- see
//      .superpowers/sdd/kicad-panel-report.md Phase 1: footprint/pad/hole/
//      via counts and total copper length match exactly; the only gap found
//      is a cosmetic footprint-mount-side metadata field, not copper).
//   2. `scripts/panelize.py` (KiKit) duplicates that geometry into a 1x2
//      panel with breakaway rails + mouse bites + fiducials, verified
//      byte-for-byte identical copper between copies (mod the panel pitch).
//   3. `kicad-cli` renders JLC-orderable gerbers + Excellon drill + an SVG
//      preview from the panel .kicad_pcb.
//   4. Panel BOM/CPL are derived from the EXISTING single-board
//      fab/<entry>/{bom,cpl}.csv (already-verified LCSC/designator
//      resolution from `bun run export:fab`) by duplicating designators
//      (-A/-B) and mapping local (tscircuit-space, board-center-origin)
//      coordinates into the panel's absolute coordinate frame -- the same
//      frame the gerbers/drill are plotted in (KiCad absolute page units,
//      Y-down). The mapping (a pure per-copy translation) is derived at
//      runtime from the actual panelized board, not hardcoded, so it stays
//      correct if panel geometry parameters ever change.
//
// Requires `bun run export:fab` to have already been run (this script reads
// fab/<entry>/{bom,cpl}.csv, it does not regenerate them).
//
// Usage: bun scripts/export-panel.ts
export {};

declare const Bun: {
  file: (path: string) => { text: () => Promise<string>; exists: () => Promise<boolean> };
  write: (path: string, data: string) => Promise<number>;
  spawn: (
    cmd: string[],
    opts?: { stdout?: "pipe" | "inherit"; stderr?: "pipe" | "inherit"; cwd?: string },
  ) => {
    exited: Promise<number>;
    stdout: ReadableStream;
    stderr: ReadableStream;
  };
};
declare const process: {
  argv: string[];
  exit: (code: number) => never;
};

const KICAD_CLI = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli";
// KiCad's bundled python -- the only interpreter with a working pcbnew binding.
const KICAD_PYTHON =
  "/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/python3";
const GERBER_LAYERS =
  "F.Cu,B.Cu,F.Mask,B.Mask,F.Silkscreen,B.Silkscreen,Edge.Cuts";

const run = async (
  cmd: string[],
  opts?: { cwd?: string },
): Promise<{ code: number; stdout: string; stderr: string }> => {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", cwd: opts?.cwd });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
};

const mustRun = async (cmd: string[], label: string): Promise<string> => {
  const { code, stdout, stderr } = await run(cmd);
  if (code !== 0) {
    throw new Error(`${label} failed (exit ${code}):\n${stdout}\n${stderr}`);
  }
  return stdout;
};

// --- CSV helpers (kept consistent with export-fab.ts's format) -------------

const csvField = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvLine = (fields: (string | number)[]): string =>
  fields.map(csvField).join(",");

// Minimal RFC4180-ish CSV parser (handles quoted fields with embedded commas,
// which is all fab/<entry>/bom.csv's Designator column needs).
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
};

// --- .kicad_pcb footprint parsing (paren-balanced, no external deps) -------

interface PanelFootprint {
  lib: string; // e.g. "tscircuit:PJ301M-12", "NPTH", "Fiducial"
  reference: string;
  x: number;
  y: number;
}

const extractBalancedBlocks = (text: string, openToken: string): string[] => {
  const blocks: string[] = [];
  let i = 0;
  while ((i = text.indexOf(openToken, i)) !== -1) {
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      if (text[j] === "(") depth++;
      else if (text[j] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    blocks.push(text.slice(i, j + 1));
    i = j + 1;
  }
  return blocks;
};

const parsePanelFootprints = (pcbText: string): PanelFootprint[] => {
  const blocks = extractBalancedBlocks(pcbText, "(footprint");
  const footprints: PanelFootprint[] = [];
  for (const block of blocks) {
    const libMatch = /^\(footprint\s+"([^"]*)"/.exec(block);
    const atMatch = /\(at\s+(-?[\d.]+)\s+(-?[\d.]+)/.exec(block);
    const refMatch = /\(property\s+"Reference"\s+"([^"]*)"/.exec(block);
    if (!libMatch || !atMatch) continue;
    footprints.push({
      lib: libMatch[1]!,
      reference: refMatch ? refMatch[1]! : "",
      x: Number(atMatch[1]),
      y: Number(atMatch[2]),
    });
  }
  return footprints;
};

// --- panel coordinate-frame derivation --------------------------------------
//
// Local (tscircuit) frame: board-center-origin, Y-up -- exactly what
// fab/<entry>/cpl.csv already carries (Mid X/Mid Y = pcb_component.center).
// Panel (gerber/drill) frame: KiCad absolute page units, Y-down.
// Both boards get panelized identically (same 19x108.4mm outline, same
// kikit parameters), and kikit applies a pure rigid translation per copy
// (no rotation/mirroring -- verified in the Phase 2 spike), so the map is:
//   panel_x = local_x + offsetA.x                (copy A)
//   panel_y = offsetA.cy - local_y
//   copy B  = copy A + (pitch.x, pitch.y)
//
// Derived at runtime (not hardcoded) from a single pivot reference that
// appears in exactly one instance per copy (i.e. not one of the
// block-repeated names like "HDR" that appear 3x per copy).
interface Transform {
  offsetX: number;
  centerY: number;
  pitchX: number;
  pitchY: number;
}

const rawRefOf = (designator: string): string => designator.split("-").pop()!;

const deriveTransform = (
  panelFootprints: PanelFootprint[],
  cplRows: { designator: string; x: number; y: number }[],
): Transform => {
  const real = panelFootprints.filter((f) => f.lib.startsWith("tscircuit:"));
  const countByRef = new Map<string, PanelFootprint[]>();
  for (const f of real) {
    const arr = countByRef.get(f.reference) ?? [];
    arr.push(f);
    countByRef.set(f.reference, arr);
  }

  const candidates: Transform[] = [];
  for (const [ref, instances] of countByRef) {
    if (instances.length !== 2) continue; // want exactly one-per-copy refs
    const local = cplRows.find((r) => rawRefOf(r.designator) === ref);
    if (!local) continue;
    const [a, b] = [...instances].sort((p, q) => p.x - q.x);
    candidates.push({
      offsetX: a!.x - local.x,
      centerY: a!.y + local.y,
      pitchX: b!.x - a!.x,
      pitchY: b!.y - a!.y,
    });
  }

  if (candidates.length === 0) {
    throw new Error(
      "could not derive panel coordinate transform: no unique-per-copy reference found",
    );
  }
  const ref = candidates[0]!;
  for (const c of candidates) {
    const tol = 0.01;
    if (
      Math.abs(c.offsetX - ref.offsetX) > tol ||
      Math.abs(c.centerY - ref.centerY) > tol ||
      Math.abs(c.pitchX - ref.pitchX) > tol ||
      Math.abs(c.pitchY - ref.pitchY) > tol
    ) {
      throw new Error(
        `panel transform candidates disagree (${candidates.length} pivots checked) -- ` +
          `panel does not look like a uniform rigid-translation 1x2 copy`,
      );
    }
  }
  return ref;
};

// --- per-board pipeline ------------------------------------------------------

const round = (v: number): number => Math.round(v * 1000) / 1000;

interface PanelResult {
  entry: string;
  bomRows: number;
  cplRows: number;
  transform: Transform;
  panelOutlineW: number;
  panelOutlineH: number;
}

const processBoard = async (entry: string): Promise<PanelResult> => {
  const outDir = `fab/${entry}-panel`;
  await Bun.spawn(["mkdir", "-p", outDir]).exited;

  console.log(`\n=== ${entry} ===`);

  const singlePcb = `${outDir}/single.kicad_pcb`;
  const panelPcb = `${outDir}/panel.kicad_pcb`;

  console.log("exporting verified single-board layout -> kicad_pcb ...");
  await mustRun(
    ["bunx", "tsci", "export", `${entry}.circuit.tsx`, "--format", "kicad_pcb", "-o", singlePcb],
    `tsci export kicad_pcb (${entry})`,
  );

  console.log("panelizing (KiKit: 1x2, rails on long sides, mouse bites, fiducials) ...");
  await mustRun(["python3", "scripts/panelize.py", singlePcb, panelPcb], `panelize.py (${entry})`);

  console.log("gating: mouse-bite holes vs board copper clearance ...");
  const gate = await run([KICAD_PYTHON, "scripts/check-bite-clearance.py", panelPcb]);
  // pcbnew prints harmless wx assert noise to stderr; the PASS/FAIL line is on stdout.
  const gateLine = gate.stdout.trim().split("\n").pop() ?? "";
  console.log(`  ${gateLine}`);
  if (gate.code !== 0) {
    throw new Error(`bite-clearance gate failed for ${entry}: ${gateLine}`);
  }

  console.log("exporting panel gerbers + drill ...");
  await mustRun(
    ["bash", "-c", `mkdir -p ${outDir}/gerbers`],
    `mkdir gerbers (${entry})`,
  );
  await mustRun(
    [
      KICAD_CLI, "pcb", "export", "gerbers",
      "--output", `${outDir}/gerbers/`,
      "--layers", GERBER_LAYERS,
      panelPcb,
    ],
    `kicad-cli pcb export gerbers (${entry})`,
  );
  await mustRun(
    [KICAD_CLI, "pcb", "export", "drill", "--output", `${outDir}/gerbers/`, panelPcb],
    `kicad-cli pcb export drill (${entry})`,
  );

  console.log("zipping panel gerbers ...");
  await run(["bash", "-c", `cd ${outDir}/gerbers && rm -f ../gerbers.zip && zip -q -r ../gerbers.zip .`]);

  console.log("rendering panel preview (SVG -> PNG) ...");
  const svgPath = `${outDir}/panel-render.svg`;
  await mustRun(
    [
      KICAD_CLI, "pcb", "export", "svg",
      "--output", svgPath,
      "--layers", "F.Cu,B.Cu,F.Silkscreen,B.Silkscreen,Edge.Cuts,F.Mask,B.Mask",
      "--page-size-mode", "2",
      panelPcb,
    ],
    `kicad-cli pcb export svg (${entry})`,
  );
  await run(["convert", "-density", "300", "-background", "white", svgPath, `${outDir}/panel-render.png`]);

  // --- derive panel coordinate transform + build BOM/CPL ---
  const cplText = await Bun.file(`fab/${entry}/cpl.csv`).text();
  const bomText = await Bun.file(`fab/${entry}/bom.csv`).text();
  const panelPcbText = await Bun.file(panelPcb).text();

  const cplRows = parseCsv(cplText)
    .slice(1)
    .map(([designator, mx, my, layer, rotation]) => ({
      designator: designator!,
      x: Number(mx),
      y: Number(my),
      layer: layer!,
      rotation: rotation!,
    }));

  // Hand-solder parts (jacks, LEDs -- no JLC library part, excluded from the
  // machine-placed CPL) still carry Mid X/Mid Y and are frequently the only
  // globally-unique-per-copy references on a board (e.g. links-control's
  // CPL is 3x "HDR", repeated per block -- every pivot candidate has to come
  // from J1..J12/LED1..LED3 instead). Used ONLY to derive the transform, not
  // included in the output panel CPL.
  const handSolderText = (await Bun.file(`fab/${entry}/hand-solder.csv`).exists())
    ? await Bun.file(`fab/${entry}/hand-solder.csv`).text()
    : "";
  const handSolderRows = parseCsv(handSolderText)
    .slice(1)
    .map(([designator, , , mx, my]) => ({ designator: designator!, x: Number(mx), y: Number(my) }));

  const panelFootprints = parsePanelFootprints(panelPcbText);
  const transform = deriveTransform(panelFootprints, [...cplRows, ...handSolderRows]);

  const toPanelXY = (localX: number, localY: number, copy: "A" | "B") => {
    const px = localX + transform.offsetX + (copy === "B" ? transform.pitchX : 0);
    const py = transform.centerY - localY + (copy === "B" ? transform.pitchY : 0);
    return { px: round(px), py: round(py) };
  };

  const panelCplLines = [csvLine(["Designator", "Mid X", "Mid Y", "Layer", "Rotation"])];
  for (const copy of ["A", "B"] as const) {
    for (const row of cplRows) {
      const { px, py } = toPanelXY(row.x, row.y, copy);
      panelCplLines.push(
        csvLine([`${row.designator}-${copy}`, px, py, row.layer, row.rotation]),
      );
    }
  }
  await Bun.write(`${outDir}/cpl.csv`, panelCplLines.join("\n") + "\n");

  const bomRows = parseCsv(bomText).slice(1);
  const panelBomLines = [csvLine(["Comment", "Designator", "Footprint", "LCSC Part #"])];
  for (const [comment, designators, footprint, lcsc] of bomRows) {
    const ds = designators!.split(",");
    const panelDs = [...ds.map((d) => `${d}-A`), ...ds.map((d) => `${d}-B`)];
    panelBomLines.push(csvLine([comment!, panelDs.join(","), footprint!, lcsc!]));
  }
  await Bun.write(`${outDir}/bom.csv`, panelBomLines.join("\n") + "\n");

  // panel outline bbox, parsed straight from Edge.Cuts gerber extents via
  // the gbrjob file kicad-cli writes alongside the gerbers (has plot area).
  const gbrjob = await Bun.file(`${outDir}/gerbers/panel-job.gbrjob`).exists()
    ? await Bun.file(`${outDir}/gerbers/panel-job.gbrjob`).text()
    : "";
  let panelOutlineW = NaN;
  let panelOutlineH = NaN;
  const sizeMatch = /"Size":\s*\{\s*"X":\s*([\d.]+),\s*"Y":\s*([\d.]+)/.exec(gbrjob);
  if (sizeMatch) {
    panelOutlineW = Number(sizeMatch[1]);
    panelOutlineH = Number(sizeMatch[2]);
  }

  console.log(
    `panel BOM rows: ${panelBomLines.length - 1}  |  panel CPL rows: ${panelCplLines.length - 1}  |  ` +
      `transform: offsetX=${transform.offsetX} centerY=${transform.centerY} pitch=(${transform.pitchX},${transform.pitchY})`,
  );

  return {
    entry,
    bomRows: panelBomLines.length - 1,
    cplRows: panelCplLines.length - 1,
    transform,
    panelOutlineW,
    panelOutlineH,
  };
};

// --- main --------------------------------------------------------------------

const ENTRIES = ["links-control", "links-main"];

const results: PanelResult[] = [];
for (const entry of ENTRIES) {
  if (!(await Bun.file(`fab/${entry}/cpl.csv`).exists())) {
    console.error(
      `fab/${entry}/cpl.csv missing -- run \`bun run export:fab\` first.`,
    );
    process.exit(1);
  }
  results.push(await processBoard(entry));
}

console.log("\n=== summary ===");
console.table(
  results.map((r) => ({
    board: r.entry,
    "BOM rows": r.bomRows,
    "CPL rows": r.cplRows,
    "panel W (mm)": r.panelOutlineW,
    "panel H (mm)": r.panelOutlineH,
  })),
);
