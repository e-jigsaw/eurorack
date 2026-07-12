#!/usr/bin/env python3
"""Build the Ripples v9 reference manifest from the original BOM and board."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "archive" / "eagle_parser"))

from eagle_brd import EagleBrdParser  # noqa: E402

XLSX = ROOT / "ripples" / "hardware_design" / "Ripples.xlsx"
BOARD = ROOT / "ripples" / "hardware_design" / "pcb" / "ripples_v90.brd"
OUTPUT = ROOT / "ember" / "modules" / "ripples" / "reference" / "v9.json"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REF_RE = re.compile(r"^(?:LED|IC|JP|SW|R|C|D|J|P|Q|L)\d+$")


def column_index(address: str) -> int:
    letters = re.match(r"[A-Z]+", address).group(0)
    result = 0
    for char in letters:
        result = result * 26 + ord(char) - ord("A") + 1
    return result - 1


def read_v9_rows() -> list[list[object | None]]:
    with ZipFile(XLSX) as archive:
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        shared = ["".join(node.itertext()) for node in shared_root.findall("m:si", NS)]
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))

    rows: list[list[object | None]] = []
    for row_node in sheet.findall(".//m:sheetData/m:row", NS):
        row: list[object | None] = [None] * 8
        for cell in row_node.findall("m:c", NS):
            index = column_index(cell.attrib["r"])
            if index >= len(row):
                continue
            value_node = cell.find("m:v", NS)
            if value_node is None:
                continue
            raw = value_node.text or ""
            cell_type = cell.attrib.get("t")
            if cell_type == "s":
                value: object = shared[int(raw)]
            elif cell_type in {"str", "inlineStr"}:
                value = raw
            else:
                number = float(raw)
                value = int(number) if number.is_integer() else number
            row[index] = value
        rows.append(row)
    return rows


def split_refdes(value: str) -> tuple[list[str], list[str]]:
    refs: list[str] = []
    accessories: list[str] = []
    for token in (item.strip() for item in value.removeprefix("- ").split(",")):
        if REF_RE.match(token):
            refs.append(token)
        elif token:
            accessories.append(token)
    return refs, accessories


def build_manifest() -> dict[str, object]:
    bom_by_ref: dict[str, dict[str, object | None]] = {}
    accessories: list[dict[str, object | None]] = []
    section = ""

    for row_number, row in enumerate(read_v9_rows(), start=1):
        index, quantity, description, specs, value, package, supplier_pn, source = row
        if isinstance(index, str) and index in {
            "SMT parts",
            "PTH parts, top side",
            "PTH parts, bottom side",
        }:
            section = index
            continue
        if not isinstance(index, str) or index in {"Index", "PCB"}:
            continue
        if not isinstance(quantity, int):
            continue
        refs, unknown = split_refdes(index)
        entry = {
            "bom_row": row_number,
            "section": section,
            "description": description,
            "specs": specs,
            "value": value,
            "package": package,
            "supplier_pn": supplier_pn,
            "source": source,
        }
        if index.startswith("- "):
            accessories.append({**entry, "quantity": quantity, "for_refdes": refs})
            continue
        if refs and isinstance(quantity, int) and quantity != len(refs):
            raise ValueError(f"BOM row {row_number}: quantity {quantity} != {len(refs)} refs")
        if unknown:
            raise ValueError(f"BOM row {row_number}: unrecognized reference tokens: {unknown}")
        for refdes in refs:
            if refdes in bom_by_ref:
                raise ValueError(f"duplicate BOM refdes: {refdes}")
            bom_by_ref[refdes] = {"refdes": refdes, **entry}

    placements = {component.refdes: component for component in EagleBrdParser(BOARD).parse()}
    missing = sorted(set(bom_by_ref) - set(placements))
    extra = sorted(set(placements) - set(bom_by_ref))
    if missing or extra:
        raise ValueError(f"BOM/board mismatch: missing={missing}, extra={extra}")

    components = []
    for refdes in sorted(bom_by_ref, key=lambda item: (re.match(r"[A-Z]+", item).group(0), int(re.search(r"\d+", item).group(0)))):
        placement = placements[refdes]
        components.append(
            {
                **bom_by_ref[refdes],
                "pcb": {
                    "x_mm": placement.x_mm,
                    "y_mm": placement.y_mm,
                    "rotation": placement.rotation,
                    "mirror": placement.mirror,
                    "layer": placement.layer,
                },
            }
        )

    return {
        "module": "Ripples",
        "revision": "v9.0",
        "sources": {
            "bom": str(XLSX.relative_to(ROOT)),
            "board": str(BOARD.relative_to(ROOT)),
        },
        "board": {"width_mm": 39.4, "height_mm": 106.7, "layers": 4},
        "component_count": len(components),
        "accessories": accessories,
        "components": components,
    }


def main() -> None:
    manifest = build_manifest()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUTPUT.relative_to(ROOT)}: {manifest['component_count']} components")


if __name__ == "__main__":
    main()
