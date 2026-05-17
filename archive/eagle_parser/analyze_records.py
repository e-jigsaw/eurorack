#!/usr/bin/env python3
"""
Reverse-engineering tool: dump bytes around 0x38 0x80 markers
and align them by refdes to find fixed-offset fields.
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
    """Find all (marker_pos, refdes, refdes_pos) tuples."""
    records = []
    pos = 0
    while True:
        m = data.find(COMP_MARKER, pos)
        if m == -1:
            break
        # search refdes within 50 bytes after marker
        end = min(m + 2 + 50, len(data))
        rd_match = REFDES_PATTERN.search(data, m + 2, end)
        if rd_match:
            refdes = rd_match.group(0)[:-1].decode('ascii')
            if is_valid_refdes(refdes):
                records.append((m, refdes, rd_match.start()))
        pos = m + 1
    return records


def hex_dump(data: bytes, start: int, length: int) -> str:
    """Return hex dump string of data[start:start+length]."""
    chunk = data[start:start+length]
    return ' '.join(f'{b:02x}' for b in chunk)


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <eagle.sch> [--dedup] [--len N]")
        sys.exit(1)

    fp = Path(sys.argv[1])
    dedup = '--dedup' in sys.argv
    length = 80
    if '--len' in sys.argv:
        i = sys.argv.index('--len')
        length = int(sys.argv[i+1])

    data = fp.read_bytes()
    print(f"File: {fp.name} ({len(data)} bytes)")
    records = find_records(data)
    print(f"Found {len(records)} marker+refdes records\n")

    seen = set()
    for marker_pos, refdes, refdes_pos in records:
        if dedup and refdes in seen:
            continue
        seen.add(refdes)
        # Print: marker_pos, refdes_pos - marker_pos offset, refdes
        offset_to_refdes = refdes_pos - marker_pos
        # Show: bytes from marker_pos to marker_pos+length
        print(f"=== {refdes:8s}  marker@{marker_pos:6d}  refdes@{refdes_pos:6d}  Δ={offset_to_refdes:2d}")
        print(f"  {hex_dump(data, marker_pos, length)}")


if __name__ == '__main__':
    main()
