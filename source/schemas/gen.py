# -*- coding: utf-8 -*-
"""Planches anatomiques des points : écrit source/contenu/figures.json et met à jour vue/x/y/rep/regle/lab
dans points.json à partir des modules v_*.py (une vue par fichier). Usage : python3 source/schemas/gen.py
puis python3 source/build.py."""
import json, sys, importlib, glob, os
sys.path.insert(0, os.path.dirname(__file__))
C = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'contenu') + '/'
F = json.load(open(C + 'figures.json'))['figures']
P = json.load(open(C + 'points.json'))['points']
mods = sorted(glob.glob(os.path.join(os.path.dirname(__file__), 'v_*.py')))
done = []
for m in mods:
    name = os.path.basename(m)[2:-3].replace('_', '-')
    mod = importlib.import_module(os.path.basename(m)[:-3])
    V = dict(mod.VIEW)
    if V.get('sym'): V.setdefault('axe', 100)
    F[name] = V
    for k, d in mod.PTS.items():
        assert k in P, k
        p = P[k]
        for key in ('rep', 'regle', 'lab', 'voisins'): p.pop(key, None)
        p['vue'] = name
        for key, v in d.items(): p[key] = round(v, 1) if isinstance(v, float) else v
    done.append(name)
# vues abandonnées : points qui y restent
used = {p.get('vue') for p in P.values()}
for fid in list(F):
    if fid not in used: del F[fid]
json.dump({'figures': F}, open(C + 'figures.json', 'w'), ensure_ascii=False, indent=1)
with open(C + 'points.json', 'w') as fh:
    fh.write('{\n "points": {\n')
    items = list(P.items())
    for n, (k, v) in enumerate(items):
        fh.write('  ' + json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False) + (',' if n < len(items) - 1 else '') + '\n')
    fh.write(' }\n}\n')
print('vues refaites :', done)
