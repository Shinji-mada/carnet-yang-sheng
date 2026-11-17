# -*- coding: utf-8 -*-
"""Épaule et bras droits vus de côté (avant du corps à droite de l'image) : deltoïde, humérus, coude."""
from lib import *

K = 32.8                     # 10 cun entre GI 11 (pli du coude) et GI 15 (sous l'acromion)
Y11 = 400
def haut(v): return Y11 - v * K

svg = ''.join([
    # peau : cou, épaule, bras, avant-bras
    skin([(96, -10), (100, 30), (120, 50), (150, 56), (176, 54), (204, 66), (220, 96), (226, 150), (224, 240), (220, 320),
          (226, 380), (232, 420), (230, 470), (226, 530)], False),
    skin([(70, 40), (84, 60), (110, 70), (124, 110), (128, 170), (132, 260), (136, 340), (130, 400), (136, 440), (150, 480), (160, 530)], False),
    # humérus, tête de l'humérus, acromion, radius et cubitus
    ellipse('os', 172, 96, 26, 28),
    bone([(160, 110), (186, 110), (190, 200), (188, 300), (192, 370), (204, 392), (200, 410), (176, 414), (150, 410), (144, 392), (160, 370), (162, 300), (160, 200)]),
    band([(120, 60), (150, 62), (178, 64), (198, 74)], 12, 9),
    bone([(176, 418), (196, 414), (204, 440), (200, 530), (184, 530), (182, 440)]),
    bone([(146, 404), (166, 412), (172, 440), (172, 530), (156, 530), (150, 450), (140, 424)]),
    # deltoïde
    path('mu', smooth([(124, 70), (200, 70), (214, 110), (206, 170), (192, haut(7) + 6, 'c'), (176, 200), (150, 150), (132, 110)], True)),
])

VIEW = {
    'nom': "Épaule et bras (vue de côté)", 'vb': '20 -20 330 560', 'sym': False,
    'svg': svg,
    'reps': {
        'acromion': dict(t="acromion|(pointe de l'épaule)", x=196, y=70, tx=262, ty=40),
        'deltoide': dict(t="pointe du V|du deltoïde", x=192, y=haut(7) + 6, tx=262, ty=haut(7) + 30),
        'pli-coude': dict(t="bout du pli|du coude", x=208, y=Y11, tx=262, ty=Y11 + 20),
        'olecrane': dict(t="pointe du coude|(olécrâne)", x=144, y=410, tx=60, ty=450, a='end'),
        'arriere-epaule': dict(t="creux derrière|l'acromion", x=146, y=78, tx=60, ty=40, a='end'),
    },
    'defaut': ['acromion', 'pli-coude'],
    'regles': {
        'gi10': dict(a=[300, Y11], b=[300, haut(10)], n=10, lab=[0, 3, 7, 10], cote=-1),
        'olec': dict(a=[90, 410], b=[90, 410 - 3 * K], n=3, lab=[0, 2], cote=1),
    },
    'canal': {'GI 12': [216, round(haut(1))], 'GI 11': [212, Y11], 'TR 10': [146, round(410 - K)], 'GI 16': [160, 50]},
}

PTS = {
    'GI 15': dict(x=200, y=round(haut(10)), rep=['acromion'], regle=['gi10'], lab='r'),
    'GI 14': dict(x=194, y=round(haut(7)), rep=['deltoide'], regle=['gi10'], lab='r'),
    'GI 13': dict(x=208, y=round(haut(3)), rep=['pli-coude'], regle=['gi10'], lab='r'),
    'TR 14': dict(x=146, y=86, rep=['arriere-epaule', 'acromion'], lab='l'),
    'TR 13': dict(x=134, y=round(86 + 3 * K), rep=['arriere-epaule', 'deltoide'], lab='l'),
    'TR 12': dict(x=136, y=round((86 + 3 * K + 410 - 2 * K) / 2), rep=['olecrane'], lab='l'),
    'TR 11': dict(x=140, y=round(410 - 2 * K), rep=['olecrane'], regle=['olec'], lab='l'),
}
