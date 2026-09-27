# -*- coding: utf-8 -*-
"""Dos : colonne au milieu, côtes, omoplate et bassin dessinés du côté droit de l'image (planches V 45 / VG 14)."""
from lib import *
import math

X0 = 200; K = 18          # axe du corps ; 1 cun = 18 (3 cun entre la colonne et le bord de l'omoplate)
VY = {'C5': 28, 'C6': 44, 'C7': 60}
for i in range(1, 13): VY[f'T{i}'] = 80 + 19 * (i - 1)
for i in range(1, 6): VY[f'L{i}'] = 316 + 29 * (i - 1)
ORDER = ['C5', 'C6', 'C7'] + [f'T{i}' for i in range(1, 13)] + [f'L{i}' for i in range(1, 6)]
def sous(v):  # niveau du creux sous l'apophyse épineuse de la vertèbre v
    i = ORDER.index(v)
    return (VY[v] + VY[ORDER[i + 1]]) / 2 if i + 1 < len(ORDER) else VY[v] + 16

def vertebre(v):
    y = VY[v]; lum = v[0] == 'L'; w = 26 if lum else (18 if v[0] == 'C' else 20); h = 22 if lum else (12 if v[0] == 'C' else 14)
    tw = 13 if lum else 9
    pts = [(X0 - w / 2, y - h / 2), (X0 - 3, y - h / 2 - 1), (X0 + 3, y - h / 2 - 1), (X0 + w / 2, y - h / 2),
           (X0 + w / 2 + tw, y - h / 2 + 2), (X0 + w / 2 + tw + 1, y - h / 2 + 6), (X0 + w / 2 + 1, y + 1),
           (X0 + w / 2, y + h / 2), (X0 + 4, y + h / 2 + 3), (X0, y + h / 2 + 6), (X0 - 4, y + h / 2 + 3), (X0 - w / 2, y + h / 2),
           (X0 - w / 2 - 1, y + 1), (X0 - w / 2 - tw - 1, y - h / 2 + 6), (X0 - w / 2 - tw, y - h / 2 + 2)]
    out = bone(pts)
    if v[0] != 'C' or v == 'C7':
        out += text('ost', X0 - w / 2 - tw - 5, y + 2.5, v, 'end')
    return out

def cote(i):
    y0 = VY[f'T{i}']; L = [0.42, 0.58, 0.72, 0.84, 0.92, 0.97, 1, 1, 0.96, 0.88, 0.55, 0.38][i - 1]
    pts = []
    for k in range(9):
        t = k / 8
        pts.append((X0 + 16 + 118 * L * t ** 0.85, y0 - 7 * math.sin(math.pi * t * 0.7) + (14 + 46 * L) * t ** 1.9))
    return band(pts, 7.5, 6)

skin_d = [(176, -30), (174, 20), (150, 44), (110, 62), (64, 78), (38, 98), (26, 150), (22, 220), (22, 300)]
flank = [(64, 176), (72, 250), (80, 330), (70, 400), (58, 470), (54, 545)]
arm_in = [(60, 168), (58, 230), (56, 300)]

svg = ''.join([
    skin(skin_d, False), skin(mirror(skin_d, X0), False),
    skin(flank, False), skin(mirror(flank, X0), False),
    skl(arm_in), skl(mirror(arm_in, X0)),
    # côtes à droite
    ''.join(cote(i) for i in range(12, 0, -1)),
    # bassin : sacrum et os iliaque droit
    bone([(233, 446), (240, 426), (262, 406), (296, 394), (326, 398), (344, 414, 'c'), (336, 432), (316, 452), (298, 470),
          (290, 490), (282, 510), (268, 514), (258, 500), (250, 484), (236, 470)]),
    osl([(250, 438), (282, 418), (318, 410)]),
    ellipse('osl', 276, 494, 9, 11),
    bone([(170, 446), (230, 446), (234, 470), (224, 500), (211, 524), (200, 542), (189, 524), (176, 500), (166, 470)]),
    ''.join(ellipse('osl', X0 + dx, y, 3.6, 2.6) for y in (466, 486, 504) for dx in (-13, 13)),
    # colonne
    ''.join(vertebre(v) for v in ORDER),
    # omoplate, épine de l'omoplate, clavicule, tête de l'humérus
    bone([(262, 86), (282, 89), (300, 86), (316, 93), (327, 104), (324, 118), (310, 150), (292, 180), (277, 207),
          (269, 214, 'c'), (261, 205), (255, 180), (253, 150), (253, 120), (256, 99)]),
    band([(344, 136), (348, 180), (352, 240), (354, 300)], 24, 20),
    ellipse('os', 338, 118, 17, 19),
    band([(352, 86), (322, 74), (290, 66), (258, 63)], 9, 7),
    band([(254, 124), (280, 116), (310, 104), (338, 94), (356, 92)], 8, 13, 'osc'),
])

