# English version: glossary and rules

The English content lives in `source/contenu/en/<same file name>.json`. Each file has the **same structure** as the
French file; only human-readable text is translated. `python3 source/verif_en.py <file>` checks a translation;
`python3 source/build.py` builds `data-en.json` (anything missing stays in French).

## What to translate / keep

- Translate every human-readable string: names, descriptions, advice, steps, ingredient names, search synonyms (`syn`:
  write natural English search words, lay terms and medical terms), labels of anatomical landmarks (`t`), etc.
- Keep identical: ids and every code (`id`, `cat`, `cle`, `k`, `zh`, `py`, `ab`, `p`, `m`, `u`, `axe`, `date`, `organe`,
  `groupes`, `recettes`, `fiches`, `autres`, `contre`, `tab`, `liste`, `type`, numbers, booleans), Chinese characters and
  pinyin. Keep `{ingredient}` placeholders exactly as they are inside step texts.
- Keep the same number of elements in lists of objects (phases, items, steps, ingredients, variants).
- `|` inside a string is a line break: keep it (translate each line).

## Voice

Plain, warm, second person ("you"), short sentences, for lay readers — the French uses "tu". No jargon without a simple
explanation. Keep medical cautions exactly as strong as in French.

## France-specific resources

Keep the advice universal and put French services in brackets:
- « appelle le 15 » → "call emergency services (15 or 112 in France)"
- 3114 → "call a suicide prevention line (3114 in France, free, 24/7)"
- CeGIDD → "a sexual health clinic (free CeGIDD centres in France)"
- Sida Info Service, Cancer info, Mon test IST, AFPric, Ligue française contre la sclérose en plaques →
  "(in France: …)" with the name and number unchanged.
- « médecin traitant » → "your doctor"; « sage-femme » → "midwife"; « pharmacien » → "pharmacist".

## Point codes (WHO standard in English text)

P → LU · GI → LI · E → ST · Rt → SP · C → HT · IG → SI · V → BL · Rn → KI · MC → PC · TR → TE · VB → GB · F → LR ·
VG → GV · RM → CV. Example: « Rt 6 » → "SP 6", « E 36 » → "ST 36", « MC 6 » → "PC 6".
Extra points keep their names: Yin Tang, Tai Yang, An Mian, Ding Chuan, He Ding, Nei Xi Yan, Bai Chong Wo, Zi Gong, Ah Shi.
Only convert codes inside texts; the code fields themselves (`ab`, `p`) stay French.

## TCM terms

Organs (capitalised as in French): Rate → Spleen · Estomac → Stomach · Foie → Liver · Vésicule biliaire → Gallbladder ·
Cœur → Heart · Poumon → Lung · Rein → Kidney · Vessie → Bladder · Gros Intestin → Large Intestine ·
Intestin grêle → Small Intestine · Maître du Cœur → Pericardium · Triple Réchauffeur → Triple Energizer (San Jiao) ·
Utérus → Uterus.

Substances and factors: Qi · Sang → Blood · Yin · Yang · Jing / Essence → Essence (Jing) · Shen → Shen (spirit) ·
Liquides organiques → body fluids · Humidité → Dampness · Mucosités → Phlegm · Chaleur → Heat · Feu → Fire ·
Froid → Cold · Vent → Wind · Sécheresse → Dryness · Toxine → Toxin.

Patterns: Vide → Deficiency · Plénitude → Excess · Stagnation → Stagnation · Stase de Sang → Blood Stasis ·
Humidité-Chaleur → Damp-Heat · Froid-Humidité → Cold-Damp · Vent-Chaleur → Wind-Heat · Vent-Froid → Wind-Cold ·
Vide de Qi de la Rate → Spleen Qi Deficiency · Vide de Yang du Rein → Kidney Yang Deficiency ·
Vide de Yin du Foie et du Rein → Liver and Kidney Yin Deficiency · Stagnation du Qi du Foie → Liver Qi Stagnation ·
Montée du Yang du Foie → Liver Yang Rising · Feu du Foie → Liver Fire · Le Foie agresse la Rate → Liver Overacting on the
Spleen · Le Foie agresse l'Estomac → Liver Overacting on the Stomach · Rébellion du Qi de l'Estomac → Rebellious Stomach
Qi · Stagnation alimentaire → Food Stagnation · Effondrement du Qi de la Rate → Sinking Spleen Qi · La Rate ne retient pas
le Sang → Spleen Not Controlling Blood · Le Qi du Rein ne retient plus → Kidney Qi Not Firm · Le Rein ne reçoit pas le
Qi → Kidney Failing to Receive Qi · Le Cœur et le Rein ne communiquent plus → Heart and Kidney Not Communicating ·
Vide de Qi et de Sang → Qi and Blood Deficiency · Vide de Jing du Rein → Kidney Essence (Jing) Deficiency ·
Bi Vent / Froid / Humidité / Chaleur → Wind / Cold / Damp / Heat Bi (painful obstruction) · syndrome Wei → Wei (atrophy)
syndrome · « tableau » → "pattern".

Techniques: disperser → disperse (strong pressure, anticlockwise) · tonifier → tonify (gentle pressure, clockwise) ·
moxa → moxa · bouillotte → hot-water bottle · cun → cun · auto-massage → self-massage · point Shu du dos → Back-Shu point ·
point Yuan → Yuan-Source point · point Luo → Luo-Connecting point · point Xi → Xi-Cleft point · point Mu → Front-Mu point.

Food: riz rond → short-grain rice · congee → congee · jujube / datte chinoise → jujube (Chinese red date) ·
baies de goji → goji berries · igname de Chine (shan yao) → Chinese yam (shan yao) · cébette → spring onion ·
c. à café → teaspoon · c. à soupe → tablespoon · « cuiseur à riz » → rice cooker · « cocotte » → casserole pot.
