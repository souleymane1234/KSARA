import { $, $$, esc, NF, fcfa, kfmt, TODAY, addDays, iso, D, fdate, fdt, MONTHS, monthKey, monthLabel, daysBetween, uid, initials, sGet, sSet, sDel } from '../lib/utils.js';
import { ico } from '../lib/icons.js';
import { SERVICES, svcName, COMMUNES, PAY_MODES, MODULES } from '../data/referentiels.js';
import { seed } from '../data/seed.js';
import { LOGO, ph } from '../lib/assets.js';
import { KEY, VER } from '../lib/config.js';

/* ---------- Persistance locale ---------- */
let DB;
function loadDB() { try { const s = sGet(KEY); if (s) { const d = JSON.parse(s); if (d && d.v === VER) { DB = d; return; } } } catch (e) {} DB = seed(); saveDB(); }
function saveDB() { sSet(KEY, JSON.stringify(DB)); }

/* ---------- Accès aux données ---------- */
const byId = (col, id) => (DB[col] || []).find(x => x.id === id);
const empName = id => byId("employes", id)?.nom || "—";
const cliName = id => byId("clients", id)?.nom || "—";
const bienName = id => { const b = byId("biens", id); return b ? b.titre + " — " + b.commune : "—"; };
const prestName = id => byId("prestataires", id)?.nom || "—";
const bailOf = id => byId("baux", id);
const bailLabel = id => { const l = bailOf(id); return l ? bienName(l.bien) + " · " + cliName(l.locataire) : "—"; };

/* ---------- Session ---------- */
const S = { view: "site", user: null, page: "dash", f: {}, siteOp: "Location", siteCommune: "", siteType: "" };
const role = () => S.user?.role;
const can = m => !!S.user && (role() === "admin" && !MODULES.find(x => x.id === m)?.client ? true : (DB.perms[role()] || []).includes(m));
function log(action, mod) { DB.logs.unshift({ id: uid("h"), date: new Date().toISOString(), service: S.user?.service || "public", user: S.user?.username || "site web", action, mod }); saveDB(); }
function notify(titre, txt, to, canal = "Système") { DB.notifs.unshift({ id: uid("n"), date: new Date().toISOString(), canal, titre, txt, lu: false, to }); saveDB(); }
function myNotifs() { const r = role(); const key = r === "client" ? "client:" + S.user.client : r; return DB.notifs.filter(n => n.to.includes(key) || (r === "admin" && !n.to.some(t => t.startsWith("client:")) )); }

/* ---------- UI helpers ---------- */
function toast(msg) { const r = $("#toast-root"); r.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toast.t); toast.t = setTimeout(() => r.innerHTML = "", 2800); }
const pillFor = s => {
  const map = { ok: ["Payé", "Payée", "Actif", "Approuvé", "Signé", "Disponible", "Livré", "Terminé", "Réalisée", "Recouvrée", "Validée", "Envoyée", "Clos", "Bon", "Oui"], warn: ["En attente", "Préavis", "À signer", "Planifié", "Planifiée", "En cours", "Commandé", "En validation", "À appeler", "Appelée", "Brouillon", "Moyen", "Stagiaire", "Consultant", "En travaux", "À réviser"], bad: ["Impayé", "En retard", "Refusé", "Mauvais", "Non", "Terminé (sortie)"], info: ["Loué", "Vendu", "Location", "Vente", "Gestion syndic"] };
  for (const k in map) if (map[k].includes(s)) return `<span class="pill ${k}">${esc(s)}</span>`;
  return `<span class="pill">${esc(s)}</span>`;
};
const stars = n => `<span class="stars" aria-label="${n} sur 5">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`;
const avatar = (n, c) => `<span class="avatar" style="background:${c || "var(--blue)"}">${esc(initials(n))}</span>`;
const AV_COL = ["#2470B8", "#C3262E", "#1E8A5A", "#7A4CC2", "#B86E00", "#13213A"];
const avc = s => AV_COL[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COL.length];

/* ================= Modale, formulaires, listes génériques ================= */
const M = {};
function openModal({ title, body, foot = "", wide = false, icon = "" }) {
  $("#modal-root").innerHTML = `<div class="modal-bg" data-act="bgClose"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-h">${icon ? ico(icon, 20) : ""}<h3>${esc(title)}</h3><button class="btn ghost sm x" data-act="closeModal" aria-label="Fermer">${ico("x")}</button></div>
    <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ""}</div></div>`;
  const f = $("#modal-root input:not([type=hidden]),#modal-root select,#modal-root textarea"); if (f) setTimeout(() => f.focus(), 30);
}
function closeModal() { $("#modal-root").innerHTML = ""; M.onSave = null; }

function fieldHTML(f, v) {
  const id = "fld_" + f.k, req = f.req ? "required" : "";
  let inp;
  const opts = typeof f.opts === "function" ? f.opts() : f.opts;
  if (f.t === "select") inp = `<select class="input" id="${id}" name="${f.k}" ${req}>${f.blank ? `<option value="">${esc(f.blank)}</option>` : ""}${(opts || []).map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(v ?? "") ? "selected" : ""}>${esc(ol)}</option>`; }).join("")}</select>`;
  else if (f.t === "checks") inp = `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;max-height:180px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:10px">${(opts || []).map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<label style="display:flex;gap:6px;align-items:center;font-size:14px;color:var(--fg);font-weight:500"><input type="checkbox" name="${f.k}" value="${esc(ov)}" ${(v || []).includes(ov) ? "checked" : ""}> ${esc(ol)}</label>`; }).join("") || '<span class="hint">Aucun élément</span>'}</div>`;
  else if (f.t === "textarea") inp = `<textarea class="input" id="${id}" name="${f.k}" ${req} placeholder="${esc(f.ph || "")}">${esc(v ?? "")}</textarea>`;
  else inp = `<input class="input" id="${id}" name="${f.k}" type="${f.t || "text"}" value="${esc(v ?? "")}" ${req} placeholder="${esc(f.ph || "")}" ${f.t === "number" ? 'step="any" min="0"' : ""}>`;
  if (f.t === "checks") return `<div class="field" style="grid-column:1/-1"><span style="font-size:13px;font-weight:600;color:var(--muted)">${esc(f.l)}</span>${inp}</div>`;
  return `<div class="field" ${f.full ? 'style="grid-column:1/-1"' : ""}><label for="${id}">${esc(f.l)}${f.req ? " *" : ""}</label>${inp}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ""}</div>`;
}
function formModal({ title, fields, data = {}, submit = "Enregistrer", onSave, intro = "", wide = false, icon = "plus" }) {
  M.onSave = onSave; M.fields = fields;
  openModal({ title, wide, icon,
    body: `${intro ? `<div class="help-tip">${ico("help")}<div>${intro}</div></div>` : ""}<form id="mform" data-form="generic" class="grid-form" novalidate>${fields.map(f => fieldHTML(f, data[f.k])).join("")}</form><p class="err" id="mform-err" hidden></p>`,
    foot: `<button class="btn" data-act="closeModal" type="button">Annuler</button><button class="btn primary" type="submit" form="mform">${ico("check", 16)} ${esc(submit)}</button>` });
}
function readForm(form) { const o = {}; new FormData(form).forEach((v, k) => o[k] = typeof v === "string" ? v.trim() : v); (M.fields || []).forEach(f => { if (f.t === "number" && o[f.k] !== undefined) o[f.k] = +o[f.k] || 0; if (f.t === "checks") o[f.k] = new FormData(form).getAll(f.k); }); return o; }
function confirmModal(text, onYes, yes = "Confirmer", danger = true) {
  M.onYes = onYes;
  openModal({ title: "Confirmation", icon: "alert", body: `<p>${text}</p>`, foot: `<button class="btn" data-act="closeModal">Annuler</button><button class="btn ${danger ? "primary" : "blue"}" data-act="confirmYes">${esc(yes)}</button>` });
}
function csvModal(name, cols, rows) {
  const sep = ";", q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.map(c => q(c.l)).join(sep), ...rows.map(r => cols.map(c => q(c.x ? c.x(r) : r[c.k])).join(sep))].join("\n");
  openModal({ title: "Export comptable — " + name, icon: "copy", wide: true,
    body: `<p class="hint">Format CSV (séparateur « ; »), compatible Excel. Copiez le contenu puis collez-le dans un fichier .csv ou directement dans Excel. ${rows.length} ligne(s).</p><textarea class="input num" id="csv-out" style="min-height:260px;font-size:12.5px" readonly>${esc(csv)}</textarea>`,
    foot: `<button class="btn" data-act="closeModal">Fermer</button><button class="btn blue" data-act="copyCsv">${ico("copy", 16)} Copier</button>` });
  log("Export « " + name + " »", S.page);
}

