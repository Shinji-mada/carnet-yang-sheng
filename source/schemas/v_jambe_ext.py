# -*- coding: utf-8 -*-
"""Genou et jambe droite de face (côté extérieur à gauche de l'image) : planche E 36 / E 40."""
from lib import *

K = 18; Y35 = 98          # creux externe du genou (E 35) ; 16 cun jusqu'à la malléole externe
def bas(v): return Y35 + v * K

svg = ''.join([
    skin([(150, -110), (148, -20), (146, 50), (149, 104), (141, 160), (140, 220), (148, 290), (158, 350), (162, 392), (160, 430)], False),
    skin([(254, -110), (256, -20), (258, 50), (254, 110), (262, 180), (258, 250), (244, 330), (236, 384), (240, 430)], False),
    # fémur, rotule
    bone([(181, -110), (180, -20), (170, 20), (160, 48), (157, 72), (163, 90), (180, 96), (200, 93), (222, 96), (240, 90),
          (246, 72), (242, 48), (232, 20), (222, -20), (221, -110)]),
    osl([(178, 62), (190, 80), (200, 84), (212, 80), (224, 62)]),
    bone([(201, 28), (216, 36), (222, 56), (214, 78), (201, 86, 'c'), (188, 78), (180, 56), (186, 36)]),
    # tibia, péroné
    bone([(164, 104), (200, 101), (244, 104), (248, 114), (240, 126), (226, 138), (222, 160), (221, 220), (222, 300),
          (226, 352), (232, 372), (232, 392, 'c'), (222, 397), (214, 391), (196, 391), (184, 387), (186, 360), (188, 300),
          (189, 220), (188, 160), (182, 138), (168, 126), (160, 114)]),
    osl([(206, 142), (204, 200), (205, 280), (206, 340)]),
    bone([(150, 124), (162, 120), (167, 130), (162, 142), (164, 200), (166, 280), (170, 350), (178, 372), (180, 392),
          (172, 406, 'c'), (162, 398), (160, 376), (158, 350), (155, 280), (154, 200), (154, 142), (148, 134)]),
    # tendon rotulien
    path('osl', smooth([(193, 84), (196, 110), (200, 136), (212, 136), (213, 110), (209, 84)], True)),
    # talus
    bone([(182, 396), (200, 393), (224, 398), (228, 412), (218, 424), (190, 424), (180, 414)]),
])

VIEW = {
    'nom': "Genou et jambe (face avant)", 'vb': '-30 -50 380 490', 'sym': False,
    'svg': svg,
    'reps': {
        'rotule': dict(t="rotule", x=186, y=56, tx=118, ty=44, a='end'),
        'bord-rotule': dict(t="bord supérieur|de la rotule", x=196, y=30, tx=118, ty=12, a='end'),
        'oeil-ext': dict(t="creux externe|du genou", x=187, y=99, tx=118, ty=92, a='end'),
        'oeil-int': dict(t="creux interne|du genou", x=216, y=99, tx=282, ty=70),
        'tete-perone': dict(t="tête du péroné", x=154, y=128, tx=118, ty=140, a='end'),
        'crete-tibia': dict(t="crête du tibia", x=205, y=190, tx=118, ty=196, a='end'),
        'perone': dict(t="péroné", x=160, y=250, tx=118, ty=256, a='end'),
        'tibia': dict(t="tibia", x=210, y=310, tx=118, ty=316, a='end'),
        'malleole-ext': dict(t="malléole externe", x=172, y=396, tx=118, ty=404, a='end'),
    },
    'defaut': ['rotule', 'tete-perone', 'crete-tibia'],
    'regles': {
        'jambe16': dict(a=[284, Y35], b=[284, bas(16)], n=16, lab=[0, 16], cote=-1),
        'cuisse2': dict(a=[284, 36], b=[284, 0], n=2, lab=[0, 2]),
    },
    'canal': {
        'E 33': [178, -18], 'E 32': [176, -72], 'E 38': [191, round(bas(8))], 'E 39': [191, round(bas(9))], 'E 41': [205, 402],
        'VB 33': [152, 52], 'VB 36': [165, round(bas(9))], 'VB 37': [166, round(bas(11))], 'VB 38': [167, round(bas(12))],
        'VB 39': [168, round(bas(13))], 'VB 40': [178, 414],
    },
}

PTS = {
    'E 34': dict(x=180, y=0, rep=['bord-rotule', 'rotule'], regle=['cuisse2'], lab='l'),
    'He Ding': dict(x=201, y=22, rep=['bord-rotule'], lab='r'),
    'E 35': dict(x=187, y=Y35, rep=['oeil-ext', 'rotule'], lab='l'),
    'Nei Xi Yan': dict(x=216, y=Y35, rep=['oeil-int', 'rotule'], lab='r'),
    'E 36': dict(x=188, y=round(bas(3)), rep=['oeil-ext', 'crete-tibia'], regle=['jambe16'], lab='l'),
    'E 37': dict(x=190, y=round(bas(6)), rep=['crete-tibia'], regle=['jambe16'], lab='l'),
    'E 40': dict(x=173, y=round(bas(8)), rep=['crete-tibia', 'perone'], regle=['jambe16'], lab='l'),
    'VB 34': dict(x=165, y=142, rep=['tete-perone'], lab='l'),
}
