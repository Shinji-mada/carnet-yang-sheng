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
# La version anglaise superpose source/contenu/en/<même fichier>.json : même structure, textes traduits.
# Tout ce qui manque en anglais reste en français. Les identifiants et codes ne sont jamais pris dans l'anglais.
PROTEGE = {"id", "cat", "cle", "k", "zh", "py", "ab", "p", "m", "u", "axe", "date", "organe", "groupes", "recettes", "fiches",
           "autres", "contre", "tab", "liste", "type", "vue", "svg", "vb", "x", "y", "rep", "regle", "lab", "voisins", "canal",
           "defaut", "regles", "s", "b", "q", "base", "ordre", "portions", "a", "tx", "ty", "sym", "axe", "symptomes", "version", "unite", "nature", "saveurs", "tropisme", "genre"}
def overlay(fr, en, key=None):
    if en is None: return fr
    if key in PROTEGE and not (isinstance(fr, list) and fr and all(isinstance(x, dict) for x in fr)) and not (key == "regle" and isinstance(fr, str)): return fr
    if isinstance(fr, dict) and isinstance(en, dict):
        return {k: overlay(v, en.get(k), k) for k, v in fr.items()}
    if isinstance(fr, list) and isinstance(en, list):
        if fr and all(isinstance(x, dict) and "id" in x for x in fr):
            m = {x["id"]: x for x in en if isinstance(x, dict) and "id" in x}
            return [overlay(x, m.get(x["id"])) for x in fr]
        if len(fr) == len(en): return [overlay(a, b, key) for a, b in zip(fr, en)]
        if all(isinstance(x, str) for x in fr + en): return en
        return fr
    if isinstance(fr, str) and isinstance(en, str) and en.strip(): return en
    return fr
def count_items(part):
    n = 0
    for v in part.values():
        if isinstance(v, list): n += sum(1 for x in v if isinstance(x, dict) and "id" in x)
        elif isinstance(v, dict): n += len(v)
    return n
data, data_en, en_manque = {}, {}, []
for fn in sorted(os.listdir(f"{SRC}/contenu")):
    if not fn.endswith(".json"):
        continue
    part = json.load(open(f"{SRC}/contenu/{fn}", encoding="utf-8"))
    enp = f"{SRC}/contenu/en/{fn}"
    en = json.load(open(enp, encoding="utf-8")) if os.path.exists(enp) else None
    part_en = overlay(part, en) if en else part
    if en is None: en_manque.append(fn)
    else:
        for k, v in part.items():
            if isinstance(v, list) and v and all(isinstance(x, dict) and "id" in x for x in v):
                have = {x.get("id") for x in (en.get(k) or []) if isinstance(x, dict)}
                miss = [x["id"] for x in v if x["id"] not in have]
                if miss: en_manque.append(f"{fn}:{k} ({len(miss)} : {', '.join(miss[:5])}{'…' if len(miss) > 5 else ''})")
    for d, pp in ((data, part), (data_en, part_en)):
        for k, v in pp.items():
            if isinstance(v, list): d.setdefault(k, []).extend(v)
            elif isinstance(v, dict): d.setdefault(k, {}).update(v)
            else: d[k] = v
data_en["lang"] = "en"
# Textes de l'interface en anglais (clé = texte français tel qu'écrit dans app.js)
ui_path = f"{SRC}/i18n/en.json"
data_en["ui"] = json.load(open(ui_path, encoding="utf-8")) if os.path.exists(ui_path) else {}

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
    tids = {t["id"] for t in data.get("tableaux", [])}
    for c in data.get("categories_symptomes", []):
        for x in c.get("liste", []) + [x for g in c.get("sous", []) for x in g.get("liste", [])]:
            if x not in sym: errs.append(f"rubrique {c['id']} : symptôme inconnu {x}")
        if c.get("guide") and not any(s.get("info") and s["id"] in c.get("liste", []) + [x for g in c.get("sous", []) for x in g.get("liste", [])] for s in data.get("symptomes", [])):
            errs.append(f"rubrique {c['id']} : guide sans aucune fiche « info »")
    for s in data.get("symptomes", []):
        for t in s.get("tab", []):
            if t not in tids: errs.append(f"diagnostic {s['id']} : tableau inconnu {t}")
        if s.get("tab") and not s.get("info"): errs.append(f"diagnostic {s['id']} : texte « info » manquant")
    def items_of(x):
        for ph in x.get("phases", []):
            if ph.get("m") not in ("d", "t", "w"): errs.append(f"{x['id']} : phase inconnue {ph.get('m')}")
            for it in ph.get("items", []): yield it
    for t in data.get("tableaux", []):
        if t.get("organe") not in org: errs.append(f"tableau {t['id']} : organe inconnu {t.get('organe')}")
        for g in t.get("groupes", []):
            if g not in org: errs.append(f"tableau {t['id']} : groupe inconnu {g}")
        for key in ("cle", "autres", "contre"):
            for s in t.get(key, []):
                if s not in sym: errs.append(f"tableau {t['id']} : symptôme inconnu {s} ({key})")
        if not t.get("cle"): errs.append(f"tableau {t['id']} : aucun signe clé")
        if not t.get("simple") or not t.get("reperes"): errs.append(f"tableau {t['id']} : explication « en clair » ou repères manquants")
        for it in items_of(t):
            if it.get("p") and it["p"] not in pts: errs.append(f"tableau {t['id']} : point inconnu {it['p']}")
            elif it.get("p") and it["p"] != "Ah Shi" and pts[it["p"]].get("vue") not in data.get("figures", {}): errs.append(f"point {it['p']} : image d'emplacement manquante")
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
    # Couverture : chaque symptôme mène à un tableau, chaque tableau à des recettes, chaque recette à un tableau
    tabs = data.get("tableaux", [])
    nlien = {s: 0 for s in sym}
    for t in tabs:
        for s in set(t.get("cle", []) + t.get("autres", [])): nlien[s] = nlien.get(s, 0) + 1
    for s in data.get("symptomes", []): nlien[s["id"]] += len(set(s.get("tab", [])))
    for s in sorted(sym):
        if nlien[s] < 3: errs.append(f"symptôme {s} : relié à {nlien[s]} tableau(x), il en faut au moins 3")
    for t in tabs:
        if len(t.get("recettes", [])) < 2: errs.append(f"tableau {t['id']} : moins de 2 recettes")
    linked = {r for t in tabs for r in t.get("recettes", [])}
    for f in data.get("fiches", []):
        if f.get("type") == "recette" and f["id"] not in linked: errs.append(f"recette {f['id']} : reliée à aucun tableau")
    return errs

