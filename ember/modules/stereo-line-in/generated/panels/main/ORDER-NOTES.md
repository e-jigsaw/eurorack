# main: 4-up customer panel

- Panel by Customer; one circuit design repeated 4 times (4 columns x 1 row).
- Panel size: 92 x 124 mm. FR4, 4 layers, 1.6 mm thickness.
- Assembly: Standard PCBA / Both sides. Confirm actual availability/options on JLCPCB.
- Upload main-panel-gerbers.zip for PCB fabrication, then BOM-JLC.csv and CPL-JLC.csv for assembly.
- BOM and CPL already contain ALL FOUR copies. Do not repeat this panel or apply another 4x multiplier to the placement data.
- One assembled panel yields four main boards. Order quantities on JLCPCB are panel quantities when using this data.
- Rails, tooling holes and fiducials are already included. Do not add another panel or tooling frame without reviewing the adjusted origin.
- Gerber/drill/CPL origin: lower-left of the whole panel; X right, Y up. Bottom positions are also viewed from the top. Verify the uploaded 3D placement and package rotations.
- P1_..P4_ prefixes identify the copies. Fiducials/tooling/mouse bites are excluded from assembly BOM and CPL.
- Routed separation: 2 mm gaps, 5 mm tabs; 5 NPTH holes per break line, diameter 0.6 mm / pitch 0.9 mm. No V-cuts.
- Ask fabrication DFM to review the routed pockets and tab fillets for their milling tool. Do not silently change unit outlines or copper.
- Keep panels intact through assembly; cut the tabs with support close to the cut and remove burrs back to the nominal 18 mm board width. Actual break-off forces/assembly stress have not been tested.
- JLC component matching, rotation/polarity preview, stock, and order submission are not verified by local DRC.

Local validation: zero KiCad DRC violations and zero unconnected nets; exact inverse comparison of 5388 copied footprints/tracks/vias/labels; 312 unique JLC placements matched to BOM and footprint coordinates; minimum mouse-bite hole edge to copper 0.572 mm.

Sources checked 2026-09-14:
https://jlcpcb.com/capabilities/pcb-assembly-capabilities
https://jlcpcb.com/jp/capabilities/pcb-capabilities/
https://jlcpcb.com/help/article/pcb-panelization
