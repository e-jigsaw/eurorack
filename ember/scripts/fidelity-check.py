#!/usr/bin/env python3
"""
Phase 1 fidelity spike: compare a tsci-exported .kicad_pcb against the
circuit.json ground truth it was exported from.

Run with the KiCad-bundled python3 (has a working `pcbnew` binding):
  /Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/python3 \
    scripts/fidelity-check.py dist/links-control/circuit.json kicad-spike-control.kicad_pcb
"""
import json
import math
import sys

import pcbnew


def circuit_json_counts(path):
    d = json.load(open(path))
    from collections import Counter
    c = Counter(x["type"] for x in d)
    board = next(x for x in d if x["type"] == "pcb_board")
    return c, board


def pcb_counts(path):
    board = pcbnew.LoadBoard(path)

    footprints = list(board.GetFootprints())
    pads = []
    for fp in footprints:
        pads.extend(fp.Pads())

    holes = 0  # plated through-holes with a nonzero drill (pads + standalone)
    for p in pads:
        if p.HasHole():
            holes += 1

    smt_pads = sum(1 for p in pads if not p.HasHole())

    tracks = [t for t in board.GetTracks() if t.Type() == pcbnew.PCB_TRACE_T]
    vias = [t for t in board.GetTracks() if t.Type() == pcbnew.PCB_VIA_T]
    arcs = [t for t in board.GetTracks() if t.Type() == pcbnew.PCB_ARC_T]

    total_len_mm = 0.0
    for t in tracks:
        total_len_mm += t.GetLength() / 1e6
    for a in arcs:
        total_len_mm += a.GetLength() / 1e6

    bbox = board.GetBoardEdgesBoundingBox()
    outline_w = bbox.GetWidth() / 1e6
    outline_h = bbox.GetHeight() / 1e6

    # bottom-layer (mounted-on-back) footprints
    bottom_fps = [fp.GetReference() for fp in footprints if fp.IsFlipped()]

    return {
        "footprint_count": len(footprints),
        "pad_count": len(pads),
        "smt_pad_count": smt_pads,
        "plated_hole_count": holes,
        "track_segment_count": len(tracks),
        "arc_count": len(arcs),
        "via_count": len(vias),
        "total_copper_length_mm": round(total_len_mm, 2),
        "outline_w_mm": round(outline_w, 3),
        "outline_h_mm": round(outline_h, 3),
        "bottom_footprints": bottom_fps,
    }


def main():
    cj_path, pcb_path = sys.argv[1], sys.argv[2]
    cj_counts, cj_board = circuit_json_counts(cj_path)
    pcb = pcb_counts(pcb_path)

    print(f"=== {pcb_path} vs {cj_path} ===")
    print("circuit.json pcb_board: width=%s height=%s" % (cj_board["width"], cj_board["height"]))
    print("kicad_pcb outline bbox: w=%.3f h=%.3f" % (pcb["outline_w_mm"], pcb["outline_h_mm"]))
    print()
    print("circuit.json type counts (relevant):")
    for k in ["pcb_component", "pcb_smtpad", "pcb_plated_hole", "pcb_trace", "pcb_via"]:
        print(f"  {k}: {cj_counts.get(k, 0)}")
    print()
    print("kicad_pcb counts:")
    for k, v in pcb.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
