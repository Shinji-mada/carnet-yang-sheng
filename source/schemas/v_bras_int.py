# -*- coding: utf-8 -*-
"""Avant-bras gauche et paume, face avant (paume vers toi) : coude en haut, pouce à droite (planche MC 6)."""
from lib import *

C = 25.0           # 12 cun entre le pli du poignet (y 340) et le pli du coude (y 40)
YP = 340           # pli du poignet
def cun(v): return YP - v * C

def carpe(x0, y0, x1, y1):
    return bone([(x0 + 2, y0), (x1 - 2, y0 + 1), (x1, (y0 + y1) / 2), (x1 - 2, y1), (x0 + 2, y1 - 1), (x0, (y0 + y1) / 2)])

SKIN = ''.join([
    # peau : bras, avant-bras, main et doigts
    skin([(101, -60), (99, 0), (96, 40), (99, 100), (105, 180), (114, 280), (119, 340), (110, 372), (106, 405), (104, 440),
          (103, 470), (106, 490), (111, 496), (116, 492), (119, 468), (122, 449), (122, 480), (125, 514), (131, 522), (137, 516),
          (140, 480), (142, 451), (142, 490), (145, 524), (152, 532), (159, 525), (161, 490), (162, 450), (164, 480), (167, 512),
          (174, 520), (180, 513), (182, 478), (184, 447), (190, 433), (204, 454), (216, 479), (225, 487), (233, 480), (231, 460),
          (224, 430), (212, 398), (198, 368), (182, 342), (186, 280), (196, 180), (202, 100), (205, 40), (201, 0), (199, -60)], closed=False),
])
BONES = ''.join([
    # humérus
    bone([(130, -60), (129, -10), (118, 8), (103, 17), (96, 27), (101, 36), (115, 40), (126, 48), (140, 44), (152, 47),
          (162, 43), (177, 46), (191, 40), (200, 31), (197, 21), (184, 9), (171, -10), (170, -60)]),
    # cubitus (côté petit doigt) et radius (côté pouce)
    bone([(119, 50), (134, 48), (146, 55), (144, 70), (137, 84), (133, 130), (131, 200), (130, 280), (131, 318), (134, 331),
          (129, 341), (122, 342), (118, 335), (121, 320), (122, 280), (123, 200), (123, 130), (119, 84), (114, 64)]),
    bone([(168, 52), (184, 50), (192, 57), (189, 65), (182, 72), (180, 95), (178, 140), (176, 200), (174, 260), (170, 300),
          (160, 322), (156, 334), (162, 341), (177, 342), (189, 343), (194, 334), (191, 318), (187, 300), (186, 260), (187, 200),
          (188, 140), (188, 100), (183, 73), (172, 65), (167, 58)]),
    # carpe (deux rangées)
    carpe(176, 344, 192, 358), carpe(159, 344, 175, 357), carpe(140, 346, 157, 358),
    ellipse('os', 132, 353, 6, 5.5),
    carpe(182, 360, 198, 374), carpe(168, 360, 181, 372), carpe(151, 358, 167, 377), carpe(134, 358, 150, 374),
    # métacarpiens
    capsule(190, 374, 206, 414, 12, 11),
    capsule(172, 377, 172, 440, 10, 11), capsule(151, 379, 151, 442, 10, 11), capsule(134, 377, 132, 440, 9, 10), capsule(118, 375, 114, 436, 9, 9),
    # phalanges
    capsule(208, 419, 217, 450, 10, 9), capsule(218, 453, 224, 475, 9, 7),
    capsule(172, 444, 173, 476, 9, 8), capsule(173, 480, 174, 498, 8, 7), capsule(174, 501, 174, 514, 7, 5),
    capsule(151, 446, 152, 482, 9, 8), capsule(152, 486, 152, 508, 8, 7), capsule(152, 511, 152, 525, 7, 5),
    capsule(131, 444, 131, 478, 9, 8), capsule(131, 482, 131, 500, 8, 7), capsule(131, 503, 131, 516, 7, 5),
    capsule(113, 440, 112, 466, 8, 7), capsule(112, 470, 111, 482, 7, 6), capsule(111, 485, 111, 493, 6, 5),
])
PAUME = skl([(111, 489), (116, 487)]) + skl([(128, 515), (135, 515)]) + skl([(148, 525), (156, 525)]) + skl([(170, 513), (178, 513)]) + skl([(221, 478), (228, 474)])
MUSCLES = ''.join([
    # muscles et tendons (petit palmaire au milieu, grand palmaire vers le pouce)
    tendon([(114, 52), (124, 56), (140, 110), (152, 170), (153, 200), (148, 200), (140, 170), (124, 110), (112, 60)]),
    tendon([(149, 196), (153, 196), (153, 338), (149, 338)]),
    tendon([(118, 46), (130, 50), (160, 110), (176, 160), (178, 190), (171, 190), (160, 160), (140, 110), (116, 56)]),
    tendon([(170, 186), (178, 186), (181, 350), (174, 350)]),
    tendon([(104, 60), (112, 58), (120, 140), (125, 230), (126, 250), (122, 250), (116, 230), (108, 140)]),
    tendon([(121, 246), (126, 246), (124, 346), (119, 346)]),
    # plis du poignet et du coude
    path('pli', smooth([(116, 340), (150, 344), (184, 341)], False)),
    path('pli', smooth([(97, 40), (150, 46), (204, 40)], False)),
])
svg = SKIN + PAUME + BONES + MUSCLES

