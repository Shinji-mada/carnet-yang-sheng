# -*- coding: utf-8 -*-
"""Poitrine et ventre de face : cage thoracique et bassin dessinés sur la moitié gauche de l'image (planche E 14)."""
from lib import *

X0 = 200; K = 18            # 4 cun entre la ligne médiane et le mamelon
YU = 360                    # nombril ; 8 cun jusqu'à la pointe du sternum (y 200), 5 cun jusqu'au pubis (y 460)
def haut(v): return YU - v * 20
def bas(v): return YU + v * 20

def cote(s, lat_x, lat_y, w=8):
    return band([(190, s), (166, s + 6), (132, s + 10), (98, s + 6), (70, lat_y + 10), (lat_x, lat_y)], w - 1.5, w)

skin_d = [(178, -30), (176, 22), (140, 34), (92, 42), (54, 50), (30, 68), (18, 120), (13, 200), (12, 260)]
flank = [(42, 150), (48, 220), (60, 300), (50, 380), (44, 450), (44, 520)]
arm_in = [(36, 160), (34, 210), (32, 260)]

svg = ''.join([
    skin(skin_d, False), skin(mirror(skin_d, X0), False),
    skin(flank, False), skin(mirror(flank, X0), False),
    skl(arm_in), skl(mirror(arm_in, X0)),
    ellipse('skl', 128, 143, 3.5, 3.5), ellipse('skl', 272, 143, 3.5, 3.5),
    ellipse('skl', 200, 360, 3.2, 4.2), skl([(195, 356), (200, 353), (205, 356)]),
    # côtes (moitié gauche de l'image)
    cote(62, 70, 54, 9), cote(84, 56, 66), cote(108, 48, 88), cote(131, 46, 112), cote(153, 46, 136), cote(173, 48, 160),
    band([(192, 192), (162, 202), (124, 204), (86, 196), (54, 182)], 6.5, 8),
    band([(176, 216), (142, 226), (102, 224), (60, 208)], 6, 7.5),
    band([(150, 242), (118, 250), (86, 246), (58, 232)], 6, 7),
    band([(118, 270), (94, 272), (66, 258)], 6, 6.5),
    band([(96, 296), (76, 292), (58, 280)], 5, 6),
    band([(198, 206), (172, 224), (142, 246), (114, 272), (92, 294)], 7, 6),
    # sternum
    bone([(184, 38), (216, 38), (218, 58), (212, 78), (214, 100), (213, 170), (210, 192), (205, 200), (203, 214, 'c'),
          (197, 214, 'c'), (195, 200), (190, 192), (187, 170), (186, 100), (188, 78), (182, 58)]),
    osl([(188, 79), (212, 79)]),
    # clavicule
    band([(190, 40), (160, 43), (128, 49), (98, 46), (72, 47), (56, 54)], 10, 9),
    # os du bassin (côté gauche de l'image) : aile iliaque, branche du pubis, symphyse
    bone([(36, 400), (42, 378), (60, 364), (88, 360), (114, 370), (128, 388), (134, 410), (126, 430), (108, 444),
          (88, 452), (72, 446), (62, 432), (56, 416, 'c'), (44, 412)]),
    osl([(50, 392), (78, 378), (106, 382), (122, 400)]),
    band([(92, 456), (126, 460), (162, 464), (194, 466)], 14, 12),
    ellipse('os', 96, 454, 14, 11),
    bone([(194, 456), (206, 456), (207, 478), (193, 478)]),
])

def h(y, n, x=None):  # règle horizontale depuis la ligne médiane
    return dict(a=[X0, y - 13], b=[X0 - n * K, y - 13], n=n, pas=1, lab=[0, n], lien=False)

