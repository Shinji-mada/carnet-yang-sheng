# -*- coding: utf-8 -*-
"""Cuisse droite de face (côté extérieur à gauche de l'image) : bassin, fémur, rotule."""
from lib import *

K = 22; YR = 452               # bord supérieur de la rotule
YP = 74                        # bord supérieur du pubis
ASIS = (96, 16); ROT = (184, YR)   # épine iliaque antéro-supérieure ; bord externe de la base de la rotule
def y_rot(v): return YR - v * K
def x_lig(y): return ASIS[0] + (ROT[0] - ASIS[0]) * (y - ASIS[1]) / (ROT[1] - ASIS[1])

svg = ''.join([
    # bassin : aile iliaque, branche du pubis jusqu'à la symphyse
    bone([(70, -36), (128, -40), (176, -30), (196, -12), (190, 14), (170, 34), (180, 50), (214, 52), (262, 56), (306, 62),
          (322, 70), (320, 86), (296, 90), (250, 86), (214, 88), (196, 98), (172, 102), (150, 92), (130, 70), (112, 46),
          (96, 20, 'c'), (88, -2), (72, -16)]),
    # fémur : tête, col, grand trochanter, diaphyse qui descend en dedans, condyles
    ellipse('os', 182, 78, 23, 22),
    bone([(164, 86), (186, 96), (176, 120), (166, 140), (172, 200), (184, 300), (198, 380), (214, 420), (240, 434), (252, 456),
          (242, 486), (210, 494), (182, 492), (152, 488), (140, 466), (150, 432), (162, 400), (156, 300), (144, 200),
          (132, 150), (112, 134), (100, 112), (104, 92), (124, 88), (146, 96)]),
    ellipse('os', 200, 466, 25, 28),
    # peau
    skin([(60, -40), (50, 10), (42, 70), (40, 120), (48, 200), (62, 300), (82, 380), (104, 440), (118, 500), (122, 540)], False),
    skin([(330, 46), (314, 80), (304, 140), (300, 220), (294, 320), (284, 420), (278, 480), (276, 540)], False),
    skl([(100, 22), (160, 44), (230, 62), (306, 78)]),
    osl([ASIS, ROT]),
])

VIEW = {
    'nom': "Cuisse (face avant)", 'vb': '0 -50 380 600', 'sym': False,
    'svg': svg,
    'reps': {
        'epine-iliaque': dict(t="bosse avant de l'os du|bassin (épine iliaque)", x=96, y=16, tx=30, ty=-24, a='end'),
        'trochanter': dict(t="grand trochanter|(bosse de la hanche)", x=104, y=110, tx=30, ty=150, a='end'),
        'pli-aine': dict(t="pli de l'aine", x=240, y=66, tx=336, ty=20),
        'rotule': dict(t="bord supérieur|de la rotule", x=186, y=YR - 10, tx=30, ty=YR + 10, a='end'),
        'interieur-cuisse': dict(t="face intérieure|de la cuisse", x=298, y=240, tx=336, ty=270),
        'cote-cuisse': dict(t="côté de la cuisse : bras|le long du corps, là où|arrive le bout du majeur", x=72, y=y_rot(7) - 16, tx=30, ty=y_rot(7) - 70, a='end'),
    },
    'defaut': ['epine-iliaque', 'rotule'],
    'regles': {
        'rot': dict(a=[350, YR], b=[350, y_rot(9)], n=9, lab=[0, 2, 3, 6, 7, 9], cote=-1),
        'pubis': dict(a=[350, YP], b=[350, YP + 4 * K], n=4, lab=[0, 2, 3], cote=-1),
    },
    'canal': {'E 33': [round(x_lig(y_rot(3))), round(y_rot(3))], 'E 34': [round(x_lig(y_rot(2))), round(y_rot(2))],
              'Rt 12': [246, 64], 'Rt 10': [262, round(YR - 2 * K)], 'F 9': [276, round(YR - 4 * K - 10)], 'VB 33': [124, 444]},
}

PTS = {
    'E 31': dict(x=round(x_lig(132)), y=132, rep=['epine-iliaque', 'rotule'], lab='r'),
    'E 32': dict(x=round(x_lig(y_rot(6))), y=round(y_rot(6)), rep=['rotule'], regle=['rot'], lab='r'),
    'VB 29': dict(x=98, y=60, rep=['epine-iliaque', 'trochanter'], lab='r'),
    'VB 31': dict(x=74, y=round(y_rot(7) + 30), rep=['cote-cuisse'], regle=['rot'], lab='r'),
    'VB 32': dict(x=82, y=round(y_rot(5) + 30), rep=['cote-cuisse'], regle=['rot'], lab='r'),
    'Rt 11': dict(x=252, y=round(64 + (YR - 2 * K - 64) / 3), rep=['pli-aine', 'interieur-cuisse'], lab='l'),
    'F 11': dict(x=290, y=round(YP + 2 * K), rep=['pli-aine', 'interieur-cuisse'], regle=['pubis'], lab='l'),
    'F 10': dict(x=290, y=round(YP + 3 * K), rep=['interieur-cuisse'], regle=['pubis'], lab='l'),
}
