# -*- coding: utf-8 -*-
"""Fesse et arrière de la cuisse droite (côté extérieur à droite de l'image)."""
from lib import *

K = 24; YF = 170               # pli de la fesse ; 14 cun jusqu'au pli du genou
def bas(v): return YF + v * K
YG = bas(14)

svg = ''.join([
    # sacrum (à gauche), os iliaque, fémur
    bone([(20, -10), (56, -10), (62, 30), (56, 70), (44, 104), (36, 120, 'c'), (28, 104), (20, 70), (14, 30)]),
    ''.join(ellipse('osl', 38 + dx, y, 3.6, 2.6) for y in (14, 36, 58) for dx in (-9, 9)),
    bone([(60, -14), (120, -30), (190, -26), (222, -6), (210, 20), (176, 40), (150, 70), (130, 110), (96, 90), (64, 50)]),
    ellipse('os', 190, 62, 20, 22),
    bone([(206, 74), (236, 80), (240, 104), (222, 120), (214, 200), (206, 300), (204, 400), (220, 470), (214, YG - 6), (180, YG),
          (150, YG - 6), (144, 470), (166, 400), (178, 300), (186, 200), (184, 120), (176, 96)]),
    # peau : fesse, cuisse, pli de la fesse, pli du genou
    skin([(36, -40), (40, 40), (60, 120), (90, 160), (110, YF), (116, 260), (126, 360), (134, 460), (140, YG), (138, YG + 40)], False),
    skin([(250, -40), (262, 40), (266, 120), (264, 200), (254, 300), (242, 400), (234, 460), (228, YG), (230, YG + 40)], False),
    skl([(98, YF - 2), (140, YF + 4), (190, YF + 2), (236, YF - 12)]),
    skl([(146, YG), (184, YG + 4), (222, YG)]),
])

VIEW = {
    'nom': "Fesse et arrière de la cuisse", 'vb': '-20 -50 340 600', 'sym': False,
    'svg': svg,
    'reps': {
        'sacrum': dict(t="hiatus sacré|(bas du sacrum)", x=36, y=112, tx=-6, ty=150, a='end'),
        'trochanter': dict(t="grand trochanter|(bosse de la hanche)", x=206, y=60, tx=282, ty=24),
        'pli-fesse': dict(t="pli de la fesse", x=170, y=YF + 4, tx=282, ty=YF + 30),
        'pli-genou': dict(t="pli du genou", x=184, y=YG + 4, tx=282, ty=YG + 20),
    },
    'defaut': ['pli-fesse', 'pli-genou'],
    'regles': {'cuisse14': dict(a=[290, YF], b=[290, YG], n=14, lab=[0, 6, 14], cote=-1)},
    'canal': {'V 40': [184, round(YG + 4)], 'V 38': [214, round(YG - 6)], 'V 39': [212, round(YG + 4)]},
}

PTS = {
    'VB 30': dict(x=round(206 - (206 - 36) / 3), y=round(62 + (112 - 62) / 3), rep=['trochanter', 'sacrum'], lab='t'),
    'V 36': dict(x=170, y=YF + 4, rep=['pli-fesse'], regle=['cuisse14'], lab='l'),
    'V 37': dict(x=174, y=round(bas(6)), rep=['pli-fesse', 'pli-genou'], regle=['cuisse14'], lab='l'),
}
