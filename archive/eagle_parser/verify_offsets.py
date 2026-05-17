#!/usr/bin/env python3
"""
Verify hypothesis: X at marker+28, Y at marker+32 for each component record.
Compare to KiCad import ground truth.
"""
import sys
import re
import struct
from pathlib import Path

REFDES_PATTERN = re.compile(rb'(?:LED[0-9]+|IC[0-9]+|JP[0-9]+|[RCDJ][0-9]+)\x00')
COMP_MARKER = b'\x38\x80'


def is_valid_refdes(s: str) -> bool:
    return bool(re.match(r'^(LED|IC|JP|R|C|D|J)[1-9]\d*$', s))


def find_records(data: bytes):
    records = []
    pos = 0
    while True:
        m = data.find(COMP_MARKER, pos)
        if m == -1:
            break
        end = min(m + 2 + 50, len(data))
        rd_match = REFDES_PATTERN.search(data, m + 2, end)
        if rd_match:
            refdes = rd_match.group(0)[:-1].decode('ascii')
            if is_valid_refdes(refdes):
                records.append((m, refdes))
        pos = m + 1
    return records


def load_kicad_coords(path: str):
    coords = {}
    text = Path(path).read_text()
    pat = re.compile(
        r'\(symbol\s+\(lib_id\s+"[^"]*"\)\s+\(at\s+([-\d.]+)\s+([-\d.]+)\s+(\d+)\).*?'
        r'\(property\s+"Reference"\s+"([A-Z]+\d+)"',
        re.DOTALL,
    )
    for x, y, rot, ref in pat.findall(text):
        if re.match(r'^(R|C|D|IC|LED|J|JP)\d+$', ref):
            coords[ref] = (float(x), float(y), int(rot))
    return coords


def main():
    sch = Path(sys.argv[1])
    kicad = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    data = sch.read_bytes()
    records = find_records(data)
    print(f"File: {sch.name}, records: {len(records)}")

    kc = load_kicad_coords(str(kicad)) if kicad else {}

    seen = set()
    print(f"\n{'refdes':8s} {'X(mm)':>12s} {'Y(mm)':>12s} {'kX(mm)':>12s} {'kY(mm)':>12s} {'dx':>8s} {'dy':>8s}")
    print('-' * 90)

    matches = 0
    total = 0
    for marker_pos, refdes in records:
        if refdes in seen:
            continue
        seen.add(refdes)

        if marker_pos + 36 > len(data):
            continue
        x_raw = struct.unpack('<i', data[marker_pos+28:marker_pos+32])[0]
        y_raw = struct.unpack('<i', data[marker_pos+32:marker_pos+36])[0]
        x_mm = x_raw / 10000.0
        y_mm = y_raw / 10000.0

        if refdes in kc:
            kx, ky, krot = kc[refdes]
            dx = x_mm - kx
            dy = y_mm - ky
            ok = abs(dx) < 0.001 and abs(dy) < 0.001
            mark = '✓' if ok else '✗'
            print(f"{refdes:8s} {x_mm:12.4f} {y_mm:12.4f} {kx:12.4f} {ky:12.4f} {dx:8.4f} {dy:8.4f} {mark}")
            total += 1
            if ok:
                matches += 1
        else:
            print(f"{refdes:8s} {x_mm:12.4f} {y_mm:12.4f} {'?':>12s} {'?':>12s}")

    if total:
        print(f"\nMatches: {matches}/{total} ({100*matches/total:.1f}%)")


if __name__ == '__main__':
    main()