/* Liste générique : recherche + filtres + actions */
let LV = null;
function listView(cfg) {
  LV = cfg; const st = (S.f[S.page] ||= {});
  const filt = (cfg.filters || []).map(f => `<select class="input" data-lf="${f.k}" aria-label="${esc(f.l)}"><option value="">${esc(f.l)} : tous</option>${(typeof f.opts === "function" ? f.opts() : f.opts).map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${st[f.k] === v ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`).join("");
  return `<div class="panel" ${cfg.tour ? `data-tour="${cfg.tour}"` : ""}>
    <div class="panel-h"><div><h3>${esc(cfg.title)}</h3>${cfg.sub ? `<div class="sub">${cfg.sub}</div>` : ""}</div>
      <div class="act">${cfg.export ? `<button class="btn sm" data-act="lvExport">${ico("copy", 15)} Exporter</button>` : ""}${cfg.extra || ""}${cfg.add ? `<button class="btn primary sm" data-act="lvAdd">${ico("plus", 15)} ${esc(cfg.add)}</button>` : ""}</div></div>
    ${cfg.search || filt ? `<div class="toolbar">${cfg.search ? `<input class="input" type="search" data-lf="q" placeholder="Rechercher…" value="${esc(st.q || "")}" aria-label="Rechercher">` : ""}${filt}</div>` : ""}
    <div id="lv-body">${lvBody()}</div></div>`;
}
function lvRows() {
  const st = S.f[S.page] || {}; let rows = LV.rows();
  if (st.q) { const q = st.q.toLowerCase(); rows = rows.filter(r => LV.search(r).toLowerCase().includes(q)); }
  (LV.filters || []).forEach(f => { if (st[f.k]) rows = rows.filter(r => String(f.get ? f.get(r) : r[f.k]) === st[f.k]); });
  return rows;
}
function lvBody() {
  const rows = lvRows();
  if (LV.cards) return rows.length ? `<div class="panel-b"><div class="vcards">${rows.map(LV.cards).join("")}</div></div>` : `<div class="empty">Aucun résultat. Modifiez la recherche ou les filtres.</div>`;
  if (!rows.length) return `<div class="empty">${LV.empty || "Aucun élément pour le moment."}</div>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${LV.cols.map(c => `<th class="${c.cls || ""}">${esc(c.l)}</th>`).join("")}${LV.act ? "<th class='r'>Actions</th>" : ""}</tr></thead><tbody>${rows.map(r => `<tr ${LV.open ? `data-act="lvOpen" data-id="${esc(r.id)}" style="cursor:pointer"` : ""}>${LV.cols.map(c => `<td class="${c.cls || ""}">${c.f ? c.f(r) : esc(r[c.k])}</td>`).join("")}${LV.act ? `<td class="r" style="white-space:nowrap">${LV.act(r)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

/* ================= SITE VITRINE ================= */
function houseArt(b, i) {
  const pal = [["#E7F0FA", "#2470B8"], ["#FBE9EA", "#C3262E"], ["#EAF4EF", "#1E8A5A"], ["#F1ECFA", "#6B48B5"]][i % 4];
  const t = b.type;
  let shape;
  if (t === "Terrain") shape = `<path d="M30 130 L170 130" stroke="${pal[1]}" stroke-width="3"/><path d="M40 130 l15 -30 l15 30 M120 130 l10 -22 l10 22" fill="none" stroke="${pal[1]}" stroke-width="3"/><rect x="60" y="60" width="80" height="50" fill="none" stroke="${pal[1]}" stroke-width="2" stroke-dasharray="6 5"/>`;
  else if (t === "Appartement" || t === "Bureau" || t === "Immeuble") shape = `<rect x="60" y="30" width="80" height="100" fill="#fff" stroke="${pal[1]}" stroke-width="3"/>${[0, 1, 2, 3].map(r => [0, 1, 2].map(c => `<rect x="${70 + c * 22}" y="${42 + r * 20}" width="14" height="11" fill="${pal[1]}" opacity=".7"/>`).join("")).join("")}<path d="M30 130H170" stroke="${pal[1]}" stroke-width="3"/>`;
  else shape = `<path d="M40 82 L100 38 L160 82" fill="none" stroke="#C3262E" stroke-width="4"/><path d="M100 38 L170 92" stroke="#2470B8" stroke-width="3"/><rect x="55" y="80" width="90" height="50" fill="#fff" stroke="${pal[1]}" stroke-width="3"/><rect x="92" y="100" width="16" height="30" fill="${pal[1]}"/><rect x="66" y="92" width="16" height="14" fill="${pal[1]}" opacity=".6"/><rect x="118" y="92" width="16" height="14" fill="${pal[1]}" opacity=".6"/><path d="M25 130H175" stroke="${pal[1]}" stroke-width="3"/>`;
  return `<svg viewBox="0 0 200 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(t)}"><rect width="200" height="150" fill="${pal[0]}"/>${shape}</svg>`;
}
/* ---------- Photos des biens ---------- */
function bienImg(b, i = 0, k = 0) { const src = ph((b.photos || [])[k]); return src ? `<img src="${src}" alt="${esc(b.titre)} — ${esc(b.quartier)}, ${esc(b.commune)}" loading="lazy">` : houseArt(b, i); }
function gallery(b) {
  const ps = (b.photos || []).map(ph).filter(Boolean);
  if (!ps.length) return `<div class="gal-main">${houseArt(b, 0)}</div>`;
  M.gal = { ps, i: 0 };
  return `<div class="gal"><div class="gal-main"><img id="gal-img" src="${ps[0]}" alt="${esc(b.titre)}">${ps.length > 1 ? `<button class="gal-nav prev" data-act="galStep" data-v="-1" aria-label="Photo précédente">‹</button><button class="gal-nav next" data-act="galStep" data-v="1" aria-label="Photo suivante">›</button><span class="gal-count num" id="gal-count">1 / ${ps.length}</span>` : ""}</div>
    ${ps.length > 1 ? `<div class="gal-thumbs">${ps.map((p, i) => `<button class="${i ? "" : "on"}" data-act="galPick" data-v="${i}" aria-label="Photo ${i + 1}"><img src="${p}" alt=""></button>`).join("")}</div>` : ""}</div>`;
}
function galShow(i) { const g = M.gal; if (!g) return; g.i = (i + g.ps.length) % g.ps.length; $("#gal-img").src = g.ps[g.i]; const c = $("#gal-count"); if (c) c.textContent = `${g.i + 1} / ${g.ps.length}`; $$(".gal-thumbs button").forEach((b, j) => b.classList.toggle("on", j === g.i)); }

/* ---------- Carte d'annonce ---------- */
function listingCard(b, i) {
  const n = (b.photos || []).length;
  return `<article class="listing">
    <button class="ph" data-act="siteBien" data-id="${b.id}" aria-label="Voir le bien : ${esc(b.titre)}">${bienImg(b, i)}<span class="tag">${b.operation === "Location" ? "À louer" : "À vendre"} · ${esc(b.type)}</span>${n > 1 ? `<span class="ph-count">${ico("eye", 13)} ${n} photos</span>` : ""}${b.vedette ? `<span class="ph-star">Coup de cœur</span>` : ""}</button>
    <div class="body"><h3 style="font-size:17px">${esc(b.titre)}</h3><div class="meta"><span>${ico("map", 14)} ${esc(b.quartier)}, ${esc(b.commune)}</span>${b.pieces ? `<span>${b.pieces} pièces</span>` : ""}<span>${NF.format(b.surface)} m²</span></div>
    <div class="price num">${fcfa(b.prix)}${b.operation === "Location" ? '<small style="font-size:13px;color:var(--muted);font-weight:500"> / mois</small>' : ""}</div>
    <div style="display:flex;gap:8px;margin-top:auto;flex-wrap:wrap"><button class="btn sm" data-act="siteBien" data-id="${b.id}">Détails</button><button class="btn sm primary" data-act="siteVisit" data-id="${b.id}">${ico("cal", 15)} Demander une visite</button></div></div></article>`;
}
function siteBien(id) {
  const b = byId("biens", id);
  const feats = b.desc ? b.desc.split(/[;.]\s+/).map(s => s.replace(/\.$/, "").trim()).filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1)) : [];
  openModal({ title: b.titre, icon: "build", wide: true, body: `${gallery(b)}
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end"><div><div class="hint">${ico("map", 14)} ${esc(b.quartier)}, ${esc(b.commune)} · réf. ${esc(b.ref)}</div><div class="meta" style="display:flex;gap:14px;color:var(--muted);font-size:14px;margin-top:4px">${b.pieces ? `<span>${b.pieces} pièces</span>` : ""}<span>${NF.format(b.surface)} m²</span><span>${b.operation === "Location" ? "À louer" : "À vendre"}</span></div></div><div style="font-family:var(--f-display);font-weight:800;font-size:26px;color:var(--red)" class="num">${fcfa(b.prix)}${b.operation === "Location" ? '<small style="font-size:14px;color:var(--muted);font-weight:500"> / mois</small>' : ""}</div></div>
    ${feats.length ? `<ul class="feats">${feats.map(f => `<li>${ico("check", 15)} ${esc(f)}</li>`).join("")}</ul>` : ""}`,
    foot: `<button class="btn" data-act="closeModal">Fermer</button><button class="btn primary" data-act="siteVisit" data-id="${b.id}">${ico("cal", 15)} Demander une visite</button>` });
}

/* ---------- Bloc vidéo d'accueil ---------- */
const ROT_WORDS = ["une maison ?", "un appartement ?", "une villa avec piscine ?", "un studio meublé ?", "un terrain ?", "des bureaux ?", "un gestionnaire pour votre bien ?"];
const HERO_SLIDES = ["vc_piscine", "std_salon", "bv_villa", "apt_chambre", "std_cuisine", "villa_piscine"];
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function stopHero() { clearInterval(S.rotT); S.rotT = null; }
function startHero() {
  stopHero(); const w = $("#rot-w"), v = $("#hv-video"); if (!w) return;
  if (v) { v.addEventListener("error", e => { if (e.target === v) v.hidden = true; }); const srcs = [...v.querySelectorAll("source")]; srcs[srcs.length - 1]?.addEventListener("error", () => v.hidden = true);
    if (reduceMotion()) v.pause(); else { const p = v.play(); if (p && p.catch) p.catch(() => {}); } }
  if (reduceMotion()) return;
  let i = 0;
  S.rotT = setInterval(() => {
    if (!document.body.contains(w)) return stopHero();
    w.classList.add("out");
    setTimeout(() => { i = (i + 1) % ROT_WORDS.length; w.textContent = ROT_WORDS[i]; w.classList.remove("out"); w.classList.add("pre"); void w.offsetWidth; w.classList.remove("pre"); }, 380);
  }, 2600);
}
const siteResults = () => DB.biens.filter(b => b.statut === "Disponible" && b.operation === S.siteOp && (!S.siteCommune || b.commune === S.siteCommune) && (!S.siteType || b.type === S.siteType)).sort((a, b) => (b.vedette ? 1 : 0) - (a.vedette ? 1 : 0) || (b.photos || []).length - (a.photos || []).length);
function offresHTML() {
  const res = siteResults();
  return `<div class="wrap"><div class="sec-title"><div><div class="eyebrow">${S.siteOp === "Location" ? "À louer" : "À vendre"}${S.siteCommune ? " · " + esc(S.siteCommune) : ""}${S.siteType ? " · " + esc(S.siteType) : ""}</div><h2>Biens disponibles</h2><p>${res.length} bien(s) correspondant à votre recherche. Cliquez sur une photo pour voir toute la galerie.</p></div>${S.siteCommune || S.siteType ? `<button class="btn sm" data-act="siteReset">Effacer les filtres</button>` : `<div class="seg" style="min-width:220px">${["Location", "Vente"].map(o => `<button class="${S.siteOp === o ? "on" : ""}" data-act="siteOp2" data-v="${o}">${o === "Location" ? "À louer" : "À vendre"}</button>`).join("")}</div>`}</div>
  ${res.length ? `<div class="listings">${res.map(listingCard).join("")}</div>` : `<div class="panel empty">Aucun bien ne correspond pour le moment. <button class="btn sm" data-act="siteContact">Laissez-nous votre recherche</button></div>`}</div>`;
}
function heroCount() { const n = siteResults().length, b = $("#hv-go"); if (b) b.innerHTML = `${ico("search", 16)} Rechercher <span class="num">(${n})</span>`; }
function renderSite() {
  stopHero(); S.heroPaused = false;
  const A = DB.agency, gal = [["villa_piscine", "Villa duplex, Riviera Golf"], ["std_cuisine", "Cuisine équipée, Biétry"], ["vc_salon", "Séjour, Riviera 3"], ["bv_terrasse", "Terrasse, Bingerville"], ["apt_sdb", "Salle de bain, Cannebière"], ["imm_facade", "Résidence neuve, Angré"]];
  const svc = [["key", "Gestion locative", "Recherche de locataires, encaissement des loyers, quittances, états des lieux et suivi des travaux pour le compte des propriétaires."], ["home", "Location", "Appartements, villas, studios et bureaux à Abidjan, visités et vérifiés par nos agents."], ["build", "Achat & vente", "Terrains avec ACD, villas et immeubles : estimation, mise en relation et accompagnement jusqu'au notaire."], ["layers", "Syndic de copropriété", "Appels de charges, entretien des parties communes, assemblées générales et recouvrement."], ["scale", "Conseil", "Rédaction de baux et mandats, gestion des litiges, conseil en investissement immobilier."]];
  $("#root").innerHTML = `
  <header class="site-head"><div class="wrap"><img src="${LOGO}" alt="KSARA Agence"><nav class="site-nav" aria-label="Navigation principale"><a href="#services" data-act="scroll" data-to="services">Services</a><a href="#offres" data-act="scroll" data-to="offres">Nos offres</a><a href="#methode" data-act="scroll" data-to="methode">Notre méthode</a><a href="#contact" data-act="scroll" data-to="contact">Contact</a></nav><button class="btn primary" data-act="toLogin">${ico("user", 16)} Espace pro & client</button></div></header>
  <section class="hv" aria-label="Présentation de l'agence">
    <div class="hv-media" aria-hidden="true">
      <div class="hv-slides">${HERO_SLIDES.map((k, i) => `<i style="background-image:url(${ph(k)});animation-delay:${i * 5}s"></i>`).join("")}</div>
      <video id="hv-video" class="hv-video" autoplay muted loop playsinline preload="auto" poster="${ph("poster")}"><source src="${import.meta.env.BASE_URL}media/hero.mp4" type="video/mp4"><source src="${import.meta.env.BASE_URL}media/hero.webm" type="video/webm"></video>
    </div>
    <div class="hv-shade"></div>
    <div class="wrap hv-in">
      <div class="kicker">KSARA Agence · ${esc(A.adresse)}</div>
      <h1 class="hv-title"><span class="hv-l1">Vous cherchez</span><span class="rot" aria-hidden="true"><span class="rot-w" id="rot-w">${ROT_WORDS[0]}</span></span><span class="sr-only">une maison, un appartement, une villa, un studio, un terrain ou des bureaux ?</span></h1>
      <p class="lead">Location · Achat · Vente · Conseil & Gestion locative.<br>Un accompagnement sur-mesure pour tous vos projets immobiliers.</p>
      <form class="hv-search" data-form="siteSearch" aria-label="Rechercher un bien">
        <div class="seg" role="group" aria-label="Type d'opération">${["Location", "Vente"].map(o => `<button type="button" class="${S.siteOp === o ? "on" : ""}" data-act="siteOp" data-v="${o}" aria-pressed="${S.siteOp === o}">${o === "Location" ? "Louer" : "Acheter"}</button>`).join("")}</div>
        <select class="input" id="s_com" name="commune" aria-label="Commune"><option value="">Toutes les communes</option>${COMMUNES.map(c => `<option ${S.siteCommune === c ? "selected" : ""}>${c}</option>`).join("")}</select>
        <select class="input" id="s_type" name="type" aria-label="Type de bien"><option value="">Tous les types de biens</option>${["Appartement", "Villa", "Studio", "Bureau", "Magasin", "Terrain"].map(c => `<option ${S.siteType === c ? "selected" : ""}>${c}</option>`).join("")}</select>
        <button class="btn primary" type="submit" id="hv-go">${ico("search", 16)} Rechercher</button></form>
      <div class="hero-stats"><div><b class="num">${DB.biens.length}</b><span>biens sous gestion</span></div><div><b class="num">${new Set(DB.biens.map(b => b.commune)).size}</b><span>communes couvertes</span></div><div><b class="num">${DB.biens.filter(b => b.statut === "Disponible").length}</b><span>biens disponibles</span></div></div>
    </div>
    <button class="hv-pause" data-act="heroPause" aria-label="Mettre la vidéo en pause"><span id="hv-pi">${ico("pause", 16)}</span></button>
  </section>
  <section class="band" id="services"><div class="wrap"><div class="sec-title"><div><div class="eyebrow">Gestion · Location · Vente · Syndic · Conseil</div><h2>Cinq métiers, un seul interlocuteur</h2><p>Chaque dossier est suivi par un service dédié et reste consultable par le propriétaire ou le locataire depuis son portail.</p></div></div>
    <div class="services">${svc.map(s => `<div class="svc"><span class="ico">${ico(s[0], 20)}</span><h3>${s[1]}</h3><p>${s[2]}</p></div>`).join("")}</div></div></section>
  <section class="band alt" id="offres">${offresHTML()}</section>
  <section class="band" id="galerie"><div class="wrap"><div class="sec-title"><div><div class="eyebrow">Nos réalisations</div><h2>Des biens visités et sélectionnés par nos agents</h2></div></div>
    <div class="mosaic">${gal.map((g, i) => `<figure class="m${i}"><img src="${ph(g[0])}" alt="${esc(g[1])}" loading="lazy"><figcaption>${esc(g[1])}</figcaption></figure>`).join("")}</div></div></section>
  <section class="band alt" id="methode"><div class="wrap"><div class="sec-title"><div><div class="eyebrow">Propriétaires</div><h2>Comment se passe la gestion de votre bien</h2></div></div>
    <div class="steps">${[["Mandat", "Estimation du loyer et signature du mandat de gestion."], ["Mise en location", "Photos, publication, visites, sélection du locataire et bail rédigé par notre juriste."], ["Entrée du locataire", "État des lieux contradictoire, remise des clés, caution et avance encaissées."], ["Suivi mensuel", "Loyers encaissés, quittances envoyées, relances et travaux suivis sur votre portail."]].map((s, i) => `<div class="step"><b>Étape ${i + 1}</b><h4>${s[0]}</h4><p>${s[1]}</p></div>`).join("")}</div></div></section>
  <section class="band" id="contact"><div class="wrap contact">
    <div><div class="eyebrow">Contact</div><h2 style="font-size:32px">Contactez-nous pour organiser une visite</h2><p style="color:var(--muted);margin-top:10px;max-width:46ch">Un conseiller vous rappelle sous 24 h ouvrées. Votre demande est transmise directement au service concerné.</p>
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px"><span>${ico("phone", 16)} <b class="num">${esc(A.tel)}</b>${A.tel2 ? ` · <b class="num">${esc(A.tel2)}</b>` : ""}${A.tel3 ? ` · <b class="num">${esc(A.tel3)}</b>` : ""}</span><span>${ico("mail", 16)} ${esc(A.email)} <button class="btn ghost sm" data-act="copy" data-v="${esc(A.email)}" aria-label="Copier l'email">${ico("copy", 14)}</button></span><span>${ico("map", 16)} ${esc(A.adresse)}</span><a href="https://bit.ly/3MXx2SN" target="_blank" rel="noopener">Suivre KSARA sur Facebook</a></div></div>
    <form class="card" data-form="siteContact"><div class="grid-form"><div class="field"><label for="ct_nom">Nom complet *</label><input class="input" id="ct_nom" name="nom" required></div><div class="field"><label for="ct_tel">Téléphone *</label><input class="input" id="ct_tel" name="tel" type="tel" required placeholder="07 00 00 00 00"></div></div>
      <div class="field"><label for="ct_obj">Je souhaite</label><select class="input" id="ct_obj" name="objet"><option>Louer un bien</option><option>Acheter un bien</option><option>Confier un bien en gestion</option><option>Un syndic pour ma copropriété</option><option>Un conseil juridique</option></select></div>
      <div class="field"><label for="ct_msg">Message</label><textarea class="input" id="ct_msg" name="msg" placeholder="Commune, budget, nombre de pièces…"></textarea></div>
      <button class="btn primary" type="submit" style="align-self:flex-start">${ico("send", 16)} Envoyer ma demande</button></form></div></section>
  <footer class="site-foot"><div class="wrap"><span>© ${TODAY.getFullYear()} KSARA Agence — Location · Achat · Vente · Conseil & Gestion locative · ${esc(A.adresse)}</span><span>Plateforme SIGRH & SIGL — conception AD'GEN'CI</span></div></footer>`;
  heroCount(); startHero();
}

/* ================= CONNEXION ================= */
function renderLogin(err = "", reset = false) {
  stopHero();
  const demo = [["admin", "Administrateur"], ["service_paie1", "RH / Paie"], ["service_juridique1", "Juridique"], ["service_syndic1", "Syndic"], ["service_marketing1", "Marketing"], ["client_aka", "Portail locataire"]];
  $("#root").innerHTML = `<div class="login">
    <div class="side-art" style="background-image:linear-gradient(160deg,rgba(19,33,58,.92),rgba(19,33,58,.72)),url(${ph("villa_piscine")});background-size:cover;background-position:center"><svg class="hero-roof" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;opacity:.45"><path d="M-20 700 L300 120" stroke="#C3262E" stroke-width="3" fill="none"/><path d="M300 120 L640 760" stroke="#2470B8" stroke-width="3" fill="none"/></svg>
      <div style="position:relative"><span class="logo-on-dark" style="display:inline-block"><img src="${LOGO}" alt="KSARA" style="height:46px;display:block"></span></div>
      <div style="position:relative"><h2>Toute l'agence au même endroit.</h2><p>Personnel, congés, paie, biens, baux, loyers, contrats et contentieux : chaque service retrouve ses outils selon ses permissions.</p></div>
      <p style="position:relative;font-size:12.5px;color:#7E8BA6">Connexion chiffrée (TLS) · Double authentification disponible</p></div>
    <div class="form-side">${reset ? `<form data-form="reset"><img src="${LOGO}" alt="KSARA"><h1>Mot de passe oublié</h1><p class="hint">Saisissez votre nom d'utilisateur. L'administrateur recevra une demande de réinitialisation et vous serez contacté par SMS.</p><div class="field"><label for="r_u">Nom d'utilisateur</label><input class="input" id="r_u" name="u" required></div><button class="btn primary" type="submit" style="justify-content:center">Envoyer la demande</button><button class="btn ghost" type="button" data-act="toLogin">← Retour à la connexion</button></form>` :
    `<form data-form="login" autocomplete="on"><img src="${LOGO}" alt="KSARA"><div><h1>Bienvenue chez KSARA Agence</h1><p class="hint" style="margin-top:6px">Veuillez vous connecter pour accéder à votre espace.</p></div>
      <div class="field"><label for="l_u">Nom d'utilisateur</label><input class="input" id="l_u" name="u" autocomplete="username" required placeholder="ex. service_paie1"></div>
      <div class="field"><label for="l_p">Mot de passe</label><input class="input" id="l_p" name="p" type="password" autocomplete="current-password" required></div>
      ${err ? `<p class="err" role="alert">${esc(err)}</p>` : ""}
      <button class="btn primary" type="submit" style="justify-content:center">Connexion</button>
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:14px"><a href="#" data-act="toReset">Mot de passe oublié ?</a><a href="#" data-act="assist">Contacter l'assistance</a></div>
      <div style="border-top:1px solid var(--line);padding-top:14px"><p class="hint" style="margin-bottom:8px">Comptes de démonstration (mot de passe : <b>ksara2026</b>)</p><div class="demo-acc">${demo.map(d => `<button type="button" data-act="demoLogin" data-u="${d[0]}"><b>${d[1]}</b><span>${d[0]}</span></button>`).join("")}</div></div>
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" type="button" data-act="toSite">← Retour au site de l'agence</button><button class="btn ghost sm" type="button" data-act="resetDemo">Réinitialiser la démo</button></div></form>`}</div></div>`;
}

/* ================= APP SHELL ================= */
function navHTML() {
  const mods = MODULES.filter(m => can(m.id)); const groups = {};
  mods.forEach(m => (groups[m.g] ||= []).push(m));
  const counts = { conges: DB.conges.filter(c => c.statut === "En attente").length, recouvrement: DB.paiements.filter(p => p.statut === "Impayé").length, contentieux: DB.contentieux.filter(c => c.statut === "En cours").length, p_pay: role() === "client" ? clientPaiements().filter(p => p.statut === "Impayé").length : 0 };
  return Object.entries(groups).map(([g, ms]) => `<div class="sb-group">${esc(g)}</div>${ms.map(m => `<button class="sb-link ${S.page === m.id ? "on" : ""}" data-act="go" data-p="${m.id}">${ico(m.i, 17)}<span>${esc(m.label)}</span>${counts[m.id] ? `<span class="count num">${counts[m.id]}</span>` : ""}</button>`).join("")}`).join("");
}
function renderApp() {
  stopHero();
  const mod = MODULES.find(m => m.id === S.page);
  const unread = myNotifs().filter(n => !n.lu).length;
  const u = S.user;
  const help = HELP[S.page] && !hiddenHelp().includes(S.page) ? `<div class="help-tip">${ico("help", 18)}<div style="flex:1"><b>Comment faire ?</b> ${HELP[S.page]}</div><button class="btn ghost sm" data-act="hideHelp" aria-label="Masquer l'aide">${ico("x", 14)}</button></div>` : "";
  $("#root").innerHTML = `<div class="app ${S.nav ? "nav-open" : ""}">
    <aside class="sidebar" data-tour="nav" aria-label="Modules"><div class="sb-brand"><span class="logo-on-dark"><img src="${LOGO}" alt="KSARA" style="height:34px;display:block"></span></div>
      <div class="sb-user">${avatar(u.nom, "var(--red)")}<div style="min-width:0"><b>${esc(u.username)}</b><span>${esc(u.poste)} · ${esc(svcName(u.service))}</span></div></div>
      <nav>${navHTML()}</nav>
      <div class="sb-group">Session</div><button class="sb-link" data-act="logout">${ico("logout", 17)}<span>Déconnexion</span></button></aside>
    <div class="scrim" data-act="navClose"></div>
    <div class="main"><header class="topbar"><button class="icon-btn menu-btn" data-act="navOpen" aria-label="Ouvrir le menu">${ico("menu")}</button>
      <div style="min-width:0"><div class="crumb">${esc(mod?.g || "")}</div><h1>${esc(mod?.label || "")}</h1></div>
      <div class="right"><button class="icon-btn" data-act="tour" data-tour="help" title="Guide de prise en main" aria-label="Guide de prise en main">${ico("help")}</button><button class="icon-btn" data-act="theme" title="Changer de thème" aria-label="Changer de thème">${ico("moon")}</button><button class="icon-btn" data-act="openNotifs" data-tour="notif" aria-label="Notifications">${ico("bell")}${unread ? '<span class="dot"></span>' : ""}</button></div></header>
      <main class="content" id="content"><div class="content-in">${help}${(PAGES[S.page] || (() => `<div class="panel empty">Module en préparation.</div>`))()}</div></main></div></div>`;
  (AFTER[S.page] || (() => {}))();
}
function hiddenHelp() { try { return JSON.parse(sGet("ksara_help_" + S.user.username) || "[]"); } catch (e) { return []; } }
function go(p) { if (!can(p)) { toast("Vous n'avez pas la permission d'ouvrir ce module."); return; } S.page = p; S.nav = false; renderApp(); const c = $("#content"); if (c) c.scrollTop = 0; }
function rerender() { if (S.view === "app") renderApp(); else if (S.view === "site") renderSite(); }

function login(u, p) {
  const user = DB.users.find(x => x.username.toLowerCase() === u.toLowerCase());
  if (!user || user.password !== p) return renderLogin("Nom d'utilisateur ou mot de passe incorrect. Vérifiez la saisie ou utilisez « Mot de passe oublié ».");
  if (!user.actif) return renderLogin("Ce compte est désactivé. Contactez l'administrateur.");
  S.user = user; S.view = "app"; S.page = user.role === "client" ? "p_dash" : "dash"; S.f = {};
  sSet("ksara_session", user.id); log("Connexion", "dash");
  renderApp();
  if (!DB.tourDone[user.username]) setTimeout(() => { if (!$("#modal-root").innerHTML && S.view === "app") startTour(); }, 350);
}
function logout() { log("Déconnexion", "dash"); S.user = null; S.view = "login"; sDel("ksara_session"); renderLogin(); }

/* ---------- Notifications ---------- */
function openNotifs() {
  const list = myNotifs();
  const cIco = { SMS: ["sms", "var(--ok-soft)", "var(--ok)"], Email: ["mail", "var(--blue-soft)", "var(--blue)"], Alerte: ["alert", "var(--bad-soft)", "var(--bad)"], Système: ["bell", "var(--surface-2)", "var(--muted)"] };
  $("#drawer-root").innerHTML = `<div class="scrim" style="display:block;z-index:54" data-act="closeDrawer"></div><aside class="drawer" aria-label="Notifications"><div class="modal-h"><h3>Notifications</h3><button class="btn sm" style="margin-left:auto" data-act="readAll">Tout marquer lu</button><button class="btn ghost sm" data-act="closeDrawer" aria-label="Fermer">${ico("x")}</button></div>
    <div class="list">${list.length ? list.map(n => { const c = cIco[n.canal] || cIco.Système; return `<div class="notif ${n.lu ? "" : "unread"}"><span class="ic" style="background:${c[1]};color:${c[2]}">${ico(c[0], 16)}</span><div><b>${esc(n.titre)}</b><div style="font-size:14px">${esc(n.txt)}</div><small>${esc(n.canal)} · ${fdt(n.date)}</small></div></div>`; }).join("") : `<div class="empty">Aucune notification.</div>`}</div>
    ${can("messages") ? `<div class="modal-f"><button class="btn blue" data-act="goMessages">${ico("sms", 16)} Envoyer un SMS / une alerte</button></div>` : ""}</aside>`;
}

/* ---------- Guide de première connexion ---------- */
const TOUR = {
  staff: [
    { sel: "[data-tour=greet]", t: "Bienvenue sur la plateforme KSARA", p: "Votre tableau de bord résume ce qui demande votre attention aujourd'hui." },
    { sel: "[data-tour=nav]", t: "Vos modules", p: "Le menu n'affiche que les modules autorisés pour votre poste. Les pastilles rouges signalent les éléments à traiter." },
    { sel: "[data-tour=quick]", t: "Actions rapides", p: "Les tâches les plus fréquentes de votre service sont à un clic : chaque action ouvre un formulaire guidé." },
    { sel: "[data-tour=notif]", t: "Notifications & alertes", p: "Fins de bail, impayés, audiences, demandes de congé : les alertes arrivent ici et peuvent partir par SMS ou email." },
    { sel: "[data-tour=help]", t: "Besoin d'aide ?", p: "Relancez ce guide à tout moment. Chaque module affiche aussi un encadré « Comment faire ? »." }
  ],
  client: [
    { sel: "[data-tour=greet]", t: "Votre portail KSARA", p: "Retrouvez vos biens, vos paiements et vos documents en un seul endroit." },
    { sel: "[data-tour=quick]", t: "Payer en ligne", p: "Réglez votre loyer par Mobile Money ou carte. La quittance est générée automatiquement." },
    { sel: "[data-tour=notif]", t: "Alertes", p: "Rappels d'échéance et quittances envoyées apparaissent ici." }
  ]
};
let TS = { i: -1, steps: [] };
function startTour() { if (S.page !== "dash" && S.page !== "p_dash") { S.page = role() === "client" ? "p_dash" : "dash"; renderApp(); } TS = { i: 0, steps: TOUR[role() === "client" ? "client" : "staff"] }; showTourStep(); }
function showTourStep() {
  const st = TS.steps[TS.i]; if (!st) return endTour();
  let el = $(st.sel); const r0 = el?.getBoundingClientRect();
  if (!el || !r0.width || r0.right <= 0) { TS.i++; return showTourStep(); }
  el.scrollIntoView({ block: "nearest" });
  const r = el.getBoundingClientRect(), pad = 6;
  const tipTop = r.bottom + 190 < innerHeight ? r.bottom + 12 : Math.max(12, r.top - 200);
  const tipLeft = Math.min(Math.max(12, r.left), innerWidth - Math.min(320, innerWidth - 32) - 12);
  $("#tour-root").innerHTML = `<div class="tour-bg"><div class="tour-hole" style="top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${Math.min(r.height + pad * 2, innerHeight)}px"></div></div>
    <div class="tour-tip" role="dialog" aria-label="Guide" style="top:${tipTop}px;left:${tipLeft}px"><h4>${esc(st.t)}</h4><p>${esc(st.p)}</p><div class="row"><small>${TS.i + 1} / ${TS.steps.length}</small><button class="btn ghost sm" data-act="tourEnd">Passer</button><button class="btn primary sm" data-act="tourNext">${TS.i === TS.steps.length - 1 ? "Terminer" : "Suivant"}</button></div></div>`;
}
function endTour() { $("#tour-root").innerHTML = ""; TS.i = -1; DB.tourDone[S.user.username] = true; saveDB(); }

/* ================= Composants de page ================= */
const PAGES = {}, AFTER = {}, HELP = {};
const kpi = (l, v, d = "", dir = "") => `<div class="kpi"><span class="l">${esc(l)}</span><span class="v">${v}</span>${d ? `<span class="d ${dir}">${d}</span>` : ""}</div>`;
function tabsHTML(tabs) { const st = (S.f[S.page] ||= {}); const cur = st.tab || tabs[0][0]; return { cur, html: `<div class="tabs" role="tablist">${tabs.map(t => `<button role="tab" class="${t[0] === cur ? "on" : ""}" data-act="ptab" data-t="${t[0]}">${esc(t[1])}</button>`).join("")}</div>` }; }
const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); return [1, 2, 2.5, 5, 10].find(x => x * p >= v) * p; };
function barChart(labels, series, h = 220) {
  const W = 640, H = h, L = 52, B = 26, T = 10, R = 8;
  const max = niceMax(Math.max(1, ...series.flatMap(s => s.data)));
  const gw = (W - L - R) / labels.length, bw = Math.min(26, (gw - 14) / series.length);
  let g = "";
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = H - B - (H - B - T) * i / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-dasharray="${i ? "3 4" : ""}"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${kfmt(v)}</text>`; }
  labels.forEach((lb, i) => {
    const x0 = L + gw * i + (gw - bw * series.length) / 2;
    series.forEach((s, j) => { const v = s.data[i], bh = (H - B - T) * v / max; g += `<rect x="${x0 + j * bw}" y="${H - B - bh}" width="${bw - 3}" height="${Math.max(0, bh)}" rx="3" fill="${s.c}"><title>${esc(s.n)} — ${esc(lb)} : ${fcfa(v)}</title></rect>`; });
    g += `<text x="${L + gw * i + gw / 2}" y="${H - 8}" text-anchor="middle">${esc(lb)}</text>`;
  });
  return `<div class="legend" style="margin-bottom:8px">${series.map(s => `<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join("")}</div><div style="overflow-x:auto"><svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="min-width:420px" role="img" aria-label="Graphique">${g}</svg></div>`;
}
function hbars(rows, color = "var(--blue)", fmt = v => NF.format(v)) { const max = Math.max(1, ...rows.map(r => r[1])); return `<div class="bars">${rows.map(r => `<div class="bar-row"><span>${esc(r[0])}</span><span class="track"><i style="width:${(r[1] / max * 100).toFixed(1)}%;background:${r[2] || color}"></i></span><span class="r">${fmt(r[1])}</span></div>`).join("")}</div>`; }
const quick = (items) => `<div class="panel" data-tour="quick"><div class="panel-h"><h3>Actions rapides</h3><span class="sub">Les tâches courantes de votre service</span></div><div class="panel-b"><div class="quick">${items.filter(Boolean).map(q => `<button data-act="${q[2]}" ${q[3] ? `data-p="${q[3]}"` : ""}><span class="qi">${ico(q[0], 16)}</span>${esc(q[1])}</button>`).join("")}</div></div></div>`;
const actBtn = (act, id, label, cls = "") => `<button class="btn sm ${cls}" data-act="${act}" data-id="${esc(id)}">${label}</button>`;

/* ---------- Calculs transverses ---------- */
const curMonth = () => monthKey(TODAY);
const impayes = () => DB.paiements.filter(p => p.statut === "Impayé");
const empActifs = () => DB.employes.filter(e => e.statut !== "Sorti");
function alerts() {
  const a = [];
  DB.baux.filter(b => b.statut !== "Terminé").forEach(b => { const d = daysBetween(TODAY, b.fin); if (d <= 90) a.push({ lvl: d <= 45 ? "bad" : "warn", t: `Fin de bail dans ${d} j`, s: bailLabel(b.id), p: "locatif" }); });
  DB.contentieux.filter(c => c.statut === "En cours" && c.audience).forEach(c => { const d = daysBetween(TODAY, c.audience); if (d >= 0 && d <= 30) a.push({ lvl: "warn", t: `Audience le ${fdate(c.audience)}`, s: c.objet, p: "contentieux" }); });
  const imp = impayes(); if (imp.length) a.push({ lvl: "bad", t: `${imp.length} loyer(s) impayé(s)`, s: fcfa(imp.reduce((s, p) => s + p.montant, 0)) + " à recouvrer", p: "recouvrement" });
  const cg = DB.conges.filter(c => c.statut === "En attente").length; if (cg) a.push({ lvl: "warn", t: `${cg} demande(s) de congé`, s: "En attente de validation", p: "conges" });
  DB.travaux.filter(t => t.statut !== "Terminé" && daysBetween(TODAY, t.date) <= 7).forEach(t => a.push({ lvl: "info", t: `Travaux ${daysBetween(TODAY, t.date) <= 0 ? "aujourd'hui" : "le " + fdate(t.date)}`, s: t.objet + " — " + bienName(t.bien), p: "travaux" }));
  DB.factures.filter(f => f.statut === "En retard").forEach(f => a.push({ lvl: "bad", t: `Facture ${f.no} en retard`, s: cliName(f.client), p: "facturation" }));
  DB.contrats.filter(k => k.statut === "À signer").forEach(k => a.push({ lvl: "warn", t: `Contrat à signer`, s: k.modele + " — " + k.ref, p: "contrats" }));
  return a.filter(x => can(x.p));
}
const alertsPanel = (title = "Alertes & échéances") => { const a = alerts(); return `<div class="panel"><div class="panel-h"><h3>${title}</h3><span class="pill ${a.length ? "bad" : "ok"}">${a.length}</span></div>${a.length ? `<div>${a.slice(0, 8).map(x => `<button data-act="go" data-p="${x.p}" style="display:flex;gap:12px;width:100%;text-align:left;padding:12px 18px;border:0;border-bottom:1px solid var(--line);background:none;cursor:pointer;align-items:center"><span class="pill ${x.lvl}" style="padding:0 6px">&nbsp;</span><span style="min-width:0"><b style="display:block;color:var(--ink)">${esc(x.t)}</b><span class="hint">${esc(x.s)}</span></span></button>`).join("")}</div>` : `<div class="empty">Rien d'urgent. Tout est à jour.</div>`}</div>`; };
function monthSeries(n = 6) { const ks = []; for (let i = n - 1; i >= 0; i--) ks.push(monthKey(new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1))); return ks; }
function finMonth(k) { const e = DB.ecritures.filter(x => x.mois === k); return { in: e.filter(x => x.sens === "in").reduce((s, x) => s + x.montant, 0), out: e.filter(x => x.sens === "out").reduce((s, x) => s + x.montant, 0) }; }
function financeChart() { const ks = monthSeries(); return barChart(ks.map(k => MONTHS[+k.slice(5) - 1]), [{ n: "Encaissements", c: "var(--blue)", data: ks.map(k => finMonth(k).in) }, { n: "Décaissements", c: "var(--red)", data: ks.map(k => finMonth(k).out) }]); }
function activityPanel(compact) {
  const st = (S.f.act ||= { per: "Semaine", svc: "" });
  const days = { Jour: 1, Semaine: 7, Mois: 30 }[st.per];
  const since = addDays(new Date(), -days);
  const logs = DB.logs.filter(l => new Date(l.date) >= since && l.service !== "public" && (!st.svc || l.service === st.svc));
  const by = SERVICES.map(s => [s.name, logs.filter(l => l.service === s.id).length]).filter(r => !st.svc || r[0] === svcName(st.svc));
  return `<div class="panel"><div class="panel-h"><h3>Suivi des activités des services</h3><div class="act"><div class="seg" style="min-width:220px">${["Jour", "Semaine", "Mois"].map(p => `<button class="${st.per === p ? "on" : ""}" data-act="actPer" data-v="${p}">${p}</button>`).join("")}</div><select class="input" style="width:auto;padding:7px 10px" data-on="actSvc" aria-label="Service"><option value="">Tous les services</option>${SERVICES.map(s => `<option value="${s.id}" ${st.svc === s.id ? "selected" : ""}>${s.name}</option>`).join("")}</select></div></div>
    <div class="panel-b" style="display:flex;flex-direction:column;gap:16px">${hbars(by, "var(--blue)")}
    ${compact ? "" : `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Service</th><th>Utilisateur</th><th>Action</th></tr></thead><tbody>${logs.slice(0, 40).map(l => `<tr><td class="num" style="white-space:nowrap">${fdt(l.date)}</td><td><span class="tag">${esc(svcName(l.service))}</span></td><td>${esc(l.user)}</td><td>${esc(l.action)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Aucune activité sur la période.</td></tr>`}</tbody></table></div>`}
    ${compact ? `<p class="hint">${logs.length} action(s) enregistrée(s) sur la période. <a href="#" data-act="go" data-p="activites">Voir le détail</a></p>` : ""}</div></div>`;
}

/* ================= TABLEAUX DE BORD ================= */
function greet(sub, extra = "") { const u = S.user; const name = role() === "admin" ? (DB.agency.nom || "Admin") : role() === "client" ? u.nom : u.username;
  return `<div class="greet" data-tour="greet">${avatar(name, "var(--red)")}<div style="flex:1;min-width:200px"><h2>Bonjour ${esc(name)},</h2><p>${sub}</p></div>${extra}</div>`; }
function profileCompletion() { const a = DB.agency, f = ["nom", "prenomAdmin", "nomAdmin", "tel", "email", "adresse", "rccm"]; return Math.round(f.filter(k => a[k]).length / f.length * 100); }
PAGES.dash = () => {
  const r = role(), dateTxt = TODAY.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const biensG = DB.biens.length, loues = DB.biens.filter(b => b.statut === "Loué").length;
  const enc = DB.paiements.filter(p => p.mois === curMonth() && p.statut === "Payé").reduce((s, p) => s + p.montant, 0);
  const imp = impayes(), impM = imp.reduce((s, p) => s + p.montant, 0);
  if (r === "admin") {
    const pc = profileCompletion();
    return greet(`Nous sommes le ${dateTxt}. Voici l'état de l'agence.`, `<div style="min-width:220px;display:flex;flex-direction:column;gap:6px"><span class="hint">Profil de l'agence complété à <b class="num">${pc} %</b></span><div class="progress"><i style="width:${pc}%"></i></div><button class="btn sm" data-act="editAgency" style="align-self:flex-start">${ico("edit", 14)} Compléter votre profil</button></div>`) +
      `<div class="kpis">${kpi("Biens gérés", biensG, `${Math.round(loues / biensG * 100)} % d'occupation`, "up")}${kpi("Loyers encaissés (mois)", `<span class="num">${kfmt(enc)}</span>`, fcfa(enc))}${kpi("Impayés", imp.length, fcfa(impM), "down")}${kpi("Effectif", empActifs().length, `${DB.employes.filter(e => e.statut === "Stagiaire").length} stagiaires · ${DB.employes.filter(e => e.statut === "Consultant").length} consultant`)}</div>` +
      quick([["shield", "Créer un utilisateur", "newUser"], ["build", "Ajouter un bien", "newBien"], ["user", "Ajouter un client", "newClient"], ["mail", "Envoyer une newsletter", "go", "emailing"], ["sms", "Envoyer un SMS", "go", "messages"], ["star", "Annuaire prestataires", "go", "prestataires"]]) +
      `<div class="cols c21"><div class="panel"><div class="panel-h"><h3>Activité financière globale</h3><span class="sub">6 derniers mois</span><div class="act"><button class="btn sm" data-act="go" data-p="finance">Détail</button></div></div><div class="panel-b">${financeChart()}</div></div>${alertsPanel()}</div>
      <div class="cols c2">${activityPanel(true)}<div class="panel"><div class="panel-h"><h3>Biens par commune</h3><div class="act"><button class="btn sm" data-act="go" data-p="biens">${ico("map", 14)} Cartographie</button></div></div><div class="panel-b">${hbars(COMMUNES.map(c => [c, DB.biens.filter(b => b.commune === c).length]).filter(x => x[1]), "var(--red)")}</div></div></div>
      <div class="panel"><div class="panel-h"><h3>Portefeuille clients & prospects</h3><span class="sub">${DB.clients.length} contacts</span><div class="act"><button class="btn sm" data-act="go" data-p="clients">Voir l'annuaire</button></div></div><div class="panel-b"><div class="vcards">${DB.clients.slice(-4).reverse().map(clientCard).join("")}</div></div></div>`;
  }
  if (r === "rh") {
    const masse = DB.employes.reduce((s, e) => s + e.salaire, 0);
    return greet(`Service RH / Paie — ${dateTxt}.`) +
      `<div class="kpis">${kpi("Effectif", empActifs().length)}${kpi("Masse salariale brute", `<span class="num">${kfmt(masse)}</span>`, fcfa(masse))}${kpi("Congés à valider", DB.conges.filter(c => c.statut === "En attente").length)}${kpi("Factures à encaisser", DB.factures.filter(f => f.statut !== "Payée").length, fcfa(DB.factures.filter(f => f.statut !== "Payée").reduce((s, f) => s + factTotal(f).ttc, 0)), "down")}</div>` +
      quick([["file", "Créer une facture", "newFacture"], ["wallet", "Préparer la paie", "go", "paie"], ["cart", "Demande d'achat", "newAchat"], ["box", "Ajouter à l'inventaire", "newInv"], ["cal", "Valider les congés", "go", "conges"], ["users", "Ajouter un employé", "newEmp"]]) +
      `<div class="cols c2">${alertsPanel("Rappels & échéances")}${recentLog("rh")}</div>`;
  }
  if (r === "juridique") {
    return greet(`Service juridique — ${dateTxt}.`) +
      `<div class="kpis">${kpi("Contrats à signer", DB.contrats.filter(k => k.statut === "À signer").length)}${kpi("Contentieux en cours", DB.contentieux.filter(c => c.statut === "En cours").length)}${kpi("Baux à échéance (90 j)", DB.baux.filter(b => b.statut !== "Terminé" && daysBetween(TODAY, b.fin) <= 90).length)}${kpi("Contrats archivés", DB.contrats.length)}</div>` +
      quick([["scale", "Établir un contrat", "newContrat"], ["gavel", "Ouvrir un dossier contentieux", "newContentieux"], ["file", "Modèles de contrats", "go", "contrats"], ["key", "Consulter les baux", "go", "locatif"]]) +
      `<div class="cols c2">${alertsPanel("Alertes juridiques")}${recentLog("juridique")}</div>`;
  }
  if (r === "syndic" || r === "gestion") {
    return greet(`Gestion locative & syndic — ${dateTxt}.`) +
      `<div class="kpis">${kpi("Biens gérés", biensG, `${loues} loués`)}${kpi("Loyers encaissés (mois)", `<span class="num">${kfmt(enc)}</span>`, fcfa(enc), "up")}${kpi("Impayés", imp.length, fcfa(impM), "down")}${kpi("Travaux à venir", DB.travaux.filter(t => t.statut !== "Terminé").length)}</div>` +
      quick([["inout", "Entrée d'un locataire", "newBail"], ["clip", "État des lieux", "newEdl"], ["receipt", "Encaisser un loyer", "go", "quittances"], ["sms", "Relancer les impayés", "go", "recouvrement"], ["layers", "Appel de charges", "newCharge"], ["build", "Ajouter un bien", "newBien"]]) +
      `<div class="cols c2">${alertsPanel()}${recentLog(r)}</div>`;
  }
  if (r === "marketing") {
    const pros = DB.clients.filter(c => c.type === "Prospect");
    return greet(`Marketing & prospection — ${dateTxt}.`) +
      `<div class="kpis">${kpi("Prospects", pros.length)}${kpi("Biens disponibles", DB.biens.filter(b => b.statut === "Disponible").length)}${kpi("Campagnes envoyées", DB.campagnes.length)}${kpi("Ouverture moyenne", Math.round(DB.campagnes.reduce((s, c) => s + c.ouverture, 0) / Math.max(1, DB.campagnes.length)) + " %")}</div>` +
      quick([["user", "Ajouter un prospect", "newClient"], ["mail", "Préparer une newsletter", "go", "emailing"], ["build", "Biens disponibles", "go", "biens"]]) +
      `<div class="panel"><div class="panel-h"><h3>Derniers prospects</h3><div class="act"><button class="btn sm" data-act="go" data-p="clients">Annuaire</button></div></div><div class="panel-b"><div class="vcards">${pros.slice(-6).reverse().map(clientCard).join("") || '<p class="hint">Aucun prospect.</p>'}</div></div></div>`;
  }
  return greet("Bienvenue.");
};
function recentLog(svc) { const l = DB.logs.filter(x => x.service === svc).slice(0, 8); return `<div class="panel"><div class="panel-h"><h3>Historique récent du service</h3><div class="act"><button class="btn sm" data-act="go" data-p="historique">Tout voir</button></div></div>${l.length ? `<div class="panel-b"><div class="timeline">${l.map(x => `<div>${esc(x.action)}<small>${fdt(x.date)} · ${esc(x.user)}</small></div>`).join("")}</div></div>` : `<div class="empty">Aucune action enregistrée pour l'instant.</div>`}</div>`; }
PAGES.activites = () => activityPanel(false);
HELP.activites = "Choisissez la période (Jour, Semaine, Mois) et un service pour voir qui a fait quoi. Chaque action enregistrée dans la plateforme apparaît ici automatiquement.";
HELP.dash = "Commencez par les <b>alertes</b> (à droite ou en bas) : chacune ouvre directement le module où agir. Les <b>actions rapides</b> lancent les formulaires guidés.";

/* ================= RESSOURCES HUMAINES ================= */
const EMP_FIELDS = () => [
  { k: "nom", l: "Nom et prénoms", req: 1 }, { k: "service", l: "Service", t: "select", opts: SERVICES.map(s => [s.id, s.name]), req: 1 },
  { k: "poste", l: "Poste", t: "select", opts: () => Object.entries(DB.postes).flatMap(([s, ps]) => ps.map(p => [p, p + " (" + svcName(s) + ")"])), req: 1 },
  { k: "statut", l: "Statut", t: "select", opts: ["Actif", "Stagiaire", "Consultant"], req: 1 }, { k: "contrat", l: "Type de contrat", t: "select", opts: ["CDI", "CDD", "Stage", "Prestation"] },
  { k: "entree", l: "Date d'entrée", t: "date", req: 1 }, { k: "salaire", l: "Salaire mensuel brut (FCFA)", t: "number", req: 1 },
  { k: "tel", l: "Téléphone", t: "tel" }, { k: "email", l: "Email", t: "email" }, { k: "naissance", l: "Date de naissance", t: "date" }, { k: "adresse", l: "Adresse", full: 1 }
];
PAGES.personnel = () => {
  const e = DB.employes;
  return `<div class="kpis">${kpi("Employés actifs", e.filter(x => x.statut === "Actif").length)}${kpi("Stagiaires", e.filter(x => x.statut === "Stagiaire").length)}${kpi("Consultants", e.filter(x => x.statut === "Consultant").length)}${kpi("Masse salariale brute", `<span class="num">${kfmt(e.reduce((s, x) => s + x.salaire, 0))}</span>`)}</div>` +
  listView({ title: "Fiches employés", sub: "Cliquez sur une ligne pour ouvrir la fiche (contrat, historique, documents).", rows: () => DB.employes, search: r => r.nom + r.poste + r.matricule, add: "Ajouter un employé", addFn: "newEmp", export: true, open: openEmp,
    filters: [{ k: "service", l: "Service", opts: SERVICES.map(s => [s.id, s.name]) }, { k: "statut", l: "Statut", opts: ["Actif", "Stagiaire", "Consultant"] }],
    cols: [{ l: "Employé", f: r => `<span class="who">${avatar(r.nom, avc(r.nom))}<span><b>${esc(r.nom)}</b><br><span class="hint num">${esc(r.matricule)}</span></span></span>` }, { l: "Service", f: r => `<span class="tag">${esc(svcName(r.service))}</span>` }, { l: "Poste", k: "poste" }, { l: "Statut", f: r => pillFor(r.statut) }, { l: "Contrat", k: "contrat" }, { l: "Entrée", f: r => fdate(r.entree) }, { l: "Salaire brut", cls: "r", f: r => NF.format(r.salaire) }],
    csv: [{ l: "Matricule", k: "matricule" }, { l: "Nom", k: "nom" }, { l: "Service", x: r => svcName(r.service) }, { l: "Poste", k: "poste" }, { l: "Statut", k: "statut" }, { l: "Contrat", k: "contrat" }, { l: "Entrée", k: "entree" }, { l: "Salaire brut", k: "salaire" }] });
};
HELP.personnel = "Pour ajouter un collaborateur, cliquez sur <b>Ajouter un employé</b>. Ouvrez une fiche pour consulter le contrat, ajouter une promotion ou une sanction à l'historique, et déposer les documents (contrat, CV, diplômes).";
function newEmp() { formModal({ title: "Ajouter un employé", fields: EMP_FIELDS(), data: { statut: "Actif", contrat: "CDI", entree: iso(TODAY) }, onSave: v => { const n = DB.employes.length + 1; const e = { id: uid("e"), matricule: "KS-" + String(n).padStart(3, "0"), ...v, historique: [{ date: v.entree, txt: "Embauche — " + v.poste }], docs: [] }; DB.employes.push(e); log("Employé ajouté — " + v.nom, "personnel"); toast("Employé ajouté"); } }); }
function openEmp(id, tab = "infos") {
  const e = byId("employes", id); if (!e) return; M.emp = id;
  const tabs = [["infos", "Informations"], ["contrat", "Contrat & salaire"], ["hist", "Historique"], ["docs", "Documents RH"]];
  let body = "";
  if (tab === "infos") body = `<dl class="dl"><dt>Matricule</dt><dd class="num">${esc(e.matricule)}</dd><dt>Service</dt><dd>${esc(svcName(e.service))}</dd><dt>Poste</dt><dd>${esc(e.poste)}</dd><dt>Statut</dt><dd>${pillFor(e.statut)}</dd><dt>Téléphone</dt><dd class="num">${esc(e.tel || "—")}</dd><dt>Email</dt><dd>${esc(e.email || "—")}</dd><dt>Naissance</dt><dd>${fdate(e.naissance)}</dd><dt>Adresse</dt><dd>${esc(e.adresse || "—")}</dd><dt>Compte plateforme</dt><dd>${esc(DB.users.find(u => u.emp === e.id)?.username || "Aucun")}</dd></dl>`;
  if (tab === "contrat") { const mv = DB.mouvements.filter(m => m.emp === id); body = `<dl class="dl"><dt>Type de contrat</dt><dd>${esc(e.contrat)}</dd><dt>Date d'entrée</dt><dd>${fdate(e.entree)}</dd><dt>Ancienneté</dt><dd>${Math.max(0, Math.floor(daysBetween(e.entree, TODAY) / 365))} an(s)</dd><dt>Salaire brut</dt><dd class="num">${fcfa(e.salaire)}</dd></dl><h4 style="font-size:15px">Avances & primes</h4>${mv.length ? mv.map(m => `<div class="doc-row"><span style="flex:1">${esc(m.type)} — ${esc(monthLabel(m.mois))}</span><b class="num">${fcfa(m.montant)}</b>${pillFor(m.statut)}</div>`).join("") : `<p class="hint">Aucune avance ni prime.</p>`}`; }
  if (tab === "hist") body = `<div class="timeline">${[...e.historique].sort((a, b) => b.date.localeCompare(a.date)).map(h => `<div>${esc(h.txt)}<small>${fdate(h.date)}</small></div>`).join("")}</div><form data-form="empHist" class="grid-form" style="border-top:1px solid var(--line);padding-top:14px"><div class="field"><label for="h_t">Type d'événement</label><select class="input" id="h_t" name="type"><option>Promotion</option><option>Changement de poste</option><option>Augmentation</option><option>Sanction</option><option>Formation suivie</option><option>Autre</option></select></div><div class="field"><label for="h_d">Date</label><input class="input" id="h_d" type="date" name="date" value="${iso(TODAY)}" required></div><div class="field" style="grid-column:1/-1"><label for="h_x">Détail</label><input class="input" id="h_x" name="txt" required placeholder="ex. Promotion — Gestionnaire senior"></div><button class="btn blue" type="submit" style="justify-self:start">${ico("plus", 15)} Ajouter à l'historique</button></form>`;
  if (tab === "docs") body = `<div style="display:flex;flex-direction:column;gap:8px">${e.docs.map((d, i) => `<div class="doc-row"><span class="ext">${esc((d.nom.split(".").pop() || "DOC").toUpperCase().slice(0, 4))}</span><span style="flex:1;min-width:0"><b>${esc(d.nom)}</b><br><span class="hint">${esc(d.type)}${d.size ? " · " + Math.round(d.size / 1024) + " Ko" : ""}</span></span><button class="btn ghost sm" data-act="empDocDel" data-id="${i}" aria-label="Supprimer">${ico("trash", 15)}</button></div>`).join("") || '<p class="hint">Aucun document.</p>'}</div>
    <div class="grid-form" style="border-top:1px solid var(--line);padding-top:14px"><div class="field"><label for="d_t">Type de document</label><select class="input" id="d_t"><option>Contrat</option><option>CV</option><option>Diplôme</option><option>Pièce d'identité</option><option>Attestation</option><option>Autre</option></select></div><div class="field"><label for="d_f">Fichier</label><input class="input" id="d_f" type="file" data-on="empDoc"></div></div><p class="hint">Les fichiers sont référencés dans la fiche. En production, ils sont stockés de façon chiffrée sur le serveur (archivage S3).</p>`;
  openModal({ title: e.nom, icon: "user", wide: true, body: `<div style="display:flex;gap:14px;align-items:center">${avatar(e.nom, avc(e.nom))}<div><b style="font-size:16px;color:var(--ink)">${esc(e.poste)}</b><div class="hint">${esc(svcName(e.service))} · ${esc(e.matricule)}</div></div></div><div class="tabs">${tabs.map(t => `<button class="${t[0] === tab ? "on" : ""}" data-act="empTab" data-t="${t[0]}">${t[1]}</button>`).join("")}</div>${body}`,
    foot: `<button class="btn" data-act="empDel">${ico("trash", 15)} Supprimer</button><button class="btn blue" data-act="empEdit">${ico("edit", 15)} Modifier</button>` });
}
PAGES.postes = () => {
  const dg = DB.employes.find(e => e.poste === "Directeur général");
  return `<div class="panel"><div class="panel-h"><h3>Organigramme</h3><span class="sub">Effectif réel par service</span></div><div class="panel-b" style="overflow-x:auto">
    <div style="display:flex;flex-direction:column;align-items:center;gap:0;min-width:760px">
      <div class="vcard" style="width:260px;text-align:center;align-items:center;border-color:var(--red)"><b style="color:var(--ink)">${esc(dg?.nom || "Direction générale")}</b><span class="hint">Directeur général</span></div>
      <div style="width:2px;height:18px;background:var(--line)"></div><div style="height:2px;background:var(--line);width:86%"></div>
      <div style="display:grid;grid-template-columns:repeat(${SERVICES.length - 1},1fr);gap:10px;width:100%">${SERVICES.filter(s => s.id !== "admin").map(s => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div style="width:2px;height:16px;background:var(--line)"></div><div style="background:var(--ink);color:var(--bg);border-radius:8px;padding:6px 10px;font-weight:700;font-size:13px;text-align:center;width:100%">${esc(s.name)}</div>${DB.employes.filter(e => e.service === s.id).map(e => `<button class="btn sm" style="width:100%;white-space:normal;flex-direction:column;align-items:flex-start;gap:0" data-act="openEmp" data-id="${e.id}"><b>${esc(e.nom)}</b><span class="hint" style="font-weight:500">${esc(e.poste)}</span></button>`).join("")}</div>`).join("")}</div></div></div></div>
  <div class="panel"><div class="panel-h"><h3>Postes par service</h3><div class="act"><button class="btn primary sm" data-act="newPoste">${ico("plus", 15)} Créer un poste</button></div></div><div class="panel-b"><div class="cols c3">${SERVICES.map(s => `<div><h4 style="font-size:15px;margin-bottom:8px">${esc(s.name)}</h4>${(DB.postes[s.id] || []).map(p => { const n = DB.employes.filter(e => e.poste === p).length; return `<div class="doc-row" style="margin-bottom:6px"><span style="flex:1">${esc(p)}</span><span class="tag num">${n} pers.</span></div>`; }).join("")}</div>`).join("")}</div></div></div>`;
};
HELP.postes = "Créez les postes de chaque service ici ; ils deviennent disponibles dans les fiches employés et lors de la création des utilisateurs. Cliquez sur une personne dans l'organigramme pour ouvrir sa fiche.";
const workDays = (a, b) => { let n = 0; for (let d = new Date(a + "T12:00:00"); d <= new Date(b + "T12:00:00"); d.setDate(d.getDate() + 1)) if (d.getDay() % 6) n++; return n; };
function congeForm(emp) {
  formModal({ title: "Demande de congé", icon: "cal", intro: "Les jours ouvrés (hors samedi et dimanche) sont calculés automatiquement. La demande part en validation auprès du service RH.",
    fields: [emp ? null : { k: "emp", l: "Employé", t: "select", opts: DB.employes.map(e => [e.id, e.nom]), req: 1 }, { k: "type", l: "Type de congé", t: "select", opts: ["Congé annuel", "Congé maladie", "Permission exceptionnelle", "Congé maternité", "Congé sans solde"], req: 1 }, { k: "debut", l: "Du", t: "date", req: 1 }, { k: "fin", l: "Au", t: "date", req: 1 }, { k: "motif", l: "Motif / commentaire", t: "textarea", full: 1 }].filter(Boolean),
    submit: "Envoyer la demande", onSave: v => { if (emp) v.emp = emp; if (v.fin < v.debut) return "La date de fin doit être postérieure à la date de début."; v.jours = workDays(v.debut, v.fin); DB.conges.unshift({ id: uid("g"), ...v, statut: "En attente" }); notify("Nouvelle demande de congé", empName(v.emp) + " — " + v.jours + " jour(s) ouvrés", ["admin", "rh"]); log("Demande de congé — " + empName(v.emp), "conges"); toast("Demande envoyée au service RH"); } });
}
PAGES.conges = () => {
  const start = addDays(TODAY, -7), span = 63, cg = DB.conges.filter(c => c.statut !== "Refusé" && c.fin >= iso(start));
  const wk = []; for (let i = 0; i < span; i += 7) wk.push(addDays(start, i));
  const pos = d => Math.min(100, Math.max(0, daysBetween(start, d) / span * 100));
  return `<div class="panel"><div class="panel-h"><h3>Planning des congés</h3><span class="sub">9 semaines à partir du ${fdate(iso(start))}</span></div><div class="panel-b" style="overflow-x:auto"><div style="min-width:640px;display:flex;flex-direction:column;gap:8px">
    <div style="display:grid;grid-template-columns:180px 1fr;gap:10px"><span></span><div style="position:relative;height:18px">${wk.map(w => `<span class="hint num" style="position:absolute;left:${pos(iso(w))}%;font-size:11.5px">${w.getDate()} ${MONTHS[w.getMonth()]}</span>`).join("")}<span style="position:absolute;left:${pos(iso(TODAY))}%;top:0;bottom:-400px;width:2px;background:var(--red);opacity:.5"></span></div></div>
    ${cg.map(c => `<div style="display:grid;grid-template-columns:180px 1fr;gap:10px;align-items:center"><span style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(empName(c.emp))}</span><div style="position:relative;height:22px;background:var(--surface-2);border-radius:6px"><span title="${esc(c.type)} — ${fdate(c.debut)} au ${fdate(c.fin)}" style="position:absolute;left:${pos(c.debut)}%;width:${Math.max(1.5, pos(c.fin) - pos(c.debut) + 1.6)}%;top:3px;bottom:3px;border-radius:5px;background:${c.statut === "Approuvé" ? "var(--blue)" : "var(--warn)"}"></span></div></div>`).join("") || '<p class="hint">Aucun congé sur la période.</p>'}
    <div class="legend"><span><i style="background:var(--blue)"></i>Approuvé</span><span><i style="background:var(--warn)"></i>En attente</span><span><i style="background:var(--red)"></i>Aujourd'hui</span></div></div></div></div>` +
  listView({ title: "Demandes de congé", rows: () => DB.conges, search: r => empName(r.emp) + r.type, add: "Nouvelle demande", addFn: "newConge",
    filters: [{ k: "statut", l: "Statut", opts: ["En attente", "Approuvé", "Refusé"] }, { k: "type", l: "Type", opts: ["Congé annuel", "Congé maladie", "Permission exceptionnelle", "Congé maternité", "Congé sans solde"] }],
    cols: [{ l: "Employé", f: r => `<b>${esc(empName(r.emp))}</b>` }, { l: "Type", k: "type" }, { l: "Période", f: r => `${fdate(r.debut)} → ${fdate(r.fin)}` }, { l: "Jours ouvrés", cls: "r", f: r => r.jours }, { l: "Statut", f: r => pillFor(r.statut) }],
    act: r => r.statut === "En attente" ? actBtn("congeOk", r.id, ico("check", 14) + " Approuver", "blue") + " " + actBtn("congeKo", r.id, "Refuser") : "" });
};
HELP.conges = "Les demandes en attente se valident avec <b>Approuver</b> ou <b>Refuser</b> : l'employé est notifié. Chaque employé peut aussi déposer sa demande depuis <b>Mon espace</b>.";
PAGES.absences = () => listView({ title: "Absences", sub: "Retards, absences justifiées ou non", rows: () => DB.absences, search: r => empName(r.emp) + r.motif, add: "Déclarer une absence", addFn: "newAbsence", export: true,
  filters: [{ k: "justif", l: "Justifiée", opts: ["Oui", "Non"] }],
  cols: [{ l: "Employé", f: r => `<b>${esc(empName(r.emp))}</b>` }, { l: "Date", f: r => fdate(r.date) }, { l: "Durée", k: "duree" }, { l: "Motif", k: "motif" }, { l: "Justifiée", f: r => pillFor(r.justif) }],
  act: r => actBtn("delAbs", r.id, ico("trash", 14)),
  csv: [{ l: "Employé", x: r => empName(r.emp) }, { l: "Date", k: "date" }, { l: "Durée", k: "duree" }, { l: "Motif", k: "motif" }, { l: "Justifiée", k: "justif" }] });
