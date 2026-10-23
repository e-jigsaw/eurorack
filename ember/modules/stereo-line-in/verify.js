import { parts } from "./model";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import createEngine from "@tscircuit/ngspice-spice-engine";
const root = new URL("./generated/", import.meta.url);
const engine = await createEngine();
const val = (v) => v.replace("F", "").replace("M", "Meg");
const node = (n) => n === "GND" ? "0" : n;
const get = (r) => parts.find((p) => p.ref === r);
const results = [];
function deck(alpha, source, step, stop, load = "100k") {
  const lines = [
    "Stereo Line In B - functional circuit verification",
    "VPLUS VP 0 11.6",
    "VMINUS VN 0 -11.6",
    "VSRC SRC 0 " + source,
    "VREF VREF 0 2.495",
    "VLED VLED 0 11.2",
    `.options method=gear
.model DGEN D(Is=1e-12 N=1 Rs=1)`,
    `
.subckt OP P N O`,
    "EGAIN DRIVER 0 P N 100k",
    "RDOM DRIVER DOM 1Meg",
    "CDOM DOM 0 1n",
    "VCP CP 0 10",
    "VCN CN 0 -10",
    "DCP DOM CP DGEN",
    "DCN CN DOM DGEN",
    "BOUT O 0 V=max(-10.6,min(10.6,V(DOM)))",
    ".ends OP"
  ];
  for (const p of parts) {
    if (p.ref.startsWith("R_TH_"))
      lines.push(`${p.ref} ${node(p.pins["1"])} ${node(p.pins["2"])} ${val(p.value)}`);
    if (p.section !== "L-analog")
      continue;
    if (["R", "C"].includes(p.kind))
      lines.push(`${p.ref} ${node(p.pins["1"])} ${node(p.pins["2"])} ${val(p.value)}`);
    if (p.kind === "D")
      lines.push(`${p.ref} ${node(p.pins["2"])} ${node(p.pins["1"])} DGEN`);
  }
  for (const leg of ["P", "N"]) {
    const raw = leg === "P" ? "TIP" : "RING";
    lines.push(`B_${leg} L_${raw} 0 V=${leg === "P" ? "0.5" : "-0.5"}*V(SRC)`);
    for (const ref of [`R_L_${leg}_BLEED`, `R_L_${leg}_SERIES`, `C_L_${leg}_AC`]) {
      const p = get(ref);
      lines.push(`${p.ref} ${node(p.pins["1"])} ${node(p.pins["2"])} ${val(p.value)}`);
    }
    lines.push(`R_RX_BIAS_${leg} L_RX_${leg} 0 500k`);
  }
  lines.push("B_RX L_RX_OUT 0 V=max(-10.2,min(10.2,V(L_RX_P,L_RX_N)))");
  lines.push(`R_POT_TOP L_RX_OUT L_WIPER ${Math.max(0.001, 1e4 * (1 - alpha))}`, `R_POT_BOTTOM L_WIPER 0 ${Math.max(0.001, 1e4 * alpha)}`, `R_LOAD L_OUT 0 ${load}`);
  for (const [tag, p, n, o] of [["A", "L_WIPER", "L_GAIN_FB", "L_DRIVE"], ["B", "0", "L_HALF_SUM", "L_HALF_DRIVE"], ["C", "0", "L_ABS_SUM", "L_ABS"], ["D", "L_ABS", "L_PEAK_FOLLOW", "L_PEAK_DRIVE"]])
    lines.push(`X${tag} ${p} ${n} ${o} OP`);
  lines.push("XENV L_ENV L_ENV_BUF L_ENV_BUF OP", "I_CMP_BIAS 0 L_ENV_BUF 100n");
  lines.push(`.tran ${step} ${stop} 0 ${step}`, ".save v(SRC) v(L_OUT) v(L_HALF) v(L_ABS) v(L_ENV)", ".end");
  return lines.join(`
`);
}
for (const tc of [
  { name: "1kHz-unity", a: 0.1, src: "SIN(0 1 1000)", step: "2u", stop: "15m", start: 0.01, expected: 0.995, env: 0.199 },
  { name: "20Hz-10Vpp", a: 0.5, src: "SIN(0 1 20)", step: "50u", stop: "200m", start: 0.15, expected: 4.96, env: 0.99 },
  { name: "20kHz-10Vpp", a: 0.5, src: "SIN(0 1 20000)", step: ".2u", stop: "3m", start: 0.002, expected: 4.94, env: 0.98 },
  { name: "minus10dBV-maxgain", a: 1, src: "SIN(0 0.4472136 1000)", step: "2u", stop: "15m", start: 0.01, expected: 4.45, env: 0.89 },
  { name: "17dBu-source-attenuated", a: 0.0645, src: "SIN(0 7.759 1000)", step: "2u", stop: "15m", start: 0.01, expected: 4.98, env: 0.99 },
  { name: "negative-pulse-and-release", a: 0.1, src: "PWL(0 0 1m 0 1.01m -5 5m -5 5.01m 0 205m 0)", step: "10u", stop: "205m", start: 0.003, expected: 4.98, env: 0.99 },
  { name: "mute", a: 0, src: "SIN(0 7.759 1000)", step: "2u", stop: "5m", start: 0.001, expected: 0, env: 0 }
]) {
  const spice = deck(tc.a, tc.src, tc.step, tc.stop);
  await writeFile(new URL(`${tc.name}.cir`, root), spice + `
`);
  const sim = await engine.simulate(spice);
  const gs = sim.simulationResultCircuitJson;
  const graph = (name) => gs.find((g) => (g.name ?? "").toLowerCase() === name.toLowerCase());
  const out = graph("l_out"), env = graph("l_env"), abs = graph("l_abs");
  assert(out && env && abs, `Missing graph: ${tc.name}`);
  const times = out.timestamps_ms?.map((t) => t / 1000) ?? out.time_points ?? out.timestamps ?? out.time;
  if (!times)
    throw new Error("Unknown graph format " + JSON.stringify(Object.keys(out)));
  assert(times.at(-1) >= Number(tc.stop.replace("m", "")) / 1000 * 0.999, "Simulation did not reach stop time");
  const peak = (g) => Math.max(...g.voltage_levels.filter((_, i) => times[i] >= tc.start).map(Math.abs));
  const outPeak = peak(out), envPeak = peak(env);
  assert(Math.abs(outPeak - tc.expected) < 0.06, `${tc.name} OUT ${outPeak}`);
  assert(tc.env === 0 ? envPeak < 0.00001 : Math.abs(envPeak / (0.2 * outPeak) - 1) < 0.05, `${tc.name} held peak error ${envPeak}`);
  const rectifierError = Math.max(...out.voltage_levels.map((v, i) => Math.abs(abs.voltage_levels[i] - 0.2 * Math.abs(v))));
  const row = { name: tc.name, outPeak, envPeak, heldPeakErrorPercent: tc.env ? 100 * (envPeak / (0.2 * outPeak) - 1) : 0, maxRectifierCommutationError: rectifierError };
  if (tc.name.includes("release")) {
    const start = times.findIndex((t) => t >= 0.006), end = times.findIndex((t) => t >= 0.106);
    row.releaseRatio = env.voltage_levels[end] / env.voltage_levels[start];
    assert(Math.abs(row.releaseRatio - Math.exp(-1)) < 0.015, "Release constant");
  }
  results.push(row);
  console.log(JSON.stringify(row));
}
assert.equal(new Set(parts.map((p) => p.ref)).size, parts.length);
for (const ch of ["L", "R"]) {
  assert.equal(get(`D_${ch}_PEAK`).pins["2"], `${ch}_PEAK_DRIVE`);
  assert.equal(get(`D_${ch}_HALF_RECT`).pins["1"], `${ch}_HALF_DRIVE`);
  assert.equal(get(`U_METER_${ch}`).pins["12"], "GND");
  assert.equal(get(`U_${ch}`).pins["11"], "VN");
  for (const p of parts.filter((p) => p.section.startsWith(ch + "-")))
    for (const n of Object.values(p.pins))
      assert(!n.startsWith((ch === "L" ? "R" : "L") + "_"), "Unintended cross-channel connection");
}
const thresholds = [240000, 52300, 15000, 5620].map((r) => 2.495 * 1e4 / (r + 1e4) / 0.2);
await writeFile(new URL("verification.json", root), JSON.stringify({ model: "ngspice; generic finite-gain single-pole rail-limited amplifiers and generic diodes; not manufacturer macro-models; 15.9MHz nominal gain-bandwidth; no slew-rate model", results, thresholds, partCount: parts.length, notValidated: ["Manufacturer macro-model behavior, THD+N, CMRR, slew rate and overload recovery", "Actual 4HP placement, footprints, potentiometer fit and jack fit", "EMC/ESD, rail reversal transient, live component availability, physical hardware"] }, null, 2) + `
`);
console.log("PASS: " + results.length + " functional SPICE cases; net integrity; peak thresholds " + thresholds.join(", "));