VIEW = {
    'nom': "Poitrine et ventre", 'vb': '4 -18 396 520', 'sym': True, 'axe': X0,
    'svg': svg,
    'reps': {
        'suprasternal': dict(t="creux au-dessus|du sternum", x=202, y=36, tx=292, ty=14),
        'clavicule': dict(t="clavicule", x=110, y=48, tx=292, ty=62),
        'espace1': dict(t="1er espace|entre les côtes", x=98, y=74, tx=292, ty=84),
        'mamelon': dict(t="mamelon (4e espace|entre les côtes)", x=274, y=143, tx=292, ty=118),
        'sternum': dict(t="sternum", x=206, y=132, tx=292, ty=164),
        'espace6': dict(t="6e espace|entre les côtes", x=128, y=184, tx=292, ty=190),
        'xiphoide': dict(t="pointe du sternum", x=201, y=212, tx=230, ty=226),
        'cote11': dict(t="bout libre de|la 11e côte", x=62, y=288, tx=24, ty=330, a='middle'),
        'nombril': dict(t="nombril", x=205, y=360, tx=236, ty=384),
        'pubis': dict(t="bord supérieur|du pubis", x=202, y=458, tx=236, ty=490),
    },
    'defaut': ['sternum', 'nombril', 'pubis'],
    'regles': {
        'poitrine': dict(a=[X0, 4], b=[X0 - 6 * K, 4], n=6, lab=[0, 2, 4, 6]),
        'haut8': dict(a=[300, YU], b=[300, haut(8)], n=8, lab=[0, 8]),
        'bas5': dict(a=[300, YU], b=[300, bas(5)], n=5, lab=[0, 5], cote=-1),
    },
    'canal': {
        **{f'RM {n}': [X0, round(y)] for n, y in ((2, bas(5)), (5, bas(2)), (7, bas(1)), (8, YU), (10, haut(2)), (11, haut(3)), (13, haut(5)),
                                                  (15, haut(7)), (16, 196), (18, 120), (19, 98), (20, 76), (21, 56))},
        **{f'E {n}': [X0 - 2 * K, round(y)] for n, y in ((19, haut(6)), (20, haut(5)), (22, haut(3)), (23, haut(2)), (24, haut(1)), (26, bas(1)),
                                                        (27, bas(2)), (28, bas(3)), (29, bas(4)), (30, bas(5)))},
        **{f'E {n}': [X0 - 4 * K, y] for n, y in ((12, 30), (13, 54), (14, 74), (15, 96), (16, 119), (17, 143), (18, 164))},
        **{f'Rn {n}': [X0 - 0.5 * K, round(y)] for n, y in ((11, bas(5)), (12, bas(4)), (13, bas(3)), (14, bas(2)), (15, bas(1)), (16, YU),
                                                           (17, haut(2)), (18, haut(3)), (19, haut(4)), (20, haut(5)), (21, haut(6)))},
        **{f'Rn {n}': [X0 - 2 * K, y] for n, y in ((22, 164), (23, 143), (24, 119), (25, 96), (26, 74))},
        'P 2': [X0 - 6 * K, 54], 'F 12': [X0 - 2.5 * K, 470],
    },
}

PTS = {
    'RM 22': dict(x=X0, y=38, rep=['suprasternal'], lab='l'),
    'RM 17': dict(x=X0, y=143, rep=['mamelon', 'sternum'], lab='l'),
    'RM 14': dict(x=X0, y=round(haut(6)), rep=['xiphoide'], regle=['haut8'], lab='l'),
    'RM 12': dict(x=X0, y=round(haut(4)), rep=['xiphoide', 'nombril'], regle=['haut8'], lab='l'),
    'RM 9': dict(x=X0, y=round(haut(1)), rep=['nombril'], regle=['haut8'], lab='l'),
    'RM 6': dict(x=X0, y=round(bas(1.5)), rep=['nombril', 'pubis'], regle=['bas5'], lab='l'),
    'RM 4': dict(x=X0, y=round(bas(3)), rep=['nombril', 'pubis'], regle=['bas5'], lab='l'),
    'RM 3': dict(x=X0, y=round(bas(4)), rep=['nombril', 'pubis'], regle=['bas5'], lab='l'),
    'Zi Gong': dict(x=X0 - 3 * K, y=round(bas(4)), rep=['nombril', 'pubis'], regle=['bas5', h(bas(4), 3)], lab='b'),
    'E 25': dict(x=X0 - 2 * K, y=YU, rep=['nombril'], regle=[h(YU, 2)], lab='b'),
    'E 21': dict(x=X0 - 2 * K, y=round(haut(4)), rep=['nombril', 'xiphoide'], regle=['haut8', h(haut(4), 2)], lab='b'),
    'Rn 27': dict(x=X0 - 2 * K, y=54, rep=['clavicule', 'suprasternal'], regle=['poitrine'], lab='b'),
    'P 1': dict(x=X0 - 6 * K, y=76, rep=['clavicule', 'espace1'], regle=['poitrine'], lab='b'),
    'F 14': dict(x=X0 - 4 * K, y=186, rep=['mamelon', 'espace6'], regle=['poitrine'], lab='b'),
    'F 13': dict(x=62, y=290, rep=['cote11'], lab='b'),
}
