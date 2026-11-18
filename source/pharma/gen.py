# -*- coding: utf-8 -*-
"""Pharmacopée et formules : lit source/pharma/*.txt et écrit contenu/formules.json, contenu/plantes.json et leurs
versions anglaises (contenu/en/). Usage : python3 source/pharma/gen.py [--liste]"""
import glob, json, os, re, sys, unicodedata
D = os.path.dirname(os.path.abspath(__file__))
C = os.path.join(os.path.dirname(D), 'contenu')

def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def bi(v):
    fr, _, en = v.partition(' || ')
    return fr.strip(), en.strip()

def blocks(pattern):
    out = []
    for f in sorted(glob.glob(os.path.join(D, pattern))):
        cur = None
        for raw in open(f, encoding='utf-8'):
            line = raw.rstrip('\n')
            if not line.strip() or line.startswith('#'): continue
            if line.startswith('@'):
                cur = {'_h': [x.strip() for x in line[1:].split('|')], '_f': os.path.basename(f)}
                out.append(cur)
            else:
                k, _, v = line.partition(' ')
                assert cur is not None and k in 'nacitxos' and len(k) == 1, (f, line)
                cur[k] = v.strip()
    return out

# Catégories des formules (classement des manuels de 方剂学)
CATF = [('surface', '解表', 'Libèrent la surface', 'Release the exterior'),
        ('chaleur', '清热', 'Clarifient la Chaleur', 'Clear Heat'),
        ('purger', '泻下', 'Purgent, humidifient les intestins', 'Purge, moisten the intestines'),
        ('harmoniser', '和解', 'Harmonisent', 'Harmonize'),
        ('rechauffer', '温里', "Réchauffent l'intérieur", 'Warm the interior'),
        ('qi-tonif', '补气', 'Tonifient le Qi', 'Tonify Qi'),
        ('sang-tonif', '补血', 'Nourrissent le Sang, le Qi et le Sang', 'Nourish Blood, Qi and Blood'),
        ('yin', '补阴', 'Nourrissent le Yin', 'Nourish Yin'),
        ('yang', '补阳', 'Tonifient le Yang', 'Tonify Yang'),
        ('astringent', '固涩', 'Retiennent (sueurs, urines, pertes)', 'Stabilize and bind'),
        ('calmer', '安神', 'Calment le Shen', 'Calm the Shen'),
        ('qi', '理气', 'Font circuler le Qi', 'Regulate Qi'),
        ('sang', '理血', 'Activent le Sang, arrêtent les saignements', 'Regulate Blood'),
        ('vent', '治风', 'Chassent ou apaisent le Vent', 'Treat Wind'),
        ('secheresse', '治燥', 'Humidifient la sécheresse', 'Treat dryness'),
        ('humidite', '祛湿', "Drainent l'Humidité", 'Expel Dampness'),
        ('mucosites', '祛痰', 'Transforment les Mucosités', 'Transform Phlegm'),
        ('digestion', '消食', 'Font digérer', 'Reduce food stagnation')]
# Catégories des plantes (classement des manuels de 中药学)
CATP = [('surface-chaude', '辛温解表', 'Libèrent la surface, tièdes', 'Warm, exterior-releasing'),
        ('surface-fraiche', '辛凉解表', 'Libèrent la surface, fraîches', 'Cool, exterior-releasing'),
        ('chaleur', '清热', 'Clarifient la Chaleur', 'Clear Heat'),
        ('purgatives', '泻下', 'Purgatives et laxatives', 'Downward-draining'),
        ('vent-humidite', '祛风湿', 'Chassent le Vent-Humidité', 'Expel Wind-Damp'),
        ('aromatiques', '化湿', "Aromatiques qui transforment l'Humidité", 'Aromatic, transform Dampness'),
        ('diuretiques', '利水渗湿', "Drainent l'Eau et l'Humidité", 'Drain Water and Dampness'),
        ('rechauffent', '温里', "Réchauffent l'intérieur", 'Warm the interior'),
        ('qi', '理气', 'Font circuler le Qi', 'Regulate Qi'),
        ('digestives', '消食', 'Font digérer', 'Reduce food stagnation'),
        ('hemostatiques', '止血', 'Arrêtent les saignements', 'Stop bleeding'),
        ('sang', '活血化瘀', 'Activent le Sang', 'Invigorate Blood'),
        ('mucosites', '化痰止咳平喘', 'Transforment les Mucosités, calment la toux', 'Transform Phlegm, stop cough'),
        ('shen', '安神', 'Calment le Shen', 'Calm the Shen'),
        ('vent-interne', '平肝息风', 'Apaisent le Foie, éteignent le Vent', 'Calm the Liver, extinguish Wind'),
        ('orifices', '开窍', 'Ouvrent les orifices', 'Open the orifices'),
        ('tonif-qi', '补气', 'Tonifient le Qi', 'Tonify Qi'),
        ('tonif-yang', '补阳', 'Tonifient le Yang', 'Tonify Yang'),
        ('tonif-sang', '补血', 'Nourrissent le Sang', 'Nourish Blood'),
        ('tonif-yin', '补阴', 'Nourrissent le Yin', 'Nourish Yin'),
        ('astringentes', '收涩', 'Astringentes', 'Astringent'),
        ('externes', '外用', 'Usage externe, toxiques', 'External use, toxic')]
