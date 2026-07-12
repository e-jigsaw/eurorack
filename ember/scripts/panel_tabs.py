# KiKit plugins for the Links 1x2 panel: copper-aware tab placement and
# per-cut mouse-bite offsets.
#
# Why this exists: KiKit's stock `tabs: fixed` spreads tabs evenly along each
# edge and its `cuts: mousebites` applies one global offset. With the flush
# offset (0.2mm into the board, holes reaching 0.45mm inside), links-main --
# whose edge-hugging traces sit as close as ~0.26-0.6mm to its long edges --
# got a bite row drilled straight through a track (measured -0.215mm
# clearance). These plugins fix that structurally:
#
# - EdgeAwareTabs (TabsPlugin): scans the panel's copper (tracks, vias, pads
#   as bounding boxes) in a strip along each board copy's long edges and
#   places the 3 tabs per interface only where a bite row would clear the
#   copper. Two tiers per edge position:
#     tier 1 "flush": no copper within FLUSH_DEPTH of the edge in the tab
#       window -> bites offset 0.2mm INTO the board (breaks flush, no stub).
#     tier 2 "stub": no copper within STUB_DEPTH -> bites offset 0.25mm
#       OUTWARD (hole tangent to the edge, zero intrusion). Breaking leaves
#       small protruding nubs on the board edge that may need a quick
#       sanding pass -- the trade-off for not drilling near copper.
#   Seam tabs (between the two copies) must sit at the same y on both edges
#   to actually bridge the boards; each end's cut still gets its own
#   per-edge offset tier. If fewer than 3 clear spots exist on an interface,
#   2 wider (3mm) tabs are used; below 2 the plugin raises (fail loud).
#
# - EdgeAwareBites (CutsPlugin): renders each tab cut as a mouse-bite row
#   using the offset tier the tabs plugin registered for that cut position.
#   The registry is stashed on the shared `panel` object -- KiKit loads each
#   file-plugin spec into its own module instance (kikit.user.SPlugin_<n>),
#   so module-level globals do NOT cross between the two plugin classes.
#
# Loaded by scripts/panelize.py via kikit's file-plugin mechanism
# (`tabs: plugin; code: <abs path>/panel_tabs.py.EdgeAwareTabs`).
import math

from kikit import plugin
from kikit.annotations import TabAnnotation

# Geometry constants (mm). Bite drill/spacing match the previous pipeline
# revision; EXPAND is the half-window around a tab center that must be
# copper-free along the edge: tab halfwidth (1.0) + bite prolongation (0.3)
# + drill radius (0.25) + 0.35 slack.
TAB_WIDTH = 2.0
WIDE_TAB_WIDTH = 3.0
MIN_SEPARATION = 12.0
CORNER_MARGIN = 3.0
FLUSH_DEPTH = 0.85   # copper-free depth required for flush bites
STUB_DEPTH = 0.40    # copper-free depth required for stub (outward) bites
OUT_DEPTH = 0.5      # strip checked outside the edge
EXPAND = 1.9
FLUSH_OFFSET = 0.2   # into the board (KiKit convention: positive = inward)
STUB_OFFSET = -0.25  # hole tangent to the board edge, zero intrusion
DRILL = 0.5
SPACING = 0.75
PROLONG = 0.3
TARGET_FRACTIONS = (0.2, 0.5, 0.8)

NM = 1e6  # KiCad units per mm

# Attribute stashed on the panel object: list of (x_mm, y_mm, offset_mm),
# filled by EdgeAwareTabs, read by EdgeAwareBites.
REGISTRY_ATTR = "_ember_cut_offsets"


def _merge(intervals):
    intervals = sorted(intervals)
    out = []
    for a, b in intervals:
        if out and a <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], b))
        else:
            out.append((a, b))
    return out


def _complement(blocked, lo, hi):
    free = []
    cur = lo
    for a, b in _merge(blocked):
        if a > cur:
            free.append((cur, min(a, hi)))
        cur = max(cur, b)
        if cur >= hi:
            break
    if cur < hi:
        free.append((cur, hi))
    return [(a, b) for a, b in free if b > a]


def _copper_boxes_mm(board):
    """All copper items as (x0, y0, x1, y1) bounding boxes in mm."""
    import pcbnew
    boxes = []
    for t in board.GetTracks():
        if t.Type() == pcbnew.PCB_TRACE_T:
            s, e = t.GetStart(), t.GetEnd()
            w = t.GetWidth() / 2 / NM
            boxes.append((min(s.x, e.x) / NM - w, min(s.y, e.y) / NM - w,
                          max(s.x, e.x) / NM + w, max(s.y, e.y) / NM + w))
        elif t.Type() == pcbnew.PCB_VIA_T:
            pos = t.GetPosition()
            r = t.GetWidth(pcbnew.F_Cu) / 2 / NM
            boxes.append((pos.x / NM - r, pos.y / NM - r, pos.x / NM + r, pos.y / NM + r))
    for fp in board.GetFootprints():
        for p in fp.Pads():
            bb = p.GetBoundingBox()
            boxes.append((bb.GetLeft() / NM, bb.GetTop() / NM,
                          bb.GetRight() / NM, bb.GetBottom() / NM))
    return boxes


def _edge_free_intervals(boxes, edge_x, inside_sign, y_lo, y_hi, depth):
    """Copper-free tab-center intervals along a vertical board edge."""
    strip_lo = edge_x - (OUT_DEPTH if inside_sign > 0 else depth)
    strip_hi = edge_x + (depth if inside_sign > 0 else OUT_DEPTH)
    blocked = [(y0 - EXPAND, y1 + EXPAND)
               for (x0, y0, x1, y1) in boxes
               if x1 >= strip_lo and x0 <= strip_hi]
    return _complement(blocked, y_lo + CORNER_MARGIN, y_hi - CORNER_MARGIN)