VIEW = {
    'nom': "Avant-bras et paume (face intérieure)", 'vb': '-6 -40 316 580', 'sym': False,
    'svg': svg,
    'reps': {
        'pli-poignet': dict(t="pli de flexion|du poignet", x=118, y=341, tx=70, ty=348, a='end'),
        'pli-coude': dict(t="pli du coude", x=99, y=41, tx=70, ty=30, a='end'),
        'fcr': dict(t="tendon du fléchisseur|radial du carpe", x=175, y=250, tx=70, ty=212, a='end'),
        'pl': dict(t="tendon du long|palmaire", x=151, y=262, tx=70, ty=262, a='end'),
        'fcu': dict(t="tendon du fléchisseur|ulnaire du carpe", x=123, y=300, tx=70, ty=300, a='end'),
        'pisiforme': dict(t="os pisiforme", x=130, y=354, tx=70, ty=384, a='end'),
        'styloide': dict(t="apophyse styloïde|du radius", x=191, y=334, tx=240, ty=364),
        'artere': dict(t="pouls radial", x=182, y=325, tx=240, ty=392),
        'thenar': dict(t="éminence thénar|(1er métacarpien)", x=205, y=398, tx=240, ty=420),
        'mc23': dict(t="entre 2e et 3e|métacarpiens", x=162, y=414, tx=70, ty=440, a='end'),
        'mc45': dict(t="entre 4e et 5e|métacarpiens", x=123, y=412, tx=70, ty=410, a='end'),
        'ongle-pouce': dict(t="angle de l'ongle|du pouce", x=231, y=474, tx=244, ty=500),
        'biceps': dict(t="tendon|du biceps", x=166, y=48, tx=240, ty=14),
        'radius': dict(t="radius", x=182, y=150, tx=70, ty=150, a='end'),
        'cubitus': dict(t="cubitus", x=127, y=180, tx=70, ty=180, a='end'),
    },
    'defaut': ['pli-poignet', 'fcr', 'pl'],
    'regles': {'bras12': dict(a=[236, YP], b=[236, cun(12)], n=12, lab=[0, 12])},
    'canal': {
        'P 8': [181, round(cun(1))], 'MC 3': [152, 42], 'MC 4': [157, round(cun(5))], 'MC 5': [158, round(cun(3))], 'MC 9': [152, 528],
        'C 3': [99, 40], 'C 4': [127, round(cun(1.5))], 'C 9': [117, 491],
    },
}

PTS = {
    'P 5': dict(x=178, y=42, rep=['biceps', 'pli-coude'], regle=['bras12'], lab='l'),
    'P 6': dict(x=179, y=round(cun(7)), rep=['radius', 'pli-poignet'], regle=['bras12'], lab='l'),
    'P 7': dict(x=188, y=round(cun(1.5)), rep=['styloide', 'pli-poignet'], regle=['bras12'], lab='l'),
    'P 9': dict(x=181, y=YP, rep=['artere', 'pli-poignet'], lab='l'),
    'P 10': dict(x=206, y=398, rep=['thenar'], lab='l'),
    'P 11': dict(x=231, y=473, rep=['ongle-pouce'], lab='l'),
    'MC 6': dict(x=159, y=round(cun(2)), rep=['fcr', 'pl', 'pli-poignet'], regle=['bras12'], lab='t'),
    'MC 7': dict(x=159, y=YP, rep=['fcr', 'pl', 'pli-poignet'], lab='t'),
    'MC 8': dict(x=162, y=413, rep=['mc23'], lab='r'),
    'C 5': dict(x=127, y=round(cun(1)), rep=['fcu', 'pli-poignet'], regle=['bras12'], lab='t'),
    'C 6': dict(x=127, y=round(cun(0.5)), rep=['fcu', 'pli-poignet'], regle=['bras12'], lab='t'),
    'C 7': dict(x=127, y=YP, rep=['fcu', 'pisiforme', 'pli-poignet'], lab='t'),
    'C 8': dict(x=123, y=411, rep=['mc45'], lab='r'),
}