NAT = {'froide', 'fraiche', 'neutre', 'tiede', 'chaude'}
SAV = {'douce', 'acide', 'amere', 'piquante', 'salee', 'astringente', 'insipide'}
MER = {'P', 'GI', 'E', 'Rt', 'C', 'IG', 'V', 'Rn', 'MC', 'TR', 'VB', 'F'}
LABS = {'cal': 'Calebasse', 'pv': 'Planeta Verd', 'jz': 'Laboratoires JZ'}
# Formules classiques aussi vendues par JZ (catalogue laboratoires-jz.fr)
JZ = ['gui-zhi-tang', 'yu-ping-feng-san', 'xiao-chai-hu-tang', 'xiao-yao-san', 'bu-zhong-yi-qi-tang', 'ba-zhen-tang',
      'si-wu-tang', 'si-jun-zi-tang', 'liu-wei-di-huang-wan', 'ming-mu-di-huang-wan', 'sheng-mai-yin', 'tian-wang-bu-xin-dan',
      'wen-jing-tang', 'mai-men-dong-tang', 'gui-pi-tang']
# Noms écrits autrement dans les compositions → plante de la pharmacopée
ALIAS = {'Ju Pi': 'Chen Pi', 'Ci Ji Li': 'Bai Ji Li', 'Duan Mu Li': 'Mu Li', 'Dang Gui Wei': 'Dang Gui', 'Huai Niu Xi': 'Niu Xi',
         'Jing Jie Sui': 'Jing Jie', 'Gui Ban Jiao': 'Gui Ban', 'Fu Ling Pi': 'Fu Ling', 'Sheng Jiang Pi': 'Sheng Jiang',
         'Chi Fu Ling': 'Fu Ling', 'Che Qian Cao': 'Che Qian Zi', 'Yin Chen Hao': 'Yin Chen', 'Zhi Gan Cao': 'Gan Cao',
         'Zhi Fu Zi': 'Fu Zi', 'Hai Dai': 'Kun Bu'}
# Plantes hors pharmacopée chinoise (formules maison) : affichées sans fiche
EXT = {'Gentiane jaune': 'Yellow gentian', 'Chardon-Marie': 'Milk thistle', 'Grande camomille': 'Feverfew',
       'Menthe poivrée': 'Peppermint', 'Graines de lin': 'Flaxseed', 'Hong Cha': 'Black tea',
       'Racine de bardane': 'Burdock root', 'Ku Gua': 'Bitter melon', 'Bing Tang': 'Rock sugar', 'Ji Zi Huang': 'Egg yolk'}

def parse_compo(s):
    out = []
    for part in s.split(';'):
        name, _, dose = part.partition(':')
        name, dose = name.strip(), dose.strip()
        assert name and dose, part
        out.append([name, dose])
    return out

