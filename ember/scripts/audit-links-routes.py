#!/usr/bin/env python3
"""Audit an existing Links circuit.json; no circuit mutation or autorouting.

Lengths follow declared routed trace centre lines, excluding via barrel length.
The graph joins trace endpoints at PCB ports, not logical net names. This is a
route-topology audit, not a copper polygon solver or an impedance simulation.
"""
import collections
import hashlib
import heapq
import html
import json
import math
from pathlib import Path
import sys

source, output = map(Path, sys.argv[1:3])
output.mkdir(parents=True, exist_ok=True)
raw = source.read_bytes()
circuit = json.loads(raw)
def entries(kind):
    return [e for e in circuit if e['type'] == kind]
def index(kind):
    return {e[kind + '_id']: e for e in entries(kind)}
components, ports, pcb_ports = index('source_component'), index('source_port'), index('pcb_port')
traces, source_traces = index('pcb_trace'), index('source_trace')
def pin(port_id):
    p = ports[pcb_ports[port_id]['source_port_id']]
    return f"{components[p['source_component_id']]['name']}.pin{p['pin_number']}"
named_ports = {pin(p): p for p in pcb_ports}
graphs = collections.defaultdict(lambda: collections.defaultdict(list))
metrics = {}
for tid, trace in traces.items():
    route = trace['route']
    length = sum(math.hypot(a['x']-b['x'], a['y']-b['y']) for a,b in zip(route, route[1:]))
    ends = []
    for point in route:
        for key in ['start_pcb_port_id', 'end_pcb_port_id']:
            if key in point and point[key] not in ends:
                ends.append(point[key])
    assert len(ends) == 2, (tid, ends)
    assert set(ends) == set(trace['connectsTo']), tid
    for pid, point in [(ends[0], route[0]), (ends[1], route[-1])]:
        assert math.hypot(pcb_ports[pid]['x']-point['x'], pcb_ports[pid]['y']-point['y']) < 1e-6
    m = dict(trace=tid, pins=list(map(pin, ends)), length_mm=length,
             vias=sum(p['route_type']=='via' for p in route),
             min_width_mm=min(p['width'] for p in route if p['route_type']=='wire'))
    metrics[tid] = m
    a,b = map(pin, ends)
    graph = graphs[trace['connection_name']]
    graph[a].append((b,length,tid)); graph[b].append((a,length,tid))

def path(net, start, end):
    queue = [(0,start,[],[start])]
    visited = set()
    while queue:
        distance,node,route,nodes = heapq.heappop(queue)
        if node in visited: continue
        visited.add(node)
        if node == end:
            return dict(pins=nodes, traces=route, length_mm=distance,
                        vias=sum(metrics[t]['vias'] for t in route))
        for other,length,tid in graphs[net][node]:
            heapq.heappush(queue,(distance+length,other,route+[tid],nodes+[other]))
    raise ValueError((net,start,end))

warnings = []
for warning in entries('pcb_trace_too_long_warning'):
    m = metrics[warning['pcb_trace_id']]
    assert abs(m['length_mm']+1.6*m['vias']-warning['actual_trace_length']) < 1e-6
    warnings.append(dict(m, warning=warning['pcb_trace_too_long_warning_id'],
                         warning_length_mm=warning['actual_trace_length'],
                         source=source_traces[warning['source_trace_id']]['display_name']))

caps = [('IC1','pin4','pin11','C3','C4'),('IC2','pin8','pin4','C5','C7'),
        ('IC4','pin8','pin4','C8','C10')]
supplies = []
for ic,positive,negative,cp,cn in caps:
    supplies.append(dict(ic=ic,positive=path('source_net_2',ic+'.'+positive,cp+'.pin1'),
                         negative=path('source_net_1',ic+'.'+negative,cn+'.pin2'),
                         ground=path('source_net_0',cp+'.pin2',cn+'.pin1')))
for ic in ['IC3','IC5']:
    positive = min((path('source_net_2',ic+'.pin5',c+'.pin1') for c in ['C3','C5','C8']),key=lambda p:p['length_mm'])
    negative = min((path('source_net_1',ic+'.pin2',c+'.pin2') for c in ['C4','C7','C10']),key=lambda p:p['length_mm'])
    supplies.append(dict(ic=ic,positive=positive,negative=negative,
        ground=path('source_net_0',positive['pins'][-1].split('.')[0]+'.pin2',negative['pins'][-1].split('.')[0]+'.pin1')))

grounds = []
for cap,pad in [('C3',2),('C4',1),('C5',2),('C7',1),('C8',2),('C10',1)]:
    p = path('source_net_0',f'{cap}.pin{pad}','JP1.pin3')
    sharing = {}
    for target in ['R3.pin2','R11.pin2','R19.pin2','J2.pin3','J3.pin3','J4.pin3','J7.pin3','J8.pin3','J12.pin3']:
        other = path('source_net_0',target,'JP1.pin3')
        shared = sorted(set(p['traces']) & set(other['traces']))
        sharing[target] = dict(traces=shared,length_mm=sum(metrics[t]['length_mm'] for t in shared))
    grounds.append(dict(cap=cap,header_path=p,shared_with=sharing))

