"""
Eagle v4/v5 binary .brd (PCB) parser

Board placement record (48 bytes, marker 0x2f 0x80):
  offset 0-1   : 0x2f 0x80 marker
  offset 2-11  : refdes (10 bytes null-padded ASCII)
  offset 12-25 : value (14 bytes null-padded ASCII)
  offset 26-27 : layer marker (0x34 0x80 = top, 0x35 0x80 = bottom)
  offset 28-29 : flags
  offset 30-33 : X (signed LE int32, 0.1µm)
  offset 34-37 : Y (signed LE int32, 0.1µm)
  offset 38-41 : footprint reference / bbox
  offset 42-43 : 0x00 0x00
  offset 44    : rotation/mirror byte (bits 2-3 = rot, bit 4 = mirror)
  offset 45-47 : 0x00 0x00 0x00
"""
import struct
import re
import json
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class BoardComponent:
    refdes: str
    value: Optional[str] = None
    x: Optional[int] = None      # 0.1µm
    y: Optional[int] = None      # 0.1µm
    rotation: str = 'R0'
    mirror: bool = False
    layer: str = 'top'           # 'top' or 'bottom'

    @property
    def x_mm(self) -> float:
        return (self.x or 0) / 10000.0

    @property
    def y_mm(self) -> float:
        return (self.y or 0) / 10000.0


COMP_MARKER = b'\x2f\x80'
RECORD_LEN = 48
REFDES_OFFSET = 2
REFDES_LEN = 8
VALUE_OFFSET = 10
VALUE_LEN = 14
LAYER_OFFSET = 24
X_OFFSET = 28
Y_OFFSET = 32
ROT_OFFSET = 41

ROTATION_MAP = {0: 'R0', 1: 'R90', 2: 'R180', 3: 'R270'}

REFDES_RE = re.compile(
    r'^(LED|IC|JP|SW|R|C|D|J|P|GND|P\+|VCC|VEE|V|TP|U|Q|Y|X|L|F|S)\d+[A-Z]?$'
)

TRACE_MARKER = b'\x22\x80'
TRACE_RECORD_LEN = 24

# Eagle layer numbers
LAYER_TOP = 1
LAYER_BOTTOM = 16
LAYER_TPLACE = 21  # top silkscreen
LAYER_BPLACE = 22
LAYER_DIMENSION = 20

VIA_MARKER = b'\x29\x80'
VIA_RECORD_LEN = 20


@dataclass
class Via:
    x: int  # 0.1µm
    y: int
    drill: int  # 0.1µm

    @property
    def x_mm(self) -> float: return self.x / 10000.0
    @property
    def y_mm(self) -> float: return self.y / 10000.0
    @property
    def drill_mm(self) -> float: return self.drill / 10000.0


@dataclass
class Trace:
    x1: int  # 0.1µm
    y1: int
    x2: int
    y2: int
    width: int  # 0.1µm
    layer: int  # Eagle layer number

    @property
    def x1_mm(self) -> float: return self.x1 / 10000.0
    @property
    def y1_mm(self) -> float: return self.y1 / 10000.0
    @property
    def x2_mm(self) -> float: return self.x2 / 10000.0
    @property
    def y2_mm(self) -> float: return self.y2 / 10000.0
    @property
    def width_mm(self) -> float: return self.width / 10000.0


