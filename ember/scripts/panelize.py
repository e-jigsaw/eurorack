#!/usr/bin/env python3
"""
Panelize a single verified Links board (.kicad_pcb) into a 1x2 JLC panel:
5mm breakaway rails on the long (108.4mm) edges, 3 mouse-bite tabs per
long-side interface, 3 fiducials per board copy on the rails.

This is a thin wrapper around KiKit (github.com/yaqwsx/KiKit), installed
into KiCad 9's bundled python via:

  /Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/pip3 \
    install --user kikit

KiKit itself never re-routes anything -- `kikit panelize` operates purely
on the existing .kicad_pcb geometry (footprints, tracks, vias, zones,
silkscreen) and duplicates/repositions it. This was verified directly
(see .superpowers/sdd/kicad-panel-report.md, Phase 2): footprint pad
coordinates, via coordinates, and total copper length of copy B exactly
match copy A shifted by the panel pitch (19mm board width + 2mm gap =
21mm), for both Links boards.

Tab placement and mouse-bite offsets are handled by the custom KiKit
plugins in scripts/panel_tabs.py (EdgeAwareTabs / EdgeAwareBites): tabs
are positioned only where the board's edge strip is copper-free, because
links-main routes traces as close as ~0.26mm to its long edges and evenly
spaced tabs put a bite row through a track (see the bite-clearance section
of the report). scripts/check-bite-clearance.py gates the output.

Usage:
  python3 scripts/panelize.py <input.kicad_pcb> <output-panel.kicad_pcb>

Requires `kikit` on PATH (installed as above; its shebang points directly
at KiCad's bundled python3, so no venv activation or PATH munging is
needed as long as ~/Library/Python/3.9/bin/kikit exists -- adjust
KIKIT_BIN below if pip installed it elsewhere).
"""
import os
import shutil
import subprocess
import sys

PLUGIN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "panel_tabs.py")

# Panel geometry, fixed for both Links boards (both are exactly
# 19mm x 108.4mm, "rail-safe" outline -- see ca55697).
LAYOUT = "rows: 1; cols: 2; hspace: 2mm; vspace: 2mm"
# Tab positions + widths and bite drill/spacing/offsets live in
# panel_tabs.py (copper-aware; see its header comment).
TABS = f"type: plugin; code: {PLUGIN_FILE}.EdgeAwareTabs"
CUTS = f"type: plugin; code: {PLUGIN_FILE}.EdgeAwareBites"
# railslr = rails on left/right, i.e. on the board's LONG (108.4mm) edges,
# since the two copies sit side-by-side along the board's 19mm (short) axis.
FRAMING = "type: railslr; width: 5mm; space: 2mm"
FIDUCIALS = "3fid; hoffset: 2.5mm; voffset: 0mm; coppersize: 1mm; opening: 2mm"
TOOLING = "type: none"


def find_kikit() -> str:
    candidates = [
        os.path.expanduser("~/Library/Python/3.9/bin/kikit"),
        shutil.which("kikit"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    raise RuntimeError(
        "kikit not found. Install with:\n"
        "  /Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/"
        "Versions/Current/bin/pip3 install --user kikit"
    )


def panelize(input_pcb: str, output_pcb: str) -> None:
    kikit = find_kikit()
    if os.path.exists(output_pcb):
        os.remove(output_pcb)
    cmd = [
        kikit, "panelize",
        "-l", LAYOUT,
        "-t", TABS,
        "-c", CUTS,
        "-r", FRAMING,
        "-f", FIDUCIALS,
        "-o", TOOLING,
        input_pcb, output_pcb,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(output_pcb):
        sys.stderr.write(result.stdout)
        sys.stderr.write(result.stderr)
        raise RuntimeError(f"kikit panelize failed (exit {result.returncode})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    panelize(sys.argv[1], sys.argv[2])
    print(f"Panelized {sys.argv[1]} -> {sys.argv[2]}")
