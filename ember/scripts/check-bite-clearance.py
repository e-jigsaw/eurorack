#!/usr/bin/env python3
"""
Panel gate: mouse-bite NPTH holes must clear all board copper by >= 0.3mm.

Drilling a bite row through (or too close to) an edge-hugging trace destroys
the trace at fabrication -- this happened on links-main when tabs were placed
by even spacing instead of copper awareness. This gate makes the failure
impossible to reintroduce silently.

Run with KiCad's bundled python (has the pcbnew binding):
  /Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/python3 \
    scripts/check-bite-clearance.py <panel.kicad_pcb>

Exits 1 if any bite hole is closer than MIN_CLEARANCE_MM to copper.
Distances: exact for tracks/vias/circular pads; other pad shapes use their
bounding box (conservative -- may under-report clearance, never over-report).
Note KiCad 9: PCB_VIA.GetWidth() requires a layer argument.
"""
import math
import sys

import pcbnew

MIN_CLEARANCE_MM = 0.3
NM = 1e6


def seg_dist(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def main(path):
    board = pcbnew.LoadBoard(path)

    bites = []
    for fp in board.GetFootprints():
        if fp.GetFPID().GetLibItemName().wx_str() == "NPTH":
            for p in fp.Pads():
                pos = p.GetPosition()
                bites.append((pos.x / NM, pos.y / NM, p.GetDrillSize().x / 2 / NM))
    if not bites:
        print(f"FAIL: {path} -- no mouse-bite NPTH holes found (not a panel?)")
        return 1

    worst = (1e9, None)
    for (bx, by, br) in bites:
        for t in board.GetTracks():
            if t.Type() == pcbnew.PCB_TRACE_T:
                s, e = t.GetStart(), t.GetEnd()
                d = (seg_dist(bx, by, s.x / NM, s.y / NM, e.x / NM, e.y / NM)
                     - t.GetWidth() / 2 / NM - br)
                if d < worst[0]:
                    worst = (d, ("track", bx, by))
            elif t.Type() == pcbnew.PCB_VIA_T:
                pos = t.GetPosition()
                w = t.GetWidth(pcbnew.F_Cu)  # KiCad 9: layer arg required
                d = math.hypot(bx - pos.x / NM, by - pos.y / NM) - w / 2 / NM - br
                if d < worst[0]:
                    worst = (d, ("via", bx, by))
        for fp in board.GetFootprints():
            if fp.GetFPID().GetLibItemName().wx_str() == "NPTH":
                continue  # bite holes themselves carry no copper
            for p in fp.Pads():
                pos = p.GetPosition()
                if p.GetShape() == pcbnew.PAD_SHAPE_CIRCLE:
                    d = math.hypot(bx - pos.x / NM, by - pos.y / NM) - p.GetSize().x / 2 / NM - br
                else:
                    bb = p.GetBoundingBox()
                    ddx = max(bb.GetLeft() / NM - bx, 0, bx - bb.GetRight() / NM)
                    ddy = max(bb.GetTop() / NM - by, 0, by - bb.GetBottom() / NM)
                    d = math.hypot(ddx, ddy) - br
                if d < worst[0]:
                    worst = (d, (f"pad {fp.GetReference()}", bx, by))

    dmin, where = worst
    status = "PASS" if dmin >= MIN_CLEARANCE_MM else "FAIL"
    print(f"{status}: {path} -- {len(bites)} bite holes, "
          f"min copper clearance {dmin:+.3f}mm (gate {MIN_CLEARANCE_MM}mm) "
          f"nearest: {where[0]} at ({where[1]:.2f}, {where[2]:.2f})mm")
    return 0 if dmin >= MIN_CLEARANCE_MM else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
