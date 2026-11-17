# -*- coding: utf-8 -*-
"""Crâne vu du dessus, front en haut : lignes du Vaisseau Gouverneur, de la Vessie et de la Vésicule biliaire."""
from lib import *

X0 = 200; K = 24
AH = 78                     # lisière antérieure des cheveux ; 12 cun jusqu'à la lisière postérieure
def av(v): return AH + v * K   # v cun en arrière de la lisière antérieure
PH = av(12)

half = [(200, 34), (152, 40), (110, 62), (80, 100), (63, 150), (58, 200), (63, 258), (80, 314), (110, 362), (152, 394), (200, 404)]
skull = [(200, 46), (156, 52), (120, 72), (94, 106), (78, 152), (74, 200), (79, 254), (94, 306), (122, 350), (158, 380), (200, 390)]
ear = [(60, 178), (46, 184), (40, 204), (46, 226), (60, 234)]

svg = ''.join([
    path('osf', smooth(skull + mirror(skull[::-1], X0)[1:-1], True)),
    skin(half + mirror(half[::-1], X0)[1:], False),
    skin(ear, False), skin(mirror(ear, X0), False),
    skl([(190, 36), (200, 18), (210, 36)]),
    skl([(86, 104), (100, 90), (132, 80), (170, 77), (200, 77), (230, 77), (268, 80), (300, 90), (314, 104)]),
    skl([(112, 346), (150, 360), (200, 365), (250, 360), (288, 346)]),
    osl([(200, 48), (200, 388)]),
    osl([(52, 200), (348, 200)]),
])

def h(y, n):  # règle horizontale depuis la ligne médiane, vers la gauche
    return dict(a=[X0, y + 12], b=[X0 - n * K, y + 12], n=n, pas=0.75 if n < 2 else 1, lab=[0, n], lien=False, cote=-1)

VIEW = {
    'nom': "Crâne vu du dessus (front en haut)", 'vb': '20 0 360 420', 'sym': True, 'axe': X0,
    'svg': svg,
    'reps': {
        'lisiere-av': dict(t="lisière des cheveux|du front", x=232, y=77, tx=300, ty=40),
        'lisiere-ar': dict(t="lisière des cheveux|de la nuque", x=248, y=361, tx=300, ty=402),
        'sommet': dict(t="sommet : ligne qui relie|la pointe des oreilles", x=230, y=200, tx=262, ty=236),
        'occiput': dict(t="bosse de|l'occiput", x=214, y=av(9.5), tx=262, ty=av(9.5) + 30),
    },
    'defaut': ['lisiere-av', 'sommet'],
    'regles': {'ah12': dict(a=[350, AH], b=[350, PH], n=12, lab=[0, 5, 12], cote=-1)},
    'canal': {'E 8': [92, 98], 'VG 16': [X0, round(av(11))], 'VB 20': [148, round(av(11))]},
}

def vg(v, lab='r'): return dict(x=X0, y=round(av(v)), rep=['lisiere-av'] if v < 5 else (['sommet'] if v < 7 else ['occiput']), regle=['ah12'], lab=lab)
def lat(v, n, rep=None, lab='l'):
    return dict(x=round(X0 - n * K), y=round(av(v)), rep=rep or ['lisiere-av'], regle=['ah12', h(av(v), n)], lab=lab)

PTS = {
    'VG 23': vg(1), 'VG 22': vg(2), 'VG 21': vg(3.5), 'VG 19': vg(6.5), 'VG 18': vg(8), 'VG 17': vg(9.5),
    'V 3': lat(0.5, 0.75), 'V 4': lat(0.5, 1.5), 'V 5': lat(1, 1.5), 'V 6': lat(2.5, 1.5), 'V 7': lat(4, 1.5),
    'V 8': lat(5.5, 1.5, ['sommet']), 'V 9': lat(9.5, 1.3, ['occiput']),
    'VB 13': lat(0.5, 3), 'VB 15': lat(0.5, 2.25), 'VB 16': lat(1.5, 2.25), 'VB 17': lat(2.5, 2.25), 'VB 18': lat(4, 2.25),
    'VB 19': lat(9.5, 2.25, ['occiput']),
}