class EagleBrdParser:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        with open(filepath, 'rb') as f:
            self.data = f.read()

    def parse_vias(self) -> List[Via]:
        """Extract via drill positions."""
        vias: List[Via] = []
        pos = 0
        while True:
            i = self.data.find(VIA_MARKER, pos)
            if i == -1 or i + VIA_RECORD_LEN > len(self.data):
                break
            pos = i + 2
            x = struct.unpack('<i', self.data[i + 4:i + 8])[0]
            y = struct.unpack('<i', self.data[i + 8:i + 12])[0]
            drill = struct.unpack('<i', self.data[i + 12:i + 16])[0]
            if 1000 <= drill <= 20000:  # 0.1mm to 2mm drill = plausible via
                vias.append(Via(x=x, y=y, drill=drill))
        return vias

    def parse_traces(self, copper_only: bool = True) -> List[Trace]:
        """Extract trace segments (wires) from the board.
        If copper_only, only return top/bottom copper layers."""
        traces: List[Trace] = []
        pos = 0
        while True:
            i = self.data.find(TRACE_MARKER, pos)
            if i == -1 or i + TRACE_RECORD_LEN > len(self.data):
                break
            pos = i + 2
            flags = struct.unpack('<H', self.data[i + 2:i + 4])[0]
            layer = (flags >> 8) & 0xFF
            x1 = struct.unpack('<i', self.data[i + 4:i + 8])[0]
            y1 = struct.unpack('<i', self.data[i + 8:i + 12])[0]
            x2 = struct.unpack('<i', self.data[i + 12:i + 16])[0]
            y2 = struct.unpack('<i', self.data[i + 16:i + 20])[0]
            w = struct.unpack('<i', self.data[i + 20:i + 24])[0]
            if w <= 0 or w > 100000:  # filter non-trace records (outlines etc)
                continue
            if copper_only and layer not in (LAYER_TOP, LAYER_BOTTOM):
                continue
            traces.append(Trace(x1=x1, y1=y1, x2=x2, y2=y2, width=w, layer=layer))
        return traces

    def parse(self) -> List[BoardComponent]:
        comps: Dict[str, BoardComponent] = {}
        pos = 0
        while True:
            m = self.data.find(COMP_MARKER, pos)
            if m == -1:
                break
            pos = m + 1
            if m + RECORD_LEN > len(self.data):
                continue
            comp = self._parse_record(m)
            if comp and comp.refdes not in comps:
                comps[comp.refdes] = comp
        return sorted(comps.values(), key=lambda c: (
            re.match(r'([A-Z]+)', c.refdes).group(1),
            int(re.search(r'(\d+)', c.refdes).group(1))
        ))

    def _parse_record(self, p: int) -> Optional[BoardComponent]:
        # refdes
        rd_field = self.data[p + REFDES_OFFSET:p + REFDES_OFFSET + REFDES_LEN]
        nul = rd_field.find(b'\x00')
        rd = rd_field[:nul] if nul >= 0 else rd_field
        try:
            refdes = rd.decode('ascii')
        except UnicodeDecodeError:
            return None
        if not REFDES_RE.match(refdes):
            return None

        # value
        val_field = self.data[p + VALUE_OFFSET:p + VALUE_OFFSET + VALUE_LEN]
        nul = val_field.find(b'\x00')
        vb = val_field[:nul] if nul >= 0 else val_field
        value = None
        if vb:
            try:
                v = vb.decode('ascii', errors='replace')
                if v and all(c.isprintable() for c in v):
                    value = v
            except UnicodeDecodeError:
                pass

        # layer
        layer_marker = self.data[p + LAYER_OFFSET:p + LAYER_OFFSET + 2]
        layer = 'bottom' if layer_marker == b'\x35\x80' else 'top'

        # coordinates
        x = struct.unpack('<i', self.data[p + X_OFFSET:p + X_OFFSET + 4])[0]
        y = struct.unpack('<i', self.data[p + Y_OFFSET:p + Y_OFFSET + 4])[0]

        # rotation / mirror
        rb = self.data[p + ROT_OFFSET]
        rotation = ROTATION_MAP.get((rb >> 2) & 0x03, 'R0')
        mirror = bool((rb >> 4) & 0x01)

        return BoardComponent(
            refdes=refdes, value=value, x=x, y=y,
            rotation=rotation, mirror=mirror, layer=layer,
        )

    def to_json(self, comps: Optional[List[BoardComponent]] = None) -> str:
        if comps is None:
            comps = self.parse()
        return json.dumps([asdict(c) for c in comps], indent=2)


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <eagle.brd> [--json]")
        sys.exit(1)

    p = EagleBrdParser(sys.argv[1])
    comps = p.parse()

    if '--json' in sys.argv:
        print(p.to_json(comps))
    else:
        print(f"{'Refdes':<10} {'Value':<20} {'X(mm)':>10} {'Y(mm)':>10} {'Rot':>6} {'Mir':>4} {'Layer':<6}")
        print('-' * 72)
        for c in comps:
            v = c.value or '—'
            m = 'Y' if c.mirror else 'N'
            print(f"{c.refdes:<10} {v:<20} {c.x_mm:>10.4f} {c.y_mm:>10.4f} {c.rotation:>6} {m:>4} {c.layer:<6}")
        print(f"\n{len(comps)} components")
