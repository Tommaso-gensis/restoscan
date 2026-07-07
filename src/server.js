// server.js — Serveur RestoScan : upload factures, saisie/validation, tri, Excel.
import express from "express";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { trier, DEFAULT_RULES, classer } from "./classifier.js";
import { injecterFactures } from "./excel.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "data");
const UPLOADS = join(DATA, "uploads");
const OUTPUT = join(DATA, "output");
const TEMPLATES = join(DATA, "templates");
for (const d of [UPLOADS, OUTPUT, TEMPLATES]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(join(ROOT, "public")));

const upload = multer({ dest: UPLOADS, limits: { fileSize: 20 * 1024 * 1024 } });

// --- Santé ---
app.get("/api/health", (_req, res) => res.json({ ok: true, app: "RestoScan", version: "0.1.0" }));

// --- Règles de tri (pour affichage/édition dans l'UI) ---
app.get("/api/rules", (_req, res) => res.json(DEFAULT_RULES));

// --- Classer une seule ligne (aperçu live pendant la saisie) ---
app.post("/api/classer", (req, res) => {
  const { fournisseur, libelle, tauxTva } = req.body || {};
  res.json(classer(fournisseur, libelle, tauxTva));
});

// --- Upload de fichiers factures (stockés, prêts pour OCR futur) ---
app.post("/api/upload", upload.array("factures", 20), (req, res) => {
  const files = (req.files || []).map((f) => ({
    id: f.filename, nom: f.originalname, taille: f.size, type: f.mimetype
  }));
  res.json({ ok: true, recus: files.length, fichiers: files });
});

// --- Génération de l'Excel à partir des lignes validées ---
// body: { sheet, lignes: [{date,fournisseur,num,libelle,tauxTva,htva,tva,ttc}], template? }
app.post("/api/generer", async (req, res) => {
  try {
    const { sheet, lignes, template } = req.body || {};
    if (!sheet || !Array.isArray(lignes) || lignes.length === 0)
      return res.status(400).json({ ok: false, error: "sheet et lignes requis" });

    const { marchandise, frais, aVerifier } = trier(lignes);
    const tmpl = template ? join(TEMPLATES, template) : join(TEMPLATES, "modele_cimotola.xlsx");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outName = `RestoScan_${sheet.replace(/\s+/g, "_")}_${stamp}.xlsx`;
    const output = join(OUTPUT, outName);

    const res2 = await injecterFactures({ template: tmpl, output, sheet, marchandise, frais });

    res.json({
      ok: true,
      resume: {
        marchandise: marchandise.length,
        frais: frais.length,
        aVerifier: aVerifier.map((x) => ({ fournisseur: x.fournisseur, libelle: x.libelle })),
        totalHtvaMarchandise: round2(sum(marchandise, "htva")),
        totalHtvaFrais: round2(sum(frais, "htva")),
      },
      fichier: outName,
      url: `/api/download/${encodeURIComponent(outName)}`,
      detail: res2,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Téléchargement du fichier généré ---
app.get("/api/download/:name", (req, res) => {
  const p = join(OUTPUT, req.params.name);
  if (!existsSync(p)) return res.status(404).json({ ok: false, error: "introuvable" });
  res.download(p);
});

function sum(arr, k) { return arr.reduce((a, x) => a + Number(x[k] || 0), 0); }
function round2(x) { return Math.round(x * 100) / 100; }

const PORT = process.env.PORT || 3210;
app.listen(PORT, () => console.log(`🌱 RestoScan sur http://localhost:${PORT}`));
