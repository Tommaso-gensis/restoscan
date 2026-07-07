# 🌱 RestoScan

Application de scan et tri de factures pour restaurateurs (Belgique).
Pensée par un consultant en restauration, pour faire gagner du temps administratif
et donner une vision **au jour près** de la situation (marge, food cost, frais).

## Le principe

3 flux de scan → tri automatique → injection dans **votre** modèle Excel :

1. 💰 **Chiffre d'affaires** (ticket Z / journal caisse) — ventilé par taux TVA (6/12/21)
2. 🥩 **Achats marchandise** (revente) → alimentent le calcul de marge
3. 🧾 **Autres achats & frais** (loyer, énergie, déchets, services…)

Le moteur de tri distingue automatiquement **marchandise vs frais**, même sur les
**factures mixtes** (ex. Afropean : alimentation 6% = marchandise / consultance 21% = frais),
en découpant ligne par ligne.

## Architecture

- **Backend** : Node.js + Express (`src/server.js`)
- **Moteur de tri** : `src/classifier.js` — LA logique métier (fournisseurs, mots-clés, taux TVA)
- **Injection Excel** : `src/excel.js` → délègue à `src/inject_excel.py` (stdlib Python, aucune dépendance,
  produit des .xlsx valides en **préservant toutes les formules** du modèle)
- **Frontend** : `public/index.html` + `public/app.js` (upload, validation, tri live, génération)
- **Modèle** : `data/templates/modele_cimotola.xlsx` (le vrai fichier client)

## Démarrer

```bash
npm install
npm start           # http://localhost:3210
```

## Endpoints API

| Méthode | Route | Rôle |
|---|---|---|
| GET  | `/api/health` | ping |
| GET  | `/api/rules` | règles de tri actuelles |
| POST | `/api/classer` | classe une ligne (aperçu live) |
| POST | `/api/upload` | dépôt de fichiers factures |
| POST | `/api/generer` | trie + injecte dans l'Excel, renvoie l'URL de téléchargement |
| GET  | `/api/download/:name` | télécharge le fichier généré |

## État actuel (v0.1)

- ✅ Tri marchandise / frais fonctionnel (y compris factures mixtes)
- ✅ Injection dans le modèle Excel réel, formules préservées, 14 feuilles intactes
- ✅ Interface web complète (3 zones, saisie/validation, tri en direct, génération)
- ⏳ **OCR réel** : à brancher (upload OK, lecture auto à venir — Tesseract ou API cloud)
- ⏳ Scan CA (ticket Z) : zone RECETTE à alimenter
- ⏳ Auto-remplissage compte comptable (colonne AB)
- ⏳ Feuille tableau de bord (food cost %, marge brute, ratios)

## Prochaines étapes

1. Brancher un moteur OCR sur `/api/upload` → pré-remplir le tableau de validation
2. Ajouter le flux CA (ventilation par taux TVA)
3. Tableau de bord d'indicateurs clés
4. Multi-restaurants / comptes clients (vision produit)

---
_Genesis pour Tommaso — v0.1, juillet 2026_
