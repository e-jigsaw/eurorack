# Ripples v9 reference data

`v9.json` is the machine-readable baseline for the tscircuit rebuild.

It joins two original sources:

- `ripples/hardware_design/Ripples.xlsx`, sheet `Ripples v9.0`: value, package,
  procurement data, and SMT/PTH section
- `ripples/hardware_design/pcb/ripples_v90.brd`: PCB coordinate, rotation, and
  component side

Regenerate it from the repository root:

```bash
python3 ember/modules/ripples/scripts/extract-v9-reference.py
```

The extractor is also a consistency gate. It fails on duplicate references, BOM
quantity mismatches, unknown reference tokens, or any difference between the BOM
and board reference sets. The expected result is 143 placed components plus one
accessory row for the two LED holders.

`../fab-parts.ts` records the JLCPCB/LCSC sourcing selection and stock snapshot.
Potentiometers, the trimmer, and audio jacks are intentionally excluded because
they will be hand-soldered.
