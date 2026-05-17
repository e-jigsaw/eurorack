#!/usr/bin/env python3
"""
Convert an Eagle v4/v5 binary .sch file to a KiCad 10 .kicad_sch file.

Covers:
  - all placed gates (multi-gate ICs get one KiCad symbol per gate)
  - wire segments and junctions
  - power symbols (GND / VCC / VEE / V+ / V-) mapped to KiCad's power lib
  - basic lib_id mapping for common symbols

Coordinate transform: Eagle uses Y-up, KiCad uses Y-down, so we flip Y and
translate so the schematic sits in positive KiCad space.
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Dict, List, Tuple, Optional

from eagle_sch import EagleSchParser, Component, Gate, Net


# ----------------------------------------------------------------------
# lib_id mapping: symbol name (Eagle) + refdes -> KiCad library:symbol
# ----------------------------------------------------------------------
def kicad_lib_id(refdes: str, eagle_sym: Optional[str], value: Optional[str]) -> str:
    """Pick a reasonable KiCad lib_id for an Eagle symbol + refdes."""
    r = refdes
    s = eagle_sym or ''
    v = (value or '').upper()

    # Power symbols
    if s == 'GND' or r.startswith('GND'):
        return 'power:GND'
    if s in ('VCC', 'VCC2') or r.startswith('P+') or r == 'VCC':
        return 'power:VCC'
    if s == 'VEE' or r.startswith('VEE') or r == 'VEE':
        return 'power:VEE'

    # Passives
    if s == 'R-US' or r.startswith('R'):
        return 'Device:R'
    if s == 'CPOL-US':
        return 'Device:C_Polarized_Small'
    if s == 'C-US' or r.startswith('C'):
        return 'Device:C'
    if s == 'D' or r.startswith('D'):
        if '1N5819' in v:
            return 'Diode:1N5819'
        return 'Device:D'
    if s == 'LED' or r.startswith('LED'):
        return 'Device:LED'

    # Connectors
    if s == 'M05X2' or r.startswith('JP'):
        return 'Connector_Generic:Conn_02x05_Odd_Even'
    if s == 'JACK' or r.startswith('J'):
        return 'Connector_Audio:AudioJack2_Ground_SwitchT'

    # Op-amps (ICs)
    if s in ('OPAMP', 'OPAMP+-'):
        if v.startswith('TL07') or v.startswith('TL08'):
            return 'Amplifier_Operational:TL072'
        if v.startswith('OPA417'):
            return 'Amplifier_Operational:TL074'  # OPA4171 = quad, pin-compatible
        if v.startswith('LM321'):
            return 'Amplifier_Operational:LM321'
        return 'Amplifier_Operational:TL072'
    if s == 'PWR+-':
        # KiCad doesn't have a direct 'implicit power' symbol for op-amps;
        # drop these gates — the power is implied by the main symbol's power pins.
        return ''

    return 'Device:R'  # fallback (should rarely hit)


# ----------------------------------------------------------------------
# Coordinate transform
# ----------------------------------------------------------------------
class CoordSystem:
    """Eagle units (0.1µm) -> KiCad mm with Y flip and positive-quadrant offset."""
    def __init__(self, components: List[Component], wires, junctions):
        # Compute bounds in Eagle mm
        xs, ys = [], []
        for c in components:
            for g in c.gates:
                xs.append(g.x / 10000.0)
                ys.append(g.y / 10000.0)
        for w in wires:
            xs.extend([w.x1 / 10000.0, w.x2 / 10000.0])
            ys.extend([w.y1 / 10000.0, w.y2 / 10000.0])
        for j in junctions:
            xs.append(j.x / 10000.0)
            ys.append(j.y / 10000.0)
        if not xs:
            xs = [0.0]
            ys = [0.0]
        self.min_x = min(xs)
        self.max_x = max(xs)
        self.min_y = min(ys)
        self.max_y = max(ys)
        # KiCad margin (mm)
        self.margin = 25.4

    def xy(self, ex: int, ey: int) -> Tuple[float, float]:
        """Eagle 0.1µm (x, y) -> KiCad mm (x, y) with Y flipped."""
        mx = ex / 10000.0
        my = ey / 10000.0
        kx = (mx - self.min_x) + self.margin
        ky = (self.max_y - my) + self.margin  # flip Y
        # Snap to 0.01mm
        return round(kx, 4), round(ky, 4)


# ----------------------------------------------------------------------
# KiCad emitter
# ----------------------------------------------------------------------
def gen_uuid() -> str:
    return str(uuid.uuid4())


def emit_symbol(lib_id: str, x: float, y: float, refdes: str,
                value: Optional[str], gate_idx: int, total_gates: int,
                rotation: int, mirror: bool) -> str:
    """Emit a single (symbol ...) S-expression."""
    parts = []
    parts.append('\t(symbol')
    parts.append(f'\t\t(lib_id "{lib_id}")')
    parts.append(f'\t\t(at {x:.4f} {y:.4f} {rotation})')
    if mirror:
        parts.append('\t\t(mirror y)')
    if total_gates > 1:
        parts.append(f'\t\t(unit {gate_idx})')
    parts.append('\t\t(exclude_from_sim no)')
    parts.append('\t\t(in_bom yes)')
    parts.append('\t\t(on_board yes)')
    parts.append(f'\t\t(uuid "{gen_uuid()}")')
    parts.append(f'\t\t(property "Reference" "{refdes}"')
    parts.append(f'\t\t\t(at {x:.4f} {y - 5:.4f} 0)')
    parts.append('\t\t)')
    if value:
        v_escaped = value.replace('"', '\\"')
        parts.append(f'\t\t(property "Value" "{v_escaped}"')
        parts.append(f'\t\t\t(at {x:.4f} {y + 5:.4f} 0)')
        parts.append('\t\t)')
    parts.append('\t)')
    return '\n'.join(parts)


def emit_wire(x1: float, y1: float, x2: float, y2: float) -> str:
    return (
        '\t(wire\n'
        f'\t\t(pts (xy {x1:.4f} {y1:.4f}) (xy {x2:.4f} {y2:.4f}))\n'
        '\t\t(stroke (width 0) (type default))\n'
        f'\t\t(uuid "{gen_uuid()}")\n'
        '\t)'
    )


def emit_junction(x: float, y: float) -> str:
    return (
        '\t(junction\n'
        f'\t\t(at {x:.4f} {y:.4f})\n'
        '\t\t(diameter 0.9144)\n'
        f'\t\t(uuid "{gen_uuid()}")\n'
        '\t)'
    )


def emit_label(text: str, x: float, y: float) -> str:
    t = text.replace('"', '\\"')
    return (
        f'\t(label "{t}"\n'
        f'\t\t(at {x:.4f} {y:.4f} 0)\n'
        f'\t\t(uuid "{gen_uuid()}")\n'
        '\t)'
    )


# ----------------------------------------------------------------------
# Main generator
# ----------------------------------------------------------------------
def generate_kicad_sch(parser: EagleSchParser,
                       comps: Optional[List[Component]] = None,
                       nets: Optional[Dict[str, Net]] = None) -> str:
    if comps is None or nets is None:
        comps, nets = parser.parse()
    # Flatten wires/junctions from all nets
    all_wires = []
    all_junctions = []
    for net in nets.values():
        all_wires.extend(net.wires)
        all_junctions.extend(net.junctions)

    coords = CoordSystem(comps, all_wires, all_junctions)

    lines: List[str] = [
        '(kicad_sch',
        '\t(version 20250114)',
        '\t(generator "eagle_parser")',
        '\t(generator_version "1.0")',
        f'\t(uuid "{gen_uuid()}")',
        '\t(paper "A3")',
        '',
        '\t(lib_symbols)',
        '',
    ]

    # Symbols — one per placed gate
    for comp in comps:
        syms = parser._gate_symbols(comp)
        for gate, sym_name in zip(comp.gates, syms):
            lib_id = kicad_lib_id(comp.refdes, sym_name, comp.value)
            if not lib_id:
                continue
            kx, ky = coords.xy(gate.x, gate.y)
            rot = {'R0': 0, 'R90': 90, 'R180': 180, 'R270': 270}.get(gate.rotation, 0)
            # For power symbols, omit value
            val = None if comp.is_power else comp.value
            lines.append(emit_symbol(
                lib_id, kx, ky, comp.refdes, val,
                gate.index, len(comp.gates), rot, gate.mirror,
            ))
            lines.append('')

    # Wires — per net
    for net in nets.values():
        for w in net.wires:
            x1, y1 = coords.xy(w.x1, w.y1)
            x2, y2 = coords.xy(w.x2, w.y2)
            lines.append(emit_wire(x1, y1, x2, y2))
        for j in net.junctions:
            x, y = coords.xy(j.x, j.y)
            lines.append(emit_junction(x, y))

    # Net labels — place on the first wire endpoint of each named net
    for net in nets.values():
        if not net.name.startswith('N$') and net.wires:
            # Put label at the midpoint of the first wire
            w = net.wires[0]
            mx = (w.x1 + w.x2) // 2
            my = (w.y1 + w.y2) // 2
            kx, ky = coords.xy(mx, my)
            lines.append(emit_label(net.name, kx, ky))

    lines.append(')')
    return '\n'.join(lines)


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <eagle.sch> [output.kicad_sch]")
        sys.exit(1)

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix('.kicad_sch')

    parser = EagleSchParser(str(src))
    # parse() once, then reuse results for stats and generation
    comps, nets = parser.parse()
    content = generate_kicad_sch(parser, comps, nets)

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(content)

    total_gates = sum(len(c.gates) for c in comps)
    total_wires = sum(len(n.wires) for n in nets.values())
    total_junctions = sum(len(n.junctions) for n in nets.values())
    total_pinrefs = sum(len(n.pin_refs) for n in nets.values())

    print(f"Input:  {src}")
    print(f"Output: {dst}")
    print(f"  parts={len(comps)}  gates={total_gates}")
    print(f"  nets={len(nets)}  wires={total_wires}  junctions={total_junctions}")
    print(f"  pin_refs={total_pinrefs}")
    print(f"  file size: {dst.stat().st_size} bytes")

    try:
        import sexpdata
        sexpdata.loads(content)
        print("  ✓ S-expression valid")
    except ImportError:
        print("  (sexpdata not installed — skip validation)")
    except Exception as e:
        print(f"  ✗ S-expression error: {e}")


if __name__ == '__main__':
    main()