HELP.absences = "Déclarez chaque absence avec sa durée et indiquez si un justificatif a été fourni. Les absences non justifiées peuvent être reportées en retenue lors de la paie.";
PAGES.stages = () => `<div style="display:flex;justify-content:flex-end"><button class="btn primary" data-act="newStage">${ico("plus", 16)} Accueillir un stagiaire</button></div><div class="vcards" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${DB.stages.map(s => { const e = byId("employes", s.emp), tot = Math.max(1, daysBetween(s.debut, s.fin)), done = Math.min(100, Math.max(0, daysBetween(s.debut, TODAY) / tot * 100)); const moy = s.evaluations.length ? (s.evaluations.reduce((a, x) => a + x.note, 0) / s.evaluations.length).toFixed(1) : "—";
  return `<div class="vcard"><div class="top">${avatar(e?.nom, avc(e?.nom || ""))}<div><h4>${esc(e?.nom)}</h4><div class="sm">${esc(e?.poste)} · ${esc(s.ecole)}</div></div></div>
    <div class="lines"><span>Tuteur : <b>${esc(empName(s.tuteur))}</b></span><span>Du ${fdate(s.debut)} au ${fdate(s.fin)} (${Math.round(tot / 30)} mois)</span></div>
    <div><div class="progress"><i style="width:${done}%"></i></div><span class="hint num">${Math.round(done)} % de la durée écoulée</span></div>
    <div><b style="font-size:13px;color:var(--muted)">OBJECTIFS</b><ul style="margin:4px 0 0;padding-left:18px;font-size:14px">${s.objectifs.split(";").map(o => `<li>${esc(o.trim())}</li>`).join("")}</ul></div>
    <div><b style="font-size:13px;color:var(--muted)">ÉVALUATIONS · moyenne ${moy}/20</b>${s.evaluations.map(v => `<div style="font-size:13.5px;margin-top:4px"><b class="num">${v.note}/20</b> — ${esc(v.com)} <span class="hint">(${fdate(v.date)})</span></div>`).join("") || '<p class="hint">Pas encore évalué.</p>'}</div>
    <div class="foot">${actBtn("evalStage", s.id, ico("star", 14) + " Évaluer", "blue")}${actBtn("openEmp", s.emp, "Fiche")}</div></div>`; }).join("") || '<div class="panel empty">Aucun stagiaire en cours.</div>'}</div>`;
HELP.stages = "Un stagiaire se crée avec ses <b>objectifs</b> (séparés par « ; »), son tuteur et sa période. Ajoutez une évaluation notée sur 20 à chaque point d'étape.";
PAGES.formations = () => listView({ title: "Plan de formation", sub: "Formations internes et externes", rows: () => DB.formations, search: r => r.titre + r.organisme, add: "Planifier une formation", addFn: "newFormation", export: true,
  filters: [{ k: "type", l: "Type", opts: ["Interne", "Externe"] }, { k: "statut", l: "Statut", opts: ["Planifiée", "Réalisée"] }],
  cols: [{ l: "Formation", f: r => `<b>${esc(r.titre)}</b><br><span class="hint">${esc(r.organisme)}</span>` }, { l: "Type", f: r => `<span class="tag">${esc(r.type)}</span>` }, { l: "Date", f: r => fdate(r.date) }, { l: "Durée", k: "duree" }, { l: "Participants", f: r => `<span title="${esc(r.participants.map(empName).join(", "))}">${r.participants.length} pers.</span>` }, { l: "Coût", cls: "r", f: r => r.cout ? NF.format(r.cout) : "—" }, { l: "Statut", f: r => pillFor(r.statut) }],
  act: r => r.statut === "Planifiée" ? actBtn("formDone", r.id, ico("check", 14) + " Réalisée") : "",
  csv: [{ l: "Formation", k: "titre" }, { l: "Type", k: "type" }, { l: "Organisme", k: "organisme" }, { l: "Date", k: "date" }, { l: "Participants", x: r => r.participants.map(empName).join(", ") }, { l: "Coût", k: "cout" }] });
HELP.formations = "Planifiez la formation et cochez les participants. Quand elle est marquée <b>Réalisée</b>, elle s'ajoute automatiquement à l'historique de chaque participant.";

/* ---------- Paie ---------- */
const CNPS = 0.063;
function bulletin(e, mk) { const mv = DB.mouvements.filter(m => m.emp === e.id && m.mois === mk && m.statut === "Validée"); const primes = mv.filter(m => m.type.startsWith("Prime")).reduce((s, m) => s + m.montant, 0); const avances = mv.filter(m => m.type.startsWith("Avance")).reduce((s, m) => s + m.montant, 0); const brut = e.salaire + primes; const cnps = Math.round(brut * CNPS); return { brut: e.salaire, primes, avances, cnps, net: brut - cnps - avances }; }
PAGES.paie = () => {
  const { cur, html } = tabsHTML([["bul", "Paie du mois"], ["mv", "Avances & primes"], ["hist", "Historique des paiements"]]);
  const mk = curMonth(), done = DB.paies.find(p => p.mois === mk);
  let body = "";
  if (cur === "bul") { const rows = DB.employes.map(e => ({ e, b: bulletin(e, mk) })); const tot = rows.reduce((s, r) => s + r.b.net, 0);
    body = `<div class="panel"><div class="panel-h"><div><h3>Paie de ${esc(monthLabel(mk))}</h3><div class="sub">${done ? "Paie validée le " + fdate(done.date) : "Brouillon — vérifiez puis validez"}</div></div><div class="act"><button class="btn sm" data-act="paieExport">${ico("copy", 15)} Export comptable</button>${done ? pillFor("Validée") : `<button class="btn primary sm" data-act="paieValider">${ico("check", 15)} Valider la paie</button>`}</div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employé</th><th class="r">Salaire de base</th><th class="r">Primes</th><th class="r">CNPS 6,3 %</th><th class="r">Avances</th><th class="r">Net à payer</th><th></th></tr></thead><tbody>${rows.map(({ e, b }) => `<tr><td><b>${esc(e.nom)}</b><br><span class="hint">${esc(e.poste)}</span></td><td class="r">${NF.format(b.brut)}</td><td class="r">${b.primes ? "+" + NF.format(b.primes) : "—"}</td><td class="r">−${NF.format(b.cnps)}</td><td class="r">${b.avances ? "−" + NF.format(b.avances) : "—"}</td><td class="r"><b>${NF.format(b.net)}</b></td><td class="r">${actBtn("bulletin", e.id, ico("eye", 14) + " Bulletin")}</td></tr>`).join("")}
    <tr><td><b>Total</b></td><td colspan="4"></td><td class="r"><b>${fcfa(tot)}</b></td><td></td></tr></tbody></table></div><div class="panel-b"><p class="hint">Cotisation salariale CNPS retraite appliquée à 6,3 %. L'ITS et les autres retenues fiscales se paramètrent selon le barème en vigueur avant la mise en production.</p></div></div>`; }
  if (cur === "mv") body = listView({ title: "Avances sur salaire & primes", rows: () => DB.mouvements, search: r => empName(r.emp) + r.type, add: "Nouvelle avance / prime", addFn: "newMvt",
    filters: [{ k: "type", l: "Type", opts: ["Avance sur salaire", "Prime de performance", "Prime de commission", "Prime exceptionnelle"] }, { k: "statut", l: "Statut", opts: ["En attente", "Validée", "Refusé"] }],
    cols: [{ l: "Employé", f: r => `<b>${esc(empName(r.emp))}</b>` }, { l: "Type", k: "type" }, { l: "Mois de paie", f: r => esc(monthLabel(r.mois)) }, { l: "Montant", cls: "r", f: r => NF.format(r.montant) }, { l: "Statut", f: r => pillFor(r.statut) }],
    act: r => r.statut === "En attente" ? actBtn("mvOk", r.id, ico("check", 14) + " Valider", "blue") + " " + actBtn("mvKo", r.id, "Refuser") : "" });
  if (cur === "hist") body = `<div class="panel"><div class="panel-h"><h3>Paies validées</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mois</th><th>Date de virement</th><th class="r">Effectif</th><th class="r">Net versé</th></tr></thead><tbody>${[...DB.paies].reverse().map(p => `<tr><td><b>${esc(monthLabel(p.mois))}</b></td><td>${fdate(p.date)}</td><td class="r">${p.effectif}</td><td class="r">${fcfa(p.net)}</td></tr>`).join("")}</tbody></table></div></div>`;
  return html + body;
};
HELP.paie = "1. Validez d'abord les <b>avances et primes</b> du mois. 2. Vérifiez la paie dans l'onglet <b>Paie du mois</b> puis cliquez sur <b>Valider la paie</b>. 3. Utilisez <b>Export comptable</b> pour transmettre le fichier au cabinet comptable.";