def svg(title, selected, labels, filename):
    pts = [p for tid in selected for p in traces[tid]['route']]
    xmin,xmax = min(p['x'] for p in pts)-2,max(p['x'] for p in pts)+2
    ymin,ymax = min(p['y'] for p in pts)-2,max(p['y'] for p in pts)+2
    scale = min(550/(xmax-xmin),600/(ymax-ymin))
    width,height = 800, 100+(ymax-ymin)*scale
    def xy(p): return (100+(p['x']-xmin)*scale,65+(ymax-p['y'])*scale)
    body = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height:.0f}" viewBox="0 0 {width} {height:.0f}">',
            '<rect width="100%" height="100%" fill="white"/>',
            f'<text x="20" y="25" font-family="sans-serif" font-size="18">{html.escape(title)}</text>',
            '<text x="20" y="47" font-family="sans-serif" font-size="12">Top view: red = top, blue = bottom, circles = vias; grey = other copper</text>']
    def draw(tid,active):
        route = traces[tid]['route']
        for a,b in zip(route,route[1:]):
            if a['route_type']!='wire' or b['route_type']!='wire': continue
            x1,y1=xy(a);x2,y2=xy(b)
            if not active and not (xmin<=a['x']<=xmax and ymin<=a['y']<=ymax and xmin<=b['x']<=xmax and ymin<=b['y']<=ymax): continue
            color = ('#c52c35' if a['layer']=='top' else '#155ab6') if active else '#e2e4e7'
            body.append(f'<path d="M{x1:.2f},{y1:.2f} L{x2:.2f},{y2:.2f}" stroke="{color}" stroke-width="{max(1,a["width"]*scale) if active else 0.6}"/>')
        if active:
            for p in route:
                if p['route_type']=='via':
                    x,y=xy(p);body.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{0.3*scale:.2f}" fill="white" stroke="#713b89"/>')
    for tid in traces: draw(tid,False)
    for tid in selected: draw(tid,True)
    # Labels use alternating margins with leader lines to keep nearby pins legible.
    for i,label in enumerate(labels):
        p=pcb_ports[named_ports[label]];x,y=xy(p)
        side = i%2; tx = 12 if side==0 else 665
        ty = 85+(i//2)*25
        body.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="3" fill="#161b22"/>')
        body.append(f'<path d="M{x:.2f},{y:.2f} L{tx+65},{ty-4}" stroke="#444" stroke-width="0.5"/>')
        body.append(f'<text x="{tx}" y="{ty}" font-family="monospace" font-size="12">{html.escape(label)}</text>')
    body.append('</svg>')
    (output/filename).write_text('\n'.join(body))

for i,w in enumerate(warnings):
    svg(f"W{i+1:02d}: {' - '.join(w['pins'])} / {w['length_mm']:.2f} mm",[w['trace']],w['pins'],f'warning-{i+1:02d}.svg')
for supply in supplies:
    ids=list(dict.fromkeys(t for k in ['positive','negative','ground'] for t in supply[k]['traces']))
    labels=list(dict.fromkeys(p for k in ['positive','negative','ground'] for p in [supply[k]['pins'][0],supply[k]['pins'][-1]]))
    svg(f"{supply['ic']}: supply and capacitor ground paths",ids,labels,supply['ic'].lower()+'.svg')
result=dict(source=str(source),sha256=hashlib.sha256(raw).hexdigest(),warnings=warnings,supplies=supplies,grounds=grounds,
            copper_pours=len(entries('pcb_copper_pour')),trace_count=len(traces),via_count=len(entries('pcb_via')))
(output/'measurements.json').write_text(json.dumps(result,indent=2)+'\n')
cards=''.join(f'<figure><img src="warning-{i+1:02d}.svg"><figcaption>W{i+1:02d} · {w["trace"]}</figcaption></figure>' for i,w in enumerate(warnings))
cards+=''.join(f'<figure><img src="{s["ic"].lower()}.svg"><figcaption>{s["ic"]}</figcaption></figure>' for s in supplies)
(output/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Links route audit</title><style>body{font:16px system-ui;margin:32px;background:#f4f5f7}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;padding:12px;background:white}img{width:100%}figcaption{padding:8px}</style><h1>Links route audit · 2026-09-10</h1><p>Routed centre lines; lengths exclude via barrels. No electrical pass implied. See report.md and measurements.json.</p><main>'+cards+'</main>')
print(json.dumps(dict(sha256=result['sha256'],warnings=warnings,supplies=supplies),indent=2))
