# KiKit plugins for the Links 1x2 panel: copper-aware tab placement and
# per-cut mouse-bite offsets.
#
# Panel topology (user decision): the two board copies sit side by side and
# ride TOP/BOTTOM rails (KiKit railstb). The boards' long (108.4mm) edges
# are both the copper-crowded ones (links-main routes traces at ~0.26-0.6mm
# from them) and the rack-visible ones, so:
#   - the OUTER long edges carry ZERO tabs -- they come out of the mill as
#     clean, unbroken 108.4mm edges (no bites, no stubs, nothing to sand);
#   - lengthwise support comes from 3 tabs on the middle SEAM between the
#     copies (the only long edges that get cuts -- they face each other,
#     never visible in the rack);
#   - each copy's SHORT (19mm) edges carry 2 tabs into the top/bottom rails.
#     The short edges are kept copper-free by placement (Y_PWR lowered to
#     48.5 specifically so the power header clears the top break line).
#
# Why copper-aware placement instead of KiKit's stock `tabs: fixed`: evenly
# spaced tabs + the global flush bite offset (0.2mm into the board, holes
# reaching 0.45mm inside) drilled a bite row straight through a links-main
# track (measured -0.215mm clearance). The plugins fix that structurally:
#
# - EdgeAwareTabs (TabsPlugin): scans the panel's copper (tracks, vias, pads
#   as bounding boxes) in a strip along each tabbed edge and places tabs
#   only where a bite row clears the copper. Two tiers per position:
#     tier 1 "flush": no copper within FLUSH_DEPTH of the edge in the tab
#       window -> bites offset 0.2mm INTO the board (breaks flush, no stub).
#     tier 2 "stub": no copper within STUB_DEPTH -> bites offset 0.25mm
#       OUTWARD (hole tangent to the edge, zero intrusion). Breaking leaves
#       small protruding nubs that may need a quick sanding pass -- the
#       trade-off for not drilling near copper. Acceptable on the seam and
#       short edges; never needed on the outer long edges (no tabs at all).
#   Seam tabs must sit at the same y on both facing edges to actually
#   bridge the boards; each end's cut still gets its own per-edge tier.
#   Fallback: fewer-but-wider (3mm) tabs when an interface lacks clear
#   spots; hard error below the per-interface minimum (fail loud).
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

# Geometry constants (mm). EXPAND is the half-window around a tab center
# that must be copper-free along the edge: tab halfwidth (1.0) + bite
# prolongation (0.3) + drill radius (0.25) + 0.35 slack.
TAB_WIDTH = 2.0
WIDE_TAB_WIDTH = 3.0
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

# Per-interface tab plans: (target fractions along the edge span, minimum
# separation between tabs, minimum acceptable tab count).
SEAM_PLAN = ((0.2, 0.5, 0.8), 12.0, 2)   # long inner edges, 108.4mm span
RAIL_PLAN = ((0.15, 0.85), 6.0, 1)       # short edges into the rails, 19mm span

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


def _edge_free_intervals(boxes, vertical, edge_c, inside_sign, lo, hi, depth):
    """Copper-free tab-center intervals along a board edge.

    vertical=True: edge is a vertical line at x=edge_c, intervals along y.
    vertical=False: edge is a horizontal line at y=edge_c, intervals along x.
    inside_sign: +1 if the board interior lies at coordinates > edge_c.
    """
    strip_lo = edge_c - (OUT_DEPTH if inside_sign > 0 else depth)
    strip_hi = edge_c + (depth if inside_sign > 0 else OUT_DEPTH)
    blocked = []
    for (x0, y0, x1, y1) in boxes:
        f0, f1, s0, s1 = (x0, x1, y0, y1) if vertical else (y0, y1, x0, x1)
        if f1 >= strip_lo and f0 <= strip_hi:
            blocked.append((s0 - EXPAND, s1 + EXPAND))
    return _complement(blocked, lo + CORNER_MARGIN, hi - CORNER_MARGIN)


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


def _subtract_chosen(intervals, chosen, min_sep):
    for c in chosen:
        nxt = []
        for a, b in intervals:
            if c - min_sep > a:
                nxt.append((a, min(b, c - min_sep)))
            if c + min_sep < b:
                nxt.append((max(a, c + min_sep), b))
        intervals = nxt
    return intervals


def _nearest_in(intervals, target):
    best = None
    for a, b in intervals:
        p = min(max(target, a), b)
        if best is None or abs(p - target) < abs(best - target):
            best = p
    return best


