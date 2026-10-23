"""Lossless orthogonal copper/placement transfer for independent KiCad DRC and plots.
The tscircuit model remains authoritative. Footprints use top-view local pad coordinates.
"""
import json,math,sys
from pathlib import Path
D=Path(__file__).parent
board=sys.argv[1];out=D.parent/'generated'/'pcb'/board
j=json.loads((out/'circuit.json').read_text());layout=json.loads((D/'layout.json').read_text())[board];physical=json.loads((D/'physical-input.json').read_text());ps={p['ref']:p for p in physical['parts'] if p['board']==board}
ts=lambda t:[e for e in j if e['type']==t];q=lambda s:json.dumps(str(s));f=lambda n:f'{n:.6f}'
X=lambda x:100+x;Y=lambda y:100-y
lm={'top':'F.Cu','inner1':'In1.Cu','inner2':'In2.Cu','bottom':'B.Cu'};layers=['top','inner1','inner2','bottom'] if board=='main' else ['top','bottom']
src={e['source_component_id']:e['name'] for e in ts('source_component')};comps={e['pcb_component_id']:src[e['source_component_id']] for e in ts('pcb_component')};sp={e['source_port_id']:e for e in ts('source_port')};ports={e['pcb_port_id']:e for e in ts('pcb_port')}
nets={e['source_net_id']:(i+1,e['name']) for i,e in enumerate(ts('source_net'))};spnet={};trnet={}
for t in ts('source_trace'):
 if t.get('connected_source_net_ids'):
  v=nets[t['connected_source_net_ids'][0]];trnet[t['source_trace_id']]=v
  for p in t['connected_source_port_ids']:spnet[p]=v
lines=['(kicad_pcb (version 20241229) (generator "stereo_tscircuit_export")','(general (thickness 1.6))','(paper "A4")','(layers (0 "F.Cu" signal)']
if board=='main':lines+=['(2 "In1.Cu" signal) (4 "In2.Cu" signal)']
lines+=['(31 "B.Cu" signal) (34 "B.Paste" user) (35 "F.Paste" user) (36 "B.SilkS" user) (37 "F.SilkS" user) (38 "B.Mask" user) (39 "F.Mask" user) (44 "Edge.Cuts" user) (48 "B.Fab" user) (49 "F.Fab" user))',f'(setup (pad_to_mask_clearance 0.05) (aux_axis_origin 91 {100+layout["height"]/2}))','(net 0 "")']
lines += [f'(net {num} {q(name)})' for num,name in nets.values()]
for ref,p in ps.items():
 x,y,r,layer=layout['placements'][ref];side='F' if layer=='top' else 'B';shape=physical['shapes'][p['shapeKey']];justify=' (justify mirror)' if side=='B' else ''
 lines += [f'(footprint {q(p["shapeKey"])} (layer "{lm[layer]}") (at {X(x)} {Y(y)})',f'(property "Reference" {q(ref)} (at 0 0) (layer "{side}.Fab") (effects (font (size 0.6 0.6) (thickness 0.1)){justify}))',f'(property "Value" {q(p.get("procurement",{}).get("mpn",p["value"]))} (at 0 0) (layer "{side}.Fab") (hide yes) (effects (font (size 0.6 0.6) (thickness 0.1)){justify}))',f'(property "TSC_Rotation" "{r}" (at 0 0) (layer "{side}.Fab") (hide yes) (effects (font (size 0.6 0.6) (thickness 0.1)){justify}))']
 # Body boundary, fabrication layer only: avoids silk on pads and identifies physical envelope.
 w,h=shape['body'];ox,oy=shape.get('offset',[0,0]);rad=math.radians(r);m=-1 if layer=='bottom' else 1
 points=[]
 for xx,yy in [(ox-w/2,oy-h/2),(ox+w/2,oy-h/2),(ox+w/2,oy+h/2),(ox-w/2,oy+h/2)]:
  xx*=m;points.append((xx*math.cos(rad)-yy*math.sin(rad),-(xx*math.sin(rad)+yy*math.cos(rad))))
 for a,b in zip(points,points[1:]+points[:1]):lines.append(f'(fp_line (start {f(a[0])} {f(a[1])}) (end {f(b[0])} {f(b[1])}) (stroke (width 0.1) (type default)) (layer "{side}.Fab"))')
 for e in ts('pcb_smtpad')+ts('pcb_plated_hole'):
  if comps[e['pcb_component_id']]!=ref:continue
  pp=sp[ports[e['pcb_port_id']]['source_port_id']];pin=str(pp['pin_number']);net=spnet.get(pp['source_port_id']);nettext=f'(net {net[0]} {q(net[1])})' if net else ''
  px,py=e['x']-x,-(e['y']-y)
  if e['type']=='pcb_smtpad':
   w,h=e['width'],e['height'];angle=-e.get('ccw_rotation',0)
   lines.append(f'(pad {q(pin)} smd rect (at {f(px)} {f(py)} {angle}) (size {w} {h}) (layers "{lm[layer]}" "{side}.Paste" "{side}.Mask") {nettext})')
  else:
   if e['shape']=='circle':size=f'{e["outer_diameter"]} {e["outer_diameter"]}';drill=f'{e["hole_diameter"]}';sh='circle'
   else:size=f'{e["outer_width"]} {e["outer_height"]}';drill=f'oval {e["hole_width"]} {e["hole_height"]}';sh='oval'
   lines.append(f'(pad {q(pin)} thru_hole {sh} (at {f(px)} {f(py)} {-e.get("ccw_rotation",0)}) (size {size}) (drill {drill}) (layers "*.Cu" "*.Mask") {nettext})')
 lines+=[')']
