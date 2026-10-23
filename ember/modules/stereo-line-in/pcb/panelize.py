"""Four-up routed panels; unit copper is copied without rotation or rerouting.

Run after rebuild.py with the Shapely-enabled Python environment.
Outputs remain separate from the single-board manufacturing artifacts.
"""
from pathlib import Path
import copy,csv,hashlib,importlib.util,json,re,shutil,subprocess,sys,zipfile
from shapely.geometry import box,Point
from shapely.ops import unary_union

D=Path(__file__).resolve().parent
ROOT=D.parent
K='/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'
COUNT=4
RAIL=5.0
GAP=2.0
TAB=5.0
HOLE=.6
PITCH=.9
q=lambda s:json.dumps(str(s))
f=lambda x:f'{float(x):.6f}'

def parse(s):
    tokens=re.findall(r'"(?:\\.|[^"\\])*"|[^\s()]+|[()]',s)
    stack=[];out=[];cur=out
    for t in tokens:
        if t=='(':n=[];cur.append(n);stack.append(cur);cur=n
        elif t==')':cur=stack.pop()
        else:cur.append(t)
    assert not stack
    return out[0]

def emit(n):
    return '('+' '.join(emit(x) if isinstance(x,list) else x for x in n)+')'

def children(n,k):return [x for x in n if isinstance(x,list) and x and x[0]==k]
def child(n,k):return children(n,k)[0]
def walk(n):
    yield n
    for x in n:
        if isinstance(x,list):yield from walk(x)

def norm(n):
    if isinstance(n,list):return [norm(x) for x in n]
    try:return round(float(n),5)
    except ValueError:return n

def move(n,dx,dy):
    # Only board-level coordinates; pad/fab coordinates inside footprints stay local.
    keys={'footprint':['at'],'segment':['start','end'],'via':['at'],'gr_text':['at'],'gr_rect':['start','end']}[n[0]]
    for key in keys:
        a=child(n,key);a[1]=f(float(a[1])+dx);a[2]=f(float(a[2])+dy)

def prefix(n,i,count,undo=False):
    p=f'P{i}_'
    for a in walk(n):
        if a[0]=='net' and int(a[1]):
            a[1]=str(int(a[1])+(-1 if undo else 1)*(i-1)*count)
            if len(a)>2:
                name=json.loads(a[2]);a[2]=q(name[len(p):] if undo else p+name)
        if a[0]=='property' and a[1]=='"Reference"':
            name=json.loads(a[2]);a[2]=q(name[len(p):] if undo else p+name)

def hole(ref,x,y,d):
    return parse(f'(footprint "Panel_NPTH" (layer "F.Cu") (at {x} {y}) (attr exclude_from_pos_files exclude_from_bom) (property "Reference" {q(ref)} (at 0 0) (layer "F.Fab") (hide yes) (effects (font (size 1 1) (thickness .1)))) (pad "" np_thru_hole circle (at 0 0) (size {d} {d}) (drill {d}) (layers "*.Cu" "*.Mask")))')

def fid(ref,x,y,side):
    return parse(f'(footprint "Panel_Fiducial" (layer "{side}.Cu") (at {x} {y}) (attr exclude_from_pos_files exclude_from_bom) (property "Reference" {q(ref)} (at 0 0) (layer "{side}.Fab") (hide yes) (effects (font (size 1 1) (thickness .1)))) (pad "" smd circle (at 0 0) (size 1 1) (layers "{side}.Cu" "{side}.Mask") (solder_mask_margin 1)))')

def run(*args):subprocess.run(args,check=True)

