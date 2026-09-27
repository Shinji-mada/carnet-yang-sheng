# -*- coding: utf-8 -*-
"""Cheville et pied droit vus du côté extérieur : talon à gauche, orteils à droite."""
from lib import *

K = 18; YP = 290          # saillie de la malléole externe
def haut(v): return YP - v * K

svg = ''.join([
    skin([(116, 20), (108, 90), (112, 160), (124, 220), (130, 262), (122, 296), (110, 322), (112, 346), (124, 356),
          (160, 358), (200, 360), (250, 364), (300, 362), (332, 364), (344, 356), (340, 346), (324, 340), (300, 332),
          (262, 320), (234, 306), (216, 290), (212, 240), (210, 160), (208, 90), (206, 20)], closed=False),
    skl([(330, 348), (338, 352)]),
    # tibia (devant) puis péroné par-dessus
    bone([(176, 20), (204, 20), (205, 120), (206, 220), (210, 270), (212, 292), (200, 298), (184, 292), (178, 240), (176, 120)]),
    bone([(146, 20), (160, 20), (160, 100), (162, 200), (166, 262), (176, 280), (178, 298), (168, 312, 'c'), (156, 304),
          (150, 284), (152, 262), (150, 200), (148, 100)]),
    # talus, calcanéum, cuboïde, os du pied
    bone([(170, 296), (196, 292), (214, 300), (216, 316), (198, 324), (176, 322)]),
    bone([(118, 314), (140, 306), (170, 312), (190, 322), (200, 336), (192, 350), (160, 352), (126, 350), (114, 338)]),
    bone([(200, 324), (222, 320), (232, 334), (226, 348), (204, 348)]),
    bone([(214, 300), (232, 304), (238, 318), (224, 320)]),
    capsule(232, 342, 298, 352, 12, 11), ellipse('os', 232, 346, 8, 6),
    osl([(236, 322), (270, 330), (300, 338)]),
    capsule(300, 353, 318, 354, 10, 9), capsule(320, 354, 330, 354, 8, 7), capsule(332, 354, 339, 353, 7, 5),
])

VIEW = {
    'nom': "Cheville et pied (côté extérieur)", 'vb': '-20 0 400 420', 'sym': False,
    'svg': svg,
    'reps': {
        'malleole-ext': dict(t="malléole externe", x=164, y=292, tx=100, ty=286, a='end'),
        'pointe-malleole': dict(t="pointe de la|malléole externe", x=167, y=310, tx=100, ty=388, a='end'),
        'achille': dict(t="tendon d'Achille", x=128, y=250, tx=100, ty=236, a='end'),
        'perone': dict(t="péroné", x=154, y=160, tx=100, ty=150, a='end'),
        'calcaneum': dict(t="calcanéum", x=146, y=340, tx=100, ty=366, a='end'),
        'mt5': dict(t="tubérosité du|5e métatarsien", x=228, y=350, tx=240, ty=392),
    },
    'defaut': ['malleole-ext', 'achille'],
    'regles': {'mall7': dict(a=[248, YP], b=[248, haut(7)], n=7, lab=[0, 7])},
    'canal': {
        'V 58': [124, round(haut(7))], 'V 59': [132, round(haut(3))], 'V 61': [136, 336], 'V 63': [204, 340], 'V 64': [236, 356],
        'V 65': [292, 358], 'V 66': [312, 359], 'V 67': [338, 350],
        'VB 36': [160, round(haut(7))], 'VB 37': [162, round(haut(5))], 'VB 38': [163, round(haut(4))],
        'VB 41': [256, 326], 'VB 42': [274, 332], 'VB 43': [300, 338],
    },
}

PTS = {
    'V 60': dict(x=146, y=YP, rep=['malleole-ext', 'achille'], lab='t'),
    'V 62': dict(x=167, y=320, rep=['pointe-malleole', 'calcaneum'], lab='b'),
    'VB 40': dict(x=186, y=314, rep=['malleole-ext'], lab='r'),
    'VB 39': dict(x=165, y=round(haut(3)), rep=['perone', 'malleole-ext'], regle=['mall7'], lab='l'),
}
