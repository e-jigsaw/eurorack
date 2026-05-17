"""
Eagle v4/v5 binary .sch parser - Stage 4

Parses Autodesk Eagle binary schematic files to extract:
1. Component instances (refdes, value, coordinates, rotation, mirror flag)
   including power symbols (GND, VCC P+ etc.)
2. Electrical nets (named nets like GND, VCC, VEE, IN1, plus auto-generated N$*)

Binary format (reverse-engineered, validated against links_v40.sch):

Instance record (48 bytes, marker 0x38 0x80):
  offset 0-1   : 0x38 0x80 marker
  offset 2-10  : 9-byte header (sub-id + library/symbol/device IDs)
                 byte 4: library id (1=power/supply, 4=conn, 5=passive,
                                     6=diode, 7=LED, 8=opamp, 9=jack, ...)
  offset 11-?  : refdes ASCII, null-terminated
  offset ?-27  : value ASCII, null-terminated, then padding
  offset 28-31 : X coordinate (signed LE int32, 0.1µm units)
  offset 32-35 : Y coordinate (signed LE int32, 0.1µm units)
  offset 36-37 : 0xff 0xff
  offset 38-40 : 0x01 0x00 0x00
  offset 41    : rotation/mirror byte
                 bits 2-3: rotation (00=R0, 01=R90, 10=R180, 11=R270)
                 bit  4  : mirror flag
  offset 42-43 : 0x00 0x00
  offset 44-47 : symbol bounding box (4 signed bytes? not yet decoded)

Conversion: mm = eagle_int32_value / 10000

Net record (marker 0x37 0x80) — partially decoded.
"""

import struct
import re
import json
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass, asdict, field
from pathlib import Path
import sys


@dataclass
class Gate:
    """One placed symbol instance of a part (Eagle <instance>)."""
    index: int                       # 1-based gate index within the part
    x: int                           # 0.1µm
    y: int
    rotation: str = 'R0'             # R0/R90/R180/R270
    mirror: bool = False


@dataclass
class Component:
    """Extracted part (with one or more placed gates) from Eagle schematic."""
    refdes: str
    value: Optional[str] = None
    package: Optional[str] = None
    gates: List[Gate] = field(default_factory=list)
    library_id: Optional[int] = None  # raw header byte at offset 4
    is_power: bool = False            # GND/VCC/VEE/P+ symbols

    # Backward-compat: expose first gate's placement as top-level fields.
    @property
    def x(self) -> Optional[int]:
        return self.gates[0].x if self.gates else None

    @property
    def y(self) -> Optional[int]:
        return self.gates[0].y if self.gates else None

    @property
    def rotation(self) -> Optional[str]:
        return self.gates[0].rotation if self.gates else None

    @property
    def mirror(self) -> bool:
        return self.gates[0].mirror if self.gates else False


@dataclass
class PinRef:
    """Reference to a pin on a component, connected to a net."""
    refdes: str
    pin: str  # e.g., "1", "2", "8" for IC pins
    x: int = 0  # absolute pin position in 0.1µm (for debugging)
    y: int = 0


# Symbol pin layouts: dict of symbol_name -> [(pin_name, dx_mm, dy_mm), ...].
# Pin coordinates are relative to the symbol origin in mm.
# Values verified against the actual binary symbol definitions in links_v40.sch
# (see library_parser.py).
SYMBOL_PIN_LAYOUTS: Dict[str, List[Tuple[str, float, float]]] = {
    # Passives — 2-terminal horizontal
    'R-US':     [('1', -7.62, 0.0), ('2', 7.62, 0.0)],
    'C-US':     [('1', 0.0, 2.54), ('2', 0.0, -1.27)],
    'CPOL-US':  [('+', 0.0, 2.54), ('-', 0.0, -1.27)],
    # Diode, LED: anode / cathode (horizontal)
    'D':        [('A', -5.08, 0.0), ('C', 5.08, 0.0)],
    'LED':      [('A', -5.08, 0.0), ('C', 5.08, 0.0)],
    # Single op-amp gate (used by TL072 A/B, OPA4171 A/B/C/D, LM321)
    'OPAMP':    [('-IN', -7.62, -2.54), ('+IN', -7.62, 2.54), ('OUT', 7.62, 0.0)],
    # Implicit-power gate for IC power pins (V+, V-)
    'PWR+-':    [('V+', 0.0, 2.54), ('V-', 0.0, -7.62)],
    # Thonkiconn PJ301M-12 jack
    'JACK':     [('P', 0.0, 0.0), ('S', 0.0, -2.54), ('T', 0.0, -5.08)],
    # Doepfer 2x5 power header
    'M05X2':    [
        ('1', -1.27,  5.08), ('2', 1.27,  5.08),
        ('3', -1.27,  2.54), ('4', 1.27,  2.54),
        ('5', -1.27,  0.0),  ('6', 1.27,  0.0),
        ('7', -1.27, -2.54), ('8', 1.27, -2.54),
        ('9', -1.27, -5.08), ('10',1.27, -5.08),
    ],
    # Power symbols — one pin at the symbol origin
    'GND':      [('GND', 0.0, 0.0)],
    'VCC':      [('VCC', 0.0, 0.0)],
    'VEE':      [('VEE', 0.0, 0.0)],
}


