# -*- coding: utf-8 -*-
"""Bras droit, face intérieure, paume vers l'avant (pouce à droite de l'image) : aisselle, biceps, pli du coude."""
from lib import *

K = 34; YF = 80               # pli avant de l'aisselle ; 9 cun jusqu'au pli du coude
YC = YF + 9 * K
def bas(v): return YF + v * K

svg = ''.join([
    # poitrine et aisselle à gauche, bras
    skin([(20, 10), (60, 30), (96, 50), (112, 74), (114, 140), (112, 240), (116, 330), (110, YC), (116, YC + 60), (122, 500)], False),
    skin([(232, -10), (244, 40), (252, 120), (254, 220), (250, 300), (246, YC - 20), (252, YC + 10), (250, YC + 60), (240, 500)], False),
    skl([(96, 50), (112, 62), (132, 70)]),
    skl([(60, 26), (100, 40), (140, 58), (168, 72)]),
    # humérus et épicondyles
    bone([(160, 20), (196, 20), (194, 120), (190, 240), (192, 320), (230, YC), (226, YC + 14), (186, YC + 10), (170, YC + 12),
          (124, YC + 14), (120, YC), (164, 320), (166, 240), (162, 120)]),
    # biceps et son tendon
    tendon([(176, 40), (210, 40), (226, 140), (220, 260), (204, 330), (196, YC - 6), (186, YC - 6), (178, 330), (160, 260), (156, 140)]),
    osl([(192, 60), (192, 300)]),
    path('skl', smooth([(118, YC), (150, YC + 4), (186, YC + 6), (220, YC + 4), (246, YC)], False)),
])

VIEW = {
    'nom': "Bras (face intérieure)", 'vb': '0 -20 330 540', 'sym': False,
    'svg': svg,
    'reps': {
        'aisselle': dict(t="creux de l'aisselle", x=110, y=56, tx=40, ty=96, a='end'),
        'pli-aisselle': dict(t="pli avant|de l'aisselle", x=150, y=64, tx=270, ty=30),
        'biceps': dict(t="biceps", x=212, y=150, tx=244, ty=118),
        'pli-coude': dict(t="pli du coude", x=150, y=YC + 4, tx=60, ty=YC + 40, a='end'),
    },
    'defaut': ['aisselle', 'pli-coude'],
    'regles': {'bras9': dict(a=[290, YF], b=[290, YC], n=9, lab=[0, 2, 3, 4, 6, 9], cote=-1)},
    'canal': {'P 5': [212, YC + 4], 'MC 3': [184, YC + 6], 'C 3': [124, YC + 2]},
}

PTS = {
    'C 1': dict(x=106, y=58, rep=['aisselle'], lab='l'),
    'MC 2': dict(x=192, y=bas(2), rep=['pli-aisselle', 'biceps'], regle=['bras9'], lab='l'),
    'P 3': dict(x=226, y=bas(3), rep=['pli-aisselle', 'biceps'], regle=['bras9'], lab='r'),
    'P 4': dict(x=226, y=bas(4), rep=['biceps'], regle=['bras9'], lab='r'),
    'C 2': dict(x=154, y=bas(6), rep=['biceps', 'pli-coude'], regle=['bras9'], lab='l'),
}
