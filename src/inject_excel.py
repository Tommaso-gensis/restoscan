#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inject_excel.py — Injection robuste de factures dans le modèle Excel.
Utilise UNIQUEMENT la stdlib (zipfile + ElementTree) : aucun pip requis.
Appelé par le serveur Node via: python3 inject_excel.py <input.json>

input.json = {
  "template": "chemin/modele.xlsx",
  "output":   "chemin/sortie.xlsx",
  "sheet":    "FEVRIER 2026",
  "startRow": 33,
  "marchandise": [ {date,fournisseur,num,htva,tva,ttc}, ... ],
  "frais":       [ {...}, ... ]
}
Écrit le xlsx et imprime un JSON de résultat sur stdout.
"""
import sys, json, re, zipfile
from xml.etree import ElementTree as ET

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RELNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
ET.register_namespace("", NS)
Q = "{%s}" % NS


def col_idx(letters):
    n = 0
    for c in letters:
        n = n * 26 + (ord(c) - 64)
    return n


def run(cfg):
    template = cfg["template"]
    output = cfg["output"]
    sheet_name = cfg["sheet"]
    start = int(cfg.get("startRow", 33))
    march = cfg.get("marchandise", [])
    frais = cfg.get("frais", [])
    ordered = [("march", x) for x in march] + [("frais", x) for x in frais]

    z = zipfile.ZipFile(template)
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {r.get("Id"): r.get("Target") for r in rels}
    target = None
    for s in wb.iter(Q + "sheet"):
        if s.get("name") == sheet_name:
            target = "xl/" + relmap[s.get(RELNS + "id")]
    if not target:
        raise RuntimeError(f'Feuille "{sheet_name}" introuvable')

    ws = ET.fromstring(z.read(target))
    sd = ws.find(Q + "sheetData")
    rowmap = {int(r.get("r")): r for r in sd.findall(Q + "row")}

    def set_cell(rownum, col, value, is_num):
        row = rowmap.get(rownum)
        if row is None:
            row = ET.SubElement(sd, Q + "row")
            row.set("r", str(rownum))
            rowmap[rownum] = row
        rr = f"{col}{rownum}"
        for c in list(row.findall(Q + "c")):
            if c.get("r") == rr:
                row.remove(c)
        c = ET.SubElement(row, Q + "c")
        c.set("r", rr)
        if is_num:
            v = ET.SubElement(c, Q + "v")
            v.text = str(value)
        else:
            c.set("t", "inlineStr")
            is_ = ET.SubElement(c, Q + "is")
            t = ET.SubElement(is_, Q + "t")
            t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            t.text = str(value)
        # trier les cellules par colonne (Excel strict)
        cells = row.findall(Q + "c")
        cells_sorted = sorted(cells, key=lambda e: col_idx(re.match(r"[A-Z]+", e.get("r")).group()))
        for e in cells:
            row.remove(e)
        for e in cells_sorted:
            row.append(e)

    def r2(x):
        return round(float(x), 2)

    n_m = n_f = 0
    for i, (cat, f) in enumerate(ordered):
        r = start + i
        set_cell(r, "Y", f["fournisseur"], False)
        set_cell(r, "Z", f["date"], False)
        set_cell(r, "AA", f["num"], False)
        set_cell(r, "AC", r2(f["htva"]), True)
        set_cell(r, "AD", r2(f["tva"]), True)
        set_cell(r, "AE", r2(f["ttc"]), True)
        if cat == "march":
            set_cell(r, "AL", r2(f["htva"]), True)
            n_m += 1
        else:
            n_f += 1

    new_ws = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + ET.tostring(ws, encoding="unicode")

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in z.namelist():
            zout.writestr(item, new_ws if item == target else z.read(item))
    z.close()
    return {"ok": True, "sheet": sheet_name, "marchandise": n_m, "frais": n_f,
            "rows": f"{start}..{start + len(ordered) - 1}", "output": output}


if __name__ == "__main__":
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    try:
        print(json.dumps(run(cfg)))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)
