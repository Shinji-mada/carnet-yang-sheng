#!/usr/bin/env python3
"""Construit l'appli Carnet Yang Sheng à la racine du dépôt à partir de source/.
Usage : python3 source/build.py [dossier_pour_zip_et_apercu]
Contenu à modifier : source/contenu/*.json (symptômes, points, tableaux, recettes, protocoles)."""
import base64, hashlib, io, json, os, re, shutil, zipfile
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont

import sys, urllib.request
SRC = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.dirname(SRC)
ROOT = os.path.join(os.path.expanduser("~"), ".cache", "yang-sheng-build")
FSRC = f"{ROOT}/fonts-src"
OUT = sys.argv[1] if len(sys.argv) > 1 else None
os.makedirs(FSRC, exist_ok=True)
GF = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
for name, path in [("AtkinsonHyperlegible-Regular.ttf", "atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf"),
                   ("AtkinsonHyperlegible-Bold.ttf", "atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf"),
                   ("NotoSerifSC[wght].ttf", "notoserifsc/NotoSerifSC%5Bwght%5D.ttf"),
                   ("OFL-atkinson.txt", "atkinsonhyperlegible/OFL.txt"),
                   ("OFL-notoserifsc.txt", "notoserifsc/OFL.txt")]:
    if not os.path.exists(f"{FSRC}/{name}"):
        urllib.request.urlretrieve(GF + path, f"{FSRC}/{name}")

# ---------- Contenu : fusion de source/contenu/*.json puis vérification ----------
data = {}
for fn in sorted(os.listdir(f"{SRC}/contenu")):
    if not fn.endswith(".json"):
        continue
    part = json.load(open(f"{SRC}/contenu/{fn}", encoding="utf-8"))
    for k, v in part.items():
        if isinstance(v, list): data.setdefault(k, []).extend(v)
        elif isinstance(v, dict): data.setdefault(k, {}).update(v)
        else: data[k] = v

def check(data):
    errs = []
    sym = {s["id"] for s in data.get("symptomes", [])}
    cats = {c["id"] for c in data.get("categories_symptomes", [])}
    pts = data.get("points", {})
    org = {o["id"] for o in data.get("organes", [])}
    axes = {a["id"] for a in data.get("axes", [])}
    ing = {i["id"] for i in data.get("ingredients", [])}
    fiches = {f["id"]: f for f in data.get("fiches", [])}
    for coll in ("symptomes", "tableaux", "fiches", "ingredients"):
        ids = [x["id"] for x in data.get(coll, [])]
        dup = {i for i in ids if ids.count(i) > 1}
        if dup: errs.append(f"{coll} : identifiants en double {sorted(dup)}")
    for s in data.get("symptomes", []):
        if s.get("cat") not in cats: errs.append(f"symptôme {s['id']} : catégorie inconnue {s.get('cat')}")
    def items_of(x):
        for ph in x.get("phases", []):
            if ph.get("m") not in ("d", "t", "w"): errs.append(f"{x['id']} : phase inconnue {ph.get('m')}")
            for it in ph.get("items", []): yield it
    for t in data.get("tableaux", []):
        if t.get("organe") not in org: errs.append(f"tableau {t['id']} : organe inconnu {t.get('organe')}")
        for key in ("cle", "autres", "contre"):
            for s in t.get(key, []):
                if s not in sym: errs.append(f"tableau {t['id']} : symptôme inconnu {s} ({key})")
        if not t.get("cle"): errs.append(f"tableau {t['id']} : aucun signe clé")
        for it in items_of(t):
            if it.get("p") and it["p"] not in pts: errs.append(f"tableau {t['id']} : point inconnu {it['p']}")
        for r in t.get("recettes", []):
            if r not in fiches: errs.append(f"tableau {t['id']} : recette inconnue {r}")
        for f in t.get("fiches", []):
            if f not in fiches: errs.append(f"tableau {t['id']} : fiche inconnue {f}")
    for f in data.get("fiches", []):
        for s in f.get("symptomes", []):
            if s not in sym: errs.append(f"fiche {f['id']} : symptôme inconnu {s}")
        for it in items_of(f):
            if it.get("p") and it["p"] not in pts: errs.append(f"fiche {f['id']} : point inconnu {it['p']}")
        if f.get("type") == "recette":
            if f.get("axe") not in axes: errs.append(f"recette {f['id']} : axe inconnu {f.get('axe')}")
            ids = {i["id"] for i in f.get("ingredients", [])}
            for i in f.get("ingredients", []):
                if i.get("cle") and i["cle"] not in ing: errs.append(f"recette {f['id']} : ingrédient inconnu {i['cle']}")
            vs = f.get("variantes") or [{"etapes": f.get("etapes", [])}]
            for v in vs:
                for e in v.get("etapes", []):
                    for ref in re.findall(r"\{([A-Za-z0-9_-]+)\}", e.get("texte", "")):
                        if ref not in ids: errs.append(f"recette {f['id']} : {{{ref}}} absent des ingrédients")
    return errs

