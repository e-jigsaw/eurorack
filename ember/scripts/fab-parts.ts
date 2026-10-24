// LCSC/JLCPCB parts map for the Links SMD parts that don't already carry an
// explicit `supplier_part_numbers.jlcpcb` entry on their source_component
// (those — the male/female 1x6 headers C37208/C2832269 and JP1's board-to-
// board header C2977596 — are resolved straight from circuit.json and never
// consult this file).
//
// Sourced against the jlcsearch community API
// (https://jlcsearch.tscircuit.com), ~0.5s between calls, 2026-07-12.
// Selection rule: original electrical specifications take priority over stock
// and basic-part status. 100k updated 2026-09-10 to the original Panasonic part.
// Package MUST match the footprint used
// in the design; prefer `is_basic` (no JLCPCB assembly setup fee) parts;
// among basic (or, failing that, all) candidates, prefer highest stock.
//
// Keys:
// - CHIP_PARTS: keyed by the exact `manufacturer_part_number` string each
//   chip primitive passes to `manufacturerPartNumber` (see
//   primitives/chips/*.tsx) — this is what ends up on
//   source_component.manufacturer_part_number in circuit.json, so it's a
//   direct, stable lookup key.
// - RESISTOR_PARTS: keyed by resistance in ohms (source_component.resistance
//   is already a plain number of ohms in circuit.json). Every resistor in
//   this design uses the 0603 footprint (verified: every simple_resistor
//   pcb_component in dist/*/circuit.json has the same ~2.45mm x 0.95mm
//   bounding box) — there is currently no second resistor footprint to
//   disambiguate against.
// - CAPACITOR_PARTS: keyed by `${capacitanceFarads}:${footprint}` — the only
//   two footprints in play are 0603 (100nF, 10pF) and 0805 (22uF, PWR
//   block), so the capacitance value alone would be enough, but the compound
//   key is kept so a future third value doesn't silently collide.

export interface FabPart {
  /** LCSC part number, "C" prefix included. */
  lcsc: string;
  /** Manufacturer part number as returned by jlcsearch. */
  mpn: string;
  /** JLCPCB package/footprint as returned by jlcsearch. */
  package: string;
  /** true = JLCPCB basic part (no assembly setup fee). */
  basic: boolean | null;
  /** Stock at time of sourcing (2026-07-12) — informational only. */
  stock: number | null;
  /** One-line rationale / tradeoff note. */
  note: string;
}

export const CHIP_PARTS: Record<string, FabPart> = {
  OPA4171AIPW: {
    lcsc: "C529553",
    mpn: "OPA4171AIPWR",
    package: "TSSOP-14",
    basic: false,
    stock: 539,
    note:
      "Only TSSOP-14 OPA4171 on jlcsearch (SOIC-14/SOIC variants exist but " +
      "don't match our footprint). Extended part — low stock (539), watch " +
      "availability before ordering.",
  },
  TL072CPW: {
    lcsc: "C4370341",
    mpn: "TL072HIPWR",
    package: "TSSOP-8",
    basic: false,
    stock: 319,
    note:
      "TSSOP-8 required (NOT SOIC-8 — verified package field). The literal " +
      "TL072CPWR (C90748) is TSSOP-8 too but stock=1 (effectively " +
      "unavailable); TL072HIPWR is TI's pin/pkg-compatible higher-spec " +
      "sibling in the same TSSOP-8, better stock (319). TL072CPWRG4 " +
      "(C4370491) is TSSOP-8 as well but stock=3. All TSSOP-8 options here " +
      "are extended (no basic TSSOP-8 TL072 exists) and stock is thin " +
      "across the board — reorder check recommended close to order time.",
  },
  "LM321MFX/NOPB": {
    lcsc: "C9405",
    mpn: "LM321MFX/NOPB",
    package: "SOT-23-5",
    basic: false,
    stock: 42018,
    note:
      "Exact MPN match (matches manufacturer_part_number in the design) in " +
      "SOT-23-5, extended but healthy stock (42k). Higher-stock SOT-23-5 " +
      "alternates exist (e.g. LM321DTR(XBLW) C18723612, 238k stock) but " +
      "differ from the specified TI part number, so the exact-MPN match " +
      "was kept.",
  },
  "1N5819HW-7-F": {
    lcsc: "C82544",
    mpn: "1N5819HW-7-F",
    package: "SOD-123",
    basic: false,
    stock: 431900,
    note:
      "Exact MPN match (Diodes Inc), 40V/1A Schottky — the PSU input " +
      "protection diodes D1/D2 (ftype simple_diode, resolved via this " +
      "map by export-fab.ts). Verified on LCSC 2026-10-24: stock " +
      "431,900, extended (SMT Extended). " +
      "https://www.lcsc.com/product-detail/C82544.html",
  },
};

