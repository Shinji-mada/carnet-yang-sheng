# Pharmacopée et formules

Sources lisibles des onglets « Formules » et « Pharmacopée ». `python3 source/pharma/gen.py` écrit
`source/contenu/formules.json`, `source/contenu/plantes.json` et leurs versions anglaises, puis `python3 source/build.py`.

Formule (`formules-*.txt`) :

    @id | Pinyin | 汉字 | catégorie | labos (cal = Calebasse, pv = Planeta Verd)
    n Nom français || English name
    c Plante : dose ; Plante : dose ; …        (doses d'une décoction pour une journée)
    a Actions || Actions
    i Indications || Indications
    t tableau-id, tableau-id                   (tableaux de l'appli soignés par la formule, le plus typique d'abord)
    s symptome-id, symptome-id                 (facultatif : signes qui la font passer en tête dans le bilan)
    x Contre-indications et précautions || Contraindications and cautions
    o Note (substitutions, version du labo…) || Note

Plante (`plantes-*.txt`) :

    @Pinyin | 汉字 | Nom latin pharmaceutique | catégorie | nature | saveurs | méridiens | posologie
    n Nom français courant || English common name
    a Actions || Actions
    i Indications || Indications
    x Contre-indications, toxicité || Contraindications, toxicity
