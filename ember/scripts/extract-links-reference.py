"""Extract the electrical reference only; never import EAGLE placement or routing.

Run from ember: python3 scripts/extract-links-reference.py --check
"""
import argparse
import json
import xml.etree.ElementTree as ET
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE.parent / "links/hardware_design/pcb/links_v40.9.sch"
TARGET = BASE / "modules/links/single-board/reference.json"
parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
r = ET.parse(SOURCE).getroot()
parts = {p.get("name"): p for p in r.findall(".//parts/part")
         if p.get("name", "").startswith(("IC", "R", "C", "D", "LED", "J"))}
nets = {}
for net in r.findall(".//sheets/sheet/nets/net"):
    members = []
    for pin in net.findall(".//pinref"):
        name = pin.get("part")
        if name not in parts:
            continue
        part = parts[name]
        device = r.find(f".//libraries/library[@name='{part.get('library')}']/devicesets/deviceset[@name='{part.get('deviceset')}']/devices/device[@name='{part.get('device')}']")
        connect = next(c for c in device.findall("./connects/connect")
                       if c.get("gate") == pin.get("gate") and c.get("pin") == pin.get("pin"))
        pad = connect.get("pad")
        if name.startswith("JP"):
            pad = str({1: 9, 2: 10, 3: 7, 4: 8, 5: 5, 6: 6, 7: 3, 8: 4, 9: 1, 10: 2}[int(pad)])
        elif name.startswith("J"):
            pad = {"P1": "3", "P2": "2", "P3": "1"}[pad]
        elif name.startswith("LED"):
            pad = {"A": "1", "K": "2"}[pad]
        elif name.startswith("D"):
            pad = {"A": "1", "C": "2"}[pad]
        elif pad in ("+", "-"):
            pad = {"+": "1", "-": "2"}[pad]
        members.append(f"{name}.pin{pad}")
    if members:
        nets[net.get("name").replace("$", "_")] = sorted(members)
reference = {
    "source": "links/hardware_design/pcb/links_v40.9.sch",
    "pinMappingNotes": [
        "JP1 remapped to standard Doepfer numbering: 1/2=-12V,9/10=+12V",
        "Jack P1=sleeve -> pin3; P2=normal -> pin2; P3=tip -> pin1",
        "LM321 uses TI datasheet pin1=+IN,2=V-,3=-IN,4=OUT,5=V+",
    ],
    "nets": nets,
    "values": {n: p.get("value", "") for n, p in parts.items()},
}
if args.check:
    if json.loads(TARGET.read_text()) != reference:
        raise SystemExit("FAIL: reference.json differs from the original EAGLE schematic")
    print("PASS: reference.json independently matches the original EAGLE schematic")
else:
    TARGET.write_text(json.dumps(reference, indent=2) + "\n")
