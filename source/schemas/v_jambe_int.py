# -*- coding: utf-8 -*-
"""Jambe gauche vue de l'intérieur : genou en haut, orteils à gauche (comme la planche Rt 9 / Rt 8)."""
from lib import *

C = 19.4          # unités par cun sur la jambe (13 cun entre Rt 9 et la pointe de la malléole)
YM = 392          # pointe de la malléole interne
def cun(v): return YM - v * C   # hauteur d'un point situé à v cun au-dessus de la malléole

svg = ''.join([
    # peau (contour ouvert en haut)
    skin([(97, -90), (94, -40), (90, 0), (84, 34), (80, 58), (83, 84), (93, 110), (100, 150), (106, 200), (113, 260), (119, 320),
          (122, 360), (120, 386), (108, 401), (80, 413), (50, 423), (26, 429), (8, 431), (-3, 437), (-4, 447), (4, 455), (26, 458),
          (60, 463), (88, 455), (118, 452), (146, 461), (174, 461), (189, 449), (192, 428), (185, 405), (178, 380), (177, 345),
          (183, 300), (196, 240), (201, 190), (200, 150), (196, 118), (198, 84), (203, 30), (206, -30), (208, -90)], closed=False),
    # plis et ongle
    skl([(2, 433), (6, 431), (10, 432)]),
    # fémur
    bone([(129, -90), (127, -30), (123, 5), (114, 34), (108, 58), (111, 80), (122, 94), (142, 99), (166, 99), (185, 92),
          (194, 76), (195, 56), (189, 38), (186, 27), (190, 19), (182, 10), (171, -15), (167, -60), (167, -90)]),
    osl([(160, 36), (170, 52), (172, 72), (168, 92)]),
    ellipse('osl', 178, 62, 6, 7),
    # rotule
    bone([(93, 33), (85, 42), (80, 60), (83, 80), (92, 96, 'c'), (100, 87), (105, 66), (103, 45)]),
    # tibia : plateau, condyle interne en surplomb, diaphyse, malléole
    bone([(104, 101), (132, 99), (164, 99), (188, 102), (197, 110), (195, 121), (185, 129), (172, 134), (165, 148),
          (158, 190), (152, 240), (148, 290), (146, 330), (147, 358), (152, 377), (149, 391), (140, 399), (130, 398),
          (124, 390), (123, 374), (123, 355), (120, 320), (116, 270), (112, 210), (108, 160), (106, 144), (101, 131), (100, 114)]),
    osl([(104, 120), (130, 126), (160, 129), (184, 128)]),
    osl([(108, 144), (113, 139), (118, 141)]),
    osl([(128, 360), (136, 372), (140, 390)]),
    # talus, calcanéum, os du pied
    bone([(122, 398), (140, 396), (160, 399), (166, 408), (160, 416), (146, 419), (132, 418), (120, 416), (112, 412), (106, 406), (110, 400)]),
    bone([(136, 420), (150, 419), (166, 414), (180, 414), (190, 424), (193, 438), (188, 450), (174, 456), (152, 454), (138, 448), (130, 438), (131, 428)]),
    bone([(104, 402), (111, 400), (117, 405), (118, 416), (113, 424), (106, 430), (99, 426), (97, 414), (99, 405)]),
    bone([(95, 405), (97, 428), (90, 434), (78, 434), (74, 420), (78, 408), (87, 404)]),
    osl([(94, 404), (60, 412), (30, 424), (16, 428)]),
    capsule(74, 421, 34, 442, 16, 15),
    ellipse('os', 39, 451, 5, 3.4),
    capsule(31, 442, 14, 441, 13, 11),
    capsule(13, 441, 1, 439, 11, 9),
])