# Map a part's device value + gate index to the symbol used for that gate.
# This describes the device-set → gate → symbol assignment.
# Format: key = (refdes_prefix, value_prefix or '*'), value = list of symbols.
# List order matches gate index (1-based).
DEVICE_GATE_SYMBOLS: Dict[Tuple[str, str], List[str]] = {
    # TL072 dual op-amp: A (OPAMP), B (OPAMP), P (PWR+-)
    ('IC', 'TL072'): ['OPAMP', 'OPAMP', 'PWR+-'],
    ('IC', 'TL074'): ['OPAMP', 'OPAMP', 'OPAMP', 'OPAMP', 'PWR+-'],
    ('IC', 'TL082'): ['OPAMP', 'OPAMP', 'PWR+-'],
    ('IC', 'TL084'): ['OPAMP', 'OPAMP', 'OPAMP', 'OPAMP', 'PWR+-'],
    # OPA41xx quad op-amps (OPA4171 etc.): 4 gates + power
    ('IC', 'OPA417'): ['OPAMP', 'OPAMP', 'OPAMP', 'OPAMP', 'PWR+-'],
    ('IC', 'OPA207'): ['OPAMP', 'OPAMP', 'OPAMP', 'OPAMP', 'PWR+-'],
    # Single op-amp SOT23-5: 1 gate (implicit power, no PWR+- gate)
    ('IC', 'LM321'): ['OPAMP'],
    ('IC', 'LMV'):   ['OPAMP'],
    # Jacks and headers
    ('J',  '*'):     ['JACK'],
    ('JP', '*'):     ['M05X2'],
    # Power symbols (gate 1 = the power symbol itself)
    ('GND', '*'):    ['GND'],
    ('P+',  '*'):    ['VCC'],
    ('VEE', '*'):    ['VEE'],
    ('VCC', '*'):    ['VCC'],
    # Passives, diode, LED
    ('R',   '*'):    ['R-US'],
    ('LED', '*'):    ['LED'],
    ('D',   '*'):    ['D'],
    # C: polarized if CP package, else standard
    ('C',   '*'):    ['C-US'],
}


@dataclass
class Wire:
    """A straight wire segment inside a net (coords in 0.1µm)."""
    x1: int
    y1: int
    x2: int
    y2: int
    width: int


@dataclass
class Junction:
    """A junction dot where 3+ wires meet (coords in 0.1µm)."""
    x: int
    y: int
    diameter: int


@dataclass
class Net:
    """Electrical net (signal name) with its wire segments and junctions."""
    name: str  # e.g., "GND", "VCC", "N$1"
    wires: List[Wire] = field(default_factory=list)
    junctions: List[Junction] = field(default_factory=list)
    pin_refs: Set[str] = field(default_factory=set)  # "REFDES.PIN" — TODO


