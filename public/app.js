// app.js — Logique front RestoScan
const corps = document.getElementById("corps");
const sortie = document.getElementById("sortie");

// Exemple = vos 5 factures réelles (6 lignes car Afropean est mixte)
const EXEMPLE = [
  { date:"2026-02-21", fournisseur:"Colruyt", num:"2102.1", libelle:"Alimentation seche", tauxTva:6, htva:31.03, tva:1.86, ttc:32.89 },
  { date:"2026-02-12", fournisseur:"Colruyt", num:"243.1", libelle:"Alimentation seche", tauxTva:6, htva:69.68, tva:4.05, ttc:73.73 },
  { date:"2026-02-28", fournisseur:"Renewi", num:"8382633", libelle:"Collecte dechets / vidange", tauxTva:21, htva:110.23, tva:23.15, ttc:133.38 },
  { date:"2026-02-28", fournisseur:"Afropean SRL", num:"2026-02", libelle:"Fourniture alimentation", tauxTva:6, htva:366.25, tva:21.98, ttc:388.23 },
  { date:"2026-02-28", fournisseur:"Afropean SRL", num:"2026-02", libelle:"Consultance en gestion", tauxTva:21, htva:3699.17, tva:787.50, ttc:4475.00 },
  { date:"2026-02-28", fournisseur:"BV Dirk Marchand", num:"26 0312", libelle:"Fruits & Legumes", tauxTva:6, htva:204.08, tva:12.24, ttc:216.32 },
];

const CHAMPS = ["date","fournisseur","num","libelle","tauxTva","htva","tva","ttc"];

function ligneVide(){ return { date:"", fournisseur:"", num:"", libelle:"", tauxTva:6, htva:"", tva:"", ttc:"" }; }

function creerLigne(data){
  const tr = document.createElement("tr");
  CHAMPS.forEach((champ)=>{
    const td = document.createElement("td");
    let el;
    if(champ==="tauxTva"){
      el = document.createElement("select");
      [6,12,21,0].forEach(t=>{ const o=document.createElement("option"); o.value=t; o.textContent=t+"%"; el.appendChild(o); });
      el.value = data[champ] ?? 6;
    } else {
      el = document.createElement("input");
      el.type = ["htva","tva","ttc"].includes(champ) ? "number" : "text";
      if(el.type==="number") el.step="0.01";
      el.value = data[champ] ?? "";
    }
    el.dataset.champ = champ;
    el.addEventListener("input", ()=>majCategorie(tr));
    td.appendChild(el);
    tr.appendChild(td);
  });
  // colonne catégorie (badge)
  const tdCat = document.createElement("td");
  tdCat.className = "cat";
  tr.appendChild(tdCat);
  // suppression
  const tdDel = document.createElement("td");
  const b = document.createElement("button");
  b.className="del"; b.textContent="×"; b.title="Supprimer";
  b.onclick = ()=>{ tr.remove(); };
  tdDel.appendChild(b);
  tr.appendChild(tdDel);

  corps.appendChild(tr);
  majCategorie(tr);
  return tr;
}

function lireLigne(tr){
  const o = {};
  tr.querySelectorAll("[data-champ]").forEach(el=>{
    let v = el.value;
    if(["htva","tva","ttc","tauxTva"].includes(el.dataset.champ)) v = v===""?"":Number(v);
    o[el.dataset.champ] = v;
  });
  return o;
}

async function majCategorie(tr){
  const o = lireLigne(tr);
  const tdCat = tr.querySelector(".cat");
  if(!o.fournisseur && !o.libelle){ tdCat.innerHTML=""; return; }
  try{
    const r = await fetch("/api/classer",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({fournisseur:o.fournisseur,libelle:o.libelle,tauxTva:o.tauxTva})});
    const c = await r.json();
    const cls = c.categorie==="marchandise" ? "m" : (c.confiance<0.5?"v":"f");
    const label = c.categorie==="marchandise" ? "Marchandise" : "Frais";
    tdCat.innerHTML = `<span class="badge ${cls}" title="${c.motif}">${label}</span>`;
  }catch(e){ tdCat.textContent="?"; }
}

function toutesLignes(){
  return [...corps.querySelectorAll("tr")].map(lireLigne)
    .filter(o=>o.fournisseur && (o.htva!=="" || o.ttc!==""));
}

// --- Boutons ---
document.getElementById("ajouter").onclick = ()=>creerLigne(ligneVide());
document.getElementById("exemple").onclick = ()=>{ corps.innerHTML=""; EXEMPLE.forEach(creerLigne); };

document.querySelectorAll(".carte").forEach(c=>{
  c.onclick = ()=>{ document.querySelectorAll(".carte").forEach(x=>x.classList.remove("actif")); c.classList.add("actif"); };
});

// --- Upload ---
document.getElementById("fichiers").addEventListener("change", async (e)=>{
  const info = document.getElementById("uploadInfo");
  const fd = new FormData();
  [...e.target.files].forEach(f=>fd.append("factures", f));
  info.textContent = " Envoi…";
  try{
    const r = await fetch("/api/upload",{method:"POST",body:fd});
    const j = await r.json();
    info.textContent = ` ✓ ${j.recus} fichier(s) reçu(s). (Lecture OCR à venir — saisissez/validez ci-dessous)`;
  }catch(err){ info.textContent = " ⚠️ erreur upload"; }
});

// --- Génération ---
document.getElementById("generer").onclick = async ()=>{
  const lignes = toutesLignes();
  if(lignes.length===0){ sortie.innerHTML = `<div class="muted" style="margin-top:12px">Ajoutez au moins une facture.</div>`; return; }
  const sheet = document.getElementById("mois").value;
  sortie.innerHTML = `<div class="muted" style="margin-top:12px">Génération…</div>`;
  try{
    const r = await fetch("/api/generer",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({sheet, lignes})});
    const j = await r.json();
    if(!j.ok) throw new Error(j.error);
    const rs = j.resume;
    sortie.innerHTML = `
      <div class="resume">
        <div class="stat"><div class="n" style="color:var(--marchandise)">${rs.marchandise}</div><div class="l">Marchandise</div></div>
        <div class="stat"><div class="n" style="color:var(--frais)">${rs.frais}</div><div class="l">Autres frais</div></div>
        <div class="stat"><div class="n">${rs.totalHtvaMarchandise.toFixed(2)}€</div><div class="l">HTVA marchandise</div></div>
        <div class="stat"><div class="n">${rs.totalHtvaFrais.toFixed(2)}€</div><div class="l">HTVA frais</div></div>
      </div>
      ${rs.aVerifier.length? `<div class="ok" style="background:#fff3cd;border-color:#e0c060">⚠️ ${rs.aVerifier.length} ligne(s) à vérifier : ${rs.aVerifier.map(x=>x.fournisseur).join(", ")}</div>`:""}
      <div class="ok">
        ✅ Excel généré et injecté dans <b>${sheet}</b>.
        <div style="margin-top:10px"><a class="btn" href="${j.url}">⬇️ Télécharger ${j.fichier}</a></div>
      </div>`;
  }catch(err){
    sortie.innerHTML = `<div class="ok" style="background:#fdecea;border-color:#e0a0a0">⚠️ ${err.message}</div>`;
  }
};

// démarrage : charge l'exemple
EXEMPLE.forEach(creerLigne);