errors = check(data)
if errors:
    print("Contenu invalide :"); [print("  -", e) for e in errors]; sys.exit(1)
VERSION = data.get("version", "0.0.0")
print(f"contenu : {len(data.get('symptomes', []))} symptômes, {len(data.get('points', {}))} points, "
      f"{len(data.get('tableaux', []))} tableaux, {sum(f['type']=='recette' for f in data.get('fiches', []))} recettes, "
      f"{sum(f['type']=='protocole' for f in data.get('fiches', []))} protocoles")
css = open(f"{SRC}/app.css", encoding="utf-8").read()
js = open(f"{SRC}/app.js", encoding="utf-8").read()
body = open(f"{SRC}/body.html", encoding="utf-8").read()

# ---------- Polices ----------
def walk(o):
    if isinstance(o, str): yield o
    elif isinstance(o, dict):
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)
all_text = "".join(walk(data)) + js + body + "养生"
cjk = sorted({c for c in all_text if 0x2E80 <= ord(c) <= 0x9FFF or 0xF900 <= ord(c) <= 0xFAFF})
latin = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x2013, 0x2014, 0x2019, 0x201C, 0x201D, 0x2026, 0x2032, 0x2212]
os.makedirs(f"{ROOT}/build", exist_ok=True)

def subset_font(src, dst, unicodes, flavor=None):
    f = TTFont(src)
    opts = subset.Options(); opts.flavor = flavor; opts.layout_features = ["*"]; opts.name_IDs = ["*"]; opts.notdef_outline = True
    s = subset.Subsetter(opts); s.populate(unicodes=unicodes); s.subset(f)
    f.flavor = flavor; f.save(dst)

serif_var = f"{ROOT}/build/serif-sub.ttf"
subset_font(f"{FSRC}/NotoSerifSC[wght].ttf", serif_var, latin + [ord(c) for c in cjk])
fonts = {}
for w in (500, 700):
    vf = TTFont(serif_var)
    inst = instancer.instantiateVariableFont(vf, {"wght": w})
    ttf = f"{ROOT}/build/serif-{w}.ttf"; inst.save(ttf)
    woff = f"{ROOT}/build/notoserifsc-{w}.woff2"
    subset_font(ttf, woff, latin + [ord(c) for c in cjk], flavor="woff2")
    fonts[("YS Serif", w)] = woff
for name, w in (("Regular", 400), ("Bold", 700)):
    woff = f"{ROOT}/build/atkinson-{w}.woff2"
    subset_font(f"{FSRC}/AtkinsonHyperlegible-{name}.ttf", woff, list(range(0x20, 0x250)) + list(range(0x2000, 0x2070)) + [0x20AC, 0x2212], flavor="woff2")
    fonts[("YS Sans", w)] = woff

def font_css(inline):
    out = []
    for (fam, w), path in fonts.items():
        src = ("data:font/woff2;base64," + base64.b64encode(open(path, "rb").read()).decode()) if inline else "fonts/" + os.path.basename(path)
        out.append(f'@font-face{{font-family:"{fam}";font-style:normal;font-weight:{w};font-display:swap;src:url("{src}") format("woff2")}}')
    return "\n".join(out) + "\n"

# ---------- Icônes ----------
SEAL, INK = (176, 57, 42, 255), (255, 247, 243, 255)
glyph_font = f"{ROOT}/build/serif-700.ttf"
def icon(size, inset, char, radius=0.0):
    S = size * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=SEAL)
    i, bw = int(S * inset), max(2, int(S * 0.018))
    d.rounded_rectangle([i, i, S - 1 - i, S - 1 - i], radius=int(S * 0.03), outline=INK, width=bw)
    f = ImageFont.truetype(glyph_font, int(S * char))
    gap = S * char * 0.12
    boxes = [d.textbbox((0, 0), c, font=f) for c in "养生"]
    hs = [b[3] - b[1] for b in boxes]
    y = (S - (sum(hs) + gap)) / 2
    for c, b, h in zip("养生", boxes, hs):
        w = b[2] - b[0]
        d.text(((S - w) / 2 - b[0], y - b[1]), c, font=f, fill=INK)
        y += h + gap
    return im.resize((size, size), Image.LANCZOS)

