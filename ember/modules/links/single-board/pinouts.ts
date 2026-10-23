// Pin numbers checked against TI OPAx171, TL07xx and LM321 datasheets.
// Explicit PW body width is required in the circuit: footprinter's default
// tssop width is 3mm, whereas the selected PW packages use a 4.4mm body.
export const opa4171Pins = {
  pin1: "OUT_A", pin2: "IN_A_NEG", pin3: "IN_A_POS", pin4: "VCC",
  pin5: "IN_B_POS", pin6: "IN_B_NEG", pin7: "OUT_B", pin8: "OUT_C",
  pin9: "IN_C_NEG", pin10: "IN_C_POS", pin11: "VEE", pin12: "IN_D_POS",
  pin13: "IN_D_NEG", pin14: "OUT_D",
} as const;
export const tl072Pins = {
  pin1: "OUT_A", pin2: "IN_A_NEG", pin3: "IN_A_POS", pin4: "VEE",
  pin5: "IN_B_POS", pin6: "IN_B_NEG", pin7: "OUT_B", pin8: "VCC",
} as const;
// LM321 (SNOS935C, p3), NOT the pin order used by OPA171's SOT-23 package.
export const lm321Pins = {
  pin1: "IN_POS", pin2: "VEE", pin3: "IN_NEG", pin4: "OUT", pin5: "VCC",
} as const;
