// Ripples v9 JLCPCB/LCSC sourcing snapshot, checked 2026-07-13.
// Stock is informational: refresh it immediately before ordering.
// Pots, the trimmer, and audio jacks are excluded for hand soldering.

export type FabPartStatus = "ready" | "substitute" | "unavailable" | "excluded";

export interface RipplesFabPart {
  refs: string[];
  quantity: number;
  original: string;
  package: string;
  status: FabPartStatus;
  lcsc?: string;
  selectedMpn?: string;
  basic?: boolean;
  stock?: number;
  note: string;
}

type PartInput = Omit<RipplesFabPart, "refs" | "quantity">;
const part = (refs: string, details: PartInput): RipplesFabPart => {
  const referenceList = refs.split(",");
  return { refs: referenceList, quantity: referenceList.length, ...details };
};

const replacement = (
  refs: string,
  original: string,
  pkg: string,
  lcsc: string,
  selectedMpn: string,
  stock: number,
  note: string,
  basic = false,
) =>
  part(refs, {
    original,
    package: pkg,
    status: "substitute",
    lcsc,
    selectedMpn,
    stock,
    basic,
    note,
  });

const exact = (
  refs: string,
  original: string,
  pkg: string,
  lcsc: string,
  selectedMpn: string,
  stock: number,
  note = "Exact MPN and package.",
) =>
  part(refs, {
    original,
    package: pkg,
    status: "ready",
    lcsc,
    selectedMpn,
    stock,
    basic: false,
    note,
  });