for e in ts('pcb_trace'):
 net=nets.get(e.get('source_net_id')) or trnet[e['source_trace_id']]
 for a,b in zip(e['route'],e['route'][1:]):
  lines.append(f'(segment (start {f(X(a["x"]))} {f(Y(a["y"]))}) (end {f(X(b["x"]))} {f(Y(b["y"]))}) (width {a["width"]}) (layer {q(lm[a["layer"]])}) (net {net[0]}))')
for e in ts('pcb_via'):
 lines.append(f'(via (at {f(X(e["x"]))} {f(Y(e["y"]))}) (size {e["outer_diameter"]}) (drill {e["hole_diameter"]}) (layers "F.Cu" "B.Cu") (net {nets[e["source_net_id"]][0]}))')
for label in json.loads((D/'silkscreen.json').read_text())[board]:
 if label.get('kind')=='solid':
  side='F' if label['layer']=='top' else 'B';x,y=label['x'],label['y']
  lines.append(f'(gr_rect (start {X(x-2.5)} {Y(y+2.5)}) (end {X(x+2.5)} {Y(y-2.5)}) (stroke (width 0) (type default)) (fill solid) (layer "{side}.SilkS"))')
  continue
 side='F' if label['layer']=='top' else 'B';mirror='(justify mirror)' if side=='B' else '';size=label['size']
 lines.append(f"(gr_text {q(label['text'])} (at {X(label['x'])} {Y(label['y'])} {label.get('rotation',0)}) (layer \"{side}.SilkS\") (effects (font (size {size} {size}) (thickness 0.15)) {mirror}))")
w,h=layout['width']/2,layout['height']/2
lines += [f'(gr_rect (start {X(-w)} {Y(h)}) (end {X(w)} {Y(-h)}) (stroke (width 0.05) (type default)) (fill none) (layer "Edge.Cuts"))',')']
(out/f'{board}.kicad_pcb').write_text('\n'.join(lines)+'\n')
(out/f'{board}.kicad_dru').write_text('(version 1)\n(rule "Manufacturing minimum" (constraint clearance (min 0.15mm)) (constraint edge_clearance (min 0.30mm)) (constraint track_width (min 0.15mm)) (constraint via_diameter (min 0.60mm)) (constraint hole_size (min 0.30mm)))\n')
(out/f'{board}.kicad_pro').write_text(json.dumps({'board':{'design_settings':{'rules':{'min_clearance':.15,'min_copper_edge_clearance':.3,'min_track_width':.15,'min_via_diameter':.6,'min_through_hole_diameter':.3,'min_hole_to_hole':.25}}},'meta':{'filename':board+'.kicad_pro','version':1}},indent=2)+'\n')
print(board,'KiCad export complete')
