#!/usr/bin/env python3
"""
Convert an Eagle v4/v5 binary .brd file to a KiCad 10 .kicad_pcb file.

Covers:
  - component footprint placements (top / bottom layer)
  - copper traces (front / back copper)
  - vias
  - board outline (Edge.Cuts)

Coordinate transform: Eagle Y-up → KiCad Y-down.
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import List, Optional

from eagle_brd import EagleBrdParser, BoardComponent, Trace, Via


# Eagle layer → KiCad layer name
LAYER_MAP = {
    1:  'F.Cu',       # Top copper
    16: 'B.Cu',       # Bottom copper
    21: 'F.SilkS',    # tPlace
    22: 'B.SilkS',    # bPlace
    20: 'Edge.Cuts',  # Dimension
    51: 'F.Fab',      # tDocu
    52: 'B.Fab',      # bDocu
}


def gen_uuid() -> str:
    return str(uuid.uuid4())


# Footprint lib_id heuristic (same as sch_to_kicad.py)
def footprint_id(comp: BoardComponent) -> str:
    r = comp.refdes
    v = (comp.value or '').upper()
    if r.startswith('R'):
        return 'Resistor_SMD:R_0603_1608Metric'
    if r.startswith('C'):
        if v and ('U' in v) and not v.startswith('10'):
            return 'Capacitor_THT:CP_Radial_D5.0mm_P2.00mm'
        return 'Capacitor_SMD:C_0603_1608Metric'
    if r.startswith('D'):
        return 'Diode_SMD:D_SOD-123'
    if r.startswith('LED'):
        return 'LED_THT:LED_D3.0mm'
    if r.startswith('IC') or r.startswith('U'):
        if 'TL07' in v or 'TL08' in v:
            return 'Package_SO:TSSOP-8_3x3mm_P0.65mm'
        if 'OPA417' in v:
            return 'Package_SO:TSSOP-14_4.4x5mm_P0.65mm'
        if 'LM321' in v:
            return 'Package_TO_SOT_SMD:SOT-23-5'
        return 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm'
    if r.startswith('J') and not r.startswith('JP'):
        return 'Connector_Audio:Jack_3.5mm_QingPu_WQP-PJ398SM_Vertical'
    if r.startswith('JP'):
        return 'Connector_PinHeader_2.54mm:PinHeader_2x05_P2.54mm_Vertical'
    return 'Resistor_SMD:R_0603_1608Metric'


class BrdToKicad:
    def __init__(self, parser: EagleBrdParser):
        self.parser = parser
        self.comps = parser.parse()
        self.traces = parser.parse_traces(copper_only=False)
        self.vias = parser.parse_vias()
        self._compute_bounds()

    def _compute_bounds(self):
        xs, ys = [], []
        for c in self.comps:
            xs.append(c.x or 0)
            ys.append(c.y or 0)
        for t in self.traces:
            xs.extend([t.x1, t.x2])
            ys.extend([t.y1, t.y2])
        for v in self.vias:
            xs.append(v.x)
            ys.append(v.y)
        self.min_x = min(xs) if xs else 0
        self.max_y = max(ys) if ys else 0

    def xy(self, ex: int, ey: int):
        """Eagle 0.1µm → KiCad mm, Y-flip."""
        kx = (ex - self.min_x) / 10000.0 + 5.0
        ky = (self.max_y - ey) / 10000.0 + 5.0
        return round(kx, 4), round(ky, 4)

    def generate(self) -> str:
        lines = [self._header()]
        lines.append(self._layers())
        lines.append(self._setup())

        # Board outline from trace layer 20 (Dimension) or derive from copper extent
        outline = [t for t in self.traces if t.layer == 20]
        if not outline:
            outline = self._synthetic_outline()
        for t in outline:
            lines.append(self._emit_trace(t, force_layer='Edge.Cuts'))

        # Footprints
        for comp in self.comps:
            lines.append(self._emit_footprint(comp))

        # Copper traces (only F.Cu and B.Cu)
        for t in self.traces:
            if t.layer in (1, 16):
                lines.append(self._emit_trace(t))

        # Vias
        for v in self.vias:
            lines.append(self._emit_via(v))

        lines.append(')')
        return '\n'.join(lines)

    def _header(self) -> str:
        return (
            '(kicad_pcb\n'
            '\t(version 20240108)\n'
            '\t(generator "eagle_parser")\n'
            '\t(generator_version "1.0")\n'
            f'\t(general (thickness 1.6) (legacy_teardrops no))\n'
            f'\t(paper "A4")\n'
        )

    def _layers(self) -> str:
        return (
            '\t(layers\n'
            '\t\t(0 "F.Cu" signal)\n'
            '\t\t(31 "B.Cu" signal)\n'
            '\t\t(32 "B.Adhes" user "B.Adhesive")\n'
            '\t\t(33 "F.Adhes" user "F.Adhesive")\n'
            '\t\t(34 "B.Paste" user)\n'
            '\t\t(35 "F.Paste" user)\n'
            '\t\t(36 "B.SilkS" user "B.Silkscreen")\n'
            '\t\t(37 "F.SilkS" user "F.Silkscreen")\n'
            '\t\t(38 "B.Mask" user)\n'
            '\t\t(39 "F.Mask" user)\n'
            '\t\t(40 "Dwgs.User" user "User.Drawings")\n'
            '\t\t(44 "Edge.Cuts" user)\n'
            '\t\t(45 "Margin" user)\n'
            '\t\t(46 "B.CrtYd" user "B.Courtyard")\n'
            '\t\t(47 "F.CrtYd" user "F.Courtyard")\n'
            '\t\t(48 "B.Fab" user)\n'
            '\t\t(49 "F.Fab" user)\n'
            '\t)\n'
        )

    def _setup(self) -> str:
        return (
            '\t(setup\n'
            '\t\t(pad_to_mask_clearance 0.05)\n'
            '\t\t(allow_soldermask_bridges_in_footprints no)\n'
            '\t\t(pcbplotparams (layerselection 0x00010fc_ffffffff))\n'
            '\t)\n'
        )

    def _emit_footprint(self, comp: BoardComponent) -> str:
        fp = footprint_id(comp)
        kx, ky = self.xy(comp.x or 0, comp.y or 0)
        rot = {'R0': 0, 'R90': 90, 'R180': 180, 'R270': 270}.get(comp.rotation, 0)
        layer = 'B.Cu' if comp.layer == 'bottom' else 'F.Cu'
        val = (comp.value or '').replace('"', '\\"')
        return (
            f'\t(footprint "{fp}"\n'
            f'\t\t(layer "{layer}")\n'
            f'\t\t(uuid "{gen_uuid()}")\n'
            f'\t\t(at {kx:.4f} {ky:.4f} {rot})\n'
            f'\t\t(property "Reference" "{comp.refdes}" (at 0 -2 {rot}) (layer "{layer.replace("Cu","SilkS")}") (uuid "{gen_uuid()}"))\n'
            f'\t\t(property "Value" "{val}" (at 0 2 {rot}) (layer "{layer.replace("Cu","Fab")}") (uuid "{gen_uuid()}"))\n'
            '\t)\n'
        )

    def _emit_trace(self, t: Trace, force_layer: Optional[str] = None) -> str:
        x1, y1 = self.xy(t.x1, t.y1)
        x2, y2 = self.xy(t.x2, t.y2)
        layer = force_layer or LAYER_MAP.get(t.layer, 'F.Cu')
        w = t.width / 10000.0
        return (
            f'\t(segment (start {x1:.4f} {y1:.4f}) (end {x2:.4f} {y2:.4f})\n'
            f'\t\t(width {w:.4f}) (layer "{layer}") (net 0) (uuid "{gen_uuid()}"))\n'
        )

    def _emit_via(self, v: Via) -> str:
        kx, ky = self.xy(v.x, v.y)
        drill = v.drill / 10000.0
        size = drill + 0.25  # annular ring
        return (
            f'\t(via (at {kx:.4f} {ky:.4f}) (size {size:.4f}) (drill {drill:.4f})\n'
            f'\t\t(layers "F.Cu" "B.Cu") (net 0) (uuid "{gen_uuid()}"))\n'
        )

    def _synthetic_outline(self) -> List[Trace]:
        """Fallback: generate board outline from copper extent."""
        xs = [t.x1 for t in self.traces if t.layer in (1,16)] + \
             [t.x2 for t in self.traces if t.layer in (1,16)]
        ys = [t.y1 for t in self.traces if t.layer in (1,16)] + \
             [t.y2 for t in self.traces if t.layer in (1,16)]
        if not xs:
            return []
        x0, x1 = min(xs) - 5000, max(xs) + 5000
        y0, y1 = min(ys) - 5000, max(ys) + 5000
        w = 1000  # 0.1mm outline width
        return [
            Trace(x0, y0, x1, y0, w, 20),
            Trace(x1, y0, x1, y1, w, 20),
            Trace(x1, y1, x0, y1, w, 20),
            Trace(x0, y1, x0, y0, w, 20),
        ]


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <eagle.brd> [output.kicad_pcb]")
        sys.exit(1)

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix('.kicad_pcb')

    parser = EagleBrdParser(str(src))
    converter = BrdToKicad(parser)
    content = converter.generate()

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(content)

    copper = [t for t in converter.traces if t.layer in (1, 16)]
    print(f"Input:  {src}")
    print(f"Output: {dst}")
    print(f"  components: {len(converter.comps)}")
    print(f"  copper traces: {len(copper)} (F.Cu={sum(1 for t in copper if t.layer==1)}, B.Cu={sum(1 for t in copper if t.layer==16)})")
    print(f"  vias: {len(converter.vias)}")
    print(f"  file size: {dst.stat().st_size} bytes")


if __name__ == '__main__':
    main()
