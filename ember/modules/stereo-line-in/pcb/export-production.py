"""Generate reviewable manufacturing files; does not submit an order."""
from pathlib import Path
import json,subprocess,csv,collections,zipfile,hashlib,sys
D=Path(__file__).parent;root=D.parent
K='/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'
physical=json.loads((D/'physical-input.json').read_text());layout=json.loads((D/'layout.json').read_text());summary={}
for board in ['control','main']:
 out=root/'generated'/'pcb'/board;pcb=out/f'{board}.kicad_pcb'
 subprocess.run([sys.executable,str(D/'export-kicad.py'),board],check=True)
 subprocess.run([K,'pcb','drc',str(pcb),'--format','json','--output',str(out/'kicad-drc.json'),'--exit-code-violations'],check=True)
 drc=json.loads((out/'copper-validation.json').read_text());assert not any(drc[k] for k in ['shorts','clearanceViolations','geometryErrors','unconnected'])
 gerber=out/'gerbers';gerber.mkdir(exist_ok=True)
 layers='F.Cu,'+('In1.Cu,In2.Cu,' if board=='main' else '')+'B.Cu,F.Paste,B.Paste,F.Mask,B.Mask,F.SilkS,B.SilkS,Edge.Cuts'
 subprocess.run([K,'pcb','export','gerbers',str(pcb),'--output',str(gerber)+'/', '--layers',layers,'--subtract-soldermask','--use-drill-file-origin'],check=True)
 subprocess.run([K,'pcb','export','drill',str(pcb),'--output',str(gerber)+'/', '--drill-origin','plot','--format','excellon','--excellon-units','mm','--excellon-separate-th','--excellon-oval-format','route'],check=True)
 for side in ['F','B']:
  subprocess.run([K,'pcb','export','svg',str(pcb),'--output',str(out/f'assembly-{side}.svg'),'--layers',f'{side}.Cu,{side}.Fab,{side}.SilkS,Edge.Cuts','--mode-single','--fit-page-to-board','--exclude-drawing-sheet','--sketch-pads-on-fab-layers']+(['--mirror'] if side=='B' else []),check=True)
 ps=[p for p in physical['parts'] if p['board']==board and p['ref']!='J_LINK'];jlc=[p for p in ps if p['procurement'].get('jlc')];hand=[p for p in ps if not p['procurement'].get('jlc')]
 groups={}
 for p in jlc:groups.setdefault(p['procurement']['jlc'],[]).append(p)
 with (out/'BOM-JLC.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['Designator','Comment','Footprint','LCSC Part #'])
  for code,parts in groups.items():
   p=parts[0];w.writerow([','.join(p['ref'] for p in parts),p['procurement']['mpn'],p['shapeKey'],code])
 with (out/'CPL-JLC.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['Designator','Mid X','Mid Y','Layer','Rotation'])
  for p in jlc:
   x,y,r,layer=layout[board]['placements'][p['ref']]
   # Same lower-left board origin as Gerbers/drills; X right, Y up.
   w.writerow([p['ref'],f'{9+x:.4f}mm',f'{y+layout[board]["height"]/2:.4f}mm','Top' if layer=='top' else 'Bottom',r])
 with (out/'assembly.csv').open('w') as f:
  w=csv.writer(f);w.writerow(['Ref','Value','MPN','Assembly','X panel mm','Y panel mm','Board face','Rotation top-view deg'])
  for p in ps:
   x,y,r,layer=layout[board]['placements'][p['ref']];w.writerow([p['ref'],p['value'],p['procurement']['mpn'],p['procurement']['assembly'],10+x,layout[board]['panelCenter'][1]-y,layer,r])
 with zipfile.ZipFile(out/f'{board}-gerbers.zip','w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(gerber.iterdir()):z.write(p,p.name)
 files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(gerber.iterdir())}
 summary[board]={'size_mm':[18,layout[board]['height']],'layers':4 if board=='main' else 2,'parts':len(ps),'jlc_parts':len(jlc),'hand_parts':len(hand),'jlc_types':len(groups),'files_sha256':files,'cpl_origin':'Lower-left board origin: X=9+pcbX, Y=pcbY+boardHeight/2; top view. Rotation follows explicit footprint local +x. JLC placement preview must verify package zero-angle conventions.'}
summary.update(status='PCB prototype design and manufacturing exports; not an approved production order',not_verified=['JLC assembly upload / DFM / orientation preview','Physical jack/pot seating, socket retention and solder-tail height','Actual audio/noise/ESD/thermal measurements'],inventory_basis='Saved JLC snapshots 2026-09-13; no reservation; LED loose-stock not verified')
(root/'generated'/'pcb'/'manufacturing-manifest.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({b:{k:v for k,v in summary[b].items() if k!='files_sha256'} for b in ['control','main']},indent=2))
