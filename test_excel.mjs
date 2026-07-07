import { injecterFactures } from "./src/excel.js";
import { trier } from "./src/classifier.js";

const factures = [
  { date:"44712", fournisseur:"Colruyt", num:"2102.1", libelle:"Alimentation seche", tauxTva:6, htva:31.03, tva:1.86, ttc:32.89 },
  { date:"44700", fournisseur:"Colruyt", num:"243.1", libelle:"Alimentation seche", tauxTva:6, htva:69.68, tva:4.05, ttc:73.73 },
  { date:"44719", fournisseur:"Renewi", num:"8382633", libelle:"Collecte dechets", tauxTva:21, htva:110.23, tva:23.15, ttc:133.38 },
  { date:"44719", fournisseur:"Afropean SRL", num:"2026-02", libelle:"Fourniture alimentation", tauxTva:6, htva:366.25, tva:21.98, ttc:388.23 },
  { date:"44719", fournisseur:"Afropean SRL", num:"2026-02", libelle:"Consultance en gestion", tauxTva:21, htva:3699.17, tva:787.50, ttc:4475.00 },
  { date:"44719", fournisseur:"BV Dirk Marchand", num:"26 0312", libelle:"Fruits & Legumes", tauxTva:6, htva:204.08, tva:12.24, ttc:216.32 },
];

const { marchandise, frais } = trier(factures);
const res = await injecterFactures({
  template: "data/templates/modele_cimotola.xlsx",
  output: "data/output/test_fevrier.xlsx",
  sheet: "FEVRIER 2026",
  marchandise, frais
});
console.log("Résultat injection:", res);
