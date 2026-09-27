# -*- coding: utf-8 -*-
"""Avant-bras droit et dos de la main, vus de derrière : coude en haut, pouce à droite."""
from lib import *
import v_bras_int as B

C = B.C; YP = B.YP
def cun(v): return YP - v * C

ONGLES = ''.join(path('skl', smooth([(x - 5, y + 10), (x - 5, y), (x, y + 6 - 12), (x + 5, y), (x + 5, y + 10), (x, y + 12)], True))
                 for x, y in ((111, 476), (131, 502), (152, 512), (174, 500), (224, 462)))
svg = ''.join([
    B.SKIN, ONGLES, B.BONES,
    # olécrane (pointe du coude) sur le cubitus
    bone([(118, 22), (134, 16), (148, 24), (150, 42), (144, 56), (128, 58), (116, 50), (113, 36)]),
    osl([(120, 44), (132, 48), (146, 44)]),
    # tendons extenseurs du dos de la main
    ''.join(path('tdl', smooth(pts, False)) for pts in (
        [(160, 330), (166, 380), (172, 440)], [(156, 330), (153, 380), (151, 442)], [(152, 332), (140, 380), (132, 440)],
        [(148, 334), (126, 380), (114, 436)], [(184, 330), (196, 372), (206, 414)])),
    path('pli', smooth([(116, 340), (150, 336), (184, 341)], False)),
])

VIEW = {
    'nom': "Avant-bras et dos de la main", 'vb': '-22 -40 316 580', 'sym': False,
    'svg': svg,
    'reps': {
        'pli-coude-ext': dict(t="bout extérieur du pli|du coude (bras plié)", x=201, y=42, tx=228, ty=0),
        'epicondyle': dict(t="épicondyle latéral|(bosse externe)", x=196, y=28, tx=40, ty=34, a='end'),
        'radius': dict(t="radius", x=183, y=160, tx=40, ty=160, a='end'),
        'entre-os': dict(t="entre radius|et cubitus", x=153, y=250, tx=228, ty=230),
        'pli-poignet': dict(t="pli du poignet|(dos de la main)", x=182, y=340, tx=228, ty=300),
        'olecrane': dict(t="olécrane|(pointe du coude)", x=124, y=24, tx=40, ty=0, a='end'),
        'tendons': dict(t="tendons|extenseurs", x=146, y=390, tx=228, ty=400),
    },
    'defaut': ['pli-poignet', 'entre-os'],
    'regles': {'bras12': dict(a=[62, YP], b=[62, cun(12)], n=12, lab=[0, 12], cote=-1),
               'bras12d': dict(a=[236, YP], b=[236, cun(12)], n=12, lab=[0, 12])},
    'canal': {
        'GI 4': [196, 404], 'GI 5': [187, 341], 'GI 6': [189, round(cun(3))], 'GI 7': [191, round(cun(5))], 'GI 8': [194, round(cun(8))],
        'GI 9': [195, round(cun(9))], 'GI 12': [206, 16],
        'TR 3': [125, 412], 'TR 4': [150, 340], 'TR 7': [140, round(cun(3))], 'TR 8': [152, round(cun(4))], 'TR 9': [151, round(cun(7))], 'TR 10': [133, -6],
    },
}

PTS = {
    'GI 11': dict(x=201, y=42, rep=['pli-coude-ext', 'epicondyle'], regle=['bras12d'], lab='l'),
    'GI 10': dict(x=198, y=round(cun(10)), rep=['radius', 'epicondyle'], regle=['bras12d'], lab='l'),
    'TR 5': dict(x=152, y=round(cun(2)), rep=['entre-os', 'pli-poignet'], regle=['bras12'], lab='r'),
    'TR 6': dict(x=153, y=round(cun(3)), rep=['entre-os', 'pli-poignet'], regle=['bras12'], lab='r'),
}