errors = check(data)
if errors:
    print("Contenu invalide :"); [print("  -", e) for e in errors]; sys.exit(1)
VERSION = data.get("version", "0.0.0")
print(f"contenu : {len(data.get('symptomes', []))} symptômes, {len(data.get('points', {}))} points, "
      f"{len(data.get('tableaux', []))} tableaux, {sum(f['type']=='recette' for f in data.get('fiches', []))} recettes, "
      f"{sum(f['type']=='protocole' for f in data.get('fiches', []))} protocoles")
css = open(f"{SRC}/app.css", encoding="utf-8").read()
# Taille du texte réglable : chaque font-size en px est multiplié par --fs (sauf planches, sceau et animation d'ouverture)
def scale_fonts(block):
    sel, decl = block.group(1), block.group(2)
    if re.search(r"\.fig-svg|\.fig-lab|\.seal|\.intro|@font-face", sel): return block.group(0)
    return sel + "{" + re.sub(r"font-size:(\d+(?:\.\d+)?)px", r"font-size:calc(\1px*var(--fs,1))", decl) + "}"
css = re.sub(r"([^{}]*)\{([^{}]*)\}", scale_fonts, css)
js = open(f"{SRC}/app.js", encoding="utf-8").read()
body = open(f"{SRC}/body.html", encoding="utf-8").read()

# ---------- Polices ----------
def walk(o):
    if isinstance(o, str): yield o
    elif isinstance(o, dict):
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)
all_text = "".join(walk(data)) + "".join(walk(data_en)) + js + body + "养生"
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
# Module de compte (Firebase), chargé seulement quand on se connecte
def sha(path): return hashlib.sha1(open(path, "rb").read()).hexdigest()[:8]
shutil.copy(f"{SRC}/vendor/compte.js", f"{DIST}/compte.js")
COMPTE_URL = f"./compte.js?v={sha(f'{DIST}/compte.js')}"
fb_path = f"{SRC}/firebase.json"
FB = json.load(open(fb_path, encoding="utf-8")) if os.path.exists(fb_path) else None
js = js.replace("__FIREBASE__", json.dumps(FB, ensure_ascii=False) if FB else "null").replace("__COMPTE_URL__", COMPTE_URL)
open(f"{DIST}/app.js", "w", encoding="utf-8").write(js)
json.dump(data, open(f"{DIST}/data.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(data_en, open(f"{DIST}/data-en.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
if en_manque: print("anglais manquant (reste en français) :", "; ".join(en_manque))
# Empreintes pour forcer le rechargement des fichiers modifiés après une mise à jour
def fp(rel): return hashlib.sha1(open(f"{DIST}/{rel}", "rb").read()).hexdigest()[:8]
CSS_URL, JS_URL = f"app.css?v={fp('app.css')}", f"app.js?v={fp('app.js')}"
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
<script>try{{var p=JSON.parse(localStorage.getItem('ys.reglages')||'{{}}')||{{}},r=document.documentElement;if(p.theme==='dark'||p.theme==='light')r.dataset.theme=p.theme;if(p.fs==='l'||p.fs==='xl')r.dataset.fs=p.fs;if(p.intro===false)r.classList.add('no-intro');if(localStorage.getItem('ys.langue')==='en')r.lang='en';}}catch(e){{}}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Carnet Yang Sheng</title>
<meta name="description" content="{manifest['description']}">
<meta name="theme-color" content="#ECF0ED" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1412" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preload" href="fonts/atkinson-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{CSS_URL}">
</head>
<body>
{body}
<script src="{JS_URL}"></script>
</body>
</html>
"""
open(f"{DIST}/index.html", "w", encoding="utf-8").write(index)

core = ["./", "index.html", CSS_URL, JS_URL, "data.json", "manifest.webmanifest",
        "icons/icon-192.png", "icons/icon-512.png"] + ["fonts/" + os.path.basename(p) for p in fonts.values()]
h = hashlib.sha1()
for rel in core[1:]:
    h.update(open(f"{DIST}/{rel.split('?')[0]}", "rb").read())
sw = open(f"{SRC}/sw.js", encoding="utf-8").read().replace("__VERSION__", f"ys-{VERSION}-{h.hexdigest()[:8]}").replace("__CORE__", json.dumps(core))
open(f"{DIST}/sw.js", "w", encoding="utf-8").write(sw)

# ---------- site servi : fichiers publiés ----------
SITE = ["index.html", "app.css", "app.js", "compte.js", "data.json", "data-en.json", "manifest.webmanifest", "sw.js", ".nojekyll"]
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

print("version", VERSION, "| comptes", "activés" if FB else "non configurés (source/firebase.json absent)", "| hanzi", "".join(cjk))
for rel in published: print(f"  {rel:42s} {os.path.getsize(f'{DIST}/{rel}'):>8,d}")
