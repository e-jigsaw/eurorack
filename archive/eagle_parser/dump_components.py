#!/usr/bin/env python3
"""
CLI tool to dump component instances from an Eagle v4/v5 binary .sch file.

Usage:
    python dump_components.py <file.sch>
    python dump_components.py <file.sch> --summary
    python dump_components.py <file.sch> --json
"""

import sys
import json
from pathlib import Path
from eagle_sch import EagleSchParser


def main():
    if len(sys.argv) < 2:
        print("Usage: python dump_components.py <file.sch> [--summary] [--json]")
        sys.exit(1)

    filepath = sys.argv[1]
    show_summary = '--summary' in sys.argv
    show_json = '--json' in sys.argv

    if not Path(filepath).exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)

    # Try to find KiCad import file as fallback for coordinates
    # Look for a corresponding .kicad_sch file in the parent directories
    kicad_import = None
    sch_path = Path(filepath).parent
    for candidate in [
        sch_path / 'import' / f"{Path(filepath).stem}.kicad_sch",
        sch_path.parent / 'import' / f"{Path(filepath).stem}.kicad_sch",
        sch_path / f"{Path(filepath).stem}.kicad_sch",
    ]:
        if candidate.exists():
            kicad_import = str(candidate)
            break

    parser = EagleSchParser(filepath, kicad_import_path=kicad_import)

    if show_summary:
        summary = parser.summary()
        print(f"\nComponent Summary:")
        total = 0
        for typ in sorted(summary.keys()):
            count = summary[typ]
            total += count
            print(f"  {typ:8s}: {count:3d}")
        print(f"  {'TOTAL':8s}: {total:3d}")
        sys.exit(0)

    components, _ = parser.parse()

    if show_json:
        print(parser.to_json(components, parser.nets))
    else:
        # Human-readable table format
        print(f"\nFound {len(components)} component instances:\n")
        print(f"{'Refdes':<10} {'Value':<20} {'Package':<20} {'X':<12} {'Y':<12} {'Rotation':<6} {'Mirror':<6}")
        print("-" * 100)

        for comp in components:
            x_str = f"{comp.x}" if comp.x is not None else "—"
            y_str = f"{comp.y}" if comp.y is not None else "—"
            rot_str = comp.rotation if comp.rotation else "—"
            mirror_str = "Y" if comp.mirror else "N"
            value_str = comp.value if comp.value else "—"
            pkg_str = comp.package if comp.package else "—"

            print(f"{comp.refdes:<10} {value_str:<20} {pkg_str:<20} {x_str:<12} {y_str:<12} {rot_str:<6} {mirror_str:<6}")

        print(f"\n{len(components)} total components")


if __name__ == '__main__':
    main()