VIEW = {
    'nom': "Genou, jambe et pied (côté intérieur)", 'vb': '-42 -62 330 560', 'sym': False,
    'svg': svg,
    'reps': {
        'condyle': dict(t="condyle interne|du tibia", x=188, y=116, tx=214, ty=100),
        'rotule': dict(t="rotule", x=86, y=60, tx=52, ty=56, a='end'),
        'bord-rotule': dict(t="bord supérieur|de la rotule", x=93, y=34, tx=52, ty=24, a='end'),
        'pointe-rotule': dict(t="pointe de|la rotule", x=92, y=94, tx=52, ty=100, a='end'),
        'tibia': dict(t="tibia", x=121, y=236, tx=52, ty=230, a='end'),
        'bord-tibia': dict(t="bord arrière|du tibia", x=150, y=300, tx=52, ty=300, a='end'),
        'malleole': dict(t="malléole|interne", x=130, y=386, tx=52, ty=366, a='end'),
        'achille': dict(t="tendon|d'Achille", x=180, y=368, tx=214, ty=404),
        'naviculaire': dict(t="tubérosité de l'os|naviculaire", x=108, y=428, tx=112, ty=478, a='middle'),
        'metatarsien': dict(t="1er métatarsien", x=56, y=432, tx=36, ty=478, a='middle'),
        'orteil': dict(t="ongle du|gros orteil", x=4, y=432, tx=-14, ty=404, a='middle'),
        'pli-genou': dict(t="pli du genou|(bout intérieur)", x=197, y=98, tx=214, ty=74),
        'condyle-femur': dict(t="condyle interne|du fémur", x=180, y=62, tx=214, ty=40),
    },
    'defaut': ['condyle', 'tibia', 'malleole'],
    'regles': {
        'tibia13': dict(a=[226, YM], b=[226, cun(13)], n=13, lab=[0, 13]),
    },
    'canal': {
        'Rt 2': [24, 452], 'Rt 5': [123, 406], 'Rt 7': [152, round(cun(6))],
        'Rn 4': [167, 401], 'Rn 5': [158, 411], 'Rn 8': [150, round(cun(2.4))], 'Rn 9': [172, round(cun(5.4))], 'Rn 10': [197, 101],
        'F 4': [115, 395], 'F 6': [134, round(cun(7))], 'F 7': [191, 143], 'F 9': [168, -8],
    },
}

PTS = {
    'Bai Chong Wo': dict(x=124, y=-24, rep=['bord-rotule'], regle=[dict(a=[60, 34], b=[60, 34 - 3 * C], n=3, lab=[0, 3], cote=-1)], lab='r'),
    'Rt 10': dict(x=122, y=-5, rep=['bord-rotule'], regle=[dict(a=[60, 34], b=[60, 34 - 2 * C], n=2, lab=[0, 2], cote=-1)], lab='r'),
    'F 8': dict(x=188, y=95, rep=['pli-genou', 'condyle-femur'], lab='l'),
    'Rt 9': dict(x=172, y=142, rep=['condyle', 'tibia'], regle=['tibia13'], lab='l'),
    'Rt 8': dict(x=160, y=round(cun(10)), rep=['pointe-rotule', 'tibia'], regle=['tibia13'], lab='l'),
    'F 5': dict(x=134, y=round(cun(5)), rep=['tibia', 'malleole'], regle=['tibia13'], lab='l'),
    'Rt 6': dict(x=148, y=round(cun(3)), rep=['bord-tibia', 'malleole'], regle=['tibia13'], lab='l'),
    'Rn 7': dict(x=163, y=round(384 - 2 * C), rep=['achille', 'malleole'], regle=[dict(a=[226, 384], b=[226, 384 - 2 * C], n=2, lab=[0, 2])], lab='l'),
    'Rn 3': dict(x=157, y=384, rep=['malleole', 'achille'], lab='t'),
    'Rn 6': dict(x=138, y=415, rep=['malleole'], lab='r'),
    'Rn 2': dict(x=106, y=439, rep=['naviculaire'], lab='t'),
    'Rt 4': dict(x=72, y=447, rep=['metatarsien'], lab='t'),
    'Rt 3': dict(x=44, y=452, rep=['metatarsien'], lab='t'),
    'Rt 1': dict(x=4, y=435, rep=['orteil'], lab='r'),
}
