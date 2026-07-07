// excel.js — Wrapper Node qui délègue l'injection Excel au script Python stdlib.
// Robuste : produit des .xlsx valides en préservant toutes les formules du modèle.

import { execFile } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = join(__dirname, "inject_excel.py");

/**
 * Injecte les factures dans une feuille du modèle, retourne le chemin de sortie.
 * @returns Promise<{ok, marchandise, frais, rows, output}>
 */
export function injecterFactures({ template, output, sheet, marchandise, frais, startRow = 33 }) {
  const cfg = { template, output, sheet, startRow, marchandise, frais };
  const dir = mkdtempSync(join(tmpdir(), "restoscan-"));
  const cfgPath = join(dir, "cfg.json");
  writeFileSync(cfgPath, JSON.stringify(cfg), "utf8");

  return new Promise((resolve, reject) => {
    execFile("python3", [PY_SCRIPT, cfgPath], (err, stdout, stderr) => {
      if (err && !stdout) return reject(new Error(stderr || err.message));
      try {
        const res = JSON.parse(stdout.trim());
        if (!res.ok) return reject(new Error(res.error || "injection échouée"));
        resolve(res);
      } catch (e) {
        reject(new Error("Réponse Python illisible: " + stdout + " " + stderr));
      }
    });
  });
}