export const RESISTOR_PARTS: Record<string, FabPart> = {
  "51": {
    lcsc: "C23197",
    mpn: "0603WAF510JT5E",
    package: "0603",
    basic: true,
    stock: 1227844,
    note: "Basic part, top of the resistance-filtered 0603/51R list by stock.",
  },
  "1000": {
    lcsc: "C21190",
    mpn: "0603WAF1001T5E",
    package: "0603",
    basic: true,
    stock: 15873089,
    note: "Basic part, highest stock for 0603/1k.",
  },
  "33000": {
    lcsc: "C4216",
    mpn: "0603WAF3302T5E",
    package: "0603",
    basic: true,
    stock: 1545728,
    note: "Basic part, highest stock for 0603/33k.",
  },
  "100000": {
    lcsc: "C190609",
    mpn: "ERA3AEB104V",
    package: "0603",
    basic: null,
    stock: null,
    note: "Original Links BOM ERA-3AEB104V: 100k, 0.1%, thin film, " +
      "25ppm/K, 0.1W. Panasonic official specifications and LCSC/JLCPCB " +
      "C190609 mapping checked 2026-09-10. Replaces non-equivalent 1% " +
      "thick-film C25803. Live assembly stock/basic status unverified (null). " +
      "https://industrial.panasonic.com/ww/products/pt/high-precision-chip-resistors/models/ERA3AEB104V " +
      "https://jlcpcb.com/partdetail/PANASONIC-ERA3AEB104V/C190609",
  },
  "10000000": {
    lcsc: "C7250",
    mpn: "0603WAF1005T5E",
    package: "0603",
    basic: true,
    stock: 270546,
    note:
      "Basic part. NOT the highest-stock 0603/10M match overall — " +
      "RC0603FR-0710ML (C114606, 1.2M stock) is bigger but extended; basic " +
      "takes priority per the sourcing rule, so C7250 was picked despite " +
      "lower stock.",
  },
};

// Capacitance values as they appear in source_component.capacitance (farads).
const F_100N = 1e-7;
const F_10P = 1e-11;
const F_4U7 = 4.7e-6;
const F_22U = 2.2e-5;

export const CAPACITOR_PARTS: Record<string, FabPart> = {
  [`${F_100N}:0603`]: {
    lcsc: "C14663",
    mpn: "CC0603KRX7R9BB104",
    package: "0603",
    basic: true,
    stock: 81299425,
    note: "X7R, 50V (>=16V required) — basic, huge stock, easy pick.",
  },
  [`${F_10P}:0603`]: {
    lcsc: "C1634",
    mpn: "CL10C100JB8NNNC",
    package: "0603",
    basic: true,
    stock: 1340862,
    note: "C0G/NP0, 50V (>=50V required) — basic, huge stock, easy pick.",
  },
  [`${F_4U7}:0805`]: {
    lcsc: "C1779",
    mpn: "CL21A475KAQNNNE",
    package: "0805",
    basic: true,
    stock: 533960,
    note:
      "X5R, 25V — same Samsung CL21A series as the 22uF pick below. " +
      "The single-board design's C1/C2 (PSU bulk) are 4.7uF, not the " +
      "22uF of the original BOM, so the C45783 entry must not carry " +
      "over. Basic part, verified on LCSC 2026-10-24: stock 533,960. " +
      "https://www.lcsc.com/product-detail/C1779.html",
  },
  [`${F_22U}:0805`]: {
    lcsc: "C45783",
    mpn: "CL21A226MAQNNNE",
    package: "0805",
    basic: true,
    stock: 5389915,
    note:
      "Design intent was X7R 0805 22uF, but that combination barely exists " +
      "in the real market: jlcsearch turns up exactly one X7R 22uF/0805 " +
      "(GRM21BZ71A226ME15L, C907991) and it's extended, 10V-rated, and " +
      "low-stock (85k) — every other 22uF/0805 part on the list (dozens, " +
      "including all the high-stock/basic ones) is X5R. Picked the basic, " +
      "highest-stock X5R option at 25V (>=10V, comfortably above the " +
      "eurorack ±12V rails) instead of chasing the unavailable X7R combo " +
      "or dropping to a tantalum. X5R's temperature-coefficient drift " +
      "matters far less here than on a precision timing/filter node — " +
      "these are PSU decoupling/bulk caps.",
  },
};

/** Lookup helper: resistor by ohms (as stored in source_component.resistance). */
export const lookupResistor = (ohms: number): FabPart | undefined =>
  RESISTOR_PARTS[String(ohms)];

/** Lookup helper: capacitor by farads + footprint ("0603" | "0805" | ...). */
export const lookupCapacitor = (
  farads: number,
  footprint: string,
): FabPart | undefined => CAPACITOR_PARTS[`${farads}:${footprint}`];

/** Lookup helper: chip by manufacturer_part_number. */
export const lookupChip = (mpn: string): FabPart | undefined =>
  CHIP_PARTS[mpn];