def _intersect(a, b):
    out = []
    i = j = 0
    while i < len(a) and j < len(b):
        lo, hi = max(a[i][0], b[j][0]), min(a[i][1], b[j][1])
        if hi > lo:
            out.append((lo, hi))
        if a[i][1] < b[j][1]:
            i += 1
        else:
            j += 1
    return out


def _subtract_chosen(intervals, chosen):
    for c in chosen:
        nxt = []
        for a, b in intervals:
            if c - MIN_SEPARATION > a:
                nxt.append((a, min(b, c - MIN_SEPARATION)))
            if c + MIN_SEPARATION < b:
                nxt.append((max(a, c + MIN_SEPARATION), b))
        intervals = nxt
    return intervals


def _nearest_in(intervals, target):
    best = None
    for a, b in intervals:
        p = min(max(target, a), b)
        if best is None or abs(p - target) < abs(best - target):
            best = p
    return best


def _pick_positions(tier1, tier2, y_lo, y_hi):
    """Pick up to 3 spread tab centers, preferring tier-1 (flush) intervals."""
    chosen = []
    for f in TARGET_FRACTIONS:
        target = y_lo + f * (y_hi - y_lo)
        p = _nearest_in(_subtract_chosen(tier1, chosen), target)
        if p is None:
            p = _nearest_in(_subtract_chosen(tier2, chosen), target)
        if p is not None:
            chosen.append(p)
    return sorted(chosen)


def _in_intervals(intervals, y):
    return any(a <= y <= b for a, b in intervals)


class EdgeAwareTabs(plugin.TabsPlugin):
    def buildTabAnnotations(self, panel):
        registry = []
        setattr(panel, REGISTRY_ATTR, registry)

        subs = sorted(panel.substrates, key=lambda s: s.bounds()[0])
        if len(subs) != 2:
            raise RuntimeError(f"expected a 1x2 panel, got {len(subs)} substrates")
        boxes = _copper_boxes_mm(panel.board)

        def edge_tiers(edge_x_nm, inside_sign, y_lo, y_hi):
            e = edge_x_nm / NM
            flush = _edge_free_intervals(boxes, e, inside_sign, y_lo, y_hi, FLUSH_DEPTH)
            stub = _edge_free_intervals(boxes, e, inside_sign, y_lo, y_hi, STUB_DEPTH)
            return flush, stub

        a, b = subs
        ax0, ay0, ax1, ay1 = a.bounds()
        bx0, by0, bx1, by1 = b.bounds()
        y_lo, y_hi = ay0 / NM, ay1 / NM

        a_left = edge_tiers(ax0, +1, y_lo, y_hi)
        a_right = edge_tiers(ax1, -1, y_lo, y_hi)
        b_left = edge_tiers(bx0, +1, y_lo, y_hi)
        b_right = edge_tiers(bx1, -1, y_lo, y_hi)

        def build(name, edges):
            """edges: list of (substrate, edge_x_nm, direction, (flush, stub))"""
            tier1 = edges[0][3][0]
            tier2 = _merge(edges[0][3][0] + edges[0][3][1])
            for (_, _, _, (fl, st)) in edges[1:]:
                tier1 = _intersect(tier1, fl)
                tier2 = _intersect(tier2, _merge(fl + st))
            ys = _pick_positions(tier1, tier2, y_lo, y_hi)
            if len(ys) < 2:
                raise RuntimeError(
                    f"panel interface '{name}': only {len(ys)} copper-clear tab "
                    f"positions found (need >= 2) -- board edges too crowded")
            width = TAB_WIDTH if len(ys) == 3 else WIDE_TAB_WIDTH
            for y in ys:
                for (sub, edge_x, direction, (fl, _)) in edges:
                    sub.annotations.append(TabAnnotation(
                        None, (edge_x, y * NM), direction, width * NM))
                    offset = FLUSH_OFFSET if _in_intervals(fl, y) else STUB_OFFSET
                    registry.append((edge_x / NM, y, offset))

        build("left-rail", [(a, ax0, (1, 0), a_left)])
        build("seam", [(a, ax1, (-1, 0), a_right), (b, bx0, (1, 0), b_left)])
        build("right-rail", [(b, bx1, (-1, 0), b_right)])


class EdgeAwareBites(plugin.CutsPlugin):
    @staticmethod
    def _offset_for(registry, cut):
        cx, cy = cut.centroid.x / NM, cut.centroid.y / NM
        best, best_d = None, 1e9
        for (x, y, offset) in registry:
            d = math.hypot(cx - x, cy - y)
            if d < best_d:
                best, best_d = offset, d
        if best is None or best_d > 3.0:
            raise RuntimeError(
                f"tab cut at ({cx:.2f}, {cy:.2f})mm has no registered offset "
                f"(nearest registration {best_d:.2f}mm away)")
        return best

    def renderTabCuts(self, panel, cuts):
        import pcbnew
        registry = getattr(panel, REGISTRY_ATTR, [])
        groups = {}
        for cut in cuts:
            groups.setdefault(self._offset_for(registry, cut), []).append(cut)
        for offset, group in groups.items():
            panel.makeMouseBites(group, pcbnew.FromMM(DRILL), pcbnew.FromMM(SPACING),
                                 pcbnew.FromMM(offset), pcbnew.FromMM(PROLONG))

    def renderOtherCuts(self, panel, cuts):
        import pcbnew
        cuts = list(cuts)
        if cuts:
            panel.makeMouseBites(cuts, pcbnew.FromMM(DRILL), pcbnew.FromMM(SPACING),
                                 0, pcbnew.FromMM(PROLONG))