# ---------- dist/ ----------
for d in ("icons", "fonts"):
    shutil.rmtree(f"{DIST}/{d}", ignore_errors=True); os.makedirs(f"{DIST}/{d}")
icon(192, 0.1, 0.3).save(f"{DIST}/icons/icon-192.png")
icon(512, 0.1, 0.3).save(f"{DIST}/icons/icon-512.png")
icon(512, 0.23, 0.2).save(f"{DIST}/icons/icon-maskable-512.png")
icon(192, 0.23, 0.2).save(f"{DIST}/icons/icon-maskable-192.png")
icon(180, 0.1, 0.3).save(f"{DIST}/icons/apple-touch-icon.png")
for p in fonts.values(): shutil.copy(p, f"{DIST}/fonts/")
shutil.copy(f"{FSRC}/OFL-atkinson.txt", f"{DIST}/fonts/OFL-Atkinson-Hyperlegible.txt")
shutil.copy(f"{FSRC}/OFL-notoserifsc.txt", f"{DIST}/fonts/OFL-Noto-Serif-SC.txt")

open(f"{DIST}/app.css", "w", encoding="utf-8").write(font_css(False) + css)
open(f"{DIST}/app.js", "w", encoding="utf-8").write(js)
json.dump(data, open(f"{DIST}/data.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
manifest = {
    "id": "./", "name": "Carnet Yang Sheng", "short_name": "Yang Sheng",
    "description": "Protocoles d'auto-massage et recettes de bien-être inspirés de la médecine traditionnelle chinoise.",
    "lang": "fr", "dir": "ltr", "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#ECF0ED", "theme_color": "#ECF0ED", "categories": ["health", "lifestyle", "food"],
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
        {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
json.dump(manifest, open(f"{DIST}/manifest.webmanifest", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
index = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Carnet Yang Sheng</title>
<meta name="description" content="{manifest['description']}">
<meta name="theme-color" content="#ECF0ED" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1412" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preload" href="fonts/atkinson-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="app.css">
</head>
<body>
{body}
<script src="app.js"></script>
</body>
</html>
"""
open(f"{DIST}/index.html", "w", encoding="utf-8").write(index)

core = ["./", "index.html", "app.css", "app.js", "data.json", "manifest.webmanifest",
        "icons/icon-192.png", "icons/icon-512.png"] + ["fonts/" + os.path.basename(p) for p in fonts.values()]
h = hashlib.sha1()
for rel in core[1:]:
    h.update(open(f"{DIST}/{rel}", "rb").read())
sw = open(f"{SRC}/sw.js", encoding="utf-8").read().replace("__VERSION__", f"ys-{VERSION}-{h.hexdigest()[:8]}").replace("__CORE__", json.dumps(core))
open(f"{DIST}/sw.js", "w", encoding="utf-8").write(sw)

# ---------- site servi : fichiers publiés ----------
SITE = ["index.html", "app.css", "app.js", "data.json", "manifest.webmanifest", "sw.js", ".nojekyll"]
open(f"{DIST}/.nojekyll", "w").close()
published = SITE + [f"{d}/{f}" for d in ("icons", "fonts") for f in sorted(os.listdir(f"{DIST}/{d}"))]

# ---------- zip et aperçu, seulement si un dossier de sortie est donné ----------
if OUT:
    os.makedirs(OUT, exist_ok=True)
    zpath = f"{OUT}/carnet-yang-sheng-v{VERSION}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in published:
            z.write(f"{DIST}/{rel}", rel)
    safe_json = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    preview = ("<title>Appli Yang Sheng</title>\n<style>\n" + font_css(True) + css + "\n</style>\n" + body
               + "\n<script>window.YS_DATA=" + safe_json + ";</script>\n<script>\n" + js + "\n</script>\n")
    open(f"{OUT}/apercu.html", "w", encoding="utf-8").write(preview)
    print("zip", os.path.getsize(zpath), "| aperçu", os.path.getsize(f"{OUT}/apercu.html"))

print("version", VERSION, "| hanzi", "".join(cjk))
for rel in published: print(f"  {rel:42s} {os.path.getsize(f'{DIST}/{rel}'):>8,d}")