def formules():
    F, E, err = [], [], []
    for b in blocks('formules-*.txt'):
        h = b['_h']
        if len(h) < 5: err.append(f"en-tête incomplet : {h}"); continue
        fid, py, zh, cat, labs = h[0], h[1], h[2], h[3], [x.strip() for x in h[4].split(',') if x.strip()]
        if fid in JZ and 'jz' not in labs: labs.append('jz')
        for k in 'nacitx':
            if k not in b: err.append(f"{fid} : ligne {k} manquante")
        if err and err[-1].startswith(fid): continue
        nf, ne = bi(b['n']); af, ae = bi(b['a']); i_f, i_e = bi(b['i']); xf, xe = bi(b['x'])
        if not (ne and ae and i_e and xe): err.append(f"{fid} : anglais manquant")
        if cat not in [c[0] for c in CATF]: err.append(f"{fid} : catégorie {cat}")
        for l in labs:
            if l not in LABS: err.append(f"{fid} : labo {l}")
        fr = {'id': fid, 'py': py, 'zh': zh if zh != '—' else '', 'nom': nf, 'cat': cat, 'labs': labs, 'compo': parse_compo(b['c']),
              'act': af, 'ind': i_f, 'tab': [t.strip() for t in b['t'].split(',') if t.strip()], 'ci': xf}
        en = {'id': fid, 'nom': ne, 'act': ae, 'ind': i_e, 'ci': xe}
        if 'o' in b:
            of, oe = bi(b['o']); fr['note'] = of; en['note'] = oe
        if 's' in b: fr['sym'] = [s.strip() for s in b['s'].split(',') if s.strip()]
        F.append(fr); E.append(en)
    ids = [f['id'] for f in F]
    for i in set(ids):
        if ids.count(i) > 1: err.append(f"formule en double : {i}")
    return F, E, err

def plantes():
    P, E, err = [], [], []
    for b in blocks('plantes-*.txt'):
        h = b['_h']
        if len(h) < 8: err.append(f"en-tête incomplet : {h}"); continue
        py, zh, lat, cat, nat, sav, mer, dose = h[:8]
        pid = slug(py)
        for k in 'naix':
            if k not in b: err.append(f"{py} : ligne {k} manquante")
        if any(e.startswith(py + ' :') for e in err): continue
        nf, ne = bi(b['n']); af, ae = bi(b['a']); i_f, i_e = bi(b['i']); xf, xe = bi(b['x'])
        if not (ne and ae and i_e and xe): err.append(f"{py} : anglais manquant")
        if cat not in [c[0] for c in CATP]: err.append(f"{py} : catégorie {cat}")
        if nat not in NAT: err.append(f"{py} : nature {nat}")
        sv = [x.strip() for x in sav.split(',')]; mr = [x.strip() for x in mer.split(',')]
        for x in sv:
            if x not in SAV: err.append(f"{py} : saveur {x}")
        for x in mr:
            if x not in MER: err.append(f"{py} : méridien {x}")
        fr = {'id': pid, 'py': py, 'zh': zh, 'lat': lat, 'nom': nf, 'cat': cat, 'nature': nat, 'saveurs': sv, 'mer': mr,
              'dose': dose, 'act': af, 'ind': i_f, 'ci': xf}
        en = {'id': pid, 'nom': ne, 'act': ae, 'ind': i_e, 'ci': xe, 'dose': dose.replace(',', '.').replace('(préparé)', '(processed)').replace('(poudre)', '(powder)').replace('pièces', 'pieces')}
        if 'o' in b:
            of, oe = bi(b['o']); fr['note'] = of; en['note'] = oe
        P.append(fr); E.append(en)
    return P, E, err

F, FE, err = formules()
P, PE, err2 = plantes()
err += err2
pyset = {p['py']: p['id'] for p in P}
manque = {}
for f in F:
    for c in f['compo']:
        n = ALIAS.get(c[0], c[0])
        if n in EXT: c.append('')
        elif n in pyset: c.append(pyset[n])
        else: manque.setdefault(n, []).append(f['id']); c.append('')
if '--liste' in sys.argv:
    print('\n'.join(sorted(manque))); sys.exit()
if manque: err.append(f"{len(manque)} plantes sans fiche : " + ', '.join(sorted(manque)))
# tableaux connus
T = {t['id'] for f in glob.glob(os.path.join(C, 'tableaux-*.json')) for t in json.load(open(f))['tableaux']}
for f in F:
    for t in f['tab']:
        if t not in T: err.append(f"{f['id']} : tableau inconnu {t}")