/* ================= DOCUMENTS (quittance, facture, contrat, EDL, bulletin) ================= */
const paperHead = (title, ref) => `<div class="ph-head"><img src="${LOGO}" alt="KSARA"><div style="text-align:right"><h2>${esc(title)}</h2><div style="color:#5D6880">${esc(ref)}</div><div style="color:#5D6880;font-size:12.5px">${esc(DB.agency.raison)} · ${esc(DB.agency.tel)}</div></div></div>`;
function showPaper(title, html, extraFoot = "") { openModal({ title, icon: "file", wide: true, body: `<div class="paper">${html}</div>`, foot: `${extraFoot}<button class="btn" data-act="closeModal">Fermer</button>` }); }
function paperQuittance(p) {
  const l = bailOf(p.bail), b = byId("biens", l.bien), loc = byId("clients", l.locataire), pr = byId("clients", b.proprio);
  return paperHead("Quittance de loyer", p.quittance) + `<p>Je soussigné, <b>${esc(DB.agency.raison)}</b>, mandataire de <b>${esc(pr?.nom)}</b>, propriétaire du bien désigné ci-dessous, déclare avoir reçu de <b>${esc(loc?.nom)}</b> la somme de <b>${fcfa(p.montant)}</b> au titre du loyer de <b>${esc(monthLabel(p.mois))}</b>, et lui en donne quittance, sous réserve de tous droits.</p>
  <table><tr><th>Bien</th><td>${esc(b.titre)} — ${esc(b.quartier)}, ${esc(b.commune)} (réf. ${esc(b.ref)})</td></tr><tr><th>Période</th><td>${esc(monthLabel(p.mois))}</td></tr><tr><th>Loyer</th><td>${fcfa(p.montant)}</td></tr><tr><th>Payé le</th><td>${fdate(p.date)} — ${esc(p.mode)}</td></tr></table>
  <div class="tot">Total acquitté : ${fcfa(p.montant)}</div><div class="sign"><div>Fait à Abidjan, le ${fdate(p.date)}</div><div>Pour l'agence — cachet et signature</div></div>`;
}
const factTotal = f => { const ht = f.lignes.reduce((s, l) => s + l.q * l.pu, 0), tva = f.tva ? Math.round(ht * .18) : 0; return { ht, tva, ttc: ht + tva }; };
function paperFacture(f) { const c = byId("clients", f.client), t = factTotal(f);
  return paperHead("Facture", f.no) + `<div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap"><div><b>Facturé à</b><br>${esc(c?.nom)}<br>${esc(c?.tel || "")}<br>${esc(c?.commune || "")}</div><div style="text-align:right">Date : ${fdate(f.date)}<br>Échéance : ${fdate(f.echeance)}<br>Objet : ${esc(f.objet)}</div></div>
  <table><tr><th>Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">PU (FCFA)</th><th style="text-align:right">Total</th></tr>${f.lignes.map(l => `<tr><td>${esc(l.d)}</td><td style="text-align:right">${l.q}</td><td style="text-align:right">${NF.format(l.pu)}</td><td style="text-align:right">${NF.format(l.q * l.pu)}</td></tr>`).join("")}</table>
  <div class="tot" style="font-weight:500;font-size:14px">Total HT : ${fcfa(t.ht)}<br>TVA 18 % : ${f.tva ? fcfa(t.tva) : "non applicable"}</div><div class="tot">Net à payer : ${fcfa(t.ttc)}</div><p style="font-size:12.5px;color:#5D6880;margin-top:16px">Règlement par virement, chèque ou Mobile Money. Merci de rappeler le numéro de facture.</p>`; }
const CLAUSES = {
  "Bail d'habitation": (k, b) => [`Le bailleur donne à bail au preneur, qui accepte, le bien à usage exclusif d'habitation désigné : ${b?.titre}, situé à ${b?.quartier}, ${b?.commune}.`, `Le bail est consenti pour une durée de ${k.duree}, renouvelable par tacite reconduction, sauf congé donné par l'une des parties avec un préavis de trois (3) mois.`, `Le loyer mensuel est fixé à ${fcfa(k.montant)}, payable d'avance au plus tard le 5 de chaque mois auprès de l'agence.`, `Le preneur verse un dépôt de garantie de deux (2) mois de loyer et une avance de deux (2) mois, conformément à la réglementation en vigueur.`, `Un état des lieux contradictoire est établi à l'entrée et à la sortie du preneur.`],
  "Bail professionnel": (k, b) => [`Le bailleur donne à bail au preneur le local à usage professionnel : ${b?.titre}, ${b?.quartier}, ${b?.commune}.`, `Durée : ${k.duree}. Loyer mensuel : ${fcfa(k.montant)} hors charges, payable d'avance.`, `Le preneur ne peut céder ni sous-louer sans l'accord écrit du bailleur.`],
  "Mandat de gestion": (k, b) => [`Le mandant confie à ${DB.agency.raison} la gestion du bien : ${b?.titre}, ${b?.commune}.`, `Missions : recherche de locataires, rédaction des baux, encaissement des loyers, délivrance des quittances, suivi des travaux et du contentieux.`, `Rémunération : commission de gestion de 10 % des loyers encaissés. Durée du mandat : ${k.duree}.`, `Un relevé de gestion est mis à disposition chaque mois sur le portail client.`],
  "Compromis de vente": (k, b) => [`Le vendeur s'engage à vendre à l'acquéreur, qui s'engage à acheter, le bien : ${b?.titre}, ${b?.quartier}, ${b?.commune}.`, `Prix de vente : ${fcfa(k.montant)}, payable selon les modalités fixées à l'acte authentique.`, `La vente sera réitérée par acte authentique devant notaire, sous réserve de la production du titre foncier ou de l'ACD.`, `Les honoraires de l'agence sont à la charge de l'acquéreur, sauf convention contraire.`]
};
function paperContrat(k) { const b = byId("biens", k.bien); const cl = (CLAUSES[k.modele] || CLAUSES["Bail d'habitation"])(k, b);
  return paperHead(k.modele, k.ref) + `<p><b>Entre :</b> ${esc(cliName(k.partieA))}, ci-après « la partie A », représenté(e) par ${esc(DB.agency.raison)} ;<br><b>Et :</b> ${k.partieB ? esc(cliName(k.partieB)) : esc(DB.agency.raison)}, ci-après « la partie B ».</p><p style="margin-top:10px">Il a été convenu ce qui suit :</p>${cl.map((c, i) => `<p style="margin-top:8px"><b>Article ${i + 1}.</b> ${esc(c)}</p>`).join("")}<div class="sign"><div>Partie A — lu et approuvé</div><div>Partie B — lu et approuvé</div></div><p style="font-size:12px;color:#5D6880;margin-top:14px">Fait à Abidjan, le ${fdate(k.date)} · Statut : ${esc(k.statut)}</p>`; }
function paperEDL(e) { const l = bailOf(e.bail);
  return paperHead("État des lieux d'" + (e.type === "Entrée" ? "entrée" : "sortie"), "EDL-" + e.id.toUpperCase()) + `<table><tr><th>Bien</th><td>${esc(bienName(l?.bien))}</td></tr><tr><th>Locataire</th><td>${esc(cliName(l?.locataire))}</td></tr><tr><th>Date</th><td>${fdate(e.date)}</td></tr><tr><th>Agent</th><td>${esc(empName(e.agent))}</td></tr><tr><th>Compteurs</th><td>${esc(e.compteurs || "—")}</td></tr><tr><th>Clés remises</th><td>${e.cles}</td></tr></table>
  <table><tr><th>Pièce</th><th>État</th><th>Observations</th></tr>${e.pieces.map(p => `<tr><td>${esc(p.p)}</td><td>${esc(p.e)}</td><td>${esc(p.c || "—")}</td></tr>`).join("")}</table><div class="sign"><div>Le locataire</div><div>L'agent KSARA</div></div>`; }
function paperBulletin(e, mk) { const b = bulletin(e, mk);
  return paperHead("Bulletin de paie", monthLabel(mk)) + `<table><tr><th>Employé</th><td>${esc(e.nom)} (${esc(e.matricule)})</td></tr><tr><th>Poste</th><td>${esc(e.poste)} — ${esc(svcName(e.service))}</td></tr><tr><th>Contrat</th><td>${esc(e.contrat)} depuis le ${fdate(e.entree)}</td></tr></table>
  <table><tr><th>Rubrique</th><th style="text-align:right">Gain</th><th style="text-align:right">Retenue</th></tr><tr><td>Salaire de base</td><td style="text-align:right">${NF.format(b.brut)}</td><td></td></tr>${b.primes ? `<tr><td>Primes</td><td style="text-align:right">${NF.format(b.primes)}</td><td></td></tr>` : ""}<tr><td>CNPS retraite (6,3 %)</td><td></td><td style="text-align:right">${NF.format(b.cnps)}</td></tr>${b.avances ? `<tr><td>Avance sur salaire</td><td></td><td style="text-align:right">${NF.format(b.avances)}</td></tr>` : ""}</table><div class="tot">Net à payer : ${fcfa(b.net)}</div>`; }