def _pick_positions(tier1, tier2, lo, hi, plan):
    """Pick spread tab centers, preferring tier-1 (flush) intervals."""
    fractions, min_sep, _ = plan
    chosen = []
    for f in fractions:
        target = lo + f * (hi - lo)
        p = _nearest_in(_subtract_chosen(tier1, chosen, min_sep), target)
        if p is None:
            p = _nearest_in(_subtract_chosen(tier2, chosen, min_sep), target)
        if p is not None:
            chosen.append(p)
    return sorted(chosen)


def _in_intervals(intervals, v):
    return any(a <= v <= b for a, b in intervals)


class EdgeAwareTabs(plugin.TabsPlugin):
    def buildTabAnnotations(self, panel):
        registry = []
        setattr(panel, REGISTRY_ATTR, registry)

        subs = sorted(panel.substrates, key=lambda s: s.bounds()[0])
        if len(subs) != 2:
            raise RuntimeError(f"expected a 1x2 panel, got {len(subs)} substrates")
        boxes = _copper_boxes_mm(panel.board)

        def edge_tiers(vertical, edge_c_nm, inside_sign, lo, hi):
            e = edge_c_nm / NM
            flush = _edge_free_intervals(boxes, vertical, e, inside_sign, lo, hi, FLUSH_DEPTH)
            stub = _edge_free_intervals(boxes, vertical, e, inside_sign, lo, hi, STUB_DEPTH)
            return flush, stub

        a, b = subs
        ax0, ay0, ax1, ay1 = a.bounds()
        bx0, by0, bx1, by1 = b.bounds()
        y_lo, y_hi = ay0 / NM, ay1 / NM

        def build(name, plan, vertical, edges, lo, hi):
            """edges: list of (substrate, edge_c_nm, direction, (flush, stub)).
            Multi-edge interfaces (the seam) require a common position on
            every edge; each edge's cut offset stays per-edge."""
            tier1 = edges[0][3][0]
            tier2 = _merge(edges[0][3][0] + edges[0][3][1])
            for (_, _, _, (fl, st)) in edges[1:]:
                tier1 = _intersect(tier1, fl)
                tier2 = _intersect(tier2, _merge(fl + st))
            positions = _pick_positions(tier1, tier2, lo, hi, plan)
            min_required = plan[2]
            if len(positions) < min_required:
                raise RuntimeError(
                    f"panel interface '{name}': only {len(positions)} copper-clear tab "
                    f"positions found (need >= {min_required}) -- edge too crowded")
            width = TAB_WIDTH if len(positions) >= len(plan[0]) else WIDE_TAB_WIDTH
            for v in positions:
                for (sub, edge_c, direction, (fl, _)) in edges:
                    origin = (edge_c, v * NM) if vertical else (v * NM, edge_c)
                    sub.annotations.append(TabAnnotation(
                        None, origin, direction, width * NM))
                    offset = FLUSH_OFFSET if _in_intervals(fl, v) else STUB_OFFSET
                    ox, oy = (edge_c / NM, v) if vertical else (v, edge_c / NM)
                    registry.append((ox, oy, offset))

        # Middle seam: the only tabs on any long edge. The outer long edges
        # (a's left, b's right) get NO annotations -- they stay unbroken.
        build("seam", SEAM_PLAN, True,
              [(a, ax1, (-1, 0), edge_tiers(True, ax1, -1, y_lo, y_hi)),
               (b, bx0, (1, 0), edge_tiers(True, bx0, +1, y_lo, y_hi))],
              y_lo, y_hi)

        # Short edges into the top (miny) and bottom (maxy) rails,
        # per copy, positions chosen independently per edge.
        for label, sub, (sx0, sy0, sx1, sy1) in (
                ("A", a, (ax0, ay0, ax1, ay1)), ("B", b, (bx0, by0, bx1, by1))):
            x_lo, x_hi = sx0 / NM, sx1 / NM
            build(f"top-rail-{label}", RAIL_PLAN, False,
                  [(sub, sy0, (0, 1), edge_tiers(False, sy0, +1, x_lo, x_hi))],
                  x_lo, x_hi)
            build(f"bottom-rail-{label}", RAIL_PLAN, False,
                  [(sub, sy1, (0, -1), edge_tiers(False, sy1, -1, x_lo, x_hi))],
                  x_lo, x_hi)


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
