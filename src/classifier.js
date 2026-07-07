// classifier.js — Moteur de tri métier : marchandise (revente) vs autres frais
// C'est le CŒUR de RestoScan : la logique de consultant restauration encodée.
// Contexte belge : alimentaire majoritairement à 6% TVA, services à 21%.

// Listes de fournisseurs connus (enrichissables via l'UI et data/fournisseurs.json)
export const DEFAULT_RULES = {
  fournisseursMarchandise: [
    "colruyt", "bv dirk marchand", "dirk marchand", "metro", "bidfood",
    "sligro", "makro", "hanos", "deli xl", "brake", "davigel", "pomona"
  ],
  fournisseursFrais: [
    "renewi", "proximus", "orange", "engie", "luminus", "sabam", "unisono",
    "belgacom", "telenet", "ores", "sibelga", "vivaqua", "ethias", "ag insurance"
  ],
  motsMarchandise: [
    "aliment", "fruit", "legume", "légume", "boisson", "viande", "boucherie",
    "poisson", "fromage", "vin", "biere", "bière", "epicerie", "épicerie",
    "fourniture aliment", "denree", "denrée", "produit frais"
  ],
  motsFrais: [
    "consultance", "consulting", "dechet", "déchet", "vidange", "loyer",
    "energie", "énergie", "electricite", "électricité", "gaz", "eau",
    "assurance", "honoraire", "entretien", "reparation", "réparation",
    "telephone", "téléphone", "internet", "comptable", "publicite", "publicité",
    "nettoyage", "location", "leasing", "abonnement"
  ]
};

/**
 * Classe une ligne de facture.
 * @returns {{categorie: 'marchandise'|'frais', motif: string, confiance: number}}
 */
export function classer(fournisseur, libelle, tauxTva, rules = DEFAULT_RULES) {
  const f = (fournisseur || "").trim().toLowerCase();
  const l = (libelle || "").trim().toLowerCase();

  // 1) Libellé explicite (prioritaire — gère les factures mixtes ligne par ligne)
  if (rules.motsFrais.some((m) => l.includes(m)))
    return { categorie: "frais", motif: "mot-clé libellé", confiance: 0.9 };
  if (rules.motsMarchandise.some((m) => l.includes(m)))
    return { categorie: "marchandise", motif: "mot-clé libellé", confiance: 0.9 };

  // 2) Fournisseur connu
  if (rules.fournisseursMarchandise.some((x) => f.includes(x)))
    return { categorie: "marchandise", motif: "fournisseur connu", confiance: 0.85 };
  if (rules.fournisseursFrais.some((x) => f.includes(x)))
    return { categorie: "frais", motif: "fournisseur connu", confiance: 0.85 };

  // 3) Heuristique taux TVA (BE) : 6% => alimentaire probable
  if (Number(tauxTva) === 6)
    return { categorie: "marchandise", motif: "taux TVA 6%", confiance: 0.5 };
  if (Number(tauxTva) === 12)
    return { categorie: "marchandise", motif: "taux TVA 12%", confiance: 0.4 };

  // 4) Défaut : frais (à faible confiance -> l'UI demandera confirmation)
  return { categorie: "frais", motif: "défaut (à vérifier)", confiance: 0.3 };
}

/**
 * Trie un tableau de lignes de facture en deux groupes + marque la confiance.
 * ligne = { date, fournisseur, num, libelle, tauxTva, htva, tva, ttc }
 */
export function trier(lignes, rules = DEFAULT_RULES) {
  const marchandise = [];
  const frais = [];
  const aVerifier = [];
  for (const ligne of lignes) {
    const r = classer(ligne.fournisseur, ligne.libelle, ligne.tauxTva, rules);
    const enrichie = { ...ligne, ...r };
    if (r.categorie === "marchandise") marchandise.push(enrichie);
    else frais.push(enrichie);
    if (r.confiance < 0.5) aVerifier.push(enrichie);
  }
  return { marchandise, frais, aVerifier };
}