/* ================= GESTION LOCATIVE ================= */
const BIEN_FIELDS = [{ k: "titre", l: "Désignation", req: 1, ph: "ex. Appartement 3 pièces" }, { k: "type", l: "Type", t: "select", opts: ["Appartement", "Villa", "Studio", "Bureau", "Magasin", "Terrain", "Immeuble"], req: 1 }, { k: "operation", l: "Opération", t: "select", opts: ["Location", "Vente", "Gestion syndic"], req: 1 }, { k: "commune", l: "Commune", t: "select", opts: COMMUNES, req: 1 }, { k: "quartier", l: "Quartier", req: 1 }, { k: "prix", l: "Loyer mensuel ou prix (FCFA)", t: "number", req: 1 }, { k: "pieces", l: "Nombre de pièces", t: "number" }, { k: "surface", l: "Surface (m²)", t: "number" }, { k: "statut", l: "Situation", t: "select", opts: ["Disponible", "Loué", "Vendu", "En travaux"] }, { k: "proprio", l: "Propriétaire", t: "select", opts: () => DB.clients.filter(c => c.type === "Propriétaire").map(c => [c.id, c.nom]), req: 1 }, { k: "desc", l: "Description", t: "textarea", full: 1 }];
function newBien() { formModal({ title: "Ajouter un bien", icon: "build", fields: BIEN_FIELDS, data: { statut: "Disponible", operation: "Location" }, onSave: v => { const b = { id: uid("b"), ref: "KS-B" + String(DB.biens.length + 1).padStart(3, "0"), ...v }; DB.biens.push(b); log("Bien ajouté — " + v.titre, "biens"); toast("Bien enregistré" + (b.statut === "Disponible" ? " et publié sur le site" : "")); } }); }
PAGES.biens = () => {
  const st = (S.f.biens ||= {});
  return `<div class="kpis">${["Loué", "Disponible", "En travaux", "Vendu"].map(s => kpi(s === "Loué" ? "Loués" : s === "Disponible" ? "Disponibles" : s, DB.biens.filter(b => b.statut === s).length)).join("")}</div>
  <div class="panel"><div class="panel-h"><h3>Cartographie des biens</h3><span class="sub">Cliquez sur une commune pour filtrer la liste</span></div><div class="panel-b"><div class="map">${COMMUNES.map(c => { const n = DB.biens.filter(b => b.commune === c).length; return `<button class="zone ${st.commune === c ? "on" : ""}" data-act="zone" data-v="${c}" style="background:color-mix(in srgb,var(--blue) ${Math.min(40, n * 7)}%,var(--surface))"><span>${c}</span><b class="num">${n}</b><span>${DB.biens.filter(b => b.commune === c && b.statut === "Disponible").length} disponible(s)</span></button>`; }).join("")}</div></div></div>` +
  listView({ title: "Biens immobiliers", sub: "Situation générale et historique de chaque bien", rows: () => DB.biens, search: r => r.titre + r.quartier + r.ref + cliName(r.proprio), add: "Ajouter un bien", addFn: "newBien", export: true, open: openBien,
    filters: [{ k: "commune", l: "Commune", opts: COMMUNES }, { k: "statut", l: "Situation", opts: ["Disponible", "Loué", "Vendu", "En travaux"] }, { k: "type", l: "Type", opts: ["Appartement", "Villa", "Studio", "Bureau", "Magasin", "Terrain", "Immeuble"] }],
    cols: [{ l: "Bien", f: r => `<b>${esc(r.titre)}</b><br><span class="hint num">${esc(r.ref)}</span>` }, { l: "Localisation", f: r => `${esc(r.commune)}<br><span class="hint">${esc(r.quartier)}</span>` }, { l: "Opération", f: r => pillFor(r.operation) }, { l: "Propriétaire", f: r => esc(cliName(r.proprio)) }, { l: "Situation", f: r => pillFor(r.statut) }, { l: "Prix / loyer", cls: "r", f: r => r.prix ? NF.format(r.prix) : "—" }],
    csv: [{ l: "Réf", k: "ref" }, { l: "Bien", k: "titre" }, { l: "Commune", k: "commune" }, { l: "Quartier", k: "quartier" }, { l: "Opération", k: "operation" }, { l: "Situation", k: "statut" }, { l: "Prix", k: "prix" }, { l: "Propriétaire", x: r => cliName(r.proprio) }] });
};
HELP.biens = "Un bien <b>Disponible</b> en location ou en vente apparaît automatiquement sur la page d'accueil publique, avec ses photos (ouvrez le bien puis « Ajouter des photos »). Ouvrez un bien pour voir son bail, ses paiements, ses travaux et ses contrats.";
function openBien(id) { const b = byId("biens", id); if (!b) return; const baux = DB.baux.filter(l => l.bien === id), bail = baux.find(l => l.statut !== "Terminé"); const pay = DB.paiements.filter(p => baux.some(l => l.id === p.bail)); const tr = DB.travaux.filter(t => t.bien === id); const kc = DB.contrats.filter(k => k.bien === id);
  const ev = [...pay.map(p => ({ d: p.date || p.mois + "-05", t: `Loyer ${monthLabel(p.mois)} — ${p.statut}` })), ...tr.map(t => ({ d: t.date, t: "Travaux : " + t.objet + " (" + t.statut + ")" })), ...kc.map(k => ({ d: k.date, t: k.modele + " " + k.ref })), ...baux.map(l => ({ d: l.debut, t: "Entrée de " + cliName(l.locataire) }))].sort((a, b) => b.d.localeCompare(a.d));
  M.bien = id;
  openModal({ title: b.titre, icon: "build", wide: true, body: `<div class="cols c2"><div style="min-width:0">${gallery(b)}<label class="btn sm" style="margin-top:8px;cursor:pointer">${ico("camera", 15)} Ajouter des photos<input type="file" accept="image/*" multiple data-on="bienPhoto" style="position:absolute;width:1px;height:1px;opacity:0"></label></div><dl class="dl"><dt>Référence</dt><dd class="num">${esc(b.ref)}</dd><dt>Localisation</dt><dd>${esc(b.quartier)}, ${esc(b.commune)}</dd><dt>Type</dt><dd>${esc(b.type)} · ${b.pieces || "—"} pièces · ${NF.format(b.surface)} m²</dd><dt>Opération</dt><dd>${pillFor(b.operation)}</dd><dt>Situation</dt><dd>${pillFor(b.statut)}</dd><dt>Prix / loyer</dt><dd class="num">${b.prix ? fcfa(b.prix) : "—"}</dd><dt>Propriétaire</dt><dd>${esc(cliName(b.proprio))}</dd><dt>Photos</dt><dd>${(b.photos || []).length} ${b.statut === "Disponible" ? "· visible sur le site" : ""}</dd><dt>Locataire actuel</dt><dd>${bail ? esc(cliName(bail.locataire)) + " (jusqu'au " + fdate(bail.fin) + ")" : "—"}</dd></dl></div><h4 style="font-size:15px">Historique du bien</h4><div class="timeline">${ev.slice(0, 12).map(x => `<div>${esc(x.t)}<small>${fdate(x.d)}</small></div>`).join("") || '<p class="hint">Aucun événement.</p>'}</div>`,
    foot: `${can("travaux") ? `<button class="btn" data-act="newTravauxFor" data-id="${id}">${ico("tool", 15)} Programmer des travaux</button>` : ""}${b.statut === "Disponible" && b.operation === "Location" && can("locatif") ? `<button class="btn primary" data-act="newBailFor" data-id="${id}">${ico("inout", 15)} Entrée d'un locataire</button>` : ""}<button class="btn blue" data-act="bienEdit">${ico("edit", 15)} Modifier</button>` }); }

function newBail(bienId) {
  const dispo = DB.biens.filter(b => b.statut === "Disponible" && b.operation === "Location");
  if (!dispo.length) return toast("Aucun bien disponible à la location.");
  formModal({ title: "Entrée d'un locataire", icon: "inout", intro: "Étape 1 : renseignez le bail. Le bien passe en « Loué », le premier loyer et la quittance sont générés, puis vous serez guidé vers l'état des lieux d'entrée.",
    fields: [{ k: "bien", l: "Bien disponible", t: "select", opts: dispo.map(b => [b.id, b.titre + " — " + b.commune + " (" + NF.format(b.prix) + ")"]), req: 1 }, { k: "locataire", l: "Locataire existant", t: "select", blank: "— Nouveau locataire —", opts: DB.clients.filter(c => c.type !== "Propriétaire").map(c => [c.id, c.nom + " (" + c.type + ")"]) }, { k: "nnom", l: "… ou nom du nouveau locataire" }, { k: "ntel", l: "Téléphone du nouveau locataire", t: "tel" }, { k: "debut", l: "Date d'entrée", t: "date", req: 1 }, { k: "duree", l: "Durée du bail (mois)", t: "number", req: 1 }, { k: "loyer", l: "Loyer mensuel (FCFA)", t: "number", hint: "Laissez 0 pour reprendre le loyer affiché du bien." }],
    data: { bien: bienId || dispo[0].id, debut: iso(TODAY), duree: 24, loyer: 0 }, submit: "Valider l'entrée",
    onSave: v => {
      let loc = v.locataire;
      if (!loc) { if (!v.nnom) return "Choisissez un locataire existant ou saisissez le nom du nouveau locataire."; loc = uid("c"); DB.clients.push({ id: loc, nom: v.nnom, type: "Locataire", tel: v.ntel, email: "", commune: byId("biens", v.bien).commune, source: "Agence", entreprise: "", note: "" }); }
      else { const c = byId("clients", loc); if (c.type === "Prospect") c.type = "Locataire"; }
      const b = byId("biens", v.bien), loyer = v.loyer || b.prix, fin = iso(addDays(new Date(v.debut), Math.round(v.duree * 30.44)));
      const l = { id: uid("l"), bien: b.id, locataire: loc, debut: v.debut, fin, loyer, caution: loyer * 2, avance: loyer * 2, statut: "Actif", edlEntree: null, edlSortie: null }; DB.baux.push(l); b.statut = "Loué";
      const mk = monthKey(v.debut); DB.paiements.push({ id: uid("p"), bail: l.id, mois: mk, montant: loyer, statut: "Payé", date: v.debut, mode: "Espèces", relances: 0, quittance: "Q-" + mk.replace("-", "") + "-" + l.id.toUpperCase() });
      DB.ecritures.push({ id: uid("w"), date: v.debut, mois: mk, cat: "Loyers encaissés", lib: "Entrée " + cliName(loc) + " (1er loyer)", montant: loyer, sens: "in" });
      DB.contrats.push({ id: uid("k"), modele: "Bail d'habitation", ref: "BAIL-" + TODAY.getFullYear() + "-" + String(DB.contrats.length + 101), bien: b.id, partieA: b.proprio, partieB: loc, date: v.debut, montant: loyer, duree: v.duree + " mois", statut: "À signer" });
      notify("Nouvelle entrée locataire", cliName(loc) + " — " + b.titre + " (" + b.commune + ")", ["admin", "syndic", "gestion", "juridique"]);
      log("Entrée locataire — " + cliName(loc) + " / " + b.titre, "locatif");
      setTimeout(() => { closeModal(); rerender(); toast("Bail créé. Contrat transmis au juridique."); edlForm(l.id, "Entrée"); }, 0);
      return "__keep";
    } });
}
PAGES.locatif = () => listView({ title: "Baux en cours et terminés", sub: "Entrées, préavis et sorties des locataires", rows: () => DB.baux, search: r => bailLabel(r.id), add: can("edl") ? "Entrée d'un locataire" : "", addFn: "newBail", export: true,
  filters: [{ k: "statut", l: "Statut", opts: ["Actif", "Préavis", "Terminé"] }],
  cols: [{ l: "Bien", f: r => `<b>${esc(byId("biens", r.bien)?.titre)}</b><br><span class="hint">${esc(byId("biens", r.bien)?.commune)}</span>` }, { l: "Locataire", f: r => esc(cliName(r.locataire)) }, { l: "Période", f: r => `${fdate(r.debut)} → ${fdate(r.fin)}` }, { l: "Loyer", cls: "r", f: r => NF.format(r.loyer) }, { l: "Caution", cls: "r", f: r => NF.format(r.caution) }, { l: "EDL entrée", f: r => r.edlEntree ? pillFor("Oui") : `<span class="pill warn">À faire</span>` }, { l: "Statut", f: r => pillFor(r.statut) }],
  act: r => !can("edl") ? "" : r.statut === "Terminé" ? "" : (r.edlEntree ? "" : actBtn("edlFor", r.id, "EDL entrée") + " ") + (r.statut === "Actif" ? actBtn("preavis", r.id, "Préavis") + " " : "") + actBtn("sortie", r.id, ico("inout", 14) + " Sortie"),
  csv: [{ l: "Bien", x: r => bienName(r.bien) }, { l: "Locataire", x: r => cliName(r.locataire) }, { l: "Début", k: "debut" }, { l: "Fin", k: "fin" }, { l: "Loyer", k: "loyer" }, { l: "Statut", k: "statut" }] });
HELP.locatif = "<b>Entrée</b> : bouton « Entrée d'un locataire » (bail, premier loyer et contrat créés automatiquement). <b>Sortie</b> : bouton « Sortie » sur la ligne du bail, puis état des lieux de sortie ; le bien redevient disponible.";
const PIECES0 = ["Séjour", "Cuisine", "Chambre 1", "Chambre 2", "Salle d'eau", "Extérieur / balcon"];
function edlForm(bailId, type = "Entrée") {
  const baux = DB.baux.filter(l => l.statut !== "Terminé" || type === "Sortie");
  M.edl = { bail: bailId || baux[0]?.id, type };
  openModal({ title: "État des lieux", icon: "clip", wide: true, body: `<div class="help-tip">${ico("help")}<div>Indiquez l'état de chaque pièce et les observations. Le document est ensuite consultable par le locataire et le propriétaire depuis leur portail.</div></div>
  <form id="mform" data-form="edl" style="display:flex;flex-direction:column;gap:14px"><div class="grid-form"><div class="field"><label for="e_b">Bail</label><select class="input" id="e_b" name="bail">${DB.baux.map(l => `<option value="${l.id}" ${l.id === M.edl.bail ? "selected" : ""}>${esc(bailLabel(l.id))}</option>`).join("")}</select></div><div class="field"><label for="e_t">Type</label><select class="input" id="e_t" name="type"><option ${type === "Entrée" ? "selected" : ""}>Entrée</option><option ${type === "Sortie" ? "selected" : ""}>Sortie</option></select></div><div class="field"><label for="e_d">Date</label><input class="input" type="date" id="e_d" name="date" value="${iso(TODAY)}" required></div><div class="field"><label for="e_a">Agent</label><select class="input" id="e_a" name="agent">${DB.employes.filter(e => ["syndic", "gestion"].includes(e.service)).map(e => `<option value="${e.id}">${esc(e.nom)}</option>`).join("")}</select></div><div class="field"><label for="e_c">Relevés des compteurs</label><input class="input" id="e_c" name="compteurs" placeholder="Électricité … kWh — Eau … m³"></div><div class="field"><label for="e_k">Nombre de clés remises</label><input class="input" type="number" min="0" id="e_k" name="cles" value="2"></div></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pièce</th><th>État</th><th>Observations</th></tr></thead><tbody>${PIECES0.map((p, i) => `<tr><td><b>${p}</b></td><td><select class="input" name="etat${i}" aria-label="État ${p}"><option>Bon</option><option>Moyen</option><option>Mauvais</option><option>Sans objet</option></select></td><td><input class="input" name="com${i}" aria-label="Observations ${p}" placeholder="—"></td></tr>`).join("")}</tbody></table></div></form>`,
    foot: `<button class="btn" data-act="closeModal">Plus tard</button><button class="btn primary" type="submit" form="mform">${ico("check", 15)} Enregistrer l'état des lieux</button>` });
}
PAGES.edl = () => listView({ title: "États des lieux", rows: () => DB.edl, search: r => bailLabel(r.bail), add: "Nouvel état des lieux", addFn: "newEdl", open: id => showPaper("État des lieux", paperEDL(byId("edl", id))),
  filters: [{ k: "type", l: "Type", opts: ["Entrée", "Sortie"] }],
  cols: [{ l: "Bail", f: r => esc(bailLabel(r.bail)) }, { l: "Type", f: r => `<span class="tag">${esc(r.type)}</span>` }, { l: "Date", f: r => fdate(r.date) }, { l: "Agent", f: r => esc(empName(r.agent)) }, { l: "Pièces en mauvais état", cls: "r", f: r => r.pieces.filter(p => p.e === "Mauvais").length }] });
HELP.edl = "Cliquez sur une ligne pour afficher le document. À la sortie, comparez avec l'état des lieux d'entrée avant de restituer la caution.";
function encaisser(id) { const p = DB.paiements.find(x => x.id === id);
  formModal({ title: "Encaisser un loyer", icon: "receipt", intro: `${esc(bailLabel(p.bail))} — ${esc(monthLabel(p.mois))} : <b>${fcfa(p.montant)}</b>. La quittance est générée et envoyée au locataire.`, fields: [{ k: "mode", l: "Mode de paiement", t: "select", opts: PAY_MODES, req: 1 }, { k: "date", l: "Date d'encaissement", t: "date", req: 1 }], data: { date: iso(TODAY) }, submit: "Encaisser",
    onSave: v => { payLoyer(p, v.mode, v.date); toast("Loyer encaissé — quittance " + p.quittance); } }); }
function payLoyer(p, mode, date) { p.statut = "Payé"; p.mode = mode; p.date = date; p.quittance = "Q-" + p.mois.replace("-", "") + "-" + p.bail.toUpperCase();
  DB.ecritures.push({ id: uid("w"), date, mois: monthKey(date), cat: "Loyers encaissés", lib: "Loyer " + monthLabel(p.mois) + " — " + cliName(bailOf(p.bail).locataire), montant: p.montant, sens: "in" });
  notify("Quittance disponible", "Loyer de " + monthLabel(p.mois) + " reçu (" + fcfa(p.montant) + "). Votre quittance est dans vos documents.", ["client:" + bailOf(p.bail).locataire], "Email");
  notify("Loyer encaissé", cliName(bailOf(p.bail).locataire) + " — " + fcfa(p.montant) + " (" + mode + ")", ["admin", "syndic", "gestion"]);
  log("Loyer encaissé — " + cliName(bailOf(p.bail).locataire) + " (" + monthLabel(p.mois) + ")", "quittances"); }
PAGES.quittances = () => { const mk = curMonth(), du = DB.paiements.filter(p => p.mois === mk), ok = du.filter(p => p.statut === "Payé");
  return `<div class="kpis">${kpi("Loyers attendus (mois)", `<span class="num">${kfmt(du.reduce((s, p) => s + p.montant, 0))}</span>`)}${kpi("Encaissés", `<span class="num">${kfmt(ok.reduce((s, p) => s + p.montant, 0))}</span>`, `${ok.length}/${du.length} locataires`, "up")}${kpi("Taux d'encaissement", Math.round(ok.length / Math.max(1, du.length) * 100) + " %")}${kpi("Quittances émises", DB.paiements.filter(p => p.quittance).length)}</div>` +
  listView({ title: "Loyers & quittances", rows: () => [...DB.paiements].sort((a, b) => b.mois.localeCompare(a.mois)), search: r => bailLabel(r.bail), export: true,
    filters: [{ k: "statut", l: "Statut", opts: ["Payé", "Impayé"] }, { k: "mois", l: "Mois", opts: () => [...new Set(DB.paiements.map(p => p.mois))].sort().reverse().map(m => [m, monthLabel(m)]) }],
    cols: [{ l: "Locataire / bien", f: r => `<b>${esc(cliName(bailOf(r.bail)?.locataire))}</b><br><span class="hint">${esc(bienName(bailOf(r.bail)?.bien))}</span>` }, { l: "Mois", f: r => esc(monthLabel(r.mois)) }, { l: "Montant", cls: "r", f: r => NF.format(r.montant) }, { l: "Paiement", f: r => r.date ? fdate(r.date) + "<br><span class='hint'>" + esc(r.mode) + "</span>" : "—" }, { l: "Statut", f: r => pillFor(r.statut) }],
    act: r => r.statut === "Payé" ? actBtn("quittance", r.id, ico("receipt", 14) + " Quittance") : actBtn("encaisser", r.id, ico("pay", 14) + " Encaisser", "blue"),
    csv: [{ l: "Locataire", x: r => cliName(bailOf(r.bail)?.locataire) }, { l: "Bien", x: r => bienName(bailOf(r.bail)?.bien) }, { l: "Mois", k: "mois" }, { l: "Montant", k: "montant" }, { l: "Statut", k: "statut" }, { l: "Date", k: "date" }, { l: "Mode", k: "mode" }, { l: "Quittance", k: "quittance" }] }); };
HELP.quittances = "Pour un loyer reçu en agence, cliquez sur <b>Encaisser</b> et choisissez le mode de paiement : la quittance est créée et envoyée au locataire. Les paiements faits depuis le portail client apparaissent ici automatiquement.";
PAGES.recouvrement = () => { const by = {}; impayes().forEach(p => (by[p.bail] ||= []).push(p)); const rows = Object.entries(by).map(([b, ps]) => ({ id: b, ps, total: ps.reduce((s, p) => s + p.montant, 0), rel: ps.reduce((s, p) => s + p.relances, 0), anc: Math.max(...ps.map(p => daysBetween(p.mois + "-05", TODAY))) }));
  const tot = rows.reduce((s, r) => s + r.total, 0);
  return `<div class="kpis">${kpi("Montant à recouvrer", `<span class="num">${kfmt(tot)}</span>`, fcfa(tot), "down")}${kpi("Locataires concernés", rows.length)}${kpi("Mois impayés", impayes().length)}${kpi("Relances envoyées", rows.reduce((s, r) => s + r.rel, 0))}</div>
  <div class="panel"><div class="panel-h"><h3>Suivi des impayés</h3><div class="act">${rows.length ? `<button class="btn primary sm" data-act="relanceAll">${ico("sms", 15)} Relancer tous par SMS</button>` : ""}</div></div>${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Locataire</th><th>Bien</th><th>Mois impayés</th><th class="r">Montant dû</th><th class="r">Ancienneté</th><th class="r">Relances</th><th class="r">Actions</th></tr></thead><tbody>${rows.map(r => { const l = bailOf(r.id), c = byId("clients", l.locataire); return `<tr><td><b>${esc(c?.nom)}</b><br><span class="hint num">${esc(c?.tel)}</span></td><td>${esc(bienName(l.bien))}</td><td>${r.ps.map(p => `<span class="tag">${esc(monthLabel(p.mois))}</span>`).join(" ")}</td><td class="r"><b>${NF.format(r.total)}</b></td><td class="r"><span class="pill ${r.anc > 45 ? "bad" : "warn"}">${r.anc} j</span></td><td class="r">${r.rel}</td><td class="r" style="white-space:nowrap">${actBtn("relance", r.id, ico("sms", 14) + " Relancer")} ${actBtn("encaisser", r.ps[0].id, "Encaisser", "blue")} ${DB.contentieux.some(x => x.bail === r.id && x.statut === "En cours") ? '<span class="pill info">Au juridique</span>' : actBtn("toJuridique", r.id, ico("gavel", 14) + " Juridique")}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">Aucun impayé. Tous les loyers sont à jour.</div>`}</div>`; };
HELP.recouvrement = "Envoyez une <b>relance SMS</b> dès 5 jours de retard. Au-delà de 45 jours ou après 2 relances, transmettez le dossier au <b>juridique</b> : un dossier contentieux est ouvert automatiquement.";
PAGES.charges = () => { const res = [...new Set(DB.charges.map(c => c.residence))];
  return `<div class="kpis">${kpi("Charges du mois", `<span class="num">${kfmt(DB.charges.filter(c => c.periode === curMonth()).reduce((s, c) => s + c.montant, 0))}</span>`)}${kpi("À appeler", DB.charges.filter(c => c.statut === "À appeler").length)}${kpi("Appelées", DB.charges.filter(c => c.statut === "Appelée").length)}${kpi("Copropriétés gérées", res.length)}</div>` +
  listView({ title: "Charges communes", sub: "Appels de fonds auprès des copropriétaires", rows: () => DB.charges, search: r => r.residence + r.poste, add: "Nouvelle charge", addFn: "newCharge", export: true,
    filters: [{ k: "statut", l: "Statut", opts: ["À appeler", "Appelée", "Recouvrée"] }, { k: "residence", l: "Résidence", opts: () => [...new Set(DB.charges.map(c => c.residence))] }],
    cols: [{ l: "Résidence", f: r => `<b>${esc(r.residence)}</b>` }, { l: "Poste", k: "poste" }, { l: "Période", f: r => esc(monthLabel(r.periode)) }, { l: "Répartition", k: "repartition" }, { l: "Montant", cls: "r", f: r => NF.format(r.montant) }, { l: "Statut", f: r => pillFor(r.statut) }],
    act: r => r.statut === "À appeler" ? actBtn("chargeCall", r.id, ico("send", 14) + " Appeler", "blue") : r.statut === "Appelée" ? actBtn("chargeOk", r.id, ico("check", 14) + " Recouvrée") : "",
    csv: [{ l: "Résidence", k: "residence" }, { l: "Poste", k: "poste" }, { l: "Période", k: "periode" }, { l: "Montant", k: "montant" }, { l: "Statut", k: "statut" }] }); };
HELP.charges = "Saisissez la charge puis cliquez sur <b>Appeler</b> : chaque copropriétaire reçoit l'appel de fonds par SMS et sur son portail. Marquez-la <b>Recouvrée</b> une fois les fonds encaissés.";
const TRAV_FIELDS = () => [{ k: "bien", l: "Bien", t: "select", opts: DB.biens.map(b => [b.id, b.titre + " — " + b.commune]), req: 1 }, { k: "objet", l: "Nature des travaux", req: 1 }, { k: "prestataire", l: "Prestataire", t: "select", opts: DB.prestataires.map(p => [p.id, p.nom + " (" + p.metier + ")"]), req: 1 }, { k: "date", l: "Date prévue", t: "date", req: 1 }, { k: "cout", l: "Coût estimé (FCFA)", t: "number" }];
function newTravaux(data = {}) { formModal({ title: "Programmer des travaux", icon: "tool", fields: TRAV_FIELDS(), data: { date: iso(addDays(TODAY, 3)), ...data }, onSave: v => { DB.travaux.push({ id: uid("t"), ...v, statut: "Planifié" }); notify("Travaux programmés", v.objet + " — " + bienName(v.bien) + " le " + fdate(v.date), ["admin", "syndic", "gestion", "rh"]); log("Travaux programmés — " + v.objet, "travaux"); toast("Travaux programmés, rappel créé"); } }); }
PAGES.travaux = () => listView({ title: "Rappels des travaux", sub: "Interventions planifiées sur les biens", rows: () => [...DB.travaux].sort((a, b) => a.date.localeCompare(b.date)), search: r => r.objet + bienName(r.bien) + prestName(r.prestataire), add: "Programmer des travaux", addFn: "newTravaux", export: true,
  filters: [{ k: "statut", l: "Statut", opts: ["Planifié", "En cours", "Terminé"] }],
  cols: [{ l: "Date", f: r => { const d = daysBetween(TODAY, r.date); return `${fdate(r.date)}${r.statut !== "Terminé" && d >= 0 && d <= 7 ? `<br><span class="pill warn">dans ${d} j</span>` : ""}`; } }, { l: "Travaux", f: r => `<b>${esc(r.objet)}</b><br><span class="hint">${esc(bienName(r.bien))}</span>` }, { l: "Prestataire", f: r => esc(prestName(r.prestataire)) }, { l: "Coût", cls: "r", f: r => NF.format(r.cout || 0) }, { l: "Statut", f: r => pillFor(r.statut) }],
  act: r => r.statut === "Planifié" ? actBtn("travStart", r.id, "Démarrer") : r.statut === "En cours" ? actBtn("travEnd", r.id, ico("check", 14) + " Terminer", "blue") : "",
  csv: [{ l: "Date", k: "date" }, { l: "Travaux", k: "objet" }, { l: "Bien", x: r => bienName(r.bien) }, { l: "Prestataire", x: r => prestName(r.prestataire) }, { l: "Coût", k: "cout" }, { l: "Statut", k: "statut" }] });
HELP.travaux = "Les travaux prévus dans les 7 jours remontent en alerte sur les tableaux de bord. À la fin des travaux, cliquez sur <b>Terminer</b> : la dépense est enregistrée en comptabilité.";

/* ================= FINANCE ================= */
PAGES.finance = () => {
  const { cur, html } = tabsHTML([["syn", "Synthèse"], ["ecr", "Écritures"], ["etats", "États financiers"]]);
  const ks = monthSeries(), m = finMonth(curMonth()), prev = finMonth(ks[4]);
  if (cur === "syn") { const cats = {}; DB.ecritures.filter(e => ks.includes(e.mois)).forEach(e => cats[e.cat] = (cats[e.cat] || 0) + e.montant);
    const res = m.in - m.out;
    return html + `<div class="kpis">${kpi("Encaissements (mois)", `<span class="num">${kfmt(m.in)}</span>`, (m.in >= prev.in ? "▲ " : "▼ ") + Math.abs(Math.round((m.in - prev.in) / Math.max(1, prev.in) * 100)) + " % vs mois précédent", m.in >= prev.in ? "up" : "down")}${kpi("Décaissements (mois)", `<span class="num">${kfmt(m.out)}</span>`)}${kpi("Résultat du mois", `<span class="num">${kfmt(res)}</span>`, fcfa(res), res >= 0 ? "up" : "down")}${kpi("Commissions (6 mois)", `<span class="num">${kfmt(cats["Commissions"] || 0)}</span>`)}</div>
    <div class="cols c21"><div class="panel"><div class="panel-h"><h3>Encaissements et décaissements</h3><span class="sub">6 derniers mois</span></div><div class="panel-b">${financeChart()}</div></div><div class="panel"><div class="panel-h"><h3>Répartition sur 6 mois</h3></div><div class="panel-b">${hbars(Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, ["Loyers encaissés", "Commissions", "Ventes & transactions"].includes(k) ? "var(--blue)" : "var(--red)"]), "", v => kfmt(v))}</div></div></div>`; }
  if (cur === "ecr") return html + listView({ title: "Journal des écritures", rows: () => [...DB.ecritures].sort((a, b) => b.date.localeCompare(a.date)), search: r => r.lib + r.cat, add: "Nouvelle écriture", addFn: "newEcriture", export: true,
    filters: [{ k: "cat", l: "Catégorie", opts: ["Loyers encaissés", "Commissions", "Ventes & transactions", "Salaires", "Charges", "Dépenses"] }, { k: "mois", l: "Mois", opts: () => ks.map(k => [k, monthLabel(k)]).reverse() }],
    cols: [{ l: "Date", f: r => fdate(r.date) }, { l: "Libellé", k: "lib" }, { l: "Catégorie", f: r => `<span class="tag">${esc(r.cat)}</span>` }, { l: "Encaissement", cls: "r", f: r => r.sens === "in" ? NF.format(r.montant) : "" }, { l: "Décaissement", cls: "r", f: r => r.sens === "out" ? NF.format(r.montant) : "" }],
    csv: [{ l: "Date", k: "date" }, { l: "Libellé", k: "lib" }, { l: "Catégorie", k: "cat" }, { l: "Sens", x: r => r.sens === "in" ? "Encaissement" : "Décaissement" }, { l: "Montant", k: "montant" }] });
  const cats = ["Loyers encaissés", "Commissions", "Ventes & transactions", "Salaires", "Charges", "Dépenses"];
  const sum = (c, k) => DB.ecritures.filter(e => e.cat === c && e.mois === k).reduce((s, e) => s + e.montant, 0);
  const row = (c) => `<tr><td>${esc(c)}</td>${ks.map(k => `<td class="r">${NF.format(sum(c, k))}</td>`).join("")}<td class="r"><b>${NF.format(ks.reduce((s, k) => s + sum(c, k), 0))}</b></td></tr>`;
  return html + `<div class="panel"><div class="panel-h"><h3>Compte de résultat simplifié</h3><span class="sub">en FCFA</span><div class="act"><button class="btn sm" data-act="etatsExport">${ico("copy", 15)} Exporter</button></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rubrique</th>${ks.map(k => `<th class="r">${MONTHS[+k.slice(5) - 1]}</th>`).join("")}<th class="r">Total</th></tr></thead><tbody>
    <tr><td colspan="${ks.length + 2}"><b style="color:var(--blue)">PRODUITS</b></td></tr>${cats.slice(0, 3).map(row).join("")}
    <tr><td colspan="${ks.length + 2}"><b style="color:var(--red)">CHARGES</b></td></tr>${cats.slice(3).map(row).join("")}
    <tr><td><b>Résultat</b></td>${ks.map(k => { const f = finMonth(k); return `<td class="r"><b style="color:${f.in - f.out >= 0 ? "var(--ok)" : "var(--bad)"}">${NF.format(f.in - f.out)}</b></td>`; }).join("")}<td class="r"><b>${NF.format(ks.reduce((s, k) => { const f = finMonth(k); return s + f.in - f.out; }, 0))}</b></td></tr></tbody></table></div></div>`;
};
HELP.finance = "Les loyers encaissés, factures payées, paies validées et travaux terminés alimentent automatiquement les écritures. Ajoutez manuellement les autres dépenses dans l'onglet <b>Écritures</b>.";
function newFacture() {
  M.lines = [{ d: "", q: 1, pu: 0 }];
  const draw = () => `<div id="f-lines" style="display:flex;flex-direction:column;gap:8px">${M.lines.map((l, i) => `<div style="display:grid;grid-template-columns:1fr 70px 130px 36px;gap:8px"><input class="input" name="d${i}" value="${esc(l.d)}" placeholder="Désignation" aria-label="Désignation ligne ${i + 1}" required><input class="input" type="number" min="1" name="q${i}" value="${l.q}" aria-label="Quantité"><input class="input" type="number" min="0" name="pu${i}" value="${l.pu}" aria-label="Prix unitaire"><button type="button" class="btn ghost sm" data-act="facDel" data-id="${i}" aria-label="Retirer la ligne">${ico("x", 14)}</button></div>`).join("")}</div>`;
  M.drawLines = draw;
  openModal({ title: "Créer une facture", icon: "file", wide: true, body: `<form id="mform" data-form="facture" style="display:flex;flex-direction:column;gap:14px"><div class="grid-form"><div class="field"><label for="fa_c">Client</label><select class="input" id="fa_c" name="client">${DB.clients.map(c => `<option value="${c.id}">${esc(c.nom)} (${esc(c.type)})</option>`).join("")}</select></div><div class="field"><label for="fa_o">Objet</label><input class="input" id="fa_o" name="objet" required placeholder="ex. Commission de gestion — octobre"></div><div class="field"><label for="fa_e">Échéance</label><input class="input" type="date" id="fa_e" name="echeance" value="${iso(addDays(TODAY, 15))}"></div><div class="field"><label for="fa_t">TVA 18 %</label><select class="input" id="fa_t" name="tva"><option value="1">Appliquer</option><option value="0">Non applicable</option></select></div></div>
    <div><div style="display:grid;grid-template-columns:1fr 70px 130px 36px;gap:8px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px"><span>Désignation</span><span>Qté</span><span>PU (FCFA)</span><span></span></div><div id="f-wrap">${draw()}</div><button type="button" class="btn sm" style="margin-top:8px" data-act="facAdd">${ico("plus", 14)} Ajouter une ligne</button></div><div class="recap num" id="f-tot"></div></form>`,
    foot: `<button class="btn" data-act="closeModal">Annuler</button><button class="btn primary" type="submit" form="mform">${ico("check", 15)} Créer la facture</button>` });
  facTotal();
}
function facSync() { const f = $("#mform"); if (!f) return; M.lines = M.lines.map((l, i) => ({ d: f["d" + i]?.value || "", q: +(f["q" + i]?.value) || 0, pu: +(f["pu" + i]?.value) || 0 })); }
function facTotal() { facSync(); const f = $("#mform"); const tva = f?.tva.value === "1"; const ht = M.lines.reduce((s, l) => s + l.q * l.pu, 0); const t = $("#f-tot"); if (t) t.innerHTML = `Total HT : <b>${fcfa(ht)}</b> · TVA : ${tva ? fcfa(ht * .18) : "—"} · <b>Total TTC : ${fcfa(ht + (tva ? ht * .18 : 0))}</b>`; }
PAGES.facturation = () => { const nonp = DB.factures.filter(f => f.statut !== "Payée");
  return `<div class="kpis">${kpi("Factures émises", DB.factures.length)}${kpi("À encaisser", `<span class="num">${kfmt(nonp.reduce((s, f) => s + factTotal(f).ttc, 0))}</span>`, nonp.length + " facture(s)")}${kpi("En retard", DB.factures.filter(f => f.statut === "En retard").length, "", "down")}${kpi("Encaissé", `<span class="num">${kfmt(DB.factures.filter(f => f.statut === "Payée").reduce((s, f) => s + factTotal(f).ttc, 0))}</span>`, "", "up")}</div>` +
  listView({ title: "Facturation clients", rows: () => [...DB.factures].reverse(), search: r => r.no + r.objet + cliName(r.client), add: "Créer une facture", addFn: "newFacture", export: true, open: id => showPaper("Facture", paperFacture(byId("factures", id))),
    filters: [{ k: "statut", l: "Statut", opts: ["En attente", "En retard", "Payée"] }],
    cols: [{ l: "N°", f: r => `<b class="num">${esc(r.no)}</b>` }, { l: "Client", f: r => esc(cliName(r.client)) }, { l: "Objet", k: "objet" }, { l: "Date", f: r => fdate(r.date) }, { l: "Échéance", f: r => fdate(r.echeance) }, { l: "Total TTC", cls: "r", f: r => NF.format(factTotal(r).ttc) }, { l: "Statut", f: r => pillFor(r.statut) }],
    act: r => r.statut !== "Payée" ? actBtn("facPaid", r.id, ico("check", 14) + " Payée", "blue") : "",
    csv: [{ l: "N°", k: "no" }, { l: "Client", x: r => cliName(r.client) }, { l: "Objet", k: "objet" }, { l: "Date", k: "date" }, { l: "HT", x: r => factTotal(r).ht }, { l: "TVA", x: r => factTotal(r).tva }, { l: "TTC", x: r => factTotal(r).ttc }, { l: "Statut", k: "statut" }] }); };
HELP.facturation = "Cliquez sur <b>Créer une facture</b>, choisissez le client, ajoutez les lignes : les totaux HT, TVA et TTC se calculent automatiquement. Cliquez sur une facture pour l'afficher.";
const ACH_FIELDS = () => [{ k: "objet", l: "Objet de l'achat", req: 1 }, { k: "fournisseur", l: "Fournisseur", req: 1 }, { k: "montant", l: "Montant (FCFA)", t: "number", req: 1 }, { k: "demandeur", l: "Demandeur", t: "select", opts: DB.employes.map(e => [e.id, e.nom]) }, { k: "date", l: "Date", t: "date", req: 1 }];
PAGES.achats = () => listView({ title: "Achats", sub: "Demandes, validation et réception", rows: () => [...DB.achats].reverse(), search: r => r.objet + r.fournisseur, add: "Nouvelle demande d'achat", addFn: "newAchat", export: true,
  filters: [{ k: "statut", l: "Statut", opts: ["En validation", "Commandé", "Livré", "Refusé"] }],
  cols: [{ l: "Date", f: r => fdate(r.date) }, { l: "Objet", f: r => `<b>${esc(r.objet)}</b>` }, { l: "Fournisseur", k: "fournisseur" }, { l: "Demandeur", f: r => esc(empName(r.demandeur)) }, { l: "Montant", cls: "r", f: r => NF.format(r.montant) }, { l: "Statut", f: r => pillFor(r.statut) }],
  act: r => r.statut === "En validation" ? actBtn("achOk", r.id, "Commander", "blue") + " " + actBtn("achKo", r.id, "Refuser") : r.statut === "Commandé" ? actBtn("achLivre", r.id, ico("check", 14) + " Réceptionné") : "",
  csv: [{ l: "Date", k: "date" }, { l: "Objet", k: "objet" }, { l: "Fournisseur", k: "fournisseur" }, { l: "Montant", k: "montant" }, { l: "Statut", k: "statut" }] });
HELP.achats = "Une demande passe par 3 étapes : <b>En validation</b> → <b>Commandé</b> → <b>Livré</b>. À la réception, la dépense est enregistrée en comptabilité.";
const INV_FIELDS = [{ k: "nom", l: "Article", req: 1 }, { k: "cat", l: "Catégorie", t: "select", opts: ["Informatique", "Équipement", "Mobilier", "Véhicule", "Clés", "Sécurité", "Outillage", "Autre"] }, { k: "qte", l: "Quantité", t: "number", req: 1 }, { k: "etat", l: "État", t: "select", opts: ["Bon", "Moyen", "À réviser", "Hors service"] }, { k: "lieu", l: "Emplacement" }, { k: "affecte", l: "Affecté à" }];
PAGES.inventaire = () => listView({ title: "Inventaire du matériel", rows: () => DB.inventaire, search: r => r.nom + r.cat + r.lieu, add: "Ajouter un article", addFn: "newInv", export: true, open: id => { const it = byId("inventaire", id); formModal({ title: "Modifier l'article", icon: "box", fields: INV_FIELDS, data: it, onSave: v => { Object.assign(it, v); log("Inventaire modifié — " + v.nom, "inventaire"); } }); },
  filters: [{ k: "cat", l: "Catégorie", opts: ["Informatique", "Équipement", "Mobilier", "Véhicule", "Clés", "Sécurité", "Outillage", "Autre"] }, { k: "etat", l: "État", opts: ["Bon", "Moyen", "À réviser", "Hors service"] }],
  cols: [{ l: "Article", f: r => `<b>${esc(r.nom)}</b>` }, { l: "Catégorie", f: r => `<span class="tag">${esc(r.cat)}</span>` }, { l: "Quantité", cls: "r", f: r => r.qte }, { l: "État", f: r => pillFor(r.etat) }, { l: "Emplacement", k: "lieu" }, { l: "Affecté à", k: "affecte" }],
  csv: [{ l: "Article", k: "nom" }, { l: "Catégorie", k: "cat" }, { l: "Quantité", k: "qte" }, { l: "État", k: "etat" }, { l: "Emplacement", k: "lieu" }] });
HELP.inventaire = "Cliquez sur un article pour modifier sa quantité ou son état. Les filtres permettent de sortir rapidement le matériel « À réviser » avant une intervention.";

/* ================= JURIDIQUE ================= */
const MODELES = [["Bail d'habitation", "key", "Location d'un logement, 2 mois de caution"], ["Bail professionnel", "brief", "Bureaux, magasins, locaux"], ["Mandat de gestion", "clip", "Le propriétaire confie son bien à KSARA"], ["Compromis de vente", "build", "Engagement avant l'acte notarié"]];
function newContrat(modele) { formModal({ title: "Établir un contrat", icon: "scale", intro: "Le contrat est généré à partir du modèle choisi et archivé numériquement. Vous pourrez l'afficher, puis le marquer « Signé » une fois paraphé.",
  fields: [{ k: "modele", l: "Modèle", t: "select", opts: MODELES.map(m => m[0]), req: 1 }, { k: "bien", l: "Bien concerné", t: "select", opts: DB.biens.map(b => [b.id, b.titre + " — " + b.commune]), req: 1 }, { k: "partieA", l: "Partie A (bailleur / mandant / vendeur)", t: "select", opts: DB.clients.map(c => [c.id, c.nom]), req: 1 }, { k: "partieB", l: "Partie B (preneur / acquéreur)", t: "select", blank: "— Aucune (mandat) —", opts: DB.clients.map(c => [c.id, c.nom]) }, { k: "date", l: "Date", t: "date", req: 1 }, { k: "montant", l: "Loyer ou prix (FCFA)", t: "number" }, { k: "duree", l: "Durée", ph: "ex. 24 mois" }],
  data: { modele: modele || "Bail d'habitation", date: iso(TODAY), duree: "24 mois" }, submit: "Générer le contrat",
  onSave: v => { const pre = { "Bail d'habitation": "BAIL", "Bail professionnel": "BAIL", "Mandat de gestion": "MAND", "Compromis de vente": "VTE" }[v.modele]; const k = { id: uid("k"), ref: pre + "-" + TODAY.getFullYear() + "-" + String(DB.contrats.length + 101).padStart(3, "0"), ...v, statut: "Brouillon" }; DB.contrats.push(k); log("Contrat établi — " + k.modele + " " + k.ref, "contrats"); setTimeout(() => showPaper(k.modele, paperContrat(k), `<button class="btn blue" data-act="kSign" data-id="${k.id}">${ico("check", 15)} Marquer signé</button>`), 0); } }); }
PAGES.contrats = () => `<div class="panel"><div class="panel-h"><h3>Modèles de contrats</h3><span class="sub">Choisissez un modèle pour établir un nouveau contrat</span></div><div class="panel-b"><div class="choice">${MODELES.map(m => `<button data-act="newContratM" data-v="${esc(m[0])}"><span style="color:var(--red)">${ico(m[1], 20)}</span><b>${esc(m[0])}</b><span>${esc(m[2])}</span></button>`).join("")}</div></div></div>` +
  listView({ title: "Archive numérique des contrats", rows: () => [...DB.contrats].reverse(), search: r => r.ref + r.modele + cliName(r.partieA) + cliName(r.partieB), export: true, open: id => { const k = byId("contrats", id); showPaper(k.modele, paperContrat(k), k.statut !== "Signé" ? `<button class="btn blue" data-act="kSign" data-id="${k.id}">${ico("check", 15)} Marquer signé</button>` : ""); },
    filters: [{ k: "modele", l: "Modèle", opts: MODELES.map(m => m[0]) }, { k: "statut", l: "Statut", opts: ["Brouillon", "À signer", "Signé"] }],
    cols: [{ l: "Référence", f: r => `<b class="num">${esc(r.ref)}</b>` }, { l: "Modèle", k: "modele" }, { l: "Parties", f: r => esc(cliName(r.partieA)) + (r.partieB ? " / " + esc(cliName(r.partieB)) : "") }, { l: "Bien", f: r => esc(bienName(r.bien)) }, { l: "Date", f: r => fdate(r.date) }, { l: "Statut", f: r => pillFor(r.statut) }],
    csv: [{ l: "Référence", k: "ref" }, { l: "Modèle", k: "modele" }, { l: "Partie A", x: r => cliName(r.partieA) }, { l: "Partie B", x: r => cliName(r.partieB) }, { l: "Date", k: "date" }, { l: "Statut", k: "statut" }] });
HELP.contrats = "Choisissez un <b>modèle</b>, renseignez les parties et le bien : le contrat est rédigé automatiquement. Cliquez sur une ligne de l'archive pour le relire ou le marquer signé.";
const ETAPES = ["Mise en demeure", "Médiation", "Assignation", "Audience", "Jugement rendu", "Exécution"];
function newContentieux(data = {}) { formModal({ title: "Ouvrir un dossier contentieux", icon: "gavel", fields: [{ k: "objet", l: "Objet du litige", req: 1 }, { k: "type", l: "Type", t: "select", opts: ["Impayé", "Litige", "Expulsion", "Dégradations", "Autre"] }, { k: "bail", l: "Bail concerné", t: "select", blank: "— Aucun —", opts: DB.baux.map(l => [l.id, bailLabel(l.id)]) }, { k: "adverse", l: "Partie adverse", t: "select", blank: "— Non renseigné —", opts: DB.clients.map(c => [c.id, c.nom]) }, { k: "etape", l: "Étape", t: "select", opts: ETAPES }, { k: "audience", l: "Prochaine audience / échéance", t: "date" }, { k: "conseil", l: "Huissier / avocat", t: "select", blank: "—", opts: DB.prestataires.filter(p => ["Huissier", "Notaire"].includes(p.metier)).map(p => [p.id, p.nom]) }], data,
  onSave: v => { DB.contentieux.push({ id: uid("x"), ...v, statut: "En cours" }); notify("Dossier contentieux ouvert", v.objet, ["admin", "juridique", "syndic"]); log("Contentieux ouvert — " + v.objet, "contentieux"); toast("Dossier ouvert"); } }); }
PAGES.contentieux = () => listView({ title: "Espace contentieux", sub: "Litiges en cours, audiences et échéances", rows: () => DB.contentieux, search: r => r.objet + cliName(r.adverse), add: can("contrats") ? "Ouvrir un dossier" : "", addFn: "newContentieux",
  filters: [{ k: "statut", l: "Statut", opts: ["En cours", "Clos"] }, { k: "type", l: "Type", opts: ["Impayé", "Litige", "Expulsion", "Dégradations", "Autre"] }],
  cols: [{ l: "Dossier", f: r => `<b>${esc(r.objet)}</b><br><span class="hint">${r.bail ? esc(bailLabel(r.bail)) : ""}</span>` }, { l: "Type", f: r => `<span class="tag">${esc(r.type)}</span>` }, { l: "Partie adverse", f: r => esc(r.adverse ? cliName(r.adverse) : "—") }, { l: "Étape", f: r => `<span title="${ETAPES.indexOf(r.etape) + 1}/${ETAPES.length}">${esc(r.etape)}</span><div class="progress" style="min-width:90px;height:5px;margin-top:4px"><i style="width:${(ETAPES.indexOf(r.etape) + 1) / ETAPES.length * 100}%"></i></div>` }, { l: "Audience", f: r => r.audience ? fdate(r.audience) : "—" }, { l: "Conseil", f: r => esc(r.conseil ? prestName(r.conseil) : "—") }, { l: "Statut", f: r => pillFor(r.statut) }],
  act: r => r.statut === "En cours" && can("contrats") ? actBtn("xNext", r.id, "Étape suivante") + " " + actBtn("xClose", r.id, "Clore") : "" });
HELP.contentieux = "Faites avancer chaque dossier avec <b>Étape suivante</b> (mise en demeure → … → exécution). Renseignez la date d'audience : une alerte apparaît 30 jours avant.";

/* ================= RELATION CLIENT ================= */
const CLI_FIELDS = [{ k: "nom", l: "Nom / raison sociale", req: 1 }, { k: "type", l: "Type", t: "select", opts: ["Prospect", "Locataire", "Propriétaire", "Acheteur"], req: 1 }, { k: "tel", l: "Téléphone", t: "tel", req: 1 }, { k: "email", l: "Email", t: "email" }, { k: "commune", l: "Commune", t: "select", opts: COMMUNES }, { k: "entreprise", l: "Entreprise / employeur" }, { k: "source", l: "Source", t: "select", opts: ["Agence", "Site web", "Facebook", "Recommandation", "Partenaire"] }, { k: "note", l: "Besoin / note", t: "textarea", full: 1 }];
function clientCard(c) { const col = { Propriétaire: "var(--red)", Locataire: "var(--blue)", Acheteur: "var(--ok)", Prospect: "var(--warn)" }[c.type];
  return `<div class="vcard"><div class="top">${avatar(c.nom, col)}<div style="min-width:0"><h4>${esc(c.nom)}</h4><div class="sm">${esc(c.type)}${c.entreprise ? " · " + esc(c.entreprise) : ""}</div></div></div><div class="lines"><span class="num">${ico("phone", 13)} ${esc(c.tel)}</span><span style="overflow-wrap:anywhere">${ico("mail", 13)} ${esc(c.email || "—")}</span><span>${ico("map", 13)} ${esc(c.commune || "—")}</span>${c.note ? `<span class="hint">${esc(c.note)}</span>` : ""}</div><div class="foot"><button class="btn sm" data-act="openClient" data-id="${c.id}">${ico("eye", 14)} Fiche</button><button class="btn sm" data-act="copy" data-v="${esc(c.tel)}">${ico("copy", 14)} Copier le n°</button></div></div>`; }
PAGES.clients = () => listView({ title: "Annuaire clients & prospects", sub: "Format carte de visite", rows: () => [...DB.clients].reverse(), search: r => r.nom + r.tel + r.email + r.note, add: "Ajouter un contact", addFn: "newClient", export: true, cards: clientCard,
  filters: [{ k: "type", l: "Type", opts: ["Prospect", "Locataire", "Propriétaire", "Acheteur"] }, { k: "commune", l: "Commune", opts: COMMUNES }, { k: "source", l: "Source", opts: ["Agence", "Site web", "Facebook", "Recommandation", "Partenaire"] }],
  csv: [{ l: "Nom", k: "nom" }, { l: "Type", k: "type" }, { l: "Téléphone", k: "tel" }, { l: "Email", k: "email" }, { l: "Commune", k: "commune" }, { l: "Source", k: "source" }] });
HELP.clients = "Les demandes envoyées depuis la page d'accueil publique arrivent ici en tant que <b>Prospects</b> (source « Site web »). Ouvrez une fiche pour voir ses biens, baux et factures.";
function openClient(id) { const c = byId("clients", id); if (!c) return; M.client = id;
  const biens = DB.biens.filter(b => b.proprio === id), baux = DB.baux.filter(l => l.locataire === id), fac = DB.factures.filter(f => f.client === id);
  openModal({ title: c.nom, icon: "user", wide: true, body: `<dl class="dl"><dt>Type</dt><dd>${pillFor(c.type)}</dd><dt>Téléphone</dt><dd class="num">${esc(c.tel)}</dd><dt>Email</dt><dd>${esc(c.email || "—")}</dd><dt>Commune</dt><dd>${esc(c.commune || "—")}</dd><dt>Source</dt><dd>${esc(c.source || "—")}</dd><dt>Note</dt><dd>${esc(c.note || "—")}</dd></dl>
    ${biens.length ? `<h4 style="font-size:15px">Biens confiés (${biens.length})</h4>${biens.map(b => `<div class="doc-row"><span style="flex:1">${esc(b.titre)} — ${esc(b.commune)}</span>${pillFor(b.statut)}</div>`).join("")}` : ""}
    ${baux.length ? `<h4 style="font-size:15px">Baux</h4>${baux.map(l => `<div class="doc-row"><span style="flex:1">${esc(bienName(l.bien))} · ${fdate(l.debut)} → ${fdate(l.fin)}</span>${pillFor(l.statut)}</div>`).join("")}` : ""}
    ${fac.length ? `<h4 style="font-size:15px">Factures</h4>${fac.map(f => `<div class="doc-row"><span style="flex:1">${esc(f.no)} — ${esc(f.objet)}</span><b class="num">${NF.format(factTotal(f).ttc)}</b>${pillFor(f.statut)}</div>`).join("")}` : ""}`,
    foot: `<button class="btn" data-act="cliDel">${ico("trash", 15)} Supprimer</button>${c.type === "Prospect" ? `<button class="btn" data-act="cliConvert">Convertir en locataire</button>` : ""}<button class="btn blue" data-act="cliEdit">${ico("edit", 15)} Modifier</button>` }); }
const PRE_FIELDS = [{ k: "nom", l: "Nom / entreprise", req: 1 }, { k: "metier", l: "Métier", t: "select", opts: ["Plombier", "Électricien", "Peintre", "Menuisier", "Climatisation", "Maçon", "Gardiennage", "Notaire", "Huissier", "Avocat", "Autre"], req: 1 }, { k: "tel", l: "Téléphone", t: "tel", req: 1 }, { k: "commune", l: "Commune" }, { k: "note", l: "Note (1 à 5)", t: "select", opts: ["5", "4", "3", "2", "1"] }];
PAGES.prestataires = () => listView({ title: "Annuaire des prestataires", sub: "Artisans, notaires, huissiers et partenaires", rows: () => [...DB.prestataires].sort((a, b) => b.note - a.note), search: r => r.nom + r.metier + r.commune, add: "Ajouter un prestataire", addFn: "newPrest",
  filters: [{ k: "metier", l: "Métier", opts: () => [...new Set(DB.prestataires.map(p => p.metier))].sort() }, { k: "note", l: "Note", opts: ["5", "4", "3", "2", "1"].map(n => [n, n + " étoile" + (n > 1 ? "s" : "")]), get: r => String(r.note) }],
  cards: p => `<div class="vcard"><div class="top">${avatar(p.nom, avc(p.metier))}<div style="min-width:0"><h4>${esc(p.nom)}</h4><div class="sm">${esc(p.metier)} · ${esc(p.commune)}</div></div></div><div class="lines"><span>${stars(p.note)} <span class="hint">${p.interventions} intervention(s)</span></span><span class="num">${ico("phone", 13)} ${esc(p.tel)}</span></div><div class="foot"><span style="display:flex;gap:2px" aria-label="Noter">${[1, 2, 3, 4, 5].map(n => `<button class="btn ghost sm" style="padding:2px 4px;color:#E0A100" data-act="rate" data-id="${p.id}" data-v="${n}" aria-label="Noter ${n}">${n <= p.note ? "★" : "☆"}</button>`).join("")}</span>${can("travaux") ? `<button class="btn sm" data-act="newTravauxPrest" data-id="${p.id}">${ico("tool", 14)} Intervention</button>` : ""}</div></div>` });
HELP.prestataires = "Filtrez par métier et par note pour trouver le bon artisan. Cliquez sur les étoiles pour noter un prestataire après une intervention ; les mieux notés apparaissent en premier.";
const TARGETS = { "Tous les locataires": () => DB.clients.filter(c => c.type === "Locataire"), "Locataires en impayé": () => [...new Set(impayes().map(p => bailOf(p.bail).locataire))].map(id => byId("clients", id)), "Propriétaires": () => DB.clients.filter(c => c.type === "Propriétaire"), "Prospects": () => DB.clients.filter(c => c.type === "Prospect"), "Tous les clients": () => DB.clients, "Personnel de l'agence": () => DB.employes };
PAGES.messages = () => `<div class="cols c2"><form class="panel" data-form="sendMsg"><div class="panel-h"><h3>Envoyer une notification</h3></div><div class="panel-b" style="display:flex;flex-direction:column;gap:14px">
  <div class="grid-form"><div class="field"><label for="m_c">Canal</label><select class="input" id="m_c" name="canal"><option>SMS</option><option>Email</option><option>Alerte</option></select></div><div class="field"><label for="m_t">Destinataires</label><select class="input" id="m_t" name="cible">${Object.keys(TARGETS).map(k => `<option>${k}</option>`).join("")}</select></div></div>
  <div class="field"><label for="m_o">Titre</label><input class="input" id="m_o" name="titre" required placeholder="ex. Rappel : loyer à régler avant le 5"></div>
  <div class="field"><label for="m_m">Message</label><textarea class="input" id="m_m" name="txt" required maxlength="320" placeholder="Bonjour, …"></textarea><span class="hint">160 caractères = 1 SMS. Les SMS partent via la passerelle de l'opérateur (envoi simulé dans ce prototype).</span></div>
  <button class="btn primary" type="submit" style="align-self:flex-start">${ico("send", 15)} Envoyer</button></div></form>
  <div class="panel"><div class="panel-h"><h3>Modèles de messages</h3></div><div class="panel-b" style="display:flex;flex-direction:column;gap:8px">${[["Rappel de loyer", "Bonjour, nous vous rappelons que votre loyer est payable avant le 5 du mois. Payez en ligne depuis votre portail KSARA."], ["Relance impayé", "Bonjour, sauf erreur de notre part, votre loyer reste impayé. Merci de régulariser sous 72 h ou de contacter l'agence."], ["Coupure d'eau", "Information : une coupure d'eau est prévue dans votre résidence demain de 9 h à 14 h pour travaux."], ["Nouvelle offre", "KSARA vous propose de nouveaux biens disponibles. Consultez-les sur notre site ou contactez votre conseiller."]].map(t => `<button class="doc-row" style="background:none;cursor:pointer;text-align:left" data-act="tpl" data-t="${esc(t[0])}" data-v="${esc(t[1])}"><span style="flex:1"><b>${esc(t[0])}</b><br><span class="hint">${esc(t[1])}</span></span>${ico("copy", 15)}</button>`).join("")}</div></div></div>` +
  listView({ title: "Historique des envois et alertes", rows: () => DB.notifs, search: r => r.titre + r.txt, filters: [{ k: "canal", l: "Canal", opts: ["SMS", "Email", "Alerte", "Système"] }],
    cols: [{ l: "Date", f: r => `<span class="num">${fdt(r.date)}</span>` }, { l: "Canal", f: r => `<span class="tag">${esc(r.canal)}</span>` }, { l: "Titre", f: r => `<b>${esc(r.titre)}</b>` }, { l: "Message", k: "txt" }] });
HELP.messages = "Choisissez un <b>modèle</b> à droite pour pré-remplir le message, sélectionnez les destinataires puis envoyez. Chaque envoi est tracé dans l'historique ci-dessous.";
PAGES.emailing = () => { const dispo = DB.biens.filter(b => b.statut === "Disponible");
  return `<form class="panel" data-form="newsletter"><div class="panel-h"><h3>Nouvelle newsletter</h3><span class="sub">Offres, promotions et actualités de l'agence</span></div><div class="panel-b" style="display:flex;flex-direction:column;gap:14px">
  <div class="grid-form"><div class="field"><label for="n_t">Titre de la campagne</label><input class="input" id="n_t" name="titre" required placeholder="ex. Nos nouvelles villas à Cocody"></div><div class="field"><label for="n_c">Cible</label><select class="input" id="n_c" name="cible"><option>Tous</option><option>Prospects</option><option>Locataires</option><option>Propriétaires</option><option>Acheteurs</option></select></div></div>
  <div class="field"><label for="n_m">Message d'introduction</label><textarea class="input" id="n_m" name="intro" placeholder="Chers clients, découvrez nos nouvelles offres…"></textarea></div>
  <div class="field"><span style="font-size:13px;font-weight:600;color:var(--muted)">Offres à mettre en avant</span><div style="display:flex;flex-wrap:wrap;gap:8px">${dispo.map(b => `<label class="doc-row" style="cursor:pointer;font-size:14px"><input type="checkbox" name="offres" value="${b.id}" checked> ${esc(b.titre)} — ${esc(b.commune)} <span class="hint num">${kfmt(b.prix)}</span></label>`).join("")}</div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="button" data-act="nlPreview">${ico("eye", 15)} Aperçu</button><button class="btn primary" type="submit">${ico("send", 15)} Envoyer la newsletter</button></div></div></form>` +
  listView({ title: "Campagnes envoyées", rows: () => DB.campagnes, cols: [{ l: "Date", f: r => fdate(r.date) }, { l: "Campagne", f: r => `<b>${esc(r.titre)}</b>` }, { l: "Cible", k: "cible" }, { l: "Destinataires", cls: "r", f: r => NF.format(r.envoyes) }, { l: "Taux d'ouverture", cls: "r", f: r => r.ouverture + " %" }, { l: "Statut", f: r => pillFor(r.statut) }] }); };
HELP.emailing = "Rédigez un titre et une introduction, cochez les biens à présenter puis cliquez sur <b>Aperçu</b> pour vérifier le rendu avant l'envoi.";
function nlHTML(v) { const offres = (v.offres || []).map(id => byId("biens", id)).filter(Boolean);
  return paperHead(v.titre || "Newsletter KSARA", "Pour : " + v.cible) + `<p>${esc(v.intro || "Découvrez nos nouvelles offres sélectionnées pour vous.")}</p><table>${offres.map(b => `<tr><td><b>${esc(b.titre)}</b><br>${esc(b.quartier)}, ${esc(b.commune)}</td><td style="text-align:right;color:#C3262E;font-weight:700">${fcfa(b.prix)}${b.operation === "Location" ? " / mois" : ""}</td></tr>`).join("")}</table><p style="margin-top:14px;font-size:13px;color:#5D6880">${esc(DB.agency.raison)} · ${esc(DB.agency.tel)} · ${esc(DB.agency.email)} — Se désabonner</p>`; }

/* ================= ADMINISTRATION ================= */
PAGES.users = () => { const { cur, html } = tabsHTML([["u", "Utilisateurs"], ["p", "Rôles & permissions"]]);
  if (cur === "u") return html + listView({ title: "Comptes utilisateurs", rows: () => DB.users, search: r => r.username + r.nom + r.poste, add: "Créer un utilisateur", addFn: "newUser",
    filters: [{ k: "role", l: "Rôle", opts: [...SERVICES.map(s => [s.id, s.name]), ["client", "Portail client"]] }],
    cols: [{ l: "Utilisateur", f: r => `<span class="who">${avatar(r.nom, avc(r.username))}<span><b class="num">${esc(r.username)}</b><br><span class="hint">${esc(r.nom)}</span></span></span>` }, { l: "Service / rôle", f: r => `<span class="tag">${esc(svcName(r.role))}</span>` }, { l: "Poste", k: "poste" }, { l: "Modules", cls: "r", f: r => r.role === "admin" ? "Tous" : (DB.perms[r.role] || []).length }, { l: "Statut", f: r => r.actif ? pillFor("Actif") : '<span class="pill bad">Désactivé</span>' }],
    act: r => r.id === "u0" ? "" : actBtn("uReset", r.id, "Réinit. mot de passe") + " " + actBtn("uToggle", r.id, r.actif ? "Désactiver" : "Activer") });
  const roles = ["rh", "juridique", "syndic", "gestion", "marketing"];
  return html + `<div class="panel"><div class="panel-h"><div><h3>Matrice des permissions</h3><div class="sub">Cochez les modules visibles pour chaque rôle. L'effet est immédiat à la prochaine navigation des utilisateurs.</div></div></div><div class="tbl-wrap"><table class="tbl perm"><thead><tr><th>Module</th><th class="c">Admin</th>${roles.map(r => `<th class="c">${esc(svcName(r))}</th>`).join("")}</tr></thead><tbody>${MODULES.filter(m => !m.client).map(m => `<tr><td>${ico(m.i, 15)} ${esc(m.label)} <span class="hint">· ${esc(m.g)}</span></td><td class="c"><input type="checkbox" checked disabled aria-label="Admin ${esc(m.label)}"></td>${roles.map(r => `<td class="c"><input type="checkbox" data-on="perm" data-r="${r}" data-m="${m.id}" ${(DB.perms[r] || []).includes(m.id) ? "checked" : ""} ${m.id === "dash" ? "disabled" : ""} aria-label="${esc(svcName(r))} — ${esc(m.label)}"></td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`; };
HELP.users = "<b>Créer un utilisateur</b> se fait en 4 étapes guidées : service, poste, identifiants, récapitulatif. L'onglet <b>Rôles & permissions</b> définit les modules visibles par chaque service.";
let WZ = {};
function newUser() { WZ = { step: 1 }; drawWizard(); }
function drawWizard() {
  const steps = ["Service", "Poste", "Identifiants", "Récapitulatif"], s = WZ.step;
  let body = `<div class="wiz-steps">${steps.map((x, i) => `<span class="${i + 1 === s ? "on" : i + 1 < s ? "done" : ""}">${i + 1}. ${x}</span>`).join("")}</div>`, foot = "";
  if (s === 1) { body += `<p class="hint">Choisissez le service de rattachement. Les permissions par défaut du service seront appliquées.</p><div class="choice">${SERVICES.map(v => `<button data-act="wzSvc" data-v="${v.id}" class="${WZ.service === v.id ? "on" : ""}"><b>${esc(v.name)}</b><span>${esc(v.desc)}</span></button>`).join("")}</div>`; foot = `<button class="btn" data-act="closeModal">Annuler</button><button class="btn primary" data-act="wzNext" ${WZ.service ? "" : "disabled"}>Suivant</button>`; }
  if (s === 2) { body += `<p class="hint">Choisissez le poste dans le service ${esc(svcName(WZ.service))}.</p><div class="choice">${(DB.postes[WZ.service] || []).map(p => `<button data-act="wzPoste" data-v="${esc(p)}" class="${WZ.poste === p ? "on" : ""}"><b>${esc(p)}</b><span>${DB.employes.filter(e => e.poste === p).length} personne(s)</span></button>`).join("")}</div><div class="field"><label for="wz_e">Lier à un employé (facultatif)</label><select class="input" id="wz_e" data-on="wzEmp"><option value="">— Aucun —</option>${DB.employes.filter(e => e.service === WZ.service).map(e => `<option value="${e.id}" ${WZ.emp === e.id ? "selected" : ""}>${esc(e.nom)}</option>`).join("")}</select></div>`; foot = `<button class="btn" data-act="wzPrev">Retour</button><button class="btn primary" data-act="wzNext" ${WZ.poste ? "" : "disabled"}>Suivant</button>`; }
  if (s === 3) { if (!WZ.username) { const base = "service_" + ({ rh: "paie", gestion: "gestion" }[WZ.service] || WZ.service); let n = 1; while (DB.users.some(u => u.username === base + n)) n++; WZ.username = base + n; } if (!WZ.password) WZ.password = genPwd();
    body += `<form id="mform" data-form="wzCred" class="grid-form"><div class="field"><label for="wz_u">Nom d'utilisateur</label><input class="input num" id="wz_u" name="u" value="${esc(WZ.username)}" required pattern="[a-z0-9_.]{3,30}"><span class="hint">Minuscules, chiffres, « _ » ou « . »</span></div><div class="field"><label for="wz_p">Mot de passe provisoire</label><div style="display:flex;gap:6px"><input class="input num" id="wz_p" name="p" value="${esc(WZ.password)}" required minlength="8"><button type="button" class="btn sm" data-act="wzGen" aria-label="Générer">↻</button></div><span class="hint">8 caractères minimum. À changer à la première connexion.</span></div></form><p class="err" id="mform-err" hidden></p>`;
    foot = `<button class="btn" data-act="wzPrev">Retour</button><button class="btn primary" type="submit" form="mform">Suivant</button>`; }
  if (s === 4) { const mods = (DB.perms[WZ.service] || []).map(id => MODULES.find(m => m.id === id)?.label).filter(Boolean);
    body += `<div class="recap">Vous êtes sur le point de créer l'utilisateur <b class="num">${esc(WZ.username)}</b> au poste de <b>${esc(WZ.poste)}</b> (service ${esc(svcName(WZ.service))})${WZ.emp ? ", lié à " + esc(empName(WZ.emp)) : ""}.</div><div><b style="font-size:13px;color:var(--muted)">MODULES ACCESSIBLES</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${WZ.service === "admin" ? '<span class="tag">Tous les modules</span>' : mods.map(m => `<span class="tag">${esc(m)}</span>`).join("")}</div></div>`;
    foot = `<button class="btn" data-act="wzPrev">Retour</button><button class="btn primary" data-act="wzConfirm">${ico("check", 15)} Confirmer</button>`; }
  if (s === 5) { body = `<div style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center;padding:10px"><span class="avatar" style="width:56px;height:56px;background:var(--ok)">${ico("check", 28)}</span><h3>Utilisateur créé</h3><p><b class="num">${esc(WZ.username)}</b> peut se connecter avec le mot de passe provisoire <b class="num">${esc(WZ.password)}</b>.</p><button class="btn sm" data-act="copy" data-v="Identifiant : ${esc(WZ.username)} / Mot de passe : ${esc(WZ.password)}">${ico("copy", 14)} Copier les identifiants</button></div>`; foot = `<button class="btn" data-act="newUser">Créer un autre utilisateur</button><button class="btn primary" data-act="closeModal">Terminer</button>`; }
  openModal({ title: "Créer un utilisateur", icon: "shield", body, foot });
}
const genPwd = () => { const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
PAGES.historique = () => listView({ title: "Historique des activités", sub: "Journal de toutes les actions, filtrable", rows: () => { const per = S.f.historique?.per; const d = { "Aujourd'hui": 1, "7 derniers jours": 7, "30 derniers jours": 30 }[per]; const mine = role() === "admin" ? DB.logs : DB.logs.filter(l => l.service === S.user.service); return d ? mine.filter(l => new Date(l.date) >= addDays(new Date(), -d)) : mine; }, search: r => r.action + r.user, export: true,
  filters: [...(role() === "admin" ? [{ k: "service", l: "Service", opts: [...SERVICES.map(s => [s.id, s.name]), ["client", "Portail client"], ["public", "Site web"]] }] : []), { k: "mod", l: "Module", opts: () => [...new Set(DB.logs.map(l => l.mod))].map(m => [m, MODULES.find(x => x.id === m)?.label || m]) }, { k: "per", l: "Période", opts: ["Aujourd'hui", "7 derniers jours", "30 derniers jours"], get: () => S.f.historique?.per }],
  cols: [{ l: "Date", f: r => `<span class="num">${fdt(r.date)}</span>` }, { l: "Utilisateur", f: r => `<b>${esc(r.user)}</b>` }, { l: "Service", f: r => `<span class="tag">${esc(svcName(r.service))}</span>` }, { l: "Action", k: "action" }, { l: "Module", f: r => esc(MODULES.find(x => x.id === r.mod)?.label || r.mod) }],
  csv: [{ l: "Date", k: "date" }, { l: "Utilisateur", k: "user" }, { l: "Service", x: r => svcName(r.service) }, { l: "Action", k: "action" }] });
HELP.historique = "Chaque action (création, validation, envoi, connexion) est enregistrée avec son auteur. Combinez recherche et filtres pour retrouver une opération.";
PAGES.moncompte = () => { const u = S.user, e = byId("employes", u.emp); const mine = e ? DB.conges.filter(c => c.emp === e.id) : [];
  return `<div class="cols c2"><div class="panel"><div class="panel-h"><h3>Mon profil</h3></div><div class="panel-b"><dl class="dl"><dt>Utilisateur</dt><dd class="num">${esc(u.username)}</dd><dt>Nom</dt><dd>${esc(u.nom)}</dd><dt>Service</dt><dd>${esc(svcName(u.service))}</dd><dt>Poste</dt><dd>${esc(u.poste)}</dd>${e ? `<dt>Matricule</dt><dd class="num">${esc(e.matricule)}</dd><dt>Entrée</dt><dd>${fdate(e.entree)}</dd>` : ""}</dl></div></div>
  <form class="panel" data-form="pwd"><div class="panel-h"><h3>Changer mon mot de passe</h3></div><div class="panel-b" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="pw0">Mot de passe actuel</label><input class="input" type="password" id="pw0" name="old" required autocomplete="current-password"></div><div class="field"><label for="pw1">Nouveau mot de passe (8 caractères min.)</label><input class="input" type="password" id="pw1" name="n1" required minlength="8" autocomplete="new-password"></div><div class="field"><label for="pw2">Confirmer</label><input class="input" type="password" id="pw2" name="n2" required autocomplete="new-password"></div><button class="btn blue" type="submit" style="align-self:flex-start">Mettre à jour</button></div></form></div>
  ${e ? `<div class="panel"><div class="panel-h"><h3>Mes congés</h3><div class="act"><button class="btn primary sm" data-act="myConge">${ico("plus", 15)} Demander un congé</button></div></div>${mine.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Type</th><th>Période</th><th class="r">Jours</th><th>Statut</th></tr></thead><tbody>${mine.map(c => `<tr><td>${esc(c.type)}</td><td>${fdate(c.debut)} → ${fdate(c.fin)}</td><td class="r">${c.jours}</td><td>${pillFor(c.statut)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">Aucune demande pour l\'instant.</div>'}</div>` : ""}`; };
HELP.moncompte = "Déposez ici vos demandes de congé : elles partent en validation au service RH et vous voyez leur statut en temps réel.";

/* ================= PORTAIL CLIENT ================= */
const me = () => byId("clients", S.user.client);
const isOwner = () => me()?.type === "Propriétaire";
function clientBaux() { const id = S.user.client; return isOwner() ? DB.baux.filter(l => byId("biens", l.bien)?.proprio === id) : DB.baux.filter(l => l.locataire === id); }
function clientPaiements() { const ids = clientBaux().map(l => l.id); return DB.paiements.filter(p => ids.includes(p.bail)).sort((a, b) => b.mois.localeCompare(a.mois)); }
PAGES.p_dash = () => { const c = me(), pays = clientPaiements(), due = pays.filter(p => p.statut === "Impayé");
  if (isOwner()) { const biens = DB.biens.filter(b => b.proprio === c.id), mk = curMonth(), enc = pays.filter(p => p.mois === mk && p.statut === "Payé").reduce((s, p) => s + p.montant, 0);
    return greet("Suivez vos biens confiés à KSARA, vos loyers reversés et les travaux en cours.") + `<div class="kpis">${kpi("Biens confiés", biens.length)}${kpi("Biens loués", biens.filter(b => b.statut === "Loué").length)}${kpi("Loyers encaissés (mois)", `<span class="num">${kfmt(enc)}</span>`, "Net reversé après 10 % : " + fcfa(enc * .9), "up")}${kpi("Travaux en cours", DB.travaux.filter(t => biens.some(b => b.id === t.bien) && t.statut !== "Terminé").length)}</div>` +
      quick([["build", "Voir mes biens", "go", "p_biens"], ["receipt", "Relevé des loyers", "go", "p_pay"], ["file", "Mes documents", "go", "p_docs"], ["sms", "Contacter mon gestionnaire", "contactGest"]]); }
  const bail = clientBaux().find(l => l.statut !== "Terminé"), last = pays.find(p => p.statut === "Payé");
  return greet(bail ? `Votre logement : ${esc(bienName(bail.bien))}.` : "Bienvenue sur votre portail.") +
    `<div class="kpis">${kpi("Loyer mensuel", bail ? `<span class="num">${kfmt(bail.loyer)}</span>` : "—", bail ? fcfa(bail.loyer) : "")}${kpi("Montant dû", `<span class="num">${kfmt(due.reduce((s, p) => s + p.montant, 0))}</span>`, due.length ? due.length + " mois à régler" : "Vous êtes à jour", due.length ? "down" : "up")}${kpi("Dernier paiement", last ? fdate(last.date) : "—", last ? esc(last.mode) : "")}${kpi("Fin du bail", bail ? fdate(bail.fin) : "—")}</div>` +
    `<div class="panel" data-tour="quick"><div class="panel-h"><h3>Payer mon loyer</h3><span class="sub">Mobile Money, Wave ou carte bancaire</span></div><div class="panel-b">${due.length ? due.map(p => `<div class="doc-row" style="margin-bottom:8px"><span style="flex:1"><b>${esc(monthLabel(p.mois))}</b><br><span class="hint">${esc(bienName(bailOf(p.bail).bien))}</span></span><b class="num">${fcfa(p.montant)}</b><button class="btn primary sm" data-act="clientPay" data-id="${p.id}">${ico("pay", 14)} Payer</button></div>`).join("") : `<p>Aucun loyer en attente. Merci ! ${last ? `<button class="btn sm" data-act="quittance" data-id="${last.id}">${ico("receipt", 14)} Dernière quittance</button>` : ""}</p>`}</div></div>` +
    quick([["file", "Mes documents", "go", "p_docs"], ["hist", "Mon historique", "go", "p_hist"], ["sms", "Contacter mon gestionnaire", "contactGest"]]); };
HELP.p_dash = "Payez votre loyer en ligne en quelques secondes : la quittance est générée immédiatement et rangée dans <b>Documents</b>.";
PAGES.p_biens = () => { const c = me();
  const biens = isOwner() ? DB.biens.filter(b => b.proprio === c.id) : clientBaux().map(l => byId("biens", l.bien));
  return `<div class="listings">${biens.map((b, i) => { const l = DB.baux.find(x => x.bien === b.id && x.statut !== "Terminé"); return `<article class="listing"><div class="ph">${bienImg(b, i)}<span class="tag">${esc(b.type)}</span></div><div class="body"><h3 style="font-size:17px">${esc(b.titre)}</h3><div class="meta"><span>${esc(b.quartier)}, ${esc(b.commune)}</span><span class="num">${esc(b.ref)}</span></div><div>${pillFor(b.statut)}</div>${l ? `<div class="hint">${isOwner() ? "Locataire : " + esc(cliName(l.locataire)) + "<br>" : ""}Bail du ${fdate(l.debut)} au ${fdate(l.fin)}<br>Loyer : <b class="num">${fcfa(l.loyer)}</b></div>` : ""}</div></article>`; }).join("") || '<div class="panel empty">Aucun bien associé à votre compte.</div>'}</div>`; };
PAGES.p_pay = () => { const pays = clientPaiements();
  return `<div class="panel"><div class="panel-h"><h3>${isOwner() ? "Relevé des loyers de mes biens" : "Mes paiements"}</h3></div>${pays.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mois</th>${isOwner() ? "<th>Bien / locataire</th>" : ""}<th class="r">Montant</th>${isOwner() ? '<th class="r">Net reversé</th>' : ""}<th>Paiement</th><th>Statut</th><th class="r"></th></tr></thead><tbody>${pays.map(p => `<tr><td><b>${esc(monthLabel(p.mois))}</b></td>${isOwner() ? `<td>${esc(byId("biens", bailOf(p.bail).bien)?.titre)}<br><span class="hint">${esc(cliName(bailOf(p.bail).locataire))}</span></td>` : ""}<td class="r">${NF.format(p.montant)}</td>${isOwner() ? `<td class="r">${p.statut === "Payé" ? NF.format(p.montant * .9) : "—"}</td>` : ""}<td>${p.date ? fdate(p.date) + " · " + esc(p.mode) : "—"}</td><td>${pillFor(p.statut)}</td><td class="r">${p.statut === "Payé" ? actBtn("quittance", p.id, ico("receipt", 14) + " Quittance") : isOwner() ? "" : actBtn("clientPay", p.id, ico("pay", 14) + " Payer", "primary")}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">Aucun paiement.</div>'}</div>`; };
HELP.p_pay = "Cliquez sur <b>Payer</b>, choisissez votre moyen de paiement et validez. Chaque paiement donne droit à une quittance téléchargeable.";
PAGES.p_docs = () => { const pays = clientPaiements().filter(p => p.statut === "Payé"), baux = clientBaux(), k = DB.contrats.filter(x => baux.some(l => l.bien === x.bien) && (x.partieA === S.user.client || x.partieB === S.user.client)), e = DB.edl.filter(x => baux.some(l => l.id === x.bail));
  const row = (ext, t, s, act, id) => `<div class="doc-row"><span class="ext">${ext}</span><span style="flex:1;min-width:0"><b>${esc(t)}</b><br><span class="hint">${esc(s)}</span></span><button class="btn sm" data-act="${act}" data-id="${id}">${ico("eye", 14)} Ouvrir</button></div>`;
  return `<div class="cols c2"><div class="panel"><div class="panel-h"><h3>Contrats & états des lieux</h3></div><div class="panel-b" style="display:flex;flex-direction:column;gap:8px">${k.map(x => row("PDF", x.modele, x.ref + " · " + x.statut, "viewContrat", x.id)).join("")}${e.map(x => row("EDL", "État des lieux d'" + (x.type === "Entrée" ? "entrée" : "sortie"), fdate(x.date), "viewEdl", x.id)).join("") || ""}${!k.length && !e.length ? '<p class="hint">Aucun document.</p>' : ""}</div></div>
  <div class="panel"><div class="panel-h"><h3>Quittances</h3></div><div class="panel-b" style="display:flex;flex-direction:column;gap:8px">${pays.map(p => row("QUIT", "Quittance — " + monthLabel(p.mois), p.quittance, "quittance", p.id)).join("") || '<p class="hint">Aucune quittance.</p>'}</div></div></div>`; };
PAGES.p_hist = () => { const key = "client:" + S.user.client; const ev = [...clientPaiements().filter(p => p.statut === "Payé").map(p => ({ d: p.date, t: `Paiement du loyer de ${monthLabel(p.mois)} — ${fcfa(p.montant)} (${p.mode})` })), ...DB.notifs.filter(n => n.to.includes(key)).map(n => ({ d: n.date, t: n.titre + " — " + n.txt })), ...clientBaux().map(l => ({ d: l.debut, t: "Début du bail — " + bienName(l.bien) }))].sort((a, b) => String(b.d).localeCompare(String(a.d)));
  return `<div class="panel"><div class="panel-h"><h3>Mon historique</h3></div><div class="panel-b"><div class="timeline">${ev.map(x => `<div>${esc(x.t)}<small>${fdate(String(x.d).slice(0, 10))}</small></div>`).join("") || '<p class="hint">Aucun événement.</p>'}</div></div></div>`; };
function clientPay(id) { const p = DB.paiements.find(x => x.id === id); M.pay = id;
  openModal({ title: "Payer mon loyer", icon: "pay", body: `<div class="recap">Loyer de <b>${esc(monthLabel(p.mois))}</b> — ${esc(bienName(bailOf(p.bail).bien))}<br><span style="font-family:var(--f-display);font-size:26px;font-weight:700" class="num">${fcfa(p.montant)}</span></div>
    <form id="mform" data-form="clientPay" style="display:flex;flex-direction:column;gap:14px"><div class="choice">${["Orange Money", "MTN MoMo", "Moov Money", "Wave", "Carte bancaire"].map((m, i) => `<label class="doc-row" style="cursor:pointer"><input type="radio" name="mode" value="${m}" ${i === 0 ? "checked" : ""}> <b>${m}</b></label>`).join("")}</div>
    <div class="field"><label for="cp_n">Numéro de téléphone ou de carte</label><input class="input num" id="cp_n" name="num" required value="${esc(me()?.tel || "")}"></div><p class="hint">Vous recevrez une demande de confirmation sur votre téléphone. Démonstration : le paiement est simulé, aucun débit réel.</p></form>`,
    foot: `<button class="btn" data-act="closeModal">Annuler</button><button class="btn primary" type="submit" form="mform">${ico("check", 15)} Payer ${fcfa(p.montant)}</button>` }); }

/* ================= ACTIONS ================= */
const find = (col, id) => DB[col].find(x => x.id === id);
const done = (msg, mod) => { saveDB(); if (msg) toast(msg); rerender(); };
const ACT = {
  bgClose: (d, el, e) => { if (e.target === el) closeModal(); },
  closeModal, confirmYes: () => { const f = M.onYes; closeModal(); f && f(); },
  copyCsv: () => copyText($("#csv-out").value, $("#csv-out")),
  copy: d => copyText(d.v),
  lvAdd: () => { const f = ACT[LV.addFn] || window[LV.addFn]; f && f(); },
  lvExport: () => csvModal(LV.title, LV.csv || LV.cols.filter(c => c.k).map(c => ({ l: c.l, k: c.k })), lvRows()),
  lvOpen: d => LV.open && LV.open(d.id),
  /* site */
  scroll: (d, el, e) => { e.preventDefault(); document.getElementById(d.to)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); },
  toLogin: (d, el, e) => { e?.preventDefault(); S.view = "login"; renderLogin(); },
  toReset: (d, el, e) => { e.preventDefault(); renderLogin("", true); },
  toSite: () => { S.view = "site"; renderSite(); },
  siteOp: d => { S.siteOp = d.v; $$(".hv-search [data-act=siteOp]").forEach(x => { x.classList.toggle("on", x.dataset.v === d.v); x.setAttribute("aria-pressed", x.dataset.v === d.v); }); heroCount(); },
  siteOp2: d => { S.siteOp = d.v; $("#offres").innerHTML = offresHTML(); $$(".hv-search [data-act=siteOp]").forEach(x => x.classList.toggle("on", x.dataset.v === d.v)); heroCount(); },
  siteBien: d => siteBien(d.id),
  galStep: d => galShow(M.gal.i + +d.v), galPick: d => galShow(+d.v),
  heroPause: () => { const v = $("#hv-video"), sl = $(".hv-slides"); S.heroPaused = !S.heroPaused; if (v) S.heroPaused ? v.pause() : v.play().catch(() => {}); sl?.classList.toggle("paused", S.heroPaused); if (S.heroPaused) stopHero(); else startHero(); $("#hv-pi").innerHTML = ico(S.heroPaused ? "play" : "pause", 16); $(".hv-pause").setAttribute("aria-label", S.heroPaused ? "Relancer la vidéo" : "Mettre la vidéo en pause"); },
  siteReset: () => { S.siteCommune = S.siteType = ""; $("#offres").innerHTML = offresHTML(); const f = $(".hv-search"); if (f) { f.commune.value = ""; f.type.value = ""; } heroCount(); },
  siteVisit: d => { const b = byId("biens", d.id); M.siteBien = d.id; formModal({ title: "Demander une visite", icon: "cal", intro: `<b>${esc(b.titre)}</b> — ${esc(b.quartier)}, ${esc(b.commune)}. Un conseiller KSARA vous rappelle pour fixer le rendez-vous.`, submit: "Envoyer la demande", fields: [{ k: "nom", l: "Nom complet", req: 1 }, { k: "tel", l: "Téléphone", t: "tel", req: 1 }, { k: "date", l: "Date souhaitée", t: "date" }, { k: "msg", l: "Message", t: "textarea", full: 1 }], data: { date: D(2) },
    onSave: v => { siteLead(v.nom, v.tel, `Visite demandée : ${b.titre} (${b.commune})${v.date ? " le " + fdate(v.date) : ""}. ${v.msg || ""}`); toast("Merci ! Votre demande a été transmise à l'agence."); } }); },
  siteContact: () => document.getElementById("contact")?.scrollIntoView(),
  assist: (d, el, e) => { e.preventDefault(); openModal({ title: "Contacter l'assistance", icon: "help", body: `<p>Support technique de la plateforme (AD'GEN'CI) et administrateur KSARA :</p><dl class="dl"><dt>Téléphone</dt><dd class="num">+225 27 22 00 00 00</dd><dt>Email</dt><dd>info@adgenci.com</dd><dt>Horaires</dt><dd>Lundi – vendredi, 8 h – 18 h</dd></dl>`, foot: `<button class="btn" data-act="copy" data-v="info@adgenci.com">${ico("copy", 15)} Copier l'email</button><button class="btn primary" data-act="closeModal">Fermer</button>` }); },
  demoLogin: d => { const f = $("form[data-form=login]"); f.u.value = d.u; f.p.value = "ksara2026"; login(d.u, "ksara2026"); },
  /* shell */
  go: (d, el, e) => { e?.preventDefault(); closeModal(); $("#drawer-root").innerHTML = ""; go(d.p); },
  logout, navOpen: () => { S.nav = true; $(".app").classList.add("nav-open"); }, navClose: () => { S.nav = false; $(".app").classList.remove("nav-open"); },
  tour: () => startTour(), tourNext: () => { TS.i++; showTourStep(); }, tourEnd: endTour,
  theme: () => { const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme = dark ? "light" : "dark"; sSet("ksara_theme", r.dataset.theme); },
  openNotifs, closeDrawer: () => $("#drawer-root").innerHTML = "",
  readAll: () => { myNotifs().forEach(n => n.lu = true); saveDB(); $("#drawer-root").innerHTML = ""; renderApp(); },
  goMessages: () => { $("#drawer-root").innerHTML = ""; go("messages"); },
  hideHelp: () => { const h = hiddenHelp(); h.push(S.page); sSet("ksara_help_" + S.user.username, JSON.stringify(h)); renderApp(); },
  actPer: d => { S.f.act.per = d.v; renderApp(); },
  ptab: d => { (S.f[S.page] ||= {}).tab = d.t; renderApp(); },
  editAgency: () => formModal({ title: "Profil de l'agence", icon: "edit", intro: "Le nom affiché remplace « Admin » dans le message d'accueil du tableau de bord.", fields: [{ k: "nom", l: "Nom affiché à l'accueil", req: 1 }, { k: "raison", l: "Raison sociale", req: 1 }, { k: "prenomAdmin", l: "Prénom de l'administrateur" }, { k: "nomAdmin", l: "Nom de l'administrateur" }, { k: "tel", l: "Téléphone", t: "tel" }, { k: "email", l: "Email", t: "email" }, { k: "adresse", l: "Adresse" }, { k: "rccm", l: "N° RCCM / agrément" }], data: DB.agency, onSave: v => { Object.assign(DB.agency, v); log("Profil de l'agence mis à jour", "dash"); toast("Profil mis à jour"); } }),
  /* créations rapides */
  newUser, newBien, newFacture, newEmp, newBail: () => newBail(), newEdl: () => edlForm(), newTravaux: () => newTravaux(), newContentieux: () => newContentieux(),
  newContrat: () => newContrat(), newContratM: d => newContrat(d.v),
  newClient: () => formModal({ title: "Ajouter un contact", icon: "user", fields: CLI_FIELDS, data: { type: "Prospect", source: "Agence" }, onSave: v => { DB.clients.push({ id: uid("c"), ...v }); log("Contact ajouté — " + v.nom + " (" + v.type + ")", "clients"); toast("Contact ajouté à l'annuaire"); } }),
  newAchat: () => formModal({ title: "Nouvelle demande d'achat", icon: "cart", fields: ACH_FIELDS(), data: { date: iso(TODAY), demandeur: S.user.emp }, onSave: v => { DB.achats.push({ id: uid("a"), ...v, statut: "En validation" }); notify("Demande d'achat", v.objet + " — " + fcfa(v.montant), ["admin", "rh"]); log("Demande d'achat — " + v.objet, "achats"); toast("Demande envoyée en validation"); } }),
  newInv: () => formModal({ title: "Ajouter à l'inventaire", icon: "box", fields: INV_FIELDS, data: { etat: "Bon", qte: 1 }, onSave: v => { DB.inventaire.push({ id: uid("i"), ...v }); log("Inventaire — ajout " + v.nom, "inventaire"); toast("Article ajouté"); } }),
  newCharge: () => formModal({ title: "Nouvelle charge commune", icon: "layers", fields: [{ k: "residence", l: "Résidence / copropriété", req: 1 }, { k: "poste", l: "Poste de charge", t: "select", opts: ["Gardiennage", "Électricité parties communes", "Eau parties communes", "Entretien ascenseur", "Nettoyage", "Espaces verts", "Assurance immeuble", "Travaux"], req: 1 }, { k: "montant", l: "Montant total (FCFA)", t: "number", req: 1 }, { k: "periode", l: "Période", t: "month", req: 1 }, { k: "repartition", l: "Répartition", t: "select", opts: ["Tantièmes", "Égalitaire"] }], data: { residence: "Résidence Les Palmiers", periode: curMonth() }, onSave: v => { DB.charges.push({ id: uid("ch"), ...v, statut: "À appeler" }); log("Charge commune — " + v.poste, "charges"); toast("Charge enregistrée"); } }),
  newEcriture: () => formModal({ title: "Nouvelle écriture", icon: "chart", fields: [{ k: "date", l: "Date", t: "date", req: 1 }, { k: "lib", l: "Libellé", req: 1 }, { k: "cat", l: "Catégorie", t: "select", opts: ["Loyers encaissés", "Commissions", "Ventes & transactions", "Salaires", "Charges", "Dépenses"], req: 1 }, { k: "montant", l: "Montant (FCFA)", t: "number", req: 1 }], data: { date: iso(TODAY), cat: "Dépenses" }, onSave: v => { v.sens = ["Loyers encaissés", "Commissions", "Ventes & transactions"].includes(v.cat) ? "in" : "out"; v.mois = monthKey(v.date); DB.ecritures.push({ id: uid("w"), ...v }); log("Écriture — " + v.lib, "finance"); toast("Écriture enregistrée"); } }),
  newPrest: () => formModal({ title: "Ajouter un prestataire", icon: "star", fields: PRE_FIELDS, data: { note: "4" }, onSave: v => { DB.prestataires.push({ id: uid("s"), ...v, note: +v.note, interventions: 0 }); log("Prestataire ajouté — " + v.nom, "prestataires"); toast("Prestataire ajouté"); } }),
  /* RH */
  openEmp: d => openEmp(d.id), empTab: d => openEmp(M.emp, d.t),
  empEdit: () => { const e = find("employes", M.emp); formModal({ title: "Modifier — " + e.nom, icon: "edit", fields: EMP_FIELDS(), data: e, onSave: v => { if (v.poste !== e.poste) e.historique.push({ date: iso(TODAY), txt: "Changement de poste — " + v.poste }); if (v.salaire !== e.salaire) e.historique.push({ date: iso(TODAY), txt: "Salaire modifié : " + fcfa(v.salaire) }); Object.assign(e, v); log("Fiche modifiée — " + e.nom, "personnel"); toast("Fiche mise à jour"); } }); },
  empDel: () => { const e = find("employes", M.emp); confirmModal(`Supprimer la fiche de <b>${esc(e.nom)}</b> ? Son historique et ses documents seront retirés.`, () => { DB.employes = DB.employes.filter(x => x.id !== e.id); log("Fiche supprimée — " + e.nom, "personnel"); done("Fiche supprimée"); }, "Supprimer"); },
  empDocDel: d => { const e = find("employes", M.emp); e.docs.splice(+d.id, 1); saveDB(); openEmp(M.emp, "docs"); },
  newPoste: () => formModal({ title: "Créer un poste", icon: "org", fields: [{ k: "service", l: "Service", t: "select", opts: SERVICES.map(s => [s.id, s.name]), req: 1 }, { k: "poste", l: "Intitulé du poste", req: 1 }], onSave: v => { (DB.postes[v.service] ||= []); if (DB.postes[v.service].includes(v.poste)) return "Ce poste existe déjà dans ce service."; DB.postes[v.service].push(v.poste); log("Poste créé — " + v.poste, "postes"); toast("Poste créé"); } }),
  newConge: () => congeForm(), myConge: () => congeForm(S.user.emp),
  congeOk: d => { const c = find("conges", d.id); c.statut = "Approuvé"; notify("Congé approuvé", empName(c.emp) + " — du " + fdate(c.debut) + " au " + fdate(c.fin), ["admin", "rh"]); log("Congé approuvé — " + empName(c.emp), "conges"); done("Congé approuvé, l'employé est notifié"); },
  congeKo: d => { const c = find("conges", d.id); c.statut = "Refusé"; log("Congé refusé — " + empName(c.emp), "conges"); done("Demande refusée"); },
  newAbsence: () => formModal({ title: "Déclarer une absence", icon: "clock", fields: [{ k: "emp", l: "Employé", t: "select", opts: DB.employes.map(e => [e.id, e.nom]), req: 1 }, { k: "date", l: "Date", t: "date", req: 1 }, { k: "duree", l: "Durée", t: "select", opts: ["1 heure", "2 heures", "Demi-journée", "1 jour", "2 jours", "Plus de 2 jours"] }, { k: "motif", l: "Motif", req: 1 }, { k: "justif", l: "Justificatif fourni", t: "select", opts: ["Oui", "Non"] }], data: { date: iso(TODAY), justif: "Non" }, onSave: v => { DB.absences.unshift({ id: uid("ab"), ...v }); log("Absence déclarée — " + empName(v.emp), "absences"); toast("Absence enregistrée"); } }),
  delAbs: d => confirmModal("Supprimer cette absence ?", () => { DB.absences = DB.absences.filter(a => a.id !== d.id); done("Absence supprimée"); }, "Supprimer"),
  newStage: () => formModal({ title: "Accueillir un stagiaire", icon: "cap", intro: "Une fiche employé au statut « Stagiaire » est créée automatiquement.", fields: [{ k: "nom", l: "Nom et prénoms", req: 1 }, { k: "service", l: "Service d'accueil", t: "select", opts: SERVICES.map(s => [s.id, s.name]), req: 1 }, { k: "ecole", l: "École / université", req: 1 }, { k: "tuteur", l: "Tuteur", t: "select", opts: DB.employes.filter(e => e.statut === "Actif").map(e => [e.id, e.nom]), req: 1 }, { k: "debut", l: "Début", t: "date", req: 1 }, { k: "fin", l: "Fin", t: "date", req: 1 }, { k: "gratif", l: "Gratification mensuelle (FCFA)", t: "number" }, { k: "tel", l: "Téléphone", t: "tel" }, { k: "objectifs", l: "Objectifs (séparés par « ; »)", t: "textarea", full: 1, req: 1 }], data: { debut: iso(TODAY), fin: D(90), gratif: 100000 },
    onSave: v => { const id = uid("e"); DB.employes.push({ id, matricule: "KS-" + String(DB.employes.length + 1).padStart(3, "0"), nom: v.nom, service: v.service, poste: "Stagiaire — " + svcName(v.service), statut: "Stagiaire", contrat: "Stage", entree: v.debut, salaire: v.gratif, tel: v.tel, email: "", historique: [{ date: v.debut, txt: "Début de stage — " + v.ecole }], docs: [{ nom: "Convention de stage.pdf", type: "Contrat" }] }); DB.stages.push({ id: uid("st"), emp: id, ecole: v.ecole, tuteur: v.tuteur, debut: v.debut, fin: v.fin, objectifs: v.objectifs, evaluations: [] }); log("Stagiaire accueilli — " + v.nom, "stages"); toast("Stagiaire enregistré"); } }),
  evalStage: d => { const s = find("stages", d.id); formModal({ title: "Évaluer — " + empName(s.emp), icon: "star", fields: [{ k: "note", l: "Note sur 20", t: "number", req: 1 }, { k: "com", l: "Appréciation", t: "textarea", full: 1, req: 1 }], onSave: v => { if (v.note > 20) return "La note doit être comprise entre 0 et 20."; s.evaluations.push({ date: iso(TODAY), note: v.note, com: v.com }); log("Évaluation stagiaire — " + empName(s.emp), "stages"); toast("Évaluation enregistrée"); } }); },
  newFormation: () => formModal({ title: "Planifier une formation", icon: "book", fields: [{ k: "titre", l: "Intitulé", req: 1 }, { k: "type", l: "Type", t: "select", opts: ["Interne", "Externe"] }, { k: "organisme", l: "Organisme / formateur", req: 1 }, { k: "date", l: "Date", t: "date", req: 1 }, { k: "duree", l: "Durée", ph: "ex. 2 jours" }, { k: "cout", l: "Coût (FCFA)", t: "number" }, { k: "participants", l: "Participants", t: "checks", opts: DB.employes.map(e => [e.id, e.nom]) }], data: { type: "Interne", date: D(14), participants: [] }, onSave: v => { DB.formations.push({ id: uid("fo"), ...v, statut: "Planifiée" }); notify("Formation planifiée", v.titre + " — " + fdate(v.date), ["admin", "rh"]); log("Formation planifiée — " + v.titre, "formations"); toast("Formation planifiée"); } }),
  formDone: d => { const f = find("formations", d.id); f.statut = "Réalisée"; f.participants.forEach(id => byId("employes", id)?.historique.push({ date: f.date, txt: "Formation suivie — " + f.titre })); if (f.cout) DB.ecritures.push({ id: uid("w"), date: iso(TODAY), mois: curMonth(), cat: "Dépenses", lib: "Formation — " + f.titre, montant: f.cout, sens: "out" }); log("Formation réalisée — " + f.titre, "formations"); done("Formation clôturée et ajoutée aux historiques"); },
  newMvt: () => formModal({ title: "Avance ou prime", icon: "wallet", fields: [{ k: "emp", l: "Employé", t: "select", opts: DB.employes.map(e => [e.id, e.nom]), req: 1 }, { k: "type", l: "Type", t: "select", opts: ["Avance sur salaire", "Prime de performance", "Prime de commission", "Prime exceptionnelle"], req: 1 }, { k: "montant", l: "Montant (FCFA)", t: "number", req: 1 }, { k: "mois", l: "Mois de paie", t: "month", req: 1 }], data: { mois: curMonth() }, onSave: v => { DB.mouvements.push({ id: uid("m"), ...v, statut: "En attente" }); log(v.type + " — " + empName(v.emp), "paie"); toast("Enregistré, en attente de validation"); } }),
  mvOk: d => { find("mouvements", d.id).statut = "Validée"; log("Mouvement de paie validé", "paie"); done("Validé"); },
  mvKo: d => { find("mouvements", d.id).statut = "Refusé"; done("Refusé"); },
  bulletin: d => { const e = find("employes", d.id); showPaper("Bulletin de paie", paperBulletin(e, curMonth())); },
  paieExport: () => csvModal("Paie " + monthLabel(curMonth()), [{ l: "Matricule", k: "matricule" }, { l: "Nom", k: "nom" }, { l: "Salaire de base", x: e => bulletin(e, curMonth()).brut }, { l: "Primes", x: e => bulletin(e, curMonth()).primes }, { l: "CNPS", x: e => bulletin(e, curMonth()).cnps }, { l: "Avances", x: e => bulletin(e, curMonth()).avances }, { l: "Net", x: e => bulletin(e, curMonth()).net }], DB.employes),
  paieValider: () => confirmModal(`Valider la paie de <b>${esc(monthLabel(curMonth()))}</b> ? Les bulletins seront figés et le virement enregistré en comptabilité.`, () => { const net = DB.employes.reduce((s, e) => s + bulletin(e, curMonth()).net, 0); DB.paies.push({ mois: curMonth(), date: iso(TODAY), net, effectif: DB.employes.length }); notify("Paie validée", monthLabel(curMonth()) + " — " + fcfa(net), ["admin", "rh"]); log("Paie validée — " + monthLabel(curMonth()), "paie"); done("Paie validée"); }, "Valider la paie", false),
  /* Locatif */
  zone: d => { const st = (S.f.biens ||= {}); st.commune = st.commune === d.v ? "" : d.v; renderApp(); },
  newBailFor: d => { closeModal(); newBail(d.id); }, newTravauxFor: d => { closeModal(); newTravaux({ bien: d.id }); }, newTravauxPrest: d => newTravaux({ prestataire: d.id }),
  bienEdit: () => { const b = find("biens", M.bien); formModal({ title: "Modifier le bien", icon: "edit", fields: BIEN_FIELDS, data: b, onSave: v => { Object.assign(b, v); log("Bien modifié — " + b.titre, "biens"); toast("Bien mis à jour"); } }); },
  edlFor: d => edlForm(d.id, "Entrée"),
  preavis: d => confirmModal("Enregistrer le préavis de départ du locataire ? Le juridique et le propriétaire seront informés.", () => { const l = find("baux", d.id); l.statut = "Préavis"; l.fin = l.fin < D(90) ? l.fin : D(90); notify("Préavis reçu", bailLabel(l.id) + " — départ prévu le " + fdate(l.fin), ["admin", "juridique", "syndic", "gestion", "client:" + byId("biens", l.bien).proprio]); log("Préavis — " + bailLabel(l.id), "locatif"); done("Préavis enregistré"); }, "Enregistrer", false),
  sortie: d => confirmModal("Confirmer la <b>sortie du locataire</b> ? Le bail sera clôturé et le bien remis en location. Vous serez guidé vers l'état des lieux de sortie.", () => { const l = find("baux", d.id); l.statut = "Terminé"; l.fin = iso(TODAY); byId("biens", l.bien).statut = "Disponible"; notify("Sortie locataire", bailLabel(l.id), ["admin", "syndic", "gestion", "juridique"]); log("Sortie locataire — " + bailLabel(l.id), "locatif"); saveDB(); rerender(); edlForm(l.id, "Sortie"); }, "Confirmer la sortie"),
  quittance: d => { const p = DB.paiements.find(x => x.id === d.id); showPaper("Quittance", paperQuittance(p), role() !== "client" ? `<button class="btn" data-act="sendQuit" data-id="${p.id}">${ico("send", 15)} Envoyer au locataire</button>` : ""); },
  sendQuit: d => { const p = DB.paiements.find(x => x.id === d.id), l = bailOf(p.bail); notify("Quittance envoyée", "Quittance " + monthLabel(p.mois) + " envoyée à " + cliName(l.locataire), ["admin", "syndic", "gestion", "client:" + l.locataire], "Email"); log("Quittance envoyée — " + cliName(l.locataire), "quittances"); toast("Quittance envoyée par email et SMS"); },
  encaisser: d => encaisser(d.id),
  relance: d => { relancer(d.id); done("Relance SMS envoyée"); },
  relanceAll: () => { const b = [...new Set(impayes().map(p => p.bail))]; b.forEach(relancer); done(b.length + " relance(s) SMS envoyée(s)"); },
  toJuridique: d => { const l = bailOf(d.id), n = impayes().filter(p => p.bail === d.id).length; newContentieux({ objet: `Loyers impayés (${n} mois)`, type: "Impayé", bail: d.id, adverse: l.locataire, etape: "Mise en demeure", audience: "" }); },
  chargeCall: d => { const c = find("charges", d.id); c.statut = "Appelée"; notify("Appel de charges", c.residence + " — " + c.poste + " : " + fcfa(c.montant), ["admin", "syndic", "client:c2"], "SMS"); log("Appel de charges — " + c.poste, "charges"); done("Appel de fonds envoyé aux copropriétaires"); },
  chargeOk: d => { const c = find("charges", d.id); c.statut = "Recouvrée"; log("Charge recouvrée — " + c.poste, "charges"); done("Charge recouvrée"); },
  travStart: d => { find("travaux", d.id).statut = "En cours"; done("Travaux démarrés"); },
  travEnd: d => { const t = find("travaux", d.id); t.statut = "Terminé"; const p = byId("prestataires", t.prestataire); if (p) p.interventions++; if (t.cout) DB.ecritures.push({ id: uid("w"), date: iso(TODAY), mois: curMonth(), cat: "Dépenses", lib: "Travaux — " + t.objet, montant: t.cout, sens: "out" }); log("Travaux terminés — " + t.objet, "travaux"); done("Travaux terminés, dépense enregistrée"); },
  /* Finance */
  etatsExport: () => { const ks = monthSeries(); csvModal("États financiers", [{ l: "Rubrique", k: "c" }, ...ks.map(k => ({ l: monthLabel(k), x: r => DB.ecritures.filter(e => e.cat === r.c && e.mois === k).reduce((s, e) => s + e.montant, 0) }))], ["Loyers encaissés", "Commissions", "Ventes & transactions", "Salaires", "Charges", "Dépenses"].map(c => ({ c }))); },
  facAdd: () => { facSync(); M.lines.push({ d: "", q: 1, pu: 0 }); $("#f-wrap").innerHTML = M.drawLines(); facTotal(); },
  facDel: d => { facSync(); if (M.lines.length > 1) M.lines.splice(+d.id, 1); $("#f-wrap").innerHTML = M.drawLines(); facTotal(); },
  facPaid: d => { const f = find("factures", d.id); f.statut = "Payée"; DB.ecritures.push({ id: uid("w"), date: iso(TODAY), mois: curMonth(), cat: "Commissions", lib: "Facture " + f.no + " — " + cliName(f.client), montant: factTotal(f).ttc, sens: "in" }); log("Facture payée — " + f.no, "facturation"); done("Facture soldée et enregistrée en comptabilité"); },
  achOk: d => { find("achats", d.id).statut = "Commandé"; log("Achat commandé", "achats"); done("Commande passée"); },
  achKo: d => { find("achats", d.id).statut = "Refusé"; done("Demande refusée"); },
  achLivre: d => { const a = find("achats", d.id); a.statut = "Livré"; DB.ecritures.push({ id: uid("w"), date: iso(TODAY), mois: curMonth(), cat: "Dépenses", lib: "Achat — " + a.objet, montant: a.montant, sens: "out" }); log("Achat réceptionné — " + a.objet, "achats"); done("Réception enregistrée"); },
  /* Juridique */
  kSign: d => { const k = find("contrats", d.id); k.statut = "Signé"; log("Contrat signé — " + k.ref, "contrats"); closeModal(); done("Contrat signé et archivé"); },
  viewContrat: d => { const k = find("contrats", d.id); showPaper(k.modele, paperContrat(k)); },
  viewEdl: d => showPaper("État des lieux", paperEDL(find("edl", d.id))),
  xNext: d => { const x = find("contentieux", d.id), i = ETAPES.indexOf(x.etape); x.etape = ETAPES[Math.min(ETAPES.length - 1, i + 1)]; log("Contentieux — étape « " + x.etape + " »", "contentieux"); done("Étape : " + x.etape); },
  xClose: d => confirmModal("Clore ce dossier contentieux ?", () => { find("contentieux", d.id).statut = "Clos"; log("Contentieux clos", "contentieux"); done("Dossier clos"); }, "Clore", false),
  /* Clients */
  openClient: d => openClient(d.id),
  cliEdit: () => { const c = find("clients", M.client); formModal({ title: "Modifier le contact", icon: "edit", fields: CLI_FIELDS, data: c, onSave: v => { Object.assign(c, v); log("Contact modifié — " + c.nom, "clients"); toast("Contact mis à jour"); } }); },
  cliConvert: () => { const c = find("clients", M.client); c.type = "Locataire"; log("Prospect converti — " + c.nom, "clients"); closeModal(); done("Prospect converti en locataire"); },
  cliDel: () => { const c = find("clients", M.client); if (DB.baux.some(l => l.locataire === c.id) || DB.biens.some(b => b.proprio === c.id)) { toast("Ce contact a des biens ou des baux : suppression impossible."); return; } confirmModal(`Supprimer <b>${esc(c.nom)}</b> de l'annuaire ?`, () => { DB.clients = DB.clients.filter(x => x.id !== c.id); done("Contact supprimé"); }, "Supprimer"); },
  rate: d => { const p = find("prestataires", d.id); p.note = +d.v; log("Prestataire noté — " + p.nom + " (" + d.v + "/5)", "prestataires"); done("Note enregistrée"); },
  tpl: d => { const f = $("form[data-form=sendMsg]"); f.titre.value = d.t; f.txt.value = d.v; f.titre.focus(); },
  nlPreview: () => { const f = $("form[data-form=newsletter]"), fd = new FormData(f); showPaper("Aperçu de la newsletter", nlHTML({ titre: fd.get("titre"), cible: fd.get("cible"), intro: fd.get("intro"), offres: fd.getAll("offres") })); },
  /* Admin */
  uReset: d => { const u = find("users", d.id); u.password = genPwd(); log("Mot de passe réinitialisé — " + u.username, "users"); saveDB(); openModal({ title: "Mot de passe réinitialisé", icon: "key", body: `<p>Nouveau mot de passe provisoire pour <b class="num">${esc(u.username)}</b> :</p><p class="recap num" style="font-size:20px;font-weight:700">${esc(u.password)}</p><p class="hint">Transmettez-le à l'utilisateur par un canal sûr. Il devra le changer depuis « Mon espace ».</p>`, foot: `<button class="btn" data-act="copy" data-v="${esc(u.password)}">${ico("copy", 15)} Copier</button><button class="btn primary" data-act="closeModal">Fermer</button>` }); },
  uToggle: d => { const u = find("users", d.id); u.actif = !u.actif; log((u.actif ? "Compte activé — " : "Compte désactivé — ") + u.username, "users"); done(u.actif ? "Compte activé" : "Compte désactivé"); },
  wzSvc: d => { if (WZ.service !== d.v) { WZ.poste = ""; WZ.emp = ""; WZ.username = ""; } WZ.service = d.v; drawWizard(); },
  wzPoste: d => { WZ.poste = d.v; drawWizard(); },
  wzNext: () => { WZ.step++; drawWizard(); }, wzPrev: () => { WZ.step--; drawWizard(); },
  wzGen: () => { WZ.password = genPwd(); $("#wz_p").value = WZ.password; },
  wzConfirm: () => { const emp = byId("employes", WZ.emp); DB.users.push({ id: uid("u"), username: WZ.username, password: WZ.password, role: WZ.service, service: WZ.service, poste: WZ.poste, nom: emp?.nom || WZ.username, emp: WZ.emp || "", actif: true }); log("Utilisateur " + WZ.username + " créé (" + WZ.poste + ")", "users"); WZ.step = 5; drawWizard(); rerenderBehind(); },
  resetDemo: () => confirmModal("Remettre toutes les données de démonstration à zéro ? Les saisies faites dans ce navigateur seront effacées.", () => { DB = seed(); saveDB(); renderLogin(); toast("Données de démonstration réinitialisées"); }, "Réinitialiser"),
  /* Portail */
  clientPay: d => clientPay(d.id),
  contactGest: () => formModal({ title: "Contacter mon gestionnaire", icon: "sms", fields: [{ k: "objet", l: "Objet", t: "select", opts: ["Question sur un paiement", "Demande d'intervention / panne", "Renouvellement ou fin de bail", "Autre demande"] }, { k: "msg", l: "Message", t: "textarea", req: 1, full: 1 }], submit: "Envoyer", onSave: v => { notify("Message client — " + v.objet, S.user.nom + " : " + v.msg, ["admin", "syndic", "gestion"]); log("Message envoyé à l'agence — " + v.objet, "p_dash"); toast("Message envoyé. Votre gestionnaire vous répond rapidement."); } })
};
function rerenderBehind() { const m = $("#modal-root").innerHTML; rerender(); $("#modal-root").innerHTML = m; }
function relancer(bailId) { const l = bailOf(bailId), c = byId("clients", l.locataire), ps = impayes().filter(p => p.bail === bailId); ps.forEach(p => p.relances++); const tot = ps.reduce((s, p) => s + p.montant, 0);
  notify("Relance SMS envoyée", `${c.nom} (${c.tel}) — ${fcfa(tot)} dû`, ["admin", "syndic", "gestion"], "SMS");
  notify("Rappel de paiement", `Votre loyer de ${fcfa(tot)} reste impayé. Payez en ligne depuis votre portail ou contactez l'agence.`, ["client:" + c.id], "SMS");
  log("Relance SMS — " + c.nom, "recouvrement"); }
function siteLead(nom, tel, note) { DB.clients.push({ id: uid("c"), nom, type: "Prospect", tel, email: "", commune: "", source: "Site web", entreprise: "", note }); notify("Nouveau prospect (site web)", nom + " — " + note, ["admin", "marketing", "gestion"]); log("Demande reçue du site — " + nom, "clients"); }
function copyText(t, el) { try { navigator.clipboard.writeText(t).then(() => toast("Copié dans le presse-papiers"), () => { el?.select?.(); toast("Sélectionnez le texte puis copiez-le (Ctrl+C)"); }); } catch (e) { el?.select?.(); toast("Sélectionnez le texte puis copiez-le (Ctrl+C)"); } }

/* ================= FORMULAIRES ================= */
const FORMS = {
  generic: f => { const v = readForm(f), err = $("#mform-err"); const r = M.onSave ? M.onSave(v) : undefined; if (r === "__keep") return; if (typeof r === "string") { err.textContent = r; err.hidden = false; return; } closeModal(); saveDB(); rerender(); },
  siteSearch: f => { S.siteCommune = f.commune.value; S.siteType = f.type.value; $("#offres").innerHTML = offresHTML(); document.getElementById("offres")?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" }); },
  siteContact: f => { const v = Object.fromEntries(new FormData(f)); siteLead(v.nom, v.tel, v.objet + (v.msg ? " — " + v.msg : "")); f.reset(); toast("Merci ! Un conseiller KSARA vous rappelle sous 24 h."); },
  login: f => login(f.u.value.trim(), f.p.value),
  reset: f => { notify("Demande de réinitialisation", "L'utilisateur « " + f.u.value + " » demande un nouveau mot de passe.", ["admin"]); toast("Demande transmise à l'administrateur."); S.view = "login"; renderLogin(); },
  empHist: f => { const e = find("employes", M.emp), v = Object.fromEntries(new FormData(f)); e.historique.push({ date: v.date, txt: v.type + " — " + v.txt }); log(v.type + " — " + e.nom, "personnel"); saveDB(); openEmp(M.emp, "hist"); toast("Historique mis à jour"); },
  edl: f => { const fd = new FormData(f), bail = fd.get("bail"), type = fd.get("type"); const e = { id: uid("ed"), bail, type, date: fd.get("date"), agent: fd.get("agent"), compteurs: fd.get("compteurs"), cles: +fd.get("cles") || 0, pieces: PIECES0.map((p, i) => ({ p, e: fd.get("etat" + i), c: fd.get("com" + i) })) };
    DB.edl.push(e); const l = bailOf(bail); if (type === "Entrée") l.edlEntree = e.id; else l.edlSortie = e.id; log("État des lieux d'" + type.toLowerCase() + " — " + bailLabel(bail), "edl"); notify("État des lieux disponible", "Document consultable dans votre portail (" + fdate(e.date) + ").", ["client:" + l.locataire, "client:" + byId("biens", l.bien).proprio], "Email"); saveDB(); closeModal(); rerender(); showPaper("État des lieux", paperEDL(e)); toast("État des lieux enregistré"); },
  facture: f => { facSync(); const lines = M.lines.filter(l => l.d && l.q > 0); if (!lines.length) { toast("Ajoutez au moins une ligne avec une désignation."); return; } const fd = new FormData(f); const no = "FAC-" + TODAY.getFullYear() + "-" + String(41 + DB.factures.length).padStart(3, "0"); const fa = { id: uid("f"), no, client: fd.get("client"), objet: fd.get("objet"), date: iso(TODAY), echeance: fd.get("echeance"), statut: "En attente", lignes: lines, tva: fd.get("tva") === "1" }; DB.factures.push(fa); log("Facture " + no + " créée", "facturation"); saveDB(); closeModal(); rerender(); showPaper("Facture", paperFacture(fa)); toast("Facture " + no + " créée"); },
  sendMsg: f => { const v = Object.fromEntries(new FormData(f)), dest = TARGETS[v.cible]().filter(Boolean); const to = v.cible === "Personnel de l'agence" ? ["admin", "rh", "juridique", "syndic", "gestion", "marketing"] : ["admin", ...dest.map(c => "client:" + c.id)]; notify(v.titre, v.txt + " (" + dest.length + " destinataire(s) : " + v.cible + ")", to, v.canal); log(v.canal + " envoyé — " + v.cible + " (" + dest.length + ")", "messages"); f.reset(); saveDB(); renderApp(); toast(v.canal + " envoyé à " + dest.length + " destinataire(s)"); },
  newsletter: f => { const fd = new FormData(f), cible = fd.get("cible"); const map = { Tous: () => DB.clients, Prospects: () => DB.clients.filter(c => c.type === "Prospect"), Locataires: () => DB.clients.filter(c => c.type === "Locataire"), Propriétaires: () => DB.clients.filter(c => c.type === "Propriétaire"), Acheteurs: () => DB.clients.filter(c => c.type === "Acheteur") }; const n = map[cible]().length; DB.campagnes.unshift({ id: uid("cp"), titre: fd.get("titre"), cible, envoyes: n, ouverture: 0, date: iso(TODAY), statut: "Envoyée" }); log("Newsletter envoyée — " + fd.get("titre") + " (" + n + ")", "emailing"); saveDB(); renderApp(); toast("Newsletter envoyée à " + n + " contact(s)"); },
  wzCred: f => { const u = f.u.value.trim().toLowerCase(), p = f.p.value.trim(), err = $("#mform-err"); const bad = !/^[a-z0-9_.]{3,30}$/.test(u) ? "Nom d'utilisateur invalide : 3 à 30 caractères (minuscules, chiffres, « _ » ou « . »)." : DB.users.some(x => x.username === u) ? "Ce nom d'utilisateur existe déjà. Choisissez-en un autre." : p.length < 8 ? "Le mot de passe doit contenir au moins 8 caractères." : ""; if (bad) { err.textContent = bad; err.hidden = false; return; } WZ.username = u; WZ.password = p; WZ.step = 4; drawWizard(); },
  pwd: f => { const v = Object.fromEntries(new FormData(f)); if (v.old !== S.user.password) return toast("Le mot de passe actuel est incorrect."); if (v.n1.length < 8) return toast("Le nouveau mot de passe doit contenir au moins 8 caractères."); if (v.n1 !== v.n2) return toast("Les deux nouveaux mots de passe ne correspondent pas."); S.user.password = v.n1; const u = DB.users.find(x => x.id === S.user.id); u.password = v.n1; log("Mot de passe modifié", "moncompte"); saveDB(); f.reset(); toast("Mot de passe mis à jour"); },
  clientPay: f => { const p = DB.paiements.find(x => x.id === M.pay), mode = new FormData(f).get("mode"); payLoyer(p, mode, iso(TODAY)); saveDB(); closeModal(); renderApp(); openModal({ title: "Paiement confirmé", icon: "check", body: `<div class="recap">Merci ! Votre paiement de <b class="num">${fcfa(p.montant)}</b> par ${esc(mode)} a bien été reçu. Votre quittance <b class="num">${esc(p.quittance)}</b> est disponible.</div>`, foot: `<button class="btn" data-act="closeModal">Fermer</button><button class="btn primary" data-act="quittance" data-id="${p.id}">${ico("receipt", 15)} Voir la quittance</button>` }); }
};

/* ================= CYCLE DE VIE (React) ================= */
let _offs = [];
const _on = (t, ev, fn) => { t.addEventListener(ev, fn); _offs.push(() => t.removeEventListener(ev, fn)); };

export function startEngine() {
/* ================= ÉVÉNEMENTS ================= */
_on(document, "click", e => { const el = e.target.closest("[data-act]"); if (!el) return; const f = ACT[el.dataset.act]; if (!f) return; if (el.tagName === "A") e.preventDefault(); f(el.dataset, el, e); });
_on(document, "submit", e => { const f = e.target; const h = FORMS[f.dataset.form]; if (!h) return; e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; } h(f, e); });
_on(document, "input", e => { const t = e.target;
  if (t.dataset.lf) { (S.f[S.page] ||= {})[t.dataset.lf] = t.value; $("#lv-body").innerHTML = lvBody(); if (t.dataset.lf === "commune" && S.page === "biens") $$(".zone").forEach(z => z.classList.toggle("on", z.dataset.v === t.value)); }
  if (t.closest("form[data-form=facture]")) facTotal(); });
_on(document, "change", e => { const t = e.target, on = t.dataset.on;
  if (on === "actSvc") { S.f.act.svc = t.value; renderApp(); }
  if (on === "wzEmp") WZ.emp = t.value;
  if (t.closest(".hv-search")) { S.siteCommune = $("#s_com").value; S.siteType = $("#s_type").value; heroCount(); }
  if (on === "bienPhoto" && t.files.length) { const b = find("biens", M.bien); let n = 0; [...t.files].forEach(file => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const sc = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); (b.photos ||= []).push(c.toDataURL("image/jpeg", .72)); if (++n === t.files.length) { saveDB(); log(n + " photo(s) ajoutée(s) — " + b.titre, "biens"); renderApp(); openBien(b.id); toast(n + " photo(s) ajoutée(s)" + (b.statut === "Disponible" ? " et publiée(s) sur le site" : "")); } }; im.src = r.result; }; r.readAsDataURL(file); }); }
  if (on === "perm") { const arr = (DB.perms[t.dataset.r] ||= []); if (t.checked) { if (!arr.includes(t.dataset.m)) arr.push(t.dataset.m); } else DB.perms[t.dataset.r] = arr.filter(x => x !== t.dataset.m); log("Permissions modifiées — " + svcName(t.dataset.r), "users"); saveDB(); toast("Permissions de « " + svcName(t.dataset.r) + " » mises à jour"); }
  if (on === "empDoc" && t.files[0]) { const e2 = find("employes", M.emp); e2.docs.push({ nom: t.files[0].name, type: $("#d_t").value, size: t.files[0].size }); log("Document RH ajouté — " + e2.nom, "personnel"); saveDB(); openEmp(M.emp, "docs"); toast("Document ajouté à la fiche"); } });
_on(document, "keydown", e => { if (e.key === "Escape") { if ($("#tour-root").innerHTML) endTour(); else if ($("#modal-root").innerHTML) closeModal(); else $("#drawer-root").innerHTML = ""; } });
_on(window, "resize", () => { if (TS.i >= 0) showTourStep(); });


/* ================= DÉMARRAGE ================= */
function init() {
  const th = sGet("ksara_theme"); if (th) document.documentElement.dataset.theme = th;
  loadDB();
  const sid = sGet("ksara_session"), u = sid && DB.users.find(x => x.id === sid && x.actif);
  if (u) { S.user = u; S.view = "app"; S.page = u.role === "client" ? "p_dash" : "dash"; renderApp(); }
  else if (location.hash === "#connexion") { S.view = "login"; renderLogin(); }
  else renderSite();
}



  init();
  return () => { stopHero(); TS.i = -1; _offs.forEach(f => f()); _offs = []; };
}
