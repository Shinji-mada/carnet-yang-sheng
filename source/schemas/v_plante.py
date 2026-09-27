# -*- coding: utf-8 -*-
"""Plante du pied droit, orteils en haut (gros orteil à droite)."""
from lib import *

YT = 98; YH = 470; XT = 179; XH = 190   # base entre 2e et 3e orteils ; arrière du talon

svg = ''.join([
    skin([(132, 470), (116, 452), (112, 410), (118, 360), (116, 300), (106, 240), (102, 180), (104, 140), (100, 116),
          (98, 96), (102, 82), (112, 84), (118, 100), (122, 88), (126, 72), (136, 70), (142, 84), (146, 96), (150, 80),
          (156, 62), (168, 60), (174, 76), (176, 92), (182, 74), (188, 52), (202, 50), (208, 66), (208, 92), (212, 76),
          (218, 50), (236, 40), (254, 48), (260, 76), (258, 110), (262, 160), (264, 230), (254, 300), (256, 360),
          (262, 410), (256, 452), (236, 472), (184, 478)], closed=True),
    # os vus par en dessous
    bone([(146, 400), (190, 392), (232, 396), (244, 430), (230, 462), (184, 468), (148, 460), (134, 430)]),
    bone([(150, 340), (186, 330), (230, 334), (236, 370), (222, 392), (160, 392), (146, 370)]),
    capsule(228, 330, 236, 190, 18, 18), capsule(206, 326, 200, 186, 12, 12), capsule(184, 328, 176, 190, 11, 11),
    capsule(164, 330, 150, 196, 11, 11), capsule(150, 336, 126, 212, 11, 10),
    ellipse('os', 230, 186, 6, 5), ellipse('os', 242, 186, 6, 5),
    capsule(237, 180, 240, 124, 17, 15), capsule(240, 120, 240, 76, 15, 12),
    capsule(200, 182, 196, 138, 10, 9), capsule(196, 134, 194, 98, 9, 8), capsule(194, 94, 194, 70, 8, 6),
    capsule(176, 186, 170, 144, 10, 9), capsule(170, 140, 166, 110, 8, 7), capsule(166, 106, 164, 84, 7, 5),
    capsule(150, 192, 142, 154, 9, 8), capsule(142, 150, 137, 124, 8, 7), capsule(137, 120, 133, 102, 7, 5),
    capsule(126, 208, 116, 174, 9, 8), capsule(116, 170, 112, 150, 7, 6), capsule(112, 146, 110, 130, 6, 5),
    path('ldr', smooth([(XT, YT), (XH, YH)], False)),
])

VIEW = {
    'nom': "Plante du pied", 'vb': '-40 30 380 470', 'sym': False,
    'svg': svg,
    'reps': {
        'palmure23': dict(t="base entre le 2e|et le 3e orteil", x=XT, y=YT, tx=86, ty=110, a='end'),
        'talon': dict(t="arrière du talon", x=XH, y=YH, tx=86, ty=470, a='end'),
        'creux': dict(t="creux qui se forme|quand on plie les orteils", x=180, y=226, tx=86, ty=250, a='end'),
    },
    'defaut': ['palmure23', 'talon'],
    'regles': {'plante': dict(a=[296, YT], b=[296, YH], parts=['1/3', '2/3'], guides=[[XT + 4, YT], [XH + 4, YH]])},
}

PTS = {'Rn 1': dict(x=round(XT + (XH - XT) / 3), y=round(YT + (YH - YT) / 3), rep=['palmure23', 'talon', 'creux'], regle=['plante'], lab='r')}
