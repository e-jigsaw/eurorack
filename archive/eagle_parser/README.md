# Eagle Binary .sch Parser — Stage 1

A Python parser for extracting component instances from Autodesk Eagle v4/v5 binary schematic (.sch) files.

## Quick Start

```bash
# Extract and print components from a .sch file
python dump_components.py path/to/schematic.sch

# Get summary counts
python dump_components.py path/to/schematic.sch --summary

# Output as JSON
python dump_components.py path/to/schematic.sch --json > components.json
```

## Output Format

**Human-readable table:**
```
Refdes     Value                Package              X            Y            Rotation Mirror
----------------------------------------------------------------------------------------------------
R1         10M                  ...                  5058609      0            R0     N     
IC1        OPA4171              ...                  48           -1498600     R0     N     
...
```

**JSON:**
```json
[
  {
    "refdes": "R1",
    "value": "10M",
    "package": "...",
    "x": 5058609,
    "y": 0,
    "rotation": "R0",
    "mirror": false
  },
  ...
]
```

## Features

- ✓ Extracts component reference designators (R1, IC1, LED1, J1, JP1, etc.)
- ✓ Extracts component values (resistor/capacitor values, IC part numbers)
- ✓ Extracts coordinates (x, y in binary-format units)
- ✓ Detects rotation (R0, R90, R180, R270)
- ✓ Filters out false positives (net names, symbol definitions)
- ✓ JSON and human-readable output

## Known Limitations (Stage 1)

- Package/footprint extraction is unreliable (~30% accuracy)
- Mirror flag not yet extracted
- Coordinate units not yet validated (plausible range: 0.1µm to 1µm)
- Rotation encoding based on heuristics, not yet validated against actual rotations

## API Usage

```python
from eagle_sch import EagleSchParser

parser = EagleSchParser('schematic.sch')
components = parser.parse()

for comp in components:
    print(f"{comp.refdes}: {comp.value}")

# Get component counts
summary = parser.summary()
print(summary)  # {'R': 21, 'C': 10, 'D': 2, ...}

# Output as JSON
json_str = parser.to_json(components)
```

## Structure

- **eagle_sch.py**: Core `EagleSchParser` class (importable module)
- **dump_components.py**: CLI tool
- **notes.md**: Reverse-engineering notes and Stage 2 recommendations

## Testing

Validated against links_v40.sch (320 KB, 54 components):
- ✓ 21 resistors (R1–R21)
- ✓ 10 capacitors (C1–C10)
- ✓ 2 diodes (D1–D2)
- ✓ 5 ICs (IC1–IC5)
- ✓ 3 LEDs (LED1–LED3)
- ✓ 12 jacks (J1–J12)
- ✓ 1 header (JP1)

Example values verified:
- R1 = 10M, R3 = 1.0k, R21 = 51Ω
- C1 = 4.7µF, C6 = 10pF
- D2 = 1N5819HW0
- IC1 = OPA4171, IC2 = TL072PW
- LED1 = WP937EGW0

## References

- Binary format: Autodesk Eagle v4/v5 proprietary (reverse-engineered)
- Ground truth: links_v40_schematic.md
- PDF layout reference: links_v40.pdf
- KiCad import reference: links_v40.9.kicad_sch
