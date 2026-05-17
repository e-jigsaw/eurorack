#!/usr/bin/env python3
"""
Generate JLCPCB BOM and CPL files from Eagle .brd + substitution table.

Output:
  - BOM CSV: Comment, Designator, Footprint, LCSC Part #
  - CPL CSV: Designator, Val, Package, Mid X, Mid Y, Rotation, Layer
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, Optional, List, Tuple

from eagle_brd import EagleBrdParser, BoardComponent

# Substitution table: refdes pattern -> (LCSC, value, footprint override)
# None = keep original
SUBSTITUTIONS: Dict[str, Tuple[str, Optional[str], Optional[str]]] = {
    # (LCSC,  value_override,  footprint_override)
    'R1':     ('C114606',  None, None),         # RC0603FR-0710ML
    'R2':     ('C403260',  None, None),         # ERJ-3EKF51R0V
    'R3':     ('C118155',  None, None),         # ERJ-3EKF1001V
    'R4':     ('C403260',  None, None),
    'R5':     ('C403260',  None, None),
    'R6':     ('C190609',  None, None),         # ERA-3AEB104V
    'R7':     ('C190609',  None, None),
    'R8':     ('C190609',  None, None),
    'R9':     ('C190609',  None, None),
    'R10':    ('C190609',  None, None),
    'R11':    ('C118155',  None, None),
    'R12':    ('C403260',  None, None),
    'R13':    ('C403260',  None, None),
    'R14':    ('C190609',  None, None),
    'R15':    ('C278619',  None, None),         # ERJ-3EKF3302V
    'R16':    ('C190609',  None, None),
    'R17':    ('C190609',  None, None),
    'R18':    ('C190609',  None, None),
    'R19':    ('C118155',  None, None),
    'R20':    ('C190609',  None, None),
    'R21':    ('C403260',  None, None),
    'C1':     ('C15850',   '10uF',  'Capacitor_SMD:C_0805_2012Metric'),
    'C2':     ('C15850',   '10uF',  'Capacitor_SMD:C_0805_2012Metric'),
    'C3':     ('C14663',   None, None),         # 100nF YAGEO
    'C4':     ('C14663',   None, None),
    'C5':     ('C14663',   None, None),
    'C6':     ('C1644',    '15pF',  None),      # 10pF -> 15pF
    'C7':     ('C14663',   None, None),
    'C8':     ('C14663',   None, None),
    'C9':     ('C1644',    '15pF',  None),
    'C10':    ('C14663',   None, None),
    'D1':     ('C82544',   None, None),
    'D2':     ('C82544',   None, None),
    'IC1':    ('C529553',  None, None),
    'IC2':    ('C67473',   'TL072CDR', 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm'),
    'IC3':    ('C9405',    None, None),
    'IC4':    ('C67473',   'TL072CDR', 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm'),
    'IC5':    ('C9405',    None, None),
    'LED1':   ('C5383216', None, None),
    'LED2':   ('C5383216', None, None),
    'LED3':   ('C5383216', None, None),
}

# Hand-solder exclusions (not in PCBA)
EXCLUDE = {'J1','J2','J3','J4','J5','J6','J7','J8','J9','J10','J11','J12','JP1'}

# Default footprint lookup
def default_footprint(comp: BoardComponent) -> str:
    r = comp.refdes
    v = (comp.value or '').upper()
    if r.startswith('R'):   return 'Resistor_SMD:R_0603_1608Metric'
    if r.startswith('C'):
        if 'U' in v and not v.startswith('10'):
            return 'Capacitor_SMD:C_0805_2012Metric'
        return 'Capacitor_SMD:C_0603_1608Metric'
    if r.startswith('D'):   return 'Diode_SMD:D_SOD-123'
    if r.startswith('LED'): return 'LED_THT:LED_D3.0mm'
    if r.startswith('IC'):
        if 'OPA417' in v: return 'Package_SO:TSSOP-14_4.4x5mm_P0.65mm'
        if 'TL07' in v:  return 'Package_SO:TSSOP-8_3x3mm_P0.65mm'
        if 'LM321' in v: return 'Package_TO_SOT_SMD:SOT-23-5'
    return 'Resistor_SMD:R_0603_1608Metric'


def export(brd_path: str, out_dir: str):
    parser = EagleBrdParser(brd_path)
    comps = parser.parse()

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Group by (LCSC, value, footprint) for BOM
    groups: Dict[str, List[str]] = defaultdict(list)  # key = "lcsc|comment|fp" -> [refdes]
    cpl_rows: List[dict] = []

    for comp in comps:
        if comp.refdes in EXCLUDE:
            continue
        sub = SUBSTITUTIONS.get(comp.refdes)
        if not sub:
            continue

        lcsc, val_override, fp_override = sub
        value = val_override or comp.value or ''
        fp = fp_override or default_footprint(comp)

        key = f"{lcsc}|{value}|{fp}"
        groups[key].append(comp.refdes)

        # CPL row
        rot = {'R0': 0, 'R90': 90, 'R180': 180, 'R270': 270}.get(comp.rotation, 0)
        layer = 'bottom' if comp.layer == 'bottom' else 'top'
        cpl_rows.append({
            'Designator': comp.refdes,
            'Val': value,
            'Package': fp.split(':')[-1] if ':' in fp else fp,
            'Mid X': f'{comp.x_mm:.4f}',
            'Mid Y': f'{comp.y_mm:.4f}',
            'Rotation': str(rot),
            'Layer': layer,
        })

    # Write BOM CSV
    bom_path = out / 'jlcpcb_bom.csv'
    with open(bom_path, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Comment', 'Designator', 'Footprint', 'LCSC Part #'])
        for key in sorted(groups.keys()):
            lcsc, comment, fp = key.split('|', 2)
            refs = sorted(groups[key], key=lambda r: (
                ''.join(c for c in r if c.isalpha()),
                int(''.join(c for c in r if c.isdigit()) or '0')
            ))
            w.writerow([comment, ','.join(refs), fp, lcsc])

    # Write CPL CSV
    cpl_path = out / 'jlcpcb_cpl.csv'
    with open(cpl_path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['Designator','Val','Package','Mid X','Mid Y','Rotation','Layer'])
        w.writeheader()
        for row in sorted(cpl_rows, key=lambda r: r['Designator']):
            w.writerow(row)

    print(f"BOM: {bom_path}  ({sum(len(v) for v in groups.values())} parts in {len(groups)} groups)")
    print(f"CPL: {cpl_path}  ({len(cpl_rows)} placements)")


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <eagle.brd> [output_dir]")
        sys.exit(1)
    brd = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else 'jlcpcb_output'
    export(brd, out)


if __name__ == '__main__':
    main()
