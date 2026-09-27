# -*- coding: utf-8 -*-
"""Outils de dessin des planches : courbes lissées (Catmull-Rom), os, peau, repères."""
import math

def _f(v): return f"{v:.1f}".rstrip('0').rstrip('.')

def smooth(pts, closed=True, k=1.0):
    """Chemin lissé passant par les points. Un point (x, y, 'c') est un angle vif."""
    P = [(p[0], p[1], len(p) > 2 and p[2] == 'c') for p in pts]
    n = len(P)
    if n < 2: return ''
    d = f"M{_f(P[0][0])},{_f(P[0][1])}"
    rng = range(n if closed else n - 1)
    for i in rng:
        p0 = P[(i - 1) % n] if (closed or i > 0) else P[i]
        p1 = P[i]; p2 = P[(i + 1) % n]
        p3 = P[(i + 2) % n] if (closed or i + 2 < n) else p2
        if p1[2]: c1 = (p1[0], p1[1])
        else: c1 = (p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k)
        if p2[2]: c2 = (p2[0], p2[1])
        else: c2 = (p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k)
        d += f"C{_f(c1[0])},{_f(c1[1])} {_f(c2[0])},{_f(c2[1])} {_f(p2[0])},{_f(p2[1])}"
    return d + ('Z' if closed else '')

def path(cls, d): return f'<path class="{cls}" d="{d}"/>'
def skin(pts, closed=True): return path('sk', smooth(pts, closed))
def skl(pts, closed=False): return path('skl', smooth(pts, closed))
def bone(pts): return path('os', smooth(pts, True))
def bonec(pts): return path('osc', smooth(pts, True))
def osl(pts, closed=False): return path('osl', smooth(pts, closed))
def tendon(pts): return path('td', smooth(pts, True))
def ellipse(cls, cx, cy, rx, ry, rot=0):
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ''
    return f'<ellipse class="{cls}" cx="{_f(cx)}" cy="{_f(cy)}" rx="{_f(rx)}" ry="{_f(ry)}"{t}/>'
def text(cls, x, y, t, anchor='middle'): return f'<text class="{cls}" x="{_f(x)}" y="{_f(y)}" text-anchor="{anchor}">{t}</text>'

def capsule(x1, y1, x2, y2, w1, w2=None, bulge=0.0):
    """Os long (phalange, métacarpien) entre deux extrémités, largeur w1 -> w2, têtes arrondies."""
    w2 = w1 if w2 is None else w2
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; nx, ny = -uy, ux
    a, b = w1 / 2, w2 / 2
    m = 0.5
    pts = [
        (x1 + nx * a, y1 + ny * a), (x1 + dx * .25 + nx * (a * .78), y1 + dy * .25 + ny * (a * .78)),
        (x1 + dx * .5 + nx * (min(a, b) * .72 + bulge), y1 + dy * .5 + ny * (min(a, b) * .72 + bulge)),
        (x1 + dx * .78 + nx * (b * .8), y1 + dy * .78 + ny * (b * .8)), (x2 + nx * b, y2 + ny * b),
        (x2 + ux * b * 0.9, y2 + uy * b * 0.9),
        (x2 - nx * b, y2 - ny * b), (x1 + dx * .78 - nx * (b * .8), y1 + dy * .78 - ny * (b * .8)),
        (x1 + dx * .5 - nx * (min(a, b) * .72), y1 + dy * .5 - ny * (min(a, b) * .72)),
        (x1 + dx * .25 - nx * (a * .78), y1 + dy * .25 - ny * (a * .78)), (x1 - nx * a, y1 - ny * a),
        (x1 - ux * a * 0.7, y1 - uy * a * 0.7),
    ]
    return bone(pts)

def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

def band_pts(center, w0, w1=None):
    """Contour d'une bande (côte, clavicule) autour d'une ligne médiane, largeur w0 -> w1."""
    w1 = w0 if w1 is None else w1
    n = len(center); left, right = [], []
    for i, (x, y) in enumerate(center):
        a = center[max(i - 1, 0)]; b = center[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L; w = (w0 + (w1 - w0) * i / (n - 1)) / 2
        left.append((x + nx * w, y + ny * w)); right.append((x - nx * w, y - ny * w))
    return left + right[::-1]

def band(center, w0, w1=None, cls='os'):
    return path(cls, smooth(band_pts(center, w0, w1), True))

def mirror(pts, ax): return [(2 * ax - p[0], p[1]) + tuple(p[2:]) for p in pts]