def r(y, n):  # petite règle horizontale au-dessus du point : 0 sur la colonne, n cun vers l'extérieur
    d = dict(a=[X0, y - 12], b=[X0 + n * K, y - 12], n=n, pas=(0.5 if n < 1 else 1.5), lab=[0, 1.5, n] if n == 3 else [0, n], cote=-1, lien=False)
    if n < 1: d.update(lab=[n], zero=False)
    return [d]

VIEW = {
    'nom': "Dos", 'vb': '10 -24 380 570', 'sym': True, 'axe': X0,
    'svg': svg,
    'reps': {
        'c7': dict(t="C7 : vertèbre qui|dépasse en bas du cou", x=192, y=60, tx=150, ty=26, a='end'),
        'colonne': dict(t="apophyses|épineuses", x=194, y=238, tx=150, ty=250, a='end'),
        'epine-omoplate': dict(t="épine de l'omoplate|(niveau de T3)", x=262, y=120, tx=150, ty=96, a='end'),
        'bord-omoplate': dict(t="bord intérieur|de l'omoplate", x=254, y=172, tx=150, ty=156, a='end'),
        'pointe-omoplate': dict(t="pointe de l'omoplate|(niveau de T7)", x=268, y=212, tx=150, ty=210, a='end'),
        'cote12': dict(t="12e côte", x=258, y=317, tx=150, ty=312, a='end'),
        'crete': dict(t="crête iliaque|(niveau de L4)", x=262, y=406, tx=150, ty=396, a='end'),
        'sacrum': dict(t="sacrum", x=194, y=500, tx=150, ty=500, a='end'),
        'acromion': dict(t="acromion", x=356, y=90, tx=372, ty=40),
    },
    'defaut': ['c7', 'pointe-omoplate', 'crete'],
    'canal': {
        **{f'V {n}': [X0 + 1.5 * K, round(sous(v))] for n, v in ((11, 'T1'), (14, 'T4'), (16, 'T6'), (19, 'T10'), (22, 'L1'), (24, 'L3'), (26, 'L5'))},
        'V 27': [X0 + 1.5 * K, 466], 'V 29': [X0 + 1.5 * K, 496], 'V 30': [X0 + 1.5 * K, 512],
        **{f'V {n}': [X0 + 3 * K, round(sous(v))] for n, v in ((41, 'T2'), (42, 'T3'), (44, 'T5'), (45, 'T6'), (46, 'T7'), (47, 'T9'), (48, 'T10'), (49, 'T11'), (50, 'T12'), (51, 'L1'))},
        **{f'VG {n}': [X0, round(sous(v))] for n, v in ((3, 'L4'), (5, 'L1'), (6, 'T11'), (7, 'T10'), (8, 'T9'), (9, 'T7'), (10, 'T6'), (11, 'T5'), (13, 'T1'))},
        'VG 2': [X0, 524], 'VG 15': [X0, 36],
        'V 10': [X0 + 1.3 * K, 10],
    },
}

def pt(v, dx, **kw):
    y = round(sous(v)); d = dict(x=X0 + dx * K, y=y); d.update(kw)
    if dx: d.setdefault('regle', r(y, dx))
    return d

PTS = {
    'VG 14': dict(x=X0, y=round(sous('C7')), rep=['c7'], lab='l'),
    'Ding Chuan': dict(x=X0 + 0.5 * K, y=round(sous('C7')), rep=['c7'], regle=r(round(sous('C7')), 0.5), lab='r'),
    'VG 12': dict(x=X0, y=round(sous('T3')), rep=['c7', 'epine-omoplate'], lab='l'),
    'VG 4': dict(x=X0, y=round(sous('L2')), rep=['crete', 'colonne'], lab='l'),
    'V 12': pt('T2', 1.5, rep=['c7', 'epine-omoplate'], lab='r'),
    'V 13': pt('T3', 1.5, rep=['epine-omoplate'], lab='r'),
    'V 15': pt('T5', 1.5, rep=['epine-omoplate', 'pointe-omoplate'], lab='r'),
    'V 17': pt('T7', 1.5, rep=['pointe-omoplate'], lab='r'),
    'V 18': pt('T9', 1.5, rep=['pointe-omoplate'], lab='r'),
    'V 20': pt('T11', 1.5, rep=['pointe-omoplate', 'cote12'], lab='r'),
    'V 21': pt('T12', 1.5, rep=['cote12'], lab='r'),
    'V 23': pt('L2', 1.5, rep=['crete', 'cote12'], lab='r'),
    'V 25': pt('L4', 1.5, rep=['crete'], lab='r'),
    'V 28': dict(x=X0 + 1.5 * K, y=486, rep=['sacrum', 'crete'], regle=r(486, 1.5), lab='r'),
    'V 43': pt('T4', 3, rep=['bord-omoplate', 'epine-omoplate'], lab='r'),
    'V 52': pt('L2', 3, rep=['crete', 'cote12'], lab='r'),
    'VB 21': dict(x=274, y=60, rep=['c7', 'acromion'], lab='t'),
}
