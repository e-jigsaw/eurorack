"""Routing-cache guard: changes to pad shapes, placement or pin nets require a new route."""
import json,hashlib
from pathlib import Path
D=Path(__file__).parent
def digest(board):
 p=json.loads((D/'physical-input.json').read_text());l=json.loads((D/'layout.json').read_text())[board]
 parts=[{k:v[k] for k in ['ref','pins','shapeKey','board']} for v in p['parts'] if v['board']==board]
 shapes={k:{'pads':v['pads'],'body':v['body'],'offset':v.get('offset',[0,0])} for k,v in p['shapes'].items() if k in {v['shapeKey'] for v in parts}}
 value={'parts':parts,'shapes':shapes,'layout':{k:v for k,v in l.items() if k!='placementErrors'}}
 return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