sans = sorted(T - {t for f in F for t in f['tab']})
if sans: err.append('tableaux sans formule : ' + ', '.join(sans))
if err:
    print('\n'.join(err)); sys.exit(1)
# Formule de premier choix (manuels) pour chaque tableau, puis les autres : rang dans la liste « t », labo disponible, nom
PRINCIPAL = {'bi-chaleur': 'si-miao-san bai-hu-jia-gui-zhi-tang', 'bi-froid': 'du-huo-ji-sheng-tang juan-bi-tang',
    'bi-humidite': 'yi-yi-ren-tang fang-ji-huang-qi-tang', 'bi-vent': 'juan-bi-tang jing-fang-bai-du-san',
    'c-feu': 'dao-chi-san huang-lian-jie-du-tang', 'c-vide-qi': 'sheng-mai-yin zhi-gan-cao-tang',
    'c-vide-sang': 'gui-pi-tang suan-zao-ren-tang', 'c-vide-yin': 'tian-wang-bu-xin-dan bai-zi-yang-xin-wan',
    'coeur-rate': 'gui-pi-tang yang-rong-wan', 'coeur-rein': 'huang-lian-e-jiao-tang tian-wang-bu-xin-dan',
    'e-feu': 'qing-wei-san xie-huang-san', 'e-froid': 'wu-zhu-yu-tang tiao-wei-dan', 'e-rebellion': 'xuan-fu-dai-zhe-tang ban-xia-xie-xin-tang',
    'e-stagnation-alimentaire': 'bao-he-wan', 'e-vide-froid': 'huang-qi-jian-zhong-tang li-zhong-wan', 'e-vide-qi': 'si-jun-zi-tang xiang-sha-liu-jun-zi',
    'e-vide-yin': 'yi-wei-tang sha-shen-mai-dong-tang', 'f-feu': 'long-dan-xie-gan-tang jia-wei-xiao-yao-san',
    'f-froid-meridien': 'nuan-gan-jian dang-gui-si-ni-tang', 'f-humidite-bas': 'long-dan-xie-gan-tang si-miao-san',
    'f-humidite-chaleur': 'long-dan-xie-gan-tang yin-chen-hao-tang', 'f-stagnation-qi': 'xiao-yao-san chai-hu-shu-gan-san',
    'f-vide-sang': 'si-wu-tang bu-gan-tang', 'f-vide-yin': 'yi-guan-jian qi-ju-di-huang-wan', 'f-yang': 'tian-ma-gou-teng-yin zhen-gan-xi-feng-tang',
    'femme-chaleur-sang': 'jia-wei-xiao-yao-san', 'foie-estomac': 'chai-hu-shu-gan-san zuo-jin-wan', 'foie-rate': 'tong-xie-yao-fang xiao-yao-san',
    'foie-rein-yin': 'qi-ju-di-huang-wan liu-wei-di-huang-wan', 'froid-uterus': 'shao-fu-zhu-yu-tang wen-jing-tang',
    'gi-constipation-vide': 'bu-zhong-yi-qi-tang ji-chuan-jian', 'gi-froid': 'li-zhong-wan huo-xiang-zheng-qi-san',
    'gi-humidite-chaleur': 'ge-gen-qin-lian-tang bai-tou-weng-tang', 'gi-secheresse': 'ma-zi-ren-wan run-chang-wan',
    'mei-he-qi': 'ban-xia-hou-po-tang', 'mucosites-feu-ganglions': 'xiao-luo-wan hai-zao-yu-hu-tang',
    'p-mucosites-chaleur': 'qing-qi-hua-tan-wan', 'p-mucosites-humidite': 'er-chen-tang er-chen-san-zi',
    'p-secheresse': 'qing-zao-jiu-fei-tang sha-shen-mai-dong-tang', 'p-stagnation-qi': 'ban-xia-hou-po-tang',
    'p-vent-chaleur': 'yin-qiao-san sang-ju-yin', 'p-vent-eau': 'yue-bi-jia-zhu-tang wu-pi-yin', 'p-vent-froid': 'jing-fang-bai-du-san gui-zhi-tang', 'p-vide-qi': 'bu-fei-tang yu-ping-feng-san',
    'p-vide-yang': 'bu-fei-tang ling-gui-zhu-gan-tang', 'p-vide-yin': 'bai-he-gu-jin-wan mai-wei-di-huang-wan',
    'peau-chaleur-sang': 'pi-pa-qing-fei-yin wu-wei-xiao-du-yin', 'peau-humidite-chaleur': 'bi-xie-shen-shi-tang xiao-feng-san',
    'peau-vent-chaleur': 'xiao-feng-san yin-qiao-san', 'peau-vide-sang': 'dang-gui-yin-zi', 'poumon-rate-qi': 'shen-ling-bai-zhu-san liu-jun-zi-tang',
    'qi-sang': 'ba-zhen-tang shi-quan-da-bu-tang', 'qi-yin': 'sheng-mai-yin', 'rate-rein-yang': 'zhen-wu-tang si-shen-wan',
    'rn-jing': 'zuo-gui-wan wu-zi-yan-zong-wan', 'rn-peur': 'an-shen-ding-zhi-wan chai-hu-long-gu-mu-li',
    'rn-qi-non-ferme': 'jin-suo-gu-jing-wan suo-quan-wan', 'rn-recevoir-qi': 'mai-wei-di-huang-wan su-zi-jiang-qi-tang',
    'rn-vide-yang': 'jin-gui-shen-qi-wan you-gui-wan', 'rn-vide-yin': 'liu-wei-di-huang-wan zuo-gui-wan', 'rn-yin-yang': 'er-xian-tang',
    'rt-effondrement': 'bu-zhong-yi-qi-tang', 'rt-froid-humidite': 'ping-wei-san huo-xiang-zheng-qi-san', 'rt-humidite-chaleur': 'san-ren-tang ban-xia-xie-xin-tang',
    'rt-sang': 'gui-pi-tang', 'rt-vide-qi': 'si-jun-zi-tang shen-ling-bai-zhu-san', 'rt-vide-yang': 'li-zhong-wan xiao-jian-zhong-tang',
    'stase-sang': 'xue-fu-zhu-yu-tang tao-hong-si-wu-tang', 'v-humidite-chaleur': 'ba-zheng-san', 'v-vide-froid': 'suo-quan-wan jin-gui-shen-qi-wan',
    'vb-mucosites': 'wen-dan-tang', 'vb-vide': 'an-shen-ding-zhi-wan'}
