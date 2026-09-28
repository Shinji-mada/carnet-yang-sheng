#!/usr/bin/env python3
"""Vérifie une traduction anglaise : python3 source/verif_en.py recettes.json [autres fichiers…]
Compare source/contenu/<fichier> (français) et source/contenu/en/<fichier> (anglais) :
- les identifiants et codes (clés protégées) doivent rester identiques ;
- les listes d'objets doivent garder la même longueur (sauf listes de textes) ;
- les références {ingredient} des étapes doivent être les mêmes ;
- signale les textes restés en français et les codes de points français (Rt 6, E 36…) dans les textes anglais."""
import json, os, re, sys
SRC = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SRC)
PROTEGE = {"id", "cat", "cle", "k", "zh", "py", "ab", "p", "m", "u", "axe", "date", "organe", "groupes", "recettes", "fiches",
           "autres", "contre", "tab", "liste", "type", "vue", "svg", "vb", "x", "y", "rep", "regle", "lab", "voisins", "canal",
           "defaut", "regles", "s", "b", "q", "base", "ordre", "portions", "a", "tx", "ty", "sym", "symptomes", "version", "unite", "nature", "saveurs", "tropisme", "genre"}
FR_WORDS = re.compile(r"\b(les|des|du|une|est|pour|avec|dans|sur|pas|qui|aux|tu|ton|ta|tes|très|être|fait|jusqu|puis)\b", re.I)
FR_CODE = re.compile(r"\b(Rt|Rn|VB|VG|RM|MC|TR|IG|GI|E|F|P|C|V) \d{1,2}\b")
REF = re.compile(r"\{([A-Za-z0-9_-]+)\}")
problems = []

def walk(fr, en, path, key=None):
    if en is None:
        return
    if key in PROTEGE and not (isinstance(fr, list) and fr and all(isinstance(x, dict) for x in fr)) and not (key == "regle" and isinstance(fr, str)):
        if fr != en: problems.append(f"{path} : code modifié ({json.dumps(fr, ensure_ascii=False)[:60]} → {json.dumps(en, ensure_ascii=False)[:60]})")
        return
    if isinstance(fr, dict):
        if not isinstance(en, dict): problems.append(f"{path} : objet attendu"); return
        for k, v in fr.items(): walk(v, en.get(k), f"{path}.{k}", k)
        for k in en:
            if k not in fr: problems.append(f"{path}.{k} : clé inconnue en français")
    elif isinstance(fr, list):
        if not isinstance(en, list): problems.append(f"{path} : liste attendue"); return
        if fr and all(isinstance(x, dict) and "id" in x for x in fr):
            m = {x.get("id"): x for x in en if isinstance(x, dict)}
            for x in fr:
                if x["id"] not in m: problems.append(f"{path} : « {x['id']} » non traduit")
                else: walk(x, m[x["id"]], f"{path}[{x['id']}]")
        elif all(isinstance(x, str) for x in fr + en):
            for i, (a, b) in enumerate(zip(fr, en)): walk(a, b, f"{path}[{i}]", key)
        elif len(fr) != len(en): problems.append(f"{path} : {len(en)} éléments au lieu de {len(fr)}")
        else:
            for i, (a, b) in enumerate(zip(fr, en)): walk(a, b, f"{path}[{i}]", key)
    elif isinstance(fr, str):
        if not isinstance(en, str): problems.append(f"{path} : texte attendu"); return
        if sorted(REF.findall(fr)) != sorted(REF.findall(en)): problems.append(f"{path} : références {{…}} différentes")
        if len(fr) > 12 and fr == en and FR_WORDS.search(fr): problems.append(f"{path} : resté en français")
        elif FR_WORDS.search(en) and len(FR_WORDS.findall(en)) >= 3: problems.append(f"{path} : semble encore en français : {en[:70]}")
        if FR_CODE.search(en) and key not in PROTEGE: problems.append(f"{path} : code de point français dans le texte : {FR_CODE.search(en).group(0)}")
    elif fr != en:
        problems.append(f"{path} : valeur changée ({fr} → {en})")

files = sys.argv[1:] or sorted(f for f in os.listdir(f"{SRC}/contenu") if f.endswith(".json"))
for fn in files:
    fn = os.path.basename(fn)
    frp, enp = f"{SRC}/contenu/{fn}", f"{SRC}/contenu/en/{fn}"
    if not os.path.exists(enp): print(f"{fn} : pas encore de traduction"); continue
    try: en = json.load(open(enp, encoding="utf-8"))
    except Exception as e: print(f"{fn} : JSON invalide : {e}"); continue
    walk(json.load(open(frp, encoding="utf-8")), en, fn)
for p in problems[:200]: print(p)
print(f"{len(problems)} problème(s)")
sys.exit(1 if problems else 0)