export const RIPPLES_V9_FAB_PARTS: RipplesFabPart[] = [
  replacement(
    "R1,R2,R5,R7,R8,R13,R15,R17,R18,R20,R25,R26,R42,R44,R45,R46",
    "33.2k 0.1% 0402 thin-film",
    "0402",
    "C852727",
    "RT0402BRD0733K2L",
    7188,
    "0.1%, 62.5mW, 25ppm/°C; meets requirements.",
  ),
  replacement(
    "R9,R10,R12,R14,R38,R63",
    "16.2k 0.1% 0402 thin-film",
    "0402",
    "C2441157",
    "ARG02BTC1622",
    11080,
    "0.1%, 62.5mW, 25ppm/°C; meets requirements.",
  ),
  replacement(
    "R22,R23,R27,R28,R61",
    "1.50k 0.1% 0402 thin-film",
    "0402",
    "C850869",
    "AT0402BRD071K5L",
    10070,
    "0.1%, 63mW, 25ppm/°C; meets requirements.",
  ),
  replacement(
    "R3,R4,R6,R11",
    "510 ohm 1%",
    "0402",
    "C25123",
    "0402WGF5100TCE",
    2395900,
    "1%, 62.5mW.",
    true,
  ),
  replacement(
    "R19,R21",
    "820 ohm 1%",
    "0402",
    "C137933",
    "RC0402FR-07820RL",
    189718,
    "1%, 62.5mW.",
  ),
  replacement(
    "R24,R36,R37,R39,R40,R49,R54,R58,R59",
    "100k 1%",
    "0402",
    "C25741",
    "0402WGF1003TCE",
    15436416,
    "1%, 62.5mW.",
    true,
  ),
  replacement(
    "R30,R34",
    "39k 1%",
    "0402",
    "C25783",
    "0402WGF3902TCE",
    337863,
    "JLCPCB preferred; 1%, 62.5mW.",
  ),
  replacement(
    "R31,R69",
    "22k 1%",
    "0402",
    "C25768",
    "0402WGF2202TCE",
    1663344,
    "1%, 62.5mW.",
    true,
  ),
  replacement(
    "R32,R33,R43,R68",
    "51k 1%",
    "0402",
    "C25794",
    "0402WGF5102TCE",
    1843453,
    "1%, 62.5mW.",
    true,
  ),
  replacement(
    "R35,R70",
    "Yageo AC0402FR-0710ML",
    "0402",
    "C138067",
    "RC0402FR-0710ML",
    488310,
    "Same Yageo value, package, tolerance, and power class.",
  ),
  replacement(
    "R47,R64",
    "68k 1%",
    "0402",
    "C36871",
    "0402WGF6802TCE",
    323055,
    "JLCPCB preferred; 1%, 62.5mW.",
  ),
  replacement(
    "R48,R50,R56,R57,R60",
    "30k 1%",
    "0402",
    "C25776",
    "0402WGF3002TCE",
    1047804,
    "1%, 62.5mW.",
  ),
  replacement(
    "R53,R62",
    "6.8k 1%",
    "0402",
    "C25917",
    "0402WGF6801TCE",
    328542,
    "JLCPCB preferred; 1%, 62.5mW.",
  ),
  replacement(
    "R55",
    "0 ohm jumper",
    "0402",
    "C17168",
    "0402WGF0000TCE",
    18421967,
    "Standard zero-ohm jumper.",
    true,
  ),
  replacement(
    "R65,R66,R67",
    "Panasonic ERJ-PA3D1001V 1k",
    "0603",
    "C2653986",
    "ESR03EZPF1001",
    24357,
    "1%, 250mW; preserves the >=200mW requirement.",
  ),

  replacement(
    "C1,C3,C4,C5,C21,C22,C25",
    "560pF 50V C0G 5%",
    "0402",
    "C464953",
    "GCM1555C1H561JA16D",
    50383,
    "50V C0G, 5%; meets requirements.",
  ),
  replacement(
    "C2,C7,C11,C12,C15,C18,C19,C20,C23,C24,C28,C29,C32,C33",
    "100nF >=25V X5R 20%",
    "0402",
    "C307331",
    "CL05B104KB54PNC",
    15968470,
    "50V X7R, 10%; exceeds requirements.",
    true,
  ),
  exact(
    "C6,C10",
    "Panasonic EEE-FT1V220AR",
    "SMD D4xL5.8mm",
    "C178597",
    "EEEFT1V220AR",
    1470,
    "Exact Panasonic part; JLCPCB spelling omits the hyphen.",
  ),
  replacement(
    "C8,C9,C13,C14",
    "220pF 50V C0G 2%",
    "0603",
    "C327167",
    "CC0603GRNPO9BN221",
    4088,
    "50V NP0, 2%; meets requirements.",
  ),
  replacement(
    "C16,C17",
    "4.7uF >=35V X5R 20%",
    "1206",
    "C29823",
    "1206B475K500NT",
    620868,
    "50V X7R, 10%; exceeds requirements.",
    true,
  ),
  replacement(
    "C26,C27,C30,C31",
    "22pF 50V C0G 5%",
    "0402",
    "C1555",
    "0402CG220J500NT",
    1434087,
    "50V C0G, 5%; meets requirements.",
    true,
  ),

  exact(
    "D1,D2",
    "Diodes Inc 1N5819HW-7-F",
    "SOD-123",
    "C82544",
    "1N5819HW-7-F",
    388818,
  ),
  replacement(
    "D3,D4,D7,D8",
    "onsemi 1N4148WT",
    "SOD-523",
    "C917006",
    "1N4148WT",
    875106,
    "Package-exact 1N4148WT; avoids SOD-523F variants.",
  ),
  exact(
    "D5,D6",
    "Diodes Inc BZT585B3V3T-7",
    "SOD-523",
    "C2759891",
    "BZT585B3V3T-7",
    1670,
  ),
  exact(
    "D9,D10,D11,D12,D13,D14",
    "TDK B72500D160H60",
    "0603",
    "C210791",
    "B72500D0160H060",
    15479,
    "Exact TDK ordering code; the workbook omits two zeroes.",
  ),
  replacement(
    "L1,L2",
    "Würth 742792664",
    "0603",
    "C51886028",
    "SCBW160808U102T",
    3760,
    "1k ohm at 100MHz, 500mA, 0.4 ohm DCR; meets or exceeds the original ratings.",
  ),
  exact(
    "P1",
    "Littelfuse 1206L035/16YR",
    "1206",
    "C126817",
    "1206L035/16YR",
    5912,
  ),
  replacement(
    "Q1,Q2",
    "Diodes Inc MMBT3906-7-F",
    "SOT-23 B-E-C",
    "C53444",
    "MMBT3906LT1G",
    82630,
    "onsemi MMBT3906 with the same package and pinout.",
  ),

  part("IC1", {
    original: "Coolaudio V2164M",
    package: "SOIC-16",
    status: "unavailable",
    note:
      "V2164M, V2164M/D, SSI2164, and SSI2164S-RT all show zero JLCPCB stock. Source externally and consign, or hand-solder.",
  }),
  exact(
    "IC2,IC7,IC8",
    "Texas Instruments OPA1679IPWR",
    "TSSOP-14",
    "C2057264",
    "OPA1679IPWR",
    2699,
  ),
  exact(
    "IC3,IC4",
    "Texas Instruments LM4040C10IDBZR",
    "SOT-23",
    "C201738",
    "LM4040C10IDBZR",
    5287,
  ),
  replacement(
    "IC5",
    "Texas Instruments LM13700M/NOPB",
    "SOIC-16",
    "C174050",
    "LM13700MX/NOPB",
    7419,
    "Same device/package; MX is the tape-and-reel suffix. Exact C1346265 has 49 in stock.",
  ),
  exact(
    "IC6",
    "Texas Instruments TL074CPWR",
    "TSSOP-14",
    "C96507",
    "TL074CPWR",
    401,
    "Exact MPN/package; recheck because stock is relatively thin.",
  ),

  replacement(
    "JP1",
    "2x5 boxed Eurorack power header",
    "THT 2x5 P2.54mm",
    "C2977596",
    "DC3-2.54-10PAS",
    7599,
    "Used by Ember Links; verify key orientation in Ripples placement.",
  ),
  part("LED1", {
    original: "OptoSupply OSC84L3131A baby-pink LED",
    package: "THT 3mm P2.54mm",
    status: "unavailable",
    note:
      "No JLCPCB entry or color-equivalent assembly part found. Source exact externally and consign, or hand-solder.",
  }),
  part("LED2", {
    original: "OptoSupply OSC54L3131A mint-green LED",
    package: "THT 3mm P2.54mm",
    status: "unavailable",
    note:
      "No JLCPCB entry or color-equivalent assembly part found. Source exact externally and consign, or hand-solder.",
  }),
  part("SW1", {
    original: "SS70070F-0202 DPDT slide switch",
    package: "custom THT",
    status: "unavailable",
    note:
      "No JLCPCB entry or mechanically compatible replacement found. Source exact externally and consign, or hand-solder.",
  }),
  part("R16,R29,R41,R51,R52", {
    original: "panel potentiometers and trimmer",
    package: "THT/custom",
    status: "excluded",
    note: "Excluded from JLCPCB sourcing; user will hand-solder.",
  }),
  part("J1,J2,J3,J4,J5,J6,J7,J8,J9", {
    original: "Thonkiconn vertical audio jacks",
    package: "THT/custom",
    status: "excluded",
    note: "Excluded from JLCPCB sourcing; user will hand-solder.",
  }),
];

export const lookupRipplesFabPart = (ref: string): RipplesFabPart | undefined =>
  RIPPLES_V9_FAB_PARTS.find(({ refs }) => refs.includes(ref));