FID = {f['id']: f for f in F}
FT = {}
for f in F:
    for i, t in enumerate(f['tab']): FT.setdefault(t, []).append((i, 0 if f['labs'] else 1, f['py'].lower(), f['id']))
for t, L in FT.items():
    first = PRINCIPAL.get(t, '').split()
    for x in first:
        if x not in FID or t not in FID[x]['tab']: err.append(f"principal {t} : {x} absent ou sans ce tableau")
    FT[t] = first + [x[3] for x in sorted(L) if x[3] not in first]
if err:
    print('\n'.join(err)); sys.exit(1)
F.sort(key=lambda f: f['py'].lower()); P.sort(key=lambda p: p['py'].lower())
fr = {'categories_formules': [{'id': i, 'zh': z, 'nom': n} for i, z, n, _ in CATF], 'formules': F,
      'labos': [{'id': k, 'nom': v} for k, v in LABS.items()],
      'hors_pharmacopee': [{'id': k, 'nom': k} for k in EXT], 'formules_tableaux': FT}
en = {'categories_formules': [{'id': i, 'nom': e} for i, _, _, e in CATF], 'formules': FE, 'labos': [{'id': k, 'nom': v} for k, v in LABS.items()],
      'hors_pharmacopee': [{'id': k, 'nom': v} for k, v in EXT.items()]}
frp = {'categories_plantes': [{'id': i, 'zh': z, 'nom': n} for i, z, n, _ in CATP], 'plantes': P}
enp = {'categories_plantes': [{'id': i, 'nom': e} for i, _, _, e in CATP], 'plantes': PE}
for path, data in ((C + '/formules.json', fr), (C + '/en/formules.json', en), (C + '/plantes.json', frp), (C + '/en/plantes.json', enp)):
    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(path, 'a').write('\n')
print(f"{len(F)} formules, {len(P)} plantes")
