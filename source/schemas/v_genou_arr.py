# -*- coding: utf-8 -*-
"""Arrière du genou droit et haut du mollet (côté extérieur à droite de l'image)."""
from lib import *

K = 18; YC = 100          # pli du genou
def bas(v): return YC + v * K

svg = ''.join([
    skin([(146, -80), (144, 0), (142, 60), (146, 100), (138, 150), (136, 210), (146, 280), (156, 340)], False),
    skin([(254, -80), (256, 0), (258, 60), (254, 100), (262, 150), (264, 210), (254, 280), (244, 340)], False),
    path('skl', smooth([(150, 100), (175, 104), (200, 106), (225, 104), (250, 100)], False)),
    # fémur (condyles), tibia, péroné
    bone([(182, -80), (180, 0), (170, 40), (158, 66), (158, 88), (172, 98), (194, 96), (200, 90), (206, 96), (228, 98),
          (242, 88), (242, 66), (230, 40), (220, 0), (218, -80)]),
    bone([(160, 108), (198, 104), (236, 108), (238, 122), (226, 134), (216, 160), (212, 260), (214, 340), (188, 340),
          (190, 260), (186, 160), (176, 134), (162, 124)]),
    bone([(234, 126), (244, 122), (248, 134), (242, 146), (240, 240), (240, 340), (232, 340), (232, 240), (232, 146)]),
    # tendons des ischio-jambiers (losange du creux poplité) et jumeaux
    tendon([(150, -40), (164, -40), (172, 40), (168, 90), (160, 116), (152, 112), (156, 60)]),
    tendon([(236, -40), (250, -40), (246, 60), (250, 112), (242, 118), (232, 90), (228, 40)]),
    path('mu', smooth([(164, 108), (192, 112), (198, 170), (194, 250), (184, 290), (160, 270), (150, 200), (154, 140)], True)),
    path('mu', smooth([(236, 108), (208, 112), (202, 170), (206, 250), (216, 290), (240, 270), (250, 200), (246, 140)], True)),
])

VIEW = {
    'nom': "Arrière du genou et mollet", 'vb': '-40 -60 400 400', 'sym': False,
    'svg': svg,
    'reps': {
        'pli-genou': dict(t="pli du genou", x=176, y=104, tx=120, ty=96, a='end'),
        'semi': dict(t="tendons du|demi-tendineux", x=160, y=40, tx=120, ty=24, a='end'),
        'biceps': dict(t="tendon du biceps|fémoral", x=242, y=40, tx=282, ty=24),
        'mollet': dict(t="muscle du mollet|(les deux jumeaux)", x=180, y=220, tx=120, ty=220, a='end'),
    },
    'defaut': ['pli-genou', 'semi', 'biceps'],
    'regles': {'mollet8': dict(a=[282, YC], b=[282, bas(8)], n=8, lab=[0, 8], cote=-1)},
    'canal': {'V 39': [230, 102], 'V 38': [234, 82], 'V 55': [200, round(bas(2))], 'V 56': [200, round(bas(5))],
              'V 57': [200, round(bas(8))], 'Rn 10': [168, 102]},
}

PTS = {
    'V 40': dict(x=200, y=106, rep=['pli-genou', 'semi', 'biceps'], lab='t'),
}