class EagleSchParser:
    """Parser for Autodesk Eagle v4/v5 binary .sch files."""

    # Component refdes patterns (signal + power)
    REFDES_RE = re.compile(r'^(LED|IC|JP|R|C|D|J|GND|P\+|VCC|VEE|V|TP|U|Q|Y|X|L|F|S|SW)\d*[A-Z]?$')

    # Markers
    COMPONENT_MARKER = b'\x38\x80'
    NET_MARKER = b'\x1f\x80'  # net definition (net name + wire/pinref data)
    SYMBOL_MARKER = b'\x1d\x00'           # symbol definition (header + pins + drawing)
    PIN_MARKER = b'\x2c\x80'              # pin definition inside a symbol
    NET_NAME_OFFSET = 16
    NET_NAME_LEN = 8  # fixed field, null-padded
    WIRE_MARKER = b'\x22\x80\x00\x5b'      # 24-byte wire: x1,y1,x2,y2,width
    JUNCTION_MARKER = b'\x27\x80\x00\x5b'  # 16-byte junction: x,y,diameter

    # Symbol header: 1d 00 cnt_u16 bbox(4xi16) pad_4 name_8
    SYMBOL_HEADER_LEN = 24
    # Pin record: 2c 80 flag_u16 x_i32 y_i32 len_u16 name_10
    PIN_RECORD_LEN = 24

    # Part record (0x38 0x80) header: 24 bytes (2 marker + 9 hdr + 5 refdes + 8 value)
    REFDES_OFFSET = 11
    REFDES_FIELD_LEN = 5
    VALUE_OFFSET = 16
    VALUE_FIELD_LEN = 8
    GATE_ARRAY_OFFSET = 24  # gate blocks start here
    GATE_RECORD_LEN = 24    # each gate is 24 bytes: 30 00 00 00 X Y ff ff idx flags rot bbox
    GATE_MARKER = b'\x30\x00\x00\x00'
    # Within a gate block:
    GATE_X_OFFSET = 4
    GATE_Y_OFFSET = 8
    GATE_INDEX_OFFSET = 14  # uint16 LE, 1-based
    GATE_ROT_OFFSET = 17    # bits 2-3 = rot, bit 4 = mirror

    ROTATION_MAP = {0: 'R0', 1: 'R90', 2: 'R180', 3: 'R270'}

    # Header signature -> package name mapping.
    # Key: (lib_id at offset 4, deviceset_id at offset 6, device_id at offset 8)
    # Verified against Mutable Instruments BOM for links_v40.sch.
    # Other modules use the same mutable.lbr library so these signatures
    # should be reusable; unknown ones fall through to value-based heuristics.
    HEADER_TO_PACKAGE = {
        (1, 1, 0x01): None,           # GND power symbol
        (1, 2, 0x01): None,           # VCC / V+ power symbol
        (4, 1, 0x01): 'PinHeader_2x05',
        (5, 1, 0x02): 'R0603',
        (5, 2, 0x03): 'C0603',
        (5, 3, 0x7b): 'CP_3mm_Panasonic_A',
        (6, 1, 0x30): 'SOD-123',
        (7, 1, 0x04): 'LED_3mm_THT',
        (8, 1, 0x01): 'SOT-23-5',
        (8, 2, 0x03): 'TSSOP-8',
        (8, 3, 0x03): 'TSSOP-14',
        (9, 1, 0x06): 'PJ301M-12',
    }

    # Fallback heuristics by (refdes type, value pattern).
    # Based on Mutable Instruments standard stack:
    #   R, C <= 1µF: 0603 SMD
    #   C >= 1µF:    Panasonic A (radial, 3mm pitch) electrolytic
    #   D small-sig: SOD-123
    #   LED:         3mm THT (WP937 bicolor is the usual MI pick)
    #   J audio:     PJ301M-12 Thonkiconn
    #   JP power:    2x5 Doepfer header
    @staticmethod
    def _guess_package_from_value(refdes: str, value: Optional[str]) -> Optional[str]:
        v_upper = value.upper() if value else ''

        # ICs by MPN prefix
        if refdes.startswith('IC') or refdes.startswith('U'):
            ic_rules = [
                # TI / STMicro opamps — TSSOP is the MI standard
                ('TL07', 'TSSOP-8'), ('TL08', 'TSSOP-8'), ('TL06', 'TSSOP-8'),
                ('TL07', 'TSSOP-8'), ('TL07', 'TSSOP-8'),
                ('OPA2134', 'SOIC-8'), ('OPA167', 'SOIC-14'),  # OPA1678/1679 quad
                ('OPA1678', 'SOIC-8'),
                ('OPA417', 'TSSOP-14'), ('OPA207', 'TSSOP-14'),
                ('MCP6', 'SOIC-8'),
                ('LM358', 'SOIC-8'), ('LM386', 'SOIC-8'),
                ('NE555', 'SOIC-8'),
                # Single-opamp SOT-23-5
                ('LM321', 'SOT-23-5'), ('LMV', 'SOT-23-5'),
                # Microcontrollers
                ('STM32F0', 'LQFP-48'), ('STM32F1', 'LQFP-48'),
                ('STM32F3', 'LQFP-48'), ('STM32F4', 'LQFP-100'),
                ('STM32', 'LQFP'),
                # Logic TSSOP
                ('74HC', 'TSSOP'), ('74LV', 'TSSOP'),
                ('74AHC', 'TSSOP'), ('74AC', 'TSSOP'),
                ('74VHC', 'TSSOP'),
                # IO expanders
                ('PCA95', 'TSSOP'), ('MCP23', 'SOIC-16'),
                ('SN74', 'TSSOP'),
                # Audio codecs
                ('AK43', 'SOP-16'), ('AK49', 'SSOP-28'),
                ('WM87', 'SSOP-28'),
                # VCAs
                ('V2164', 'SOIC-16'), ('SSM2164', 'SOIC-16'),
                # DAC / ADC
                ('AD56', 'MSOP-10'), ('DAC85', 'SOIC-14'),
                # Voltage references
                ('REF19', 'SOT-23-5'), ('REF02', 'SOIC-8'),
                # Regulators
                ('LM317', 'SOT-223'), ('LM337', 'SOT-223'),
                ('AMS1117', 'SOT-223'),
            ]
            for prefix, pkg in ic_rules:
                if v_upper.startswith(prefix):
                    return pkg

        # Transistors
        if refdes.startswith('Q'):
            return 'SOT-23'  # Mutable standard small-signal

        # Diodes
        if refdes.startswith('D'):
            if v_upper.startswith('1N5819') or v_upper.startswith('1N4148') or \
               v_upper.startswith('BAT') or v_upper.startswith('BAS'):
                return 'SOD-123'
            if v_upper.startswith('LL'):
                return 'MiniMELF'

        # LEDs
        if refdes.startswith('LED'):
            if v_upper.startswith('WP937') or v_upper.startswith('WP9'):
                return 'LED_3mm_THT'
            return 'LED_0603'  # default SMD

        # Jacks
        if refdes.startswith('J') and not refdes.startswith('JP'):
            return 'PJ301M-12'

        # Headers / pin strips
        if refdes.startswith('JP'):
            return 'PinHeader_2x05' if v_upper.startswith('M05') else 'PinHeader'

        # Resistors — Mutable default 0603
        if refdes.startswith('R'):
            return 'R0603'

        # Capacitors — 0603 unless explicit µF range → electrolytic
        if refdes.startswith('C'):
            m = re.match(r'^([\d.]+)\s*([A-Z]+)?', v_upper)
            if m:
                try:
                    num = float(m.group(1))
                    unit = (m.group(2) or '').strip()
                    # 'U', 'UF', 'μ' etc → microfarads
                    if unit.startswith('U') and num >= 1.0:
                        return 'CP_3mm_Panasonic_A'
                except ValueError:
                    pass
            return 'C0603'

        # Inductors / ferrite beads / fuses
        if refdes.startswith('L'):
            return 'L0805'
        if refdes.startswith('F'):
            return 'Fuse_0603'

        # Crystals
        if refdes.startswith(('Y', 'X')):
            return 'Crystal_SMD_3225'

        # Switches
        if refdes.startswith('SW') or refdes == 'S':
            return 'Tact_Switch'

        return None

    def __init__(self, filepath: str, kicad_import_path: Optional[str] = None):
        """
        Initialize parser with .sch file path.

        Args:
            filepath: Path to Eagle .sch binary file
            kicad_import_path: Optional path to KiCad .kicad_sch import for coordinate fallback
        """
        self.filepath = Path(filepath)
        with open(self.filepath, 'rb') as f:
            self.data = f.read()
        self.components: Dict[str, Component] = {}
        self.nets: Dict[str, Net] = {}
        # name -> [(pin_name, x_mm, y_mm), ...]
        self.symbols: Dict[str, List[Tuple[str, float, float]]] = {}
        self.kicad_coords: Dict[str, Tuple[float, float, int]] = {}

        # Load KiCad coordinates if provided
        if kicad_import_path:
            self._load_kicad_coords(kicad_import_path)

    def _load_kicad_coords(self, kicad_path: str):
        """Load component coordinates from KiCad .kicad_sch import file as fallback."""
        try:
            with open(kicad_path, 'r') as f:
                content = f.read()

            # Extract (symbol ... (at X Y rot) ... (property "Reference" "REFDES")) patterns
            pattern = r'\(symbol\s+\(lib_id "[^"]*"\)\s+\(at\s+([-\d.]+)\s+([-\d.]+)\s+(\d+)\).*?\(property\s+"Reference"\s+"([RCDILEJgdv]+[0-9]+[A-Z0-9]*)"'
            matches = re.findall(pattern, content, re.DOTALL)

            for x_str, y_str, rot_str, refdes in matches:
                try:
                    x = float(x_str)
                    y = float(y_str)
                    rot = int(rot_str)
                    if re.match(r'^(R|C|D|IC|LED|J|JP)\d+$', refdes):
                        # Convert mm to 0.1µm units for consistency with Eagle format
                        x_units = int(round(x * 10000))
                        y_units = int(round(y * 10000))
                        self.kicad_coords[refdes] = (x, y, rot)
                except (ValueError, AttributeError):
                    pass
        except (FileNotFoundError, IOError):
            pass

    def parse(self, use_kicad_fallback: bool = False) -> Tuple[List[Component], Dict[str, Net]]:
        """
        Parse the schematic file and extract components + nets.

        Args:
            use_kicad_fallback: if True, override Eagle coords with KiCad import
                                values (useful when KiCad file has been hand-edited
                                and represents the desired layout).
        Returns (components, nets).
        """
        # Idempotent: clear any prior results so parse() can be called twice.
        self.symbols.clear()
        self.components.clear()
        self.nets.clear()

        self._find_symbols()
        self._find_components()
        self._find_nets()
        components = self._deduplicate_and_sort()

        if use_kicad_fallback:
            for comp in components:
                if comp.refdes in self.kicad_coords:
                    x_mm, y_mm, rot = self.kicad_coords[comp.refdes]
                    comp.x = int(round(x_mm * 10000))
                    comp.y = int(round(y_mm * 10000))
                    rot_map = {0: 'R0', 90: 'R90', 180: 'R180', 270: 'R270'}
                    if rot in rot_map:
                        comp.rotation = rot_map[rot]

        # Resolve pin refs by matching wire endpoints / junctions to absolute
        # pin coordinates derived from each instance.
        self._resolve_pinrefs(components)

        return components, self.nets

    def _gate_symbols(self, comp: 'Component') -> List[str]:
        """
        Pick the symbol name for each gate of a component.
        Returns a list aligned with comp.gates; unknown symbols are None.
        """
        r = comp.refdes
        v = (comp.value or '').upper()

        # Match by refdes prefix, with optional value prefix.
        # Refdes prefixes: power (GND/P+/VCC/VEE) first, then long IC/JP, then letter.
        for prefix_re in (r'^(GND|VCC|VEE|P\+)', r'^(IC|JP|LED|SW|TP)', r'^[A-Z]'):
            m = re.match(prefix_re, r)
            if not m:
                continue
            pre = m.group(0) if prefix_re == r'^[A-Z]' else m.group(1)
            # Try value-specific match first
            candidates = [
                (pre, v[:7]), (pre, v[:6]), (pre, v[:5]),
                (pre, v[:4]), (pre, v[:3]), (pre, '*'),
            ]
            for key in candidates:
                if key in DEVICE_GATE_SYMBOLS:
                    syms = DEVICE_GATE_SYMBOLS[key][:]
                    # Handle polarized capacitors
                    if pre == 'C' and comp.package and 'CP' in comp.package:
                        syms = ['CPOL-US'] * len(syms)
                    # Pad / truncate to actual gate count
                    if len(syms) < len(comp.gates):
                        syms += [syms[-1]] * (len(comp.gates) - len(syms))
                    elif len(syms) > len(comp.gates):
                        syms = syms[:len(comp.gates)]
                    return syms
            break
        return [None] * len(comp.gates)

    def _absolute_pins(self, comp: 'Component') -> List[Tuple[str, int, int]]:
        """
        Return [(pin_label, abs_x, abs_y)] for every pin of every gate of
        this part. Pin labels include gate index for disambiguation when
        there are multiple gates, e.g. 'IC2.A.OUT', 'IC2.B.-IN', 'IC2.P.V+'.
        """
        if not comp.gates:
            return []

        gate_symbols = self._gate_symbols(comp)
        result: List[Tuple[str, int, int]] = []
        # Map gate index → letter suffix (A, B, C, D, P for power)
        def gate_suffix(idx: int, total: int, is_power_gate: bool) -> str:
            if is_power_gate:
                return 'P'
            return chr(ord('A') + idx - 1)

        total_gates = len(comp.gates)
        for gate, sym in zip(comp.gates, gate_symbols):
            # Prefer pins extracted from the library; fall back to hardcoded.
            pin_list = self.symbols.get(sym) if sym else None
            if pin_list is None:
                pin_list = SYMBOL_PIN_LAYOUTS.get(sym)
            if not pin_list:
                continue
            is_pwr_gate = (sym == 'PWR+-')
            suffix = gate_suffix(gate.index, total_gates, is_pwr_gate)
            rot = {'R0': 0, 'R90': 90, 'R180': 180, 'R270': 270}.get(gate.rotation, 0)
            mirror = gate.mirror
            for pin_name, dx_mm, dy_mm in pin_list:
                dx = int(round(dx_mm * 10000))
                dy = int(round(dy_mm * 10000))
                if mirror:
                    dx = -dx
                if rot == 90:
                    dx, dy = -dy, dx
                elif rot == 180:
                    dx, dy = -dx, -dy
                elif rot == 270:
                    dx, dy = dy, -dx
                # Label: for multi-gate ICs include the gate suffix
                if total_gates > 1 and not comp.is_power:
                    label = f'{suffix}.{pin_name}'
                else:
                    label = pin_name
                result.append((label, comp.gates[0].x if False else gate.x + dx,
                               gate.y + dy))
        return result

    def _resolve_pinrefs(self, components: List['Component'], tol_mm: float = 0.3):
        """
        For each net, find pins whose absolute position coincides with any
        wire endpoint or junction in that net. tol_mm = match tolerance.
        """
        tol = int(round(tol_mm * 10000))

        all_pins: List[Tuple[str, str, int, int]] = []
        for comp in components:
            for label, x, y in self._absolute_pins(comp):
                all_pins.append((comp.refdes, label, x, y))

        for net in self.nets.values():
            anchor_points: List[Tuple[int, int]] = []
            for w in net.wires:
                anchor_points.append((w.x1, w.y1))
                anchor_points.append((w.x2, w.y2))
            for j in net.junctions:
                anchor_points.append((j.x, j.y))

            for refdes, pin_label, px, py in all_pins:
                for ax, ay in anchor_points:
                    if abs(px - ax) <= tol and abs(py - ay) <= tol:
                        net.pin_refs.add(f'{refdes}.{pin_label}')
                        break

    def _find_symbols(self):
        """
        Scan the library section for symbol definitions (0x1d 0x00 marker).
        Populate self.symbols with {name: [(pin_name, x_mm, y_mm), ...]}.

        Symbol header:
          1d 00 <cnt:u16>  <bbox:4xi16>  <pad:4>  <name:8 null-padded>

        Body is a mix of pins (2c 80), text labels (31 80), wires/arcs/circles
        (22 80, etc.). We only care about pins here; scan the entire body
        until the next 1d 00 (or other non-symbol marker).
        """
        # First pass: find all valid symbol start positions
        starts: List[Tuple[int, str]] = []
        pos = 0
        while pos < len(self.data):
            m = self.data.find(self.SYMBOL_MARKER, pos)
            if m == -1:
                break
            pos = m + 1

            if m + self.SYMBOL_HEADER_LEN > len(self.data):
                continue
            if self.data[m + 12:m + 16] != b'\x00\x00\x00\x00':
                continue
            name_field = self.data[m + 16:m + 24]
            if not name_field[0:1].isalpha():
                continue
            nul = name_field.find(b'\x00')
            raw = name_field if nul == -1 else name_field[:nul]
            try:
                name = raw.decode('ascii')
            except UnicodeDecodeError:
                continue
            if not name or not all(c.isprintable() for c in name):
                continue
            if name in self.symbols:
                continue
            starts.append((m, name))

        # Second pass: for each symbol, scan its body for 2c 80 pin markers
        for idx, (m, name) in enumerate(starts):
            body_end = starts[idx + 1][0] if idx + 1 < len(starts) else len(self.data)
            body_start = m + self.SYMBOL_HEADER_LEN

            # Pin records in a symbol body are separated by text/wire records.
            # To avoid picking up pins from the *next* symbol (when body_end
            # is loose), stop if the gap since the last pin exceeds a
            # reasonable limit (~400 bytes is plenty for any realistic
            # text/wire block between two pins).
            pins: List[Tuple[str, float, float]] = []
            p = body_start
            last_pin_end = body_start
            max_gap = 400
            while p + self.PIN_RECORD_LEN <= body_end:
                found = self.data.find(self.PIN_MARKER, p, body_end)
                if found == -1 or found + self.PIN_RECORD_LEN > body_end:
                    break
                if pins and found - last_pin_end > max_gap:
                    break
                x = struct.unpack('<i', self.data[found + 4:found + 8])[0]
                y = struct.unpack('<i', self.data[found + 8:found + 12])[0]
                if abs(x) > 2_000_000 or abs(y) > 2_000_000:
                    p = found + 2
                    continue
                pin_name_field = self.data[found + 14:found + 24]
                nul = pin_name_field.find(b'\x00')
                pn = pin_name_field if nul == -1 else pin_name_field[:nul]
                try:
                    pin_name = pn.decode('ascii') if pn else str(len(pins) + 1)
                except UnicodeDecodeError:
                    p = found + 2
                    continue
                if not pin_name or not all(c.isprintable() for c in pin_name):
                    p = found + 2
                    continue
                pins.append((pin_name, x / 10000.0, y / 10000.0))
                last_pin_end = found + self.PIN_RECORD_LEN
                p = last_pin_end

            if pins:
                self.symbols[name] = pins

    def _find_components(self):
        """
        Iterate every 0x38 0x80 marker and parse the variable-length part
        record at fixed offsets. Each part has one or more gates (symbol
        placements) laid out as 24-byte blocks starting at offset 24.
        """
        # First collect all part-record start positions so we know boundaries.
        starts = []
        pos = 0
        while pos < len(self.data):
            m = self.data.find(self.COMPONENT_MARKER, pos)
            if m == -1:
                break
            starts.append(m)
            pos = m + 1

        for idx, marker_pos in enumerate(starts):
            end = starts[idx + 1] if idx + 1 < len(starts) else len(self.data)
            comp = self._parse_part_record(marker_pos, end)
            if comp and comp.refdes not in self.components:
                self.components[comp.refdes] = comp

    def _parse_part_record(self, marker_pos: int, end: int) -> Optional[Component]:
        """
        Parse a variable-length part record starting at marker_pos, extending
        up to (but not including) end (the next 0x38 0x80 marker or EOF).

        - header (24 bytes): marker + 9 header bytes + 5 refdes + 8 value
        - gate blocks (24 bytes each), each starting with 0x30 0x00 0x00 0x00
        """
        if marker_pos + self.GATE_ARRAY_OFFSET > len(self.data):
            return None

        # refdes
        rd_start = marker_pos + self.REFDES_OFFSET
        rd_field = self.data[rd_start:rd_start + self.REFDES_FIELD_LEN]
        nul = rd_field.find(b'\x00')
        rd_bytes = rd_field if nul == -1 else rd_field[:nul]
        if not rd_bytes:
            return None
        try:
            refdes = rd_bytes.decode('ascii')
        except UnicodeDecodeError:
            return None
        if not self.REFDES_RE.match(refdes):
            return None

        # value
        val_start = marker_pos + self.VALUE_OFFSET
        val_field = self.data[val_start:val_start + self.VALUE_FIELD_LEN]
        nul = val_field.find(b'\x00')
        value_bytes = val_field if nul == -1 else val_field[:nul]
        value: Optional[str] = None
        if value_bytes:
            try:
                v = value_bytes.decode('ascii', errors='replace')
                if v and all(c.isprintable() for c in v):
                    value = v
            except UnicodeDecodeError:
                pass

        # Library identifiers
        lib_id = self.data[marker_pos + 4]
        ds_id = self.data[marker_pos + 6]
        dev_id = self.data[marker_pos + 8]

        # Package lookup
        sig = (lib_id, ds_id, dev_id)
        package = self.HEADER_TO_PACKAGE.get(sig)
        if package is None and sig not in self.HEADER_TO_PACKAGE:
            package = self._guess_package_from_value(refdes, value)

        is_power = bool(re.match(r'^(GND|VCC|VEE|P\+)', refdes))
        if is_power and value is None:
            if refdes.startswith('GND'):
                value = 'GND'
            elif refdes.startswith('P+') or refdes.startswith('VCC'):
                value = 'VCC'
            elif refdes.startswith('VEE'):
                value = 'VEE'

        # Parse gate blocks starting at offset 24
        gates: List[Gate] = []
        g_pos = marker_pos + self.GATE_ARRAY_OFFSET
        while g_pos + self.GATE_RECORD_LEN <= end:
            if self.data[g_pos:g_pos + 4] != self.GATE_MARKER:
                break
            gx = struct.unpack('<i', self.data[g_pos + self.GATE_X_OFFSET:g_pos + self.GATE_X_OFFSET + 4])[0]
            gy = struct.unpack('<i', self.data[g_pos + self.GATE_Y_OFFSET:g_pos + self.GATE_Y_OFFSET + 4])[0]
            gidx = struct.unpack('<H', self.data[g_pos + self.GATE_INDEX_OFFSET:g_pos + self.GATE_INDEX_OFFSET + 2])[0]
            rb = self.data[g_pos + self.GATE_ROT_OFFSET]
            rotation = self.ROTATION_MAP[(rb >> 2) & 0x03]
            mirror = bool((rb >> 4) & 0x01)
            gates.append(Gate(index=gidx, x=gx, y=gy, rotation=rotation, mirror=mirror))
            g_pos += self.GATE_RECORD_LEN

        if not gates:
            return None

        return Component(
            refdes=refdes,
            value=value,
            package=package,
            gates=gates,
            library_id=lib_id,
            is_power=is_power,
        )

    def _find_nets(self):
        """
        Extract nets from 0x1f 0x80 records.

        Each net record starts with:
          1f 80 <cnt:uint16_le> ff 7f ff 7f 00 80 00 80 00 00 00 00
          <net_name 8 bytes, null-padded ASCII>
          <separator 20 00> <sub_count u16> <bbox 20 bytes>
          [segments...]

        Segment structure:
          3d 80 00 00 <len_hint:u16> 01 00 <elem_count:u16> <padding>
          [wires (22 80 00 5b, 24 bytes each) + junctions (27 80 00 5b, 16 bytes)]

        The record extends until the next 1f 80 marker (or EOF).
        """
        # Find all validated net-header positions first so we know boundaries.
        net_positions = []
        pos = 0
        while pos < len(self.data):
            m = self.data.find(self.NET_MARKER, pos)
            if m == -1:
                break
            pos = m + 1
            if m + self.NET_NAME_OFFSET + self.NET_NAME_LEN > len(self.data):
                continue
            if self.data[m + 4:m + 16] != b'\xff\x7f\xff\x7f\x00\x80\x00\x80\x00\x00\x00\x00':
                continue
            net_positions.append(m)

        for idx, start in enumerate(net_positions):
            end = net_positions[idx + 1] if idx + 1 < len(net_positions) else len(self.data)
            body = self.data[start:end]

            name_field = body[self.NET_NAME_OFFSET:self.NET_NAME_OFFSET + self.NET_NAME_LEN]
            nul = name_field.find(b'\x00')
            name_bytes = name_field if nul == -1 else name_field[:nul]
            if not name_bytes:
                continue
            try:
                name = name_bytes.decode('ascii')
            except UnicodeDecodeError:
                continue
            if not name.strip():
                continue

            net = self.nets.setdefault(name, Net(name=name))

            # Scan body for wires (24 bytes from marker)
            p = 0
            while True:
                w = body.find(self.WIRE_MARKER, p)
                if w == -1 or w + 24 > len(body):
                    break
                x1, y1, x2, y2, width = struct.unpack('<iiiii', body[w + 4:w + 24])
                net.wires.append(Wire(x1=x1, y1=y1, x2=x2, y2=y2, width=width))
                p = w + 24

            # Scan body for junctions (16 bytes from marker)
            p = 0
            while True:
                j = body.find(self.JUNCTION_MARKER, p)
                if j == -1 or j + 16 > len(body):
                    break
                x, y, diameter = struct.unpack('<iii', body[j + 4:j + 16])
                net.junctions.append(Junction(x=x, y=y, diameter=diameter))
                p = j + 16

    def _deduplicate_and_sort(self) -> List[Component]:
        """Sort by refdes prefix then number. No filtering needed —
        the new fixed-offset parser doesn't produce false positives."""
        comps = list(self.components.values())

        def sort_key(comp: Component) -> Tuple:
            m = re.match(r'([A-Za-z+]+)(\d+)', comp.refdes)
            if m:
                return (m.group(1), int(m.group(2)))
            return (comp.refdes, 0)

        comps.sort(key=sort_key)
        return comps

    def to_json(self, components: Optional[List[Component]] = None, nets: Optional[Dict[str, Net]] = None) -> str:
        """Serialize components and nets to JSON."""
        if components is None or nets is None:
            components, nets = self.parse()

        comp_dicts = []
        for comp in components:
            d = asdict(comp)
            comp_dicts.append({k: v for k, v in d.items() if v is not None})

        net_dicts = []
        for net in nets.values():
            net_dicts.append({
                'name': net.name,
                'segments': net.segments,
                'pins': sorted(list(net.pin_refs))
            })

        return json.dumps({
            'components': comp_dicts,
            'nets': net_dicts
        }, indent=2)

    def summary(self) -> Dict[str, int]:
        """Return a summary of component counts by type."""
        comps, _ = self.parse()
        summary = {}
        for comp in comps:
            match = re.match(r'([A-Z]+)', comp.refdes)
            if match:
                typ = match.group(1)
                summary[typ] = summary.get(typ, 0) + 1
        return summary