spec=importlib.util.spec_from_file_location('copper',D/'verify-copper.py')
copper=importlib.util.module_from_spec(spec);spec.loader.exec_module(copper)
summaries={}
for board in ['control','main']:
    src=ROOT/'generated/pcb'/board
    out=ROOT/'generated/panels'/board;out.mkdir(parents=True,exist_ok=True)
    unit=parse((src/f'{board}.kicad_pcb').read_text())
    report=json.loads((src/'build-report.json').read_text())
    assert report['status']=='passed' and not report['kicad']['violations'] and not report['kicad']['unconnected_items']
    layout=json.loads((D/'layout.json').read_text())[board]
    w,h=layout['width'],layout['height']
    width=2*(RAIL+GAP)+COUNT*w+(COUNT-1)*GAP
    height=h+2*(RAIL+GAP)
    ox=RAIL+GAP;oy=RAIL+GAP
    oldx=100-w/2;oldy=100-h/2
    origin=[0,height]
    panel=copy.deepcopy(unit[:1]+[x for x in unit[1:] if isinstance(x,list) and x[0] in ['version','generator','general','paper','layers','setup']])
    setup=child(panel,'setup');child(setup,'aux_axis_origin')[1:]=['0',f(height)]
    panel.append(['net','0','""'])
    nets=[n for n in children(unit,'net') if int(n[1])];ncount=max(int(n[1]) for n in nets)
    placements=[];copychecks=0
    for i in range(1,COUNT+1):
        x=ox+(i-1)*(w+GAP);dx=x-oldx;dy=oy-oldy
        placements.append({'copy':i,'left_mm':x,'top_mm':oy,'bottom_origin_mm':[x,height-oy-h]})
        for n in nets:
            v=copy.deepcopy(n);prefix(v,i,ncount);panel.append(v)
        for n in unit[1:]:
            if not isinstance(n,list) or n[0] not in ['footprint','segment','via','gr_text','gr_rect']:continue
            if n[0]=='gr_rect' and child(n,'layer')[1]=='"Edge.Cuts"':continue
            v=copy.deepcopy(n);move(v,dx,dy);prefix(v,i,ncount);panel.append(v)
            inv=copy.deepcopy(v);prefix(inv,i,ncount,undo=True);move(inv,-dx,-dy)
            assert norm(inv)==norm(n),f'Unit copy mismatch: {board} {i} {n[0]}'
            copychecks+=1
    # Choose two widely-separated support rows where both board edges are free of copper.
    items,_,_,_=copper.geometry(board);cu=unary_union([e['g'] for e in items])
    def bite_clearance(y):
        return min(cu.distance(Point(x,h/2-(y+offset)).buffer(HOLE/2)) for x in [-w/2,w/2] for offset in [-2*PITCH,-PITCH,0,PITCH,2*PITCH])
    rows=[]
    for low,high,target in [(8,h*.45,h*.28),(h*.55,h-8,h*.72)]:
        candidates=[i/2 for i in range(int(low*2),int(high*2)+1) if bite_clearance(i/2)>=.30]
        assert candidates,'No safe mouse-bite row'
        rows.append(min(candidates,key=lambda y:abs(y-target)))
    # One connected FR4 panel with interior routed pockets, not overlapping outlines.
    material=box(0,0,width,height).difference(box(RAIL,RAIL,width-RAIL,height-RAIL))
    boards=[];bridges=[];biteholes=[]
    for p in placements:
        x=p['left_mm'];boards.append(box(x,oy,x+w,oy+h))
        for y in rows:
            for edge in [x,x+w]:
                for delta in [-2*PITCH,-PITCH,0,PITCH,2*PITCH]:biteholes.append([edge,oy+y+delta])
    for j in range(COUNT+1):
        left=RAIL if j==0 else ox+(j-1)*(w+GAP)+w
        right=ox+j*(w+GAP) if j<COUNT else width-RAIL
        for y in rows:bridges.append(box(left,oy+y-TAB/2,right,oy+y+TAB/2))
    material=unary_union([material,*boards,*bridges])
    assert material.geom_type=='Polygon' and material.is_valid
    for ring in [material.exterior,*material.interiors]:
        pts=list(ring.coords)
        for a,b in zip(pts,pts[1:]):panel.append(parse(f'(gr_line (start {f(a[0])} {f(a[1])}) (end {f(b[0])} {f(b[1])}) (stroke (width .05) (type default)) (layer "Edge.Cuts"))'))
    for i,(x,y) in enumerate(biteholes,1):panel.append(hole(f'MB{i}',x,y,HOLE))
    tools=[[3.85,3.85],[width-3.85,3.85],[3.85,height-3.85]]
    for i,(x,y) in enumerate(tools,1):panel.append(hole(f'TOOL{i}',x,y,2))
    for side in ['F','B']:
        for i,(x,y) in enumerate([[12,3.85],[width-12,3.85],[12,height-3.85]],1):panel.append(fid(f'FID{side}{i}',x,y,side))
    for p in placements:
        panel.append(parse(f'(gr_text "P{p["copy"]}" (at {p["left_mm"]+w/2} 2.3) (layer "F.SilkS") (effects (font (size .8 .8) (thickness .15))))'))
    name=f'{board}-panel';pcb=out/f'{name}.kicad_pcb';pcb.write_text(emit(panel)+'\n')
    for ext in ['kicad_dru','kicad_pro']:shutil.copy2(src/f'{board}.{ext}',out/f'{name}.{ext}')
    # Transform the original JLC files with exactly the same offsets and copy names.
    bom=list(csv.DictReader((src/'BOM-JLC.csv').open()));cpl=list(csv.DictReader((src/'CPL-JLC.csv').open()))
    expanded=[]
    for r in bom:
        a=dict(r);a['Designator']=','.join(f'P{i}_{ref}' for i in range(1,COUNT+1) for ref in r['Designator'].split(','));expanded.append(a)
    with (out/'BOM-JLC.csv').open('w') as fh:
        wr=csv.DictWriter(fh,fieldnames=list(bom[0]));wr.writeheader();wr.writerows(expanded)
    locations=[]
    for p in placements:
        for r in cpl:
            a=dict(r);a['Designator']=f'P{p["copy"]}_{r["Designator"]}'
            a['Mid X']=f'{float(r["Mid X"].removesuffix("mm"))+p["bottom_origin_mm"][0]:.4f}mm'
            a['Mid Y']=f'{float(r["Mid Y"].removesuffix("mm"))+p["bottom_origin_mm"][1]:.4f}mm';locations.append(a)
    with (out/'CPL-JLC.csv').open('w') as fh:
        wr=csv.DictWriter(fh,fieldnames=list(cpl[0]));wr.writeheader();wr.writerows(locations)
    refs={ref for r in expanded for ref in r['Designator'].split(',')}
    assert refs=={r['Designator'] for r in locations} and len(refs)==len(cpl)*COUNT==len(locations)
    fps={json.loads(child(n,'property')[2]):n for n in children(panel,'footprint')}
    for r in locations:
        fp=fps[r['Designator']];at=child(fp,'at');side=json.loads(child(fp,'layer')[1])
        assert abs(float(at[1])-float(r['Mid X'][:-2]))<1e-5
        assert abs(height-float(at[2])-float(r['Mid Y'][:-2]))<1e-5
        assert side==('F.Cu' if r['Layer']=='Top' else 'B.Cu')
        assert float(next(n[2].strip('"') for n in children(fp,'property') if n[1]=='"TSC_Rotation"'))==float(r['Rotation'])
    run(K,'pcb','drc',str(pcb),'--format','json','--output',str(out/'kicad-drc.json'),'--exit-code-violations')
    gerber=out/'gerbers';gerber.mkdir(exist_ok=True)
    layers='F.Cu,'+('In1.Cu,In2.Cu,' if board=='main' else '')+'B.Cu,F.Paste,B.Paste,F.Mask,B.Mask,F.SilkS,B.SilkS,Edge.Cuts'
    run(K,'pcb','export','gerbers',str(pcb),'--output',str(gerber)+'/', '--layers',layers,'--subtract-soldermask','--use-drill-file-origin')
    run(K,'pcb','export','drill',str(pcb),'--output',str(gerber)+'/', '--drill-origin','plot','--format','excellon','--excellon-units','mm','--excellon-separate-th','--excellon-oval-format','route')
    for side in ['F','B']:
        run(K,'pcb','export','svg',str(pcb),'--output',str(out/f'assembly-{side}.svg'),'--layers',f'{side}.Cu,{side}.Fab,{side}.SilkS,Edge.Cuts','--mode-single','--fit-page-to-board','--exclude-drawing-sheet','--sketch-pads-on-fab-layers',*(['--mirror'] if side=='B' else []))
    with zipfile.ZipFile(out/f'{name}-gerbers.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(gerber.iterdir()):z.write(p,p.name)
    drc=json.loads((out/'kicad-drc.json').read_text());assert not drc['violations'] and not drc['unconnected_items']
    summary={'board':board,'copies':COUNT,'size_mm':[width,height],'unit_size_mm':[w,h],'layers':2 if board=='control' else 4,'thickness_mm':1.6,'rail_mm':RAIL,'routed_gap_mm':GAP,'mouse_bite_diameter_mm':HOLE,'mouse_bite_pitch_mm':PITCH,'tab_width_mm':TAB,'tab_rows_from_unit_top_mm':rows,'mouse_bite_holes':len(biteholes),'minimum_bite_to_copper_mm':min(bite_clearance(y) for y in rows),'copy_inverse_checks':copychecks,'jlc_components_per_panel':len(locations),'placements':placements,'origin':'panel lower left; CPL X right / Y up; both faces in top view','drc_violations':0,'unconnected':0,'source_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/f'{board}.kicad_pcb',src/'BOM-JLC.csv',src/'CPL-JLC.csv']},'not_verified':['JLC upload, milling/tooling review and assembly angle preview','Live stock and order quantity','Physical break-off strength and burr removal']}
    (out/'validation.json').write_text(json.dumps(summary,indent=2)+'\n');summaries[board]=summary
    print(json.dumps(summary),flush=True)
(ROOT/'generated/panels/manifest.json').write_text(json.dumps(summaries,indent=2)+'\n')
for board,s in summaries.items():
    out=ROOT/'generated/panels'/board
    service='Economic PCBA / Bottom side' if board=='control' else 'Standard PCBA / Both sides'
    text=f'''# {board}: 4-up customer panel

- Panel by Customer; one circuit design repeated 4 times (4 columns x 1 row).
- Panel size: {s['size_mm'][0]:g} x {s['size_mm'][1]:g} mm. FR4, {s['layers']} layers, 1.6 mm thickness.
- Assembly: {service}. Confirm actual availability/options on JLCPCB.
- Upload {board}-panel-gerbers.zip for PCB fabrication, then BOM-JLC.csv and CPL-JLC.csv for assembly.
- BOM and CPL already contain ALL FOUR copies. Do not repeat this panel or apply another 4x multiplier to the placement data.
- One assembled panel yields four {board} boards. Order quantities on JLCPCB are panel quantities when using this data.
- Rails, tooling holes and fiducials are already included. Do not add another panel or tooling frame without reviewing the adjusted origin.
- Gerber/drill/CPL origin: lower-left of the whole panel; X right, Y up. Bottom positions are also viewed from the top. Verify the uploaded 3D placement and package rotations.
- P1_..P4_ prefixes identify the copies. Fiducials/tooling/mouse bites are excluded from assembly BOM and CPL.
- Routed separation: 2 mm gaps, 5 mm tabs; 5 NPTH holes per break line, diameter 0.6 mm / pitch 0.9 mm. No V-cuts.
- Ask fabrication DFM to review the routed pockets and tab fillets for their milling tool. Do not silently change unit outlines or copper.
- Keep panels intact through assembly; cut the tabs with support close to the cut and remove burrs back to the nominal 18 mm board width. Actual break-off forces/assembly stress have not been tested.
- JLC component matching, rotation/polarity preview, stock, and order submission are not verified by local DRC.

Local validation: zero KiCad DRC violations and zero unconnected nets; exact inverse comparison of {s['copy_inverse_checks']} copied footprints/tracks/vias/labels; {s['jlc_components_per_panel']} unique JLC placements matched to BOM and footprint coordinates; minimum mouse-bite hole edge to copper {s['minimum_bite_to_copper_mm']:.3f} mm.

Sources checked 2026-09-14:
https://jlcpcb.com/capabilities/pcb-assembly-capabilities
https://jlcpcb.com/jp/capabilities/pcb-capabilities/
https://jlcpcb.com/help/article/pcb-panelization
'''
    (out/'ORDER-NOTES.md').write_text(text)
    members=[out/f'{board}-panel-gerbers.zip',out/'BOM-JLC.csv',out/'CPL-JLC.csv',out/'ORDER-NOTES.md',out/'validation.json',out/'kicad-drc.json',out/'assembly-F.svg',out/'assembly-B.svg']
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in members}
    (out/'SHA256SUMS.json').write_text(json.dumps(hashes,indent=2)+'\n')
    with zipfile.ZipFile(out/f'{board}-panel-order-files.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in [*members,out/'SHA256SUMS.json']:z.write(p,p.name)
review='''<!doctype html><html lang="ja"><meta charset="utf-8"><title>Stereo Line In / 4-up panels</title><style>body{font:16px system-ui;background:#edf2ef;color:#19362f;margin:32px}main{display:flex;gap:24px}section{width:50%;background:white;padding:20px;border-radius:12px}img{width:100%}a{color:#126c59}small{display:block;margin:12px 0}</style><h1>Stereo Line In / 各4枚の面付け</h1><p>四周5mm捨て板・2mmルーター間隔・ミシン目タブ。単板の銅箔を保持。ローカルDRC通過、JLCアップロードと製造DFMは未確認。</p><main>'''
for board,s in summaries.items():
    review+=f'<section><h2>{board} / {s["size_mm"][0]:g} × {s["size_mm"][1]:g} mm</h2><p>{s["layers"]}層 / 1パネル4枚 / JLC実装{s["jlc_components_per_panel"]}点</p><a href="{board}/{board}-panel-order-files.zip">発注データ一式</a> · <a href="{board}/ORDER-NOTES.md">発注条件</a><small>F面</small><img src="{board}/assembly-F.svg"><small>B面（裏から見た図）</small><img src="{board}/assembly-B.svg"></section>'
(ROOT/'generated/panels/review.html').write_text(review+'</main></html>')
