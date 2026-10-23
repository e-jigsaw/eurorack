"""Rebuild reviewed PCB artifacts from frozen offline routing, with live source checks."""
from pathlib import Path
import subprocess,sys,json,shutil
root=Path(__file__).resolve().parent.parent

def run(*args):subprocess.run(args,cwd=root,check=True)
run('bun','build.jsx')
run('bun','pcb/export-shapes.ts')
run(sys.executable,'procurement/render-selection.py')
for board in ['control','main']:run('bun','pcb/build.tsx',board,'--placement-only')
run(sys.executable,'pcb/check-placement.py')
run(sys.executable,'pcb/check-assembly.py')
for board in ['control','main']:
 run(sys.executable,'pcb/import-ses.py',board)
 run(sys.executable,'pcb/verify-copper.py',board)
run('bun','run','typecheck:pcb')
run('bun','pcb/check-preview.tsx')
run(sys.executable,'pcb/add-silkscreen.py')
run(sys.executable,'pcb/export-production.py')
run('bun','pcb/review.ts')
for board in ['control','main']:
 out=root/'generated'/'pcb'/board
 report={'status':'passed','board':board,'routing':'Offline Freerouting 2.4.1 + checked route adjustments; reproduced in tscircuit', 'preview':json.loads((out/'preview-validation.json').read_text()),'copper':json.loads((out/'copper-validation.json').read_text()),'kicad':json.loads((out/'kicad-drc.json').read_text())}
 old=out/'build-report.json'
 if old.exists() and json.loads(old.read_text()).get('errors'):
  archive=root/'generated'/'pcb'/'routing-history';archive.mkdir(exist_ok=True);shutil.copy2(old,archive/f'{board}-capacity-attempt.json')
 old.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('Reviewed PCB artifacts rebuilt. No order submitted.')
