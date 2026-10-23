"""Nominal packaging study, not routed PCB or fabrication release."""
import json,math
from pathlib import Path
out=Path(__file__).parent
plan=json.loads((out/'construction.json').read_text())
panel,controls,leds,fixings,boards,films=[plan[k] for k in ['panel','controls','leds','fixings','boards','film_capacitors']]
checks=[]
for a in controls+leds:
 checks.append(dict(check=a['ref']+' panel side envelope',gap=min(a['x']-a['envelope']/2,20-a['x']-a['envelope']/2)))
for a,b in [(controls[0],controls[1]),(controls[4],controls[5]),(controls[5],fixings[1]),(controls[3],controls[4]),(controls[2],controls[3])]+[(leds[j],leds[j+1]) for j in [0,1,2,4,5,6]]:
 checks.append(dict(check=a['ref']+' to '+b['ref'],gap=math.hypot(a['x']-b['x'],a['y']-b['y'])-(a['envelope']+b['envelope'])/2))
assert all(c['gap']>=0 for c in checks)
# Worst allowed panel thickness remains within manufacturer 1.2..1.5.
assert 1.2<=panel['thickness']-.05 and panel['thickness']+.05<=1.5
assert len(set(plan['interconnect']['nets']))==16
plan['pot_rotations_degrees']=plan['interconnect']['pot_rotations_deg']
plan['nominal_checks']=checks
(out/'construction.json').write_text(json.dumps(plan,indent=2)+'\n')
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="850" viewBox="0 0 1120 850"><rect width="1120" height="850" fill="#f4f4f0"/><style>text{font-family:Arial,sans-serif;fill:#203b3d}.small{font-size:14px}.label{font-size:18px}</style><text x="35" y="40" font-size="26">Stereo Line In / rev G construction</text><text x="35" y="70" class="small">Selected dimensions / nominal envelope study — PCB placement and routing complete / hardware fit pending</text>']
s=5;ox=80;oy=110
svg.append(f'<rect x="{ox}" y="{oy}" width="100" height="642.5" rx="2" fill="#203b3d"/>')
for a in controls+leds+fixings:
 x=ox+s*a['x'];y=oy+s*a['y'];rad=a['hole']*s/2
 svg.append(f'<circle cx="{x}" cy="{y}" r="{rad}" fill="{a.get("color","#f4f4f0")}"/>')
 if a in controls:svg.append(f'<circle cx="{x}" cy="{y}" r="{a["envelope"]*s/2}" fill="none" stroke="#c4d1cd" stroke-dasharray="3 2"/>')
for x,y,t in [(5,15,'L'),(15,15,'R'),(10,28,'PEAK'),(10,49,'GAIN L'),(10,78,'GAIN R'),(10,85.3,'IN L'),(10,102.5,'IN R')]:svg.append(f'<text x="{ox+x*s}" y="{oy+y*s}" text-anchor="middle" style="font-size:9px;fill:white">{t}</text>')
for c in [dict(controls[0],ref='OUT L/R'),*controls[2:]]:svg.append(f'<text x="205" y="{oy+c["y"]*s+4}" class="small">{c["ref"]} / y {c["y"]} / hole {c["hole"]}</text>')
# Side view with same y scale, z horizontal.
sx=555
svg.append(f'<rect x="{sx-7}" y="{oy}" width="7" height="642.5" fill="#203b3d"/>')
for b,col in zip(boards,['#59a586','#568caf']):svg.append(f'<rect x="{sx+b["z"]*s}" y="{oy+b["y"]*s}" width="8" height="{b["height"]*s}" fill="{col}"/>')
for y in [93,111]:svg.append(f'<rect x="{sx}" y="{oy+(y-7.5)*s}" width="120" height="75" fill="#e0ad63" fill-opacity=".7"/>')
for y,h,z in [(a['y'] if a['ref'].startswith('J_OUT') else a['y']+.6,10.5 if a['ref'].startswith('J_OUT') else 10.8,1 if a['ref'].startswith('J_OUT') else 0) for a in controls if a['ref'] in ['J_OUT_L','RV_L','RV_R']]:svg.append(f'<rect x="{sx+z*s}" y="{oy+(y-h/2)*s}" width="{(10-z)*s}" height="{h*s}" fill="#a7d3c1"/>')
for y in sorted(set(c['y'] for c in films)):svg.append(f'<rect x="{sx+14*s}" y="{oy+(y-2.5)*s}" width="50" height="25" fill="#bf6a62"/>')
svg.append(f'<rect x="{sx+25.6*s}" y="{oy+(52-10.15)*s}" width="43" height="101.5" fill="#5a6570"/>')
for c in plan['interconnect']['positions']:
 y=c['y'];length=10.16 if c['rotation']==0 else 5.08
 svg.append(f'<rect x="{sx+11.6*s}" y="{oy+(y-length/2)*s}" width="{2.54*s}" height="{length*s}" fill="#9e773f"/>')
 svg.append(f'<rect x="{sx+15.49*s}" y="{oy+(y-length/2)*s}" width="{8.51*s}" height="{length*s}" fill="#353d47"/>')
 for dy in [-1.27,1.27]:svg.append(f'<line x1="{sx+14.14*s}" y1="{oy+(y+dy)*s}" x2="{sx+19.98*s}" y2="{oy+(y+dy)*s}" stroke="#d3ac55" stroke-width="2"/>')
svg += ['<text x="548" y="95" class="small">SIDE / z behind panel rear</text>','<text x="815" y="155" class="label">Parallel PCBs</text>','<text x="815" y="185" class="small">Control face: z = 10 mm</text>','<text x="815" y="210" class="small">Main face: z = 24 mm</text>','<text x="815" y="235" class="small">Both boards: 1.6 mm thick</text>','<text x="815" y="285" class="small">WQP: 1 mm rear-panel shim</text>','<text x="815" y="310" class="small">Tayda pot: shoulder on panel</text>','<text x="815" y="335" class="small">Header/socket gap: 12.4 mm</text>','<text x="815" y="390" class="label">Depth allocation</text>','<text x="815" y="420" class="small">Bare nominal: 34.2 mm</text>','<text x="815" y="445" class="small">With cable: target &lt;= 45 mm</text>','<text x="815" y="500" class="small">WIMA: 7.2 x 5 x 10 mm</text>','<text x="815" y="525" class="small">Four caps face into board gap</text>','<text x="815" y="580" class="small">LEDs: 3 mm, hand aligned</text>','<text x="815" y="605" class="small">Knobs: 12 mm / T18</text>','<text x="35" y="802" class="small">Panel: 20 x 128.5 x 1.40 +/- 0.05 mm. LED pitch: 5 mm. Dashed circles: component envelopes.</text>','<text x="35" y="825" class="small">Reference diagram only. Do not use this SVG as fabrication data; actual footprints and fit coupon must be checked.</text></svg>']
(out/'jack-layout.svg').write_text(''.join(svg))
print(json.dumps({'checks':len(checks),'minimum_checked_gap_mm':min(c['gap'] for c in checks),'bare_depth_nominal_mm':34.2}))
