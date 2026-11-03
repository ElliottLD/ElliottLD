"use strict";

/* ---------- Stockage local (tout reste sur l'appareil) ---------- */

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem("as_" + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("as_" + key, JSON.stringify(value));
      return true;
    } catch {
      toast("Impossible d'enregistrer sur cet appareil.");
      return false;
    }
  },
};

const state = {
  profile: store.get("profile", null),
  meals: store.get("meals", []),
  weights: store.get("weights", []),
  recipes: store.get("recipes", []),
  tab: "today",
  day: todayKey(),
};

function saveMeals() { store.set("meals", state.meals); }
function saveWeights() { store.set("weights", state.weights); }
function saveRecipes() { store.set("recipes", state.recipes); refreshFoodList(); }
function saveProfile() { store.set("profile", state.profile); }

/* ---------- Clé d'accès (lien secret) ---------- */

function readAccessKey() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get("k") || new URLSearchParams(location.hash.slice(1)).get("k");
  if (fromUrl) store.set("key", fromUrl);
  return fromUrl || store.get("key", "");
}
const ACCESS_KEY = readAccessKey();

function shareLink() {
  return `${location.origin}/?k=${encodeURIComponent(ACCESS_KEY)}`;
}

/* ---------- Utilitaires ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const round = (n) => Math.round(Number(n) || 0);
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
// Poids à la française : virgule et jusqu'à 2 décimales (72,45).
const fmtKg = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const parseKg = (s) => parseFloat(String(s ?? "").trim().replace(",", "."));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function shiftKey(key, days) {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}
function dayLabel(key) {
  const t = todayKey();
  if (key === t) return "Aujourd'hui";
  if (key === shiftKey(t, -1)) return "Hier";
  const s = parseKey(key).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shortDate(key) {
  return parseKey(key).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

/* ---------- Calcul des objectifs ---------- */

const ACTIVITY = [
  { v: 1.2, label: "Sédentaire (bureau, peu de sport)" },
  { v: 1.375, label: "Léger (1–3 séances / semaine)" },
  { v: 1.55, label: "Modéré (3–5 séances / semaine)" },
  { v: 1.725, label: "Élevé (6–7 séances / semaine)" },
  { v: 1.9, label: "Très élevé (sport + métier physique)" },
];
const PACE = [
  { v: 0.25, label: "Doux — 0,25 kg / semaine" },
  { v: 0.5, label: "Recommandé — 0,5 kg / semaine" },
  { v: 0.75, label: "Rapide — 0,75 kg / semaine" },
];
// Prise de poids : lent pour prendre surtout du muscle et rester sec.
const GAIN_PACE = [
  { v: 0.1, label: "Très sec — 0,1 kg / semaine" },
  { v: 0.25, label: "Recommandé — 0,25 kg / semaine" },
  { v: 0.4, label: "Rapide — 0,4 kg / semaine" },
];

function direction(weight, goalWeight) {
  const diff = weight - goalWeight;
  return diff > 0.5 ? "cut" : diff < -0.5 ? "bulk" : "maintain";
}

function computeTargets(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "f" ? -161 : 5);
  // Dépense : formule (Mifflin-St Jeor × activité) + correction apprise du poids réel.
  const tdee = bmr * p.activity + (p.kcalAdjust || 0);
  const mode = direction(p.weight, p.goalWeight);
  let kcal = tdee;
  if (mode === "cut") {
    const deficit = Math.min(((p.pace || 0.5) * 7700) / 7, tdee * 0.25);
    kcal = Math.max(tdee - deficit, p.sex === "f" ? 1200 : 1500);
  } else if (mode === "bulk") {
    kcal = tdee + Math.min(((p.gainPace || 0.25) * 7700) / 7, 500);
  }
  // Protéines hautes en sèche (garder le muscle) comme en prise (en construire).
  let protein = mode === "cut" ? 2 * p.goalWeight : mode === "bulk" ? 2 * p.weight : 1.8 * p.weight;
  protein = Math.min(protein, (kcal * 0.35) / 4);
  const fat = Math.max(0.8 * Math.min(p.weight, p.goalWeight + 10), (kcal * 0.25) / 9);
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  return { kcal: round(kcal / 10) * 10, protein: round(protein), carbs: round(carbs), fat: round(fat), tdee: round(tdee), bmr: round(bmr), mode };
}

/* ---------- Ajustement automatique de la dépense ----------
   Sur les 3 dernières semaines : calories notées en moyenne et pente du poids.
   Dépense réelle ≈ calories mangées − variation de poids × 7700 kcal/kg.
   La différence avec la formule devient une correction, appliquée par pas de 150 kcal au plus. */
const ADAPT = { windowDays: 21, minDays: 10, minWeighIns: 4, minSpanDays: 10, maxStep: 150, minChange: 50, rateTolerance: 0.1, cooldownDays: 14, snoozeDays: 7 };

function adaptiveStatus() {
  const p = state.profile;
  if (p.custom) return { state: "custom" };
  const end = shiftKey(todayKey(), -1); // la journée en cours n'est pas finie
  const start = shiftKey(end, -(ADAPT.windowDays - 1));
  const base = computeTargets(p);
  // Jours notés : au moins la moitié de l'objectif, sinon on considère que tout n'a pas été noté.
  const days = [];
  for (let k = start; k <= end; k = shiftKey(k, 1)) {
    const kcal = dayTotals(k).kcal;
    if (kcal >= base.kcal * 0.5) days.push(kcal);
  }
  const weights = state.weights.filter((w) => w.date >= start && w.date <= end);
  const span = weights.length > 1 ? (parseKey(weights[weights.length - 1].date) - parseKey(weights[0].date)) / 86400000 : 0;
  const progress = { days: days.length, weighIns: weights.length, span };
  if (days.length < ADAPT.minDays || weights.length < ADAPT.minWeighIns || span < ADAPT.minSpanDays) return { state: "collecting", ...progress };

  const now = Date.now();
  const since = (t) => (t ? (now - t) / 86400000 : Infinity);
  if (since(p.adapt?.at) < ADAPT.cooldownDays) return { state: "cooldown", ...progress, nextIn: Math.ceil(ADAPT.cooldownDays - since(p.adapt.at)) };

  // Pente du poids par moindres carrés (kg / jour) : moins sensible qu'un simple écart premier / dernier.
  const xs = weights.map((w) => (parseKey(w.date) - parseKey(start)) / 86400000);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = weights.reduce((a, w) => a + w.kg, 0) / weights.length;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (weights[i].kg - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const intake = days.reduce((a, b) => a + b, 0) / days.length;
  const realTdee = intake - slope * 7700;

  const oldAdjust = p.kcalAdjust || 0;
  const formulaTdee = base.tdee - oldAdjust;
  const wanted = realTdee - formulaTdee;
  const step = Math.max(-ADAPT.maxStep, Math.min(ADAPT.maxStep, wanted - oldAdjust));
  const newAdjust = round(oldAdjust + step);
  const next = computeTargets({ ...p, kcalAdjust: newAdjust });
  const result = { ...progress, intake: round(intake), weeklyRate: slope * 7, realTdee: round(realTdee), from: base.kcal, to: next.kcal, newAdjust, mode: base.mode };
  // Le poids varie de quelques centaines de grammes d'un jour à l'autre (eau, sel) :
  // on ne bouge pas tant que le rythme reste à moins de 0,1 kg / semaine de celui visé.
  const offTarget = Math.abs(slope * 7 - expectedRate(p, base.mode)) >= ADAPT.rateTolerance;
  if (!offTarget || Math.abs(next.kcal - base.kcal) < ADAPT.minChange) return { state: "ontrack", ...result };
  if (since(p.adapt?.dismissedAt) < ADAPT.snoozeDays) return { state: "snoozed", ...result };
  return { state: "suggest", ...result };
}

function signedKg(n) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtKg(Math.abs(round2(n)))}`;
}

function expectedRate(p, mode) {
  return mode === "cut" ? -(p.pace || 0.5) : mode === "bulk" ? p.gainPace || 0.25 : 0;
}

// Carte affichée sur l'écran du jour quand un nouvel objectif est proposé.
function adaptCard() {
  const a = adaptiveStatus();
  if (a.state !== "suggest") return "";
  const p = state.profile;
  const target = expectedRate(p, a.mode);
  const faster = a.mode === "maintain" ? null : Math.abs(a.weeklyRate) > Math.abs(target);
  const verb = a.mode === "cut" ? "perte" : a.mode === "bulk" ? "prise" : "évolution";
  const head = a.mode === "maintain"
    ? `Ton poids bouge de ${signedKg(a.weeklyRate)} kg par semaine alors que tu vises le maintien.`
    : `Ta ${verb} de poids est plus ${faster ? "rapide" : "lente"} que prévu : ${signedKg(a.weeklyRate)} kg par semaine au lieu de ${signedKg(target)}.`;
  return `
    <div class="card adapt">
      <p style="margin-bottom:6px"><b>Ajustement de ton objectif</b></p>
      <p class="small">${head} Ton objectif passe de <b>${a.from}</b> à <b>${a.to} kcal</b>.</p>
      <p class="small muted">Sur les 3 dernières semaines : ${a.days} jours notés à ${a.intake} kcal en moyenne et ${a.weighIns} pesées. Ta dépense réelle est estimée à ${a.realTdee} kcal par jour.</p>
      <div class="btn-row">
        <button class="btn primary" data-act="adapt-accept">Accepter</button>
        <button class="btn" data-act="adapt-later">Plus tard</button>
      </div>
    </div>`;
}

// État de l'ajustement, affiché dans l'onglet Poids.
function adaptInfo() {
  const a = adaptiveStatus();
  const p = state.profile;
  const adj = p.kcalAdjust ? ` Correction actuelle de ta dépense : <b>${p.kcalAdjust > 0 ? "+" : ""}${p.kcalAdjust} kcal</b>.` : "";
  const text = {
    custom: "Tes objectifs sont personnalisés à la main : l'ajustement automatique est désactivé.",
    collecting: `L'appli apprend ta vraie dépense à partir de tes repas et de ton poids. Sur les 3 dernières semaines : <b>${a.days}/${ADAPT.minDays}</b> jours notés en entier, <b>${a.weighIns}/${ADAPT.minWeighIns}</b> pesées sur au moins ${ADAPT.minSpanDays} jours.`,
    cooldown: `Objectif ajusté récemment. Prochaine vérification dans ${a.nextIn} jour${a.nextIn > 1 ? "s" : ""}.`,
    ontrack: `Ton objectif est juste : ta dépense réelle (≈ ${a.realTdee} kcal) correspond à ce qui est prévu.`,
    snoozed: `Un ajustement de ${a.from} à ${a.to} kcal est en attente ; il te sera reproposé dans quelques jours.`,
    suggest: `Un nouvel objectif t'est proposé sur l'écran du jour : ${a.from} → ${a.to} kcal.`,
  }[a.state];
  return `<p class="small" style="margin:0"><b>Ajustement automatique.</b> ${text}${adj}</p>`;
}

function targets() {
  const p = state.profile;
  const auto = computeTargets(p);
  return p.custom ? { ...auto, ...p.custom } : auto;
}

/* ---------- Agrégats ---------- */

function mealTotals(meal) {
  return meal.items.reduce(
    (t, it) => ({ kcal: t.kcal + (+it.kcal || 0), protein: t.protein + (+it.protein || 0), carbs: t.carbs + (+it.carbs || 0), fat: t.fat + (+it.fat || 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
function dayTotals(key) {
  return state.meals
    .filter((m) => m.date === key)
    .map(mealTotals)
    .reduce((a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

const MEAL_TYPES = { breakfast: "Petit-déj", lunch: "Déjeuner", snack: "Collation", dinner: "Dîner" };
const MEAL_ICONS = { breakfast: "☕", lunch: "🍽️", snack: "🍎", dinner: "🌙" };
function guessMealType(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

/* ---------- Rendu ---------- */

function render() {
  const view = $("#view");
  const tabs = $("#tabs");
  if (!ACCESS_KEY) {
    tabs.hidden = true;
    view.innerHTML = renderLocked();
    return;
  }
  if (!state.profile) {
    tabs.hidden = true;
    view.innerHTML = renderOnboarding();
    bindProfileForm($("#profile-form"), true);
    return;
  }
  tabs.hidden = false;
  $$(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === state.tab));
  const screens = { today: renderToday, weight: renderWeight, history: renderHistory, profile: renderProfile };
  view.innerHTML = screens[state.tab]();
  if (state.tab === "profile") bindProfileForm($("#profile-form"), false);
  window.scrollTo(0, 0);
}

function renderLocked() {
  return `
    <div class="hero">
      <img class="logo" src="/icons/icon-192.png" alt="">
      <h1>Assiette</h1>
      <p class="muted">Cette appli s'ouvre uniquement avec son lien d'accès complet.</p>
    </div>
    <div class="card">
      <p>Demande le lien à la personne qui te l'a partagé, puis ouvre-le directement sur ton téléphone.</p>
    </div>`;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function installHint() {
  if (isStandalone()) return "";
  const how = isIOS()
    ? "Dans Safari, touche <b>Partager</b> puis <b>Sur l'écran d'accueil</b>."
    : "Dans le menu du navigateur, choisis <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>.";
  return `<div class="notice"><b>Conseil :</b> installe d'abord l'appli sur ton écran d'accueil, puis remplis ton profil depuis l'icône. ${how}${isIOS() ? " Sur iPhone, l'appli installée garde ses propres données, séparées de Safari." : ""}</div>`;
}

function profileFields(p = {}) {
  const sex = p.sex || "m";
  const activity = p.activity || 1.55;
  const pace = p.pace || 0.5;
  const gainPace = p.gainPace || 0.25;
  const dir = p.weight && p.goalWeight ? direction(p.weight, p.goalWeight) : "cut";
  return `
    <label class="field"><span>Prénom ou pseudo (facultatif)</span><input name="name" value="${esc(p.name || "")}" maxlength="30" autocomplete="off"></label>
    <div class="field">
      <span class="muted small" style="display:block;margin-bottom:6px">Sexe (pour le calcul du métabolisme)</span>
      <div class="seg" data-seg="sex">
        <button type="button" data-v="m" class="${sex === "m" ? "on" : ""}">Homme</button>
        <button type="button" data-v="f" class="${sex === "f" ? "on" : ""}">Femme</button>
      </div>
      <input type="hidden" name="sex" value="${sex}">
    </div>
    <div class="grid-2">
      <label class="field"><span>Âge</span><input name="age" type="number" inputmode="numeric" min="14" max="99" required value="${p.age ?? ""}"></label>
      <label class="field"><span>Taille (cm)</span><input name="height" type="number" inputmode="numeric" min="120" max="230" required value="${p.height ?? ""}"></label>
      <label class="field"><span>Poids actuel (kg)</span><input name="weight" type="text" inputmode="decimal" autocomplete="off" required value="${p.weight ? fmtKg(p.weight) : ""}"></label>
      <label class="field"><span>Poids visé (kg)</span><input name="goalWeight" type="text" inputmode="decimal" autocomplete="off" required value="${p.goalWeight ? fmtKg(p.goalWeight) : ""}"></label>
    </div>
    <label class="field"><span>Activité</span>
      <select name="activity">${ACTIVITY.map((a) => `<option value="${a.v}" ${a.v === activity ? "selected" : ""}>${a.label}</option>`).join("")}</select>
    </label>
    <label class="field" data-pace="cut" ${dir === "cut" ? "" : "hidden"}><span>Rythme de perte</span>
      <select name="pace">${PACE.map((a) => `<option value="${a.v}" ${a.v === pace ? "selected" : ""}>${a.label}</option>`).join("")}</select>
    </label>
    <label class="field" data-pace="bulk" ${dir === "bulk" ? "" : "hidden"}><span>Rythme de prise</span>
      <select name="gainPace">${GAIN_PACE.map((a) => `<option value="${a.v}" ${a.v === gainPace ? "selected" : ""}>${a.label}</option>`).join("")}</select>
    </label>`;
}

function renderOnboarding() {
  return `
    <div class="hero">
      <img class="logo" src="/icons/icon-192.png" alt="">
      <h1>Bienvenue sur Assiette</h1>
      <p class="muted">Photographie tes repas, l'appli estime les calories et les macros. Tes données restent sur ton téléphone : pas de compte, pas d'email.</p>
    </div>
    ${installHint()}
    <form id="profile-form" class="card" autocomplete="off">
      <h2 style="margin-top:0">Ton profil</h2>
      ${profileFields()}
      <div id="targets-preview"></div>
      <button class="btn primary block" type="submit">C'est parti</button>
    </form>`;
}

function readProfileForm(form) {
  const f = new FormData(form);
  const num = (k) => parseKg(f.get(k));
  const p = {
    name: String(f.get("name") || "").trim(),
    sex: f.get("sex") === "f" ? "f" : "m",
    age: num("age"),
    height: num("height"),
    weight: num("weight"),
    goalWeight: num("goalWeight"),
    activity: num("activity"),
    pace: num("pace"),
    gainPace: num("gainPace"),
  };
  const ok = [p.age, p.height, p.weight, p.goalWeight].every((n) => Number.isFinite(n) && n > 0);
  return ok ? p : null;
}

function targetsBlock(t) {
  return `
    <div class="targets">
      <div><b>${t.kcal}</b><span>kcal</span></div>
      <div><b style="color:var(--protein)">${t.protein} g</b><span>protéines</span></div>
      <div><b style="color:var(--carbs)">${t.carbs} g</b><span>glucides</span></div>
      <div><b style="color:var(--fat)">${t.fat} g</b><span>lipides</span></div>
    </div>`;
}

function modeText(t, p) {
  if (t.mode === "cut") {
    const weeks = Math.ceil((p.weight - p.goalWeight) / p.pace);
    return `Sèche : environ ${t.tdee - t.kcal} kcal sous ta maintenance (${t.tdee} kcal). Objectif atteint en ~${weeks} semaines si tu tiens le rythme.`;
  }
  if (t.mode === "bulk") {
    const weeks = Math.ceil((p.goalWeight - p.weight) / (p.gainPace || 0.25));
    return `Prise de masse propre : environ ${t.kcal - t.tdee} kcal au-dessus de ta maintenance (${t.tdee} kcal). Objectif atteint en ~${weeks} semaines si tu tiens le rythme. Garde un œil sur ton tour de taille : s'il monte vite, ralentis.`;
  }
  return `Maintien : ta dépense estimée est de ${t.tdee} kcal par jour.`;
}

function bindProfileForm(form, isNew) {
  if (!form) return;
  $$(".seg[data-seg]", form).forEach((seg) => {
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      $$("button", seg).forEach((x) => x.classList.toggle("on", x === b));
      form.elements[seg.dataset.seg].value = b.dataset.v;
      preview();
    });
  });
  const preview = () => {
    const box = $("#targets-preview", form);
    if (!box) return;
    const p = readProfileForm(form);
    const dir = p ? direction(p.weight, p.goalWeight) : "cut";
    $$("[data-pace]", form).forEach((el) => { el.hidden = el.dataset.pace !== dir; });
    if (!p) { box.innerHTML = ""; return; }
    const t = computeTargets(p);
    box.innerHTML = `<div class="card" style="background:var(--surface-2);border:0;box-shadow:none"><p class="small muted" style="margin-bottom:10px">Tes objectifs par jour</p>${targetsBlock(t)}<p class="small muted" style="margin:10px 0 0">${modeText(t, p)}</p></div>`;
  };
  form.addEventListener("input", preview);
  preview();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = readProfileForm(form);
    if (!p) { toast("Complète l'âge, la taille et les poids."); return; }
    const previous = state.profile;
    p.weight = round2(p.weight);
    p.goalWeight = round2(p.goalWeight);
    state.profile = { ...previous, ...p, startWeight: previous?.startWeight ?? p.weight, createdAt: previous?.createdAt ?? Date.now() };
    saveProfile();
    if (isNew || !state.weights.length || p.weight !== previous?.weight) logWeight(p.weight, todayKey(), false);
    toast(isNew ? "Profil créé. Photographie ton prochain repas !" : "Profil mis à jour.");
    state.tab = isNew ? "today" : state.tab;
    render();
  });
}

/* ----- Écran Jour ----- */

function ring(value, target) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const pct = target ? Math.min(value / target, 1) : 0;
  const over = value > target;
  return `
    <div class="ring">
      <svg viewBox="0 0 132 132" aria-hidden="true">
        <circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
        <circle cx="66" cy="66" r="${r}" fill="none" stroke="${over ? "var(--over)" : "var(--kcal)"}" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/>
      </svg>
      <div class="ring-label">
        <strong>${round(over ? value - target : target - value)}</strong>
        <span class="small muted">${over ? "kcal en trop" : "kcal restantes"}</span>
      </div>
    </div>`;
}

function macroBar(label, value, target, color) {
  const pct = target ? Math.min((value / target) * 100, 100) : 0;
  return `
    <div class="macro">
      <div class="macro-head"><span>${label}</span><b>${round(value)} / ${target} g</b></div>
      <div class="bar"><i style="width:${pct}%;background:${color}"></i></div>
    </div>`;
}

function renderToday() {
  const t = targets();
  const tot = dayTotals(state.day);
  const meals = state.meals.filter((m) => m.date === state.day).sort((a, b) => a.time - b.time);
  const isToday = state.day === todayKey();
  const hello = state.profile.name ? `Salut ${esc(state.profile.name)}` : "Ton suivi";
  return `
    <p class="muted small" style="margin:0">${hello}</p>
    <div class="day-nav">
      <button data-act="prev-day" aria-label="Jour précédent">‹</button>
      <div class="day-title"><strong>${dayLabel(state.day)}</strong><span class="small muted">${round(tot.kcal)} / ${t.kcal} kcal</span></div>
      <button data-act="next-day" aria-label="Jour suivant" ${isToday ? "disabled style='opacity:.3'" : ""}>›</button>
    </div>
    ${isToday ? adaptCard() : ""}
    <div class="card summary">
      ${ring(tot.kcal, t.kcal)}
      <div class="macros">
        ${macroBar("Protéines", tot.protein, t.protein, "var(--protein)")}
        ${macroBar("Glucides", tot.carbs, t.carbs, "var(--carbs)")}
        ${macroBar("Lipides", tot.fat, t.fat, "var(--fat)")}
      </div>
    </div>
    <h2>Repas</h2>
    <div class="card">
      ${meals.length ? meals.map(mealRow).join("") : `<div class="empty">Aucun repas enregistré.<br><button class="link" data-act="add">Ajouter un repas</button></div>`}
    </div>`;
}

function mealRow(m) {
  const t = mealTotals(m);
  const time = new Date(m.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `
    <div class="meal" data-act="edit-meal" data-id="${m.id}">
      <div class="meal-emoji" aria-hidden="true">${MEAL_ICONS[m.type] || "🍽️"}</div>
      <div class="meal-body">
        <strong>${esc(m.name || "Repas")}</strong>
        <span class="small muted">${MEAL_TYPES[m.type] || "Repas"} · ${time} · P ${round(t.protein)} · G ${round(t.carbs)} · L ${round(t.fat)}</span>
      </div>
      ${m.review ? `<span class="score-pill" style="background:${scoreColor(m.review.score)}" title="Note du repas">${m.review.score}</span>` : ""}
      <div class="meal-kcal"><strong>${round(t.kcal)}</strong><span class="small muted">kcal</span></div>
    </div>`;
}

/* ----- Écran Poids ----- */

function logWeight(kg, date = todayKey(), notify = true) {
  const value = round2(kg);
  state.weights = state.weights.filter((w) => w.date !== date).concat({ date, kg: value }).sort((a, b) => a.date.localeCompare(b.date));
  saveWeights();
  const latest = state.weights[state.weights.length - 1];
  if (state.profile && latest && latest.kg !== state.profile.weight) {
    state.profile.weight = latest.kg;
    saveProfile();
  }
  if (notify) toast("Poids enregistré. Tes objectifs ont été recalculés.");
}

function movingAverage(points, days = 7) {
  return points.map((p, i) => {
    const from = shiftKey(p.date, -(days - 1));
    const win = points.slice(0, i + 1).filter((q) => q.date >= from);
    return { date: p.date, kg: win.reduce((s, q) => s + q.kg, 0) / win.length };
  });
}

function weightChart(points, goal) {
  if (points.length < 2) return `<p class="muted small center" style="margin:20px 0">La courbe apparaît à partir de 2 pesées.</p>`;
  const W = 340, H = 180, pad = { l: 34, r: 10, t: 12, b: 24 };
  const avg = movingAverage(points);
  const t0 = parseKey(points[0].date).getTime();
  const t1 = Math.max(parseKey(points[points.length - 1].date).getTime(), t0 + 86400000);
  const vals = points.map((p) => p.kg).concat(goal);
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  const x = (d) => pad.l + ((parseKey(d).getTime() - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const line = avg.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const ticks = [lo, (lo + hi) / 2, hi];
  return `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de poids">
      ${ticks.map((v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${fmtKg(round1(v))}</text>`).join("")}
      <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--accent)" stroke-dasharray="4 4"/>
      <text x="${W - pad.r}" y="${y(goal) - 5}" text-anchor="end" font-size="10" fill="var(--accent)">objectif ${fmtKg(goal)} kg</text>
      ${points.map((p) => `<circle cx="${x(p.date)}" cy="${y(p.kg)}" r="2.5" fill="var(--muted)" opacity=".6"/>`).join("")}
      <path d="${line}" fill="none" stroke="var(--text)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <text x="${pad.l}" y="${H - 6}" font-size="10" fill="var(--muted)">${shortDate(points[0].date)}</text>
      <text x="${W - pad.r}" y="${H - 6}" text-anchor="end" font-size="10" fill="var(--muted)">${shortDate(points[points.length - 1].date)}</text>
    </svg>`;
}

function weeklyTrend(points) {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const from = shiftKey(last.date, -28);
  const win = points.filter((p) => p.date >= from);
  if (win.length < 2) return null;
  const days = (parseKey(win[win.length - 1].date) - parseKey(win[0].date)) / 86400000;
  if (days < 6) return null;
  const avg = movingAverage(points);
  const a = avg.find((p) => p.date >= from) || avg[0];
  const b = avg[avg.length - 1];
  return ((b.kg - a.kg) / days) * 7;
}

function renderWeight() {
  const p = state.profile;
  const pts = state.weights;
  const current = pts.length ? pts[pts.length - 1].kg : p.weight;
  const start = p.startWeight ?? current;
  const left = round2(current - p.goalWeight);
  const trend = weeklyTrend(pts);
  let eta = "";
  if (trend !== null && Math.abs(left) > 0.2) {
    if ((left > 0 && trend < -0.05) || (left < 0 && trend > 0.05)) {
      const weeks = Math.abs(left / trend);
      const d = new Date();
      d.setDate(d.getDate() + weeks * 7);
      eta = `À ce rythme, objectif vers <b>${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</b>.`;
    } else {
      eta = "Ta tendance ne va pas encore vers ton objectif : vérifie que tu restes sous ton objectif calorique.";
    }
  }
  const recent = pts.slice(-10).reverse();
  return `
    <h1>Poids</h1>
    <form id="weight-form" class="card" style="display:flex;gap:10px;align-items:flex-end">
      <label class="field" style="flex:1;margin:0"><span>Pesée du jour (kg)</span><input name="kg" type="text" inputmode="decimal" autocomplete="off" placeholder="${fmtKg(current)}" required></label>
      <button class="btn primary" type="submit">Enregistrer</button>
    </form>
    <div class="card stats">
      <div><b>${fmtKg(start)}</b><span>départ</span></div>
      <div><b>${fmtKg(current)}</b><span>actuel</span></div>
      <div><b>${fmtKg(Math.abs(left))}</b><span>${left > 0 ? "kg à perdre" : left < 0 ? "kg à prendre" : "objectif atteint"}</span></div>
    </div>
    <div class="card chart">
      ${weightChart(pts, p.goalWeight)}
      ${trend !== null ? `<p class="small" style="margin:10px 0 0">Tendance : <b>${trend > 0 ? "+" : ""}${fmtKg(round2(trend))} kg / semaine</b>. ${eta}</p>` : `<p class="small muted" style="margin:10px 0 0">Pèse-toi le matin à jeun, 2 à 3 fois par semaine. La tendance s'affiche après une semaine.</p>`}
    </div>
    <div class="card">${adaptInfo()}</div>
    ${recent.length ? `<h2>Dernières pesées</h2><div class="card">${recent.map((w) => `<div class="weight-row"><span>${dayLabel(w.date)}</span><span><b>${fmtKg(w.kg)} kg</b> <button data-act="del-weight" data-date="${w.date}" aria-label="Supprimer">✕</button></span></div>`).join("")}</div>` : ""}`;
}

/* ----- Écran Historique ----- */

function renderHistory() {
  const t = targets();
  const days = Array.from({ length: 14 }, (_, i) => shiftKey(todayKey(), -i));
  const rows = days.map((d) => ({ d, tot: dayTotals(d), n: state.meals.filter((m) => m.date === d).length }));
  const logged = rows.slice(0, 7).filter((r) => r.n > 0);
  const avg = (k) => (logged.length ? logged.reduce((s, r) => s + r.tot[k], 0) / logged.length : 0);
  const dot = (v, target) => {
    if (!v) return "var(--line)";
    const ratio = v / target;
    return ratio > 1.08 ? "var(--over)" : ratio < 0.8 ? "var(--carbs)" : "var(--accent)";
  };
  return `
    <h1>Historique</h1>
    <div class="card">
      <p class="small muted" style="margin-bottom:10px">Moyenne des 7 derniers jours (${logged.length} jour${logged.length > 1 ? "s" : ""} suivi${logged.length > 1 ? "s" : ""})</p>
      <div class="totals">
        <div><b>${round(avg("kcal"))}</b><span>kcal / ${t.kcal}</span></div>
        <div><b style="color:var(--protein)">${round(avg("protein"))}</b><span>prot. / ${t.protein}</span></div>
        <div><b style="color:var(--carbs)">${round(avg("carbs"))}</b><span>gluc. / ${t.carbs}</span></div>
        <div><b style="color:var(--fat)">${round(avg("fat"))}</b><span>lip. / ${t.fat}</span></div>
      </div>
    </div>
    <h2>14 derniers jours</h2>
    <div class="card">
      ${rows.map((r) => `
        <div class="hist-row" data-act="open-day" data-date="${r.d}">
          <span><i class="dot" style="background:${dot(r.tot.kcal, t.kcal)}"></i>${dayLabel(r.d)}</span>
          <span class="num small muted">${r.n ? `P ${round(r.tot.protein)} g` : ""}</span>
          <span class="num">${r.n ? `<b>${round(r.tot.kcal)}</b> kcal` : `<span class="muted small">—</span>`}</span>
        </div>`).join("")}
      <p class="small muted" style="margin:12px 0 0"><i class="dot" style="background:var(--accent)"></i>dans l'objectif <i class="dot" style="background:var(--over);margin-left:10px"></i>au-dessus <i class="dot" style="background:var(--carbs);margin-left:10px"></i>bien en dessous</p>
    </div>`;
}

/* ----- Écran Profil ----- */

function renderProfile() {
  const p = state.profile;
  const t = targets();
  const auto = computeTargets(p);
  return `
    <h1>Profil</h1>
    <div class="card">
      <p class="small muted" style="margin-bottom:10px">Objectifs par jour ${p.custom ? "(personnalisés)" : "(calculés automatiquement)"}</p>
      ${targetsBlock(t)}
      <p class="small muted" style="margin:10px 0 0">${modeText(auto, p)}</p>
      ${p.kcalAdjust ? `<p class="small" style="margin:10px 0 0">Dépense corrigée d'après ton poids réel : <b>${p.kcalAdjust > 0 ? "+" : ""}${p.kcalAdjust} kcal</b> par rapport à la formule. <button class="link" data-act="adapt-reset">Annuler la correction</button></p>` : ""}
      <div class="btn-row" style="margin-top:12px">
        <button class="btn" data-act="custom-targets">Personnaliser</button>
        ${p.custom ? `<button class="btn" data-act="reset-targets">Revenir au calcul auto</button>` : ""}
      </div>
    </div>
    <form id="profile-form" class="card" autocomplete="off">
      ${profileFields(p)}
      <div id="targets-preview"></div>
      <button class="btn primary block" type="submit">Enregistrer le profil</button>
    </form>
    <h2>Mes recettes</h2>
    <div class="card">
      ${state.recipes.length
        ? state.recipes.map((r) => { const t = recipeTotals(r.items); return `
          <div class="weight-row" data-act="edit-recipe" data-id="${r.id}" style="cursor:pointer">
            <span><b>${esc(r.name)}</b><br><span class="small muted">${round(t.kcal)} kcal · P ${round(t.protein)} g · G ${round(t.carbs)} g · L ${round(t.fat)} g</span></span>
            <span class="muted">›</span>
          </div>`; }).join("")
        : `<p class="small muted">Shaker, porridge, bowl… Enregistre ce que tu prépares souvent avec ses ingrédients : tu l'ajouteras ensuite à un repas en un geste, sans photo.</p>`}
      <button class="btn block" style="margin-top:10px" data-act="new-recipe">+ Nouvelle recette</button>
    </div>
    <h2>Partager l'appli</h2>
    <div class="card">
      <p class="small">Envoie ce lien à un proche : chacun a son propre suivi sur son téléphone, personne ne voit les données des autres.</p>
      <button class="btn block" data-act="share">Copier le lien d'accès</button>
    </div>
    <h2>Sauvegarde</h2>
    <div class="card">
      <p class="small">Tes données sont uniquement sur cet appareil. Exporte une sauvegarde de temps en temps, surtout avant de changer de téléphone.</p>
      <div class="btn-row">
        <button class="btn" data-act="export">Exporter</button>
        <button class="btn" data-act="import">Importer</button>
      </div>
      <button class="btn danger block" style="margin-top:10px" data-act="wipe">Tout effacer</button>
    </div>
    <p class="small muted center">Les estimations à partir d'une photo ont souvent une marge de ±20 %. Corrige les grammes quand tu les connais.</p>`;
}

/* ---------- Ajout / édition de repas ---------- */

let draft = null;

function openSheet(html) {
  const sheet = $("#sheet");
  sheet.innerHTML = `<div class="sheet-inner">${html}</div>`;
  sheet.dataset.review = "";
  sheet.hidden = false;
  sheet.scrollTop = 0;
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  $("#sheet").hidden = true;
  $("#sheet").innerHTML = "";
  document.body.style.overflow = "";
  draft = null;
}

function startAdd() {
  const now = new Date();
  const date = state.day;
  const time = date === todayKey() ? now.getTime() : parseKey(date).setHours(12, 30);
  draft = { id: null, date, time, type: guessMealType(now), image: null, foods: [emptyFood()], items: [], name: "", comment: "", confidence: null, analyzed: false };
  renderDraft();
}

/* Lignes « aliment + quantité » saisies avant l'analyse.
   La quantité est en grammes (mode "g") ou en unités (mode "u" : œufs, tranches, pots…). */
function emptyFood() {
  return { name: "", qty: "", mode: "g", unit: null, auto: false };
}

function namedFoods(d) {
  return d.foods.filter((f) => f.name.trim());
}

function rowGrams(f) {
  const qty = +f.qty || 0;
  return f.mode === "u" && f.unit ? qty * f.unit.g : qty;
}

function qtyText(f) {
  const qty = +f.qty || 0;
  return f.mode === "u" && f.unit ? `${qty} ${unitLabel(f.unit, qty)} (${round(rowGrams(f))} g)` : `${round(qty)} g`;
}

function foodHint(f) {
  if (!f.name.trim()) return "";
  const food = findFood(f.name);
  if (!food) return "Pas dans la table : l'IA estimera les valeurs.";
  const grams = rowGrams(f);
  if (!grams) return f.mode === "u" ? "Indique la quantité." : "Indique les grammes.";
  const v = foodValues(food, grams);
  const weight = f.mode === "u" ? `${round(grams)} g · ` : "";
  return `≈ ${weight}${round(v.kcal)} kcal · P ${round(v.protein)} g · G ${round(v.carbs)} g · L ${round(v.fat)} g`;
}

function unitButton(f, i) {
  if (!f.unit) return `<span class="unit-btn static" data-unit="${i}">g</span>`;
  const label = f.mode === "u" ? unitLabel(f.unit, +f.qty || 0) : "g";
  return `<button type="button" class="unit-btn" data-act="toggle-unit" data-i="${i}" data-unit="${i}" title="Changer d'unité">${esc(label)} ⇄</button>`;
}

function foodRow(f, i) {
  return `
    <div class="food-row">
      <div class="item-top">
        <input class="name" list="food-list" data-food="${i}" data-k="name" value="${esc(f.name)}" placeholder="Aliment (ex. œuf au plat, riz…)" autocomplete="off" autocapitalize="off">
        <button class="item-del" data-act="del-food" data-i="${i}" aria-label="Retirer">✕</button>
      </div>
      <div class="food-qty">
        <input type="number" inputmode="decimal" step="any" min="0" data-food="${i}" data-k="qty" value="${esc(f.qty)}" placeholder="0" aria-label="Quantité">
        ${unitButton(f, i)}
      </div>
      <p class="food-hint small muted" data-hint="${i}">${foodHint(f)}</p>
    </div>`;
}

// « Calculer » quand tout est dans la table et sans photo (instantané, sans IA), sinon « Analyser ».
function analyzeButtonState(d) {
  const named = namedFoods(d);
  const localOnly = !d.image && named.length > 0 && named.every((f) => findFood(f.name) && rowGrams(f) > 0);
  return { enabled: !!d.image || named.length > 0, label: localOnly ? "Calculer" : "Analyser" };
}

function refreshAnalyzeButton() {
  const btn = $('[data-act="analyze"]');
  if (!btn || !draft) return;
  const st = analyzeButtonState(draft);
  btn.disabled = !st.enabled;
  btn.textContent = st.label;
}

function refreshFoodRow(i) {
  const f = draft.foods[i];
  const qty = $(`input[data-food="${i}"][data-k="qty"]`);
  if (qty && qty !== document.activeElement) qty.value = f.qty;
  const unit = $(`[data-unit="${i}"]`);
  if (unit) unit.outerHTML = unitButton(f, i);
  const hint = $(`[data-hint="${i}"]`);
  if (hint) hint.textContent = foodHint(f);
}

function onFoodInput(el) {
  const i = +el.dataset.food;
  const f = draft.foods[i];
  if (!f) return;
  if (el.dataset.k === "name") {
    f.name = el.value;
    const food = findFood(f.name);
    if (food) {
      // Aliment reconnu : on propose sa portion habituelle (en unités si l'aliment se compte),
      // tant que la personne n'a pas tapé sa quantité elle-même.
      if (!f.qty || f.auto) {
        f.unit = food.unit;
        f.mode = food.unit ? "u" : "g";
        f.qty = String(food.portion);
        f.auto = true;
      } else if (!food.unit && f.mode === "u") {
        f.qty = String(round(rowGrams(f)));
        f.mode = "g";
        f.unit = null;
      } else if (food.unit) {
        f.unit = food.unit;
      }
    }
  } else {
    f.qty = el.value;
    f.auto = false;
  }
  refreshFoodRow(i);
  refreshAnalyzeButton();
  refreshRecipeTotals();
}

function refreshRecipeTotals() {
  const box = $("#recipe-totals");
  if (box && draft?.kind === "recipe") box.innerHTML = recipeTotalsHtml(draft);
}

function toggleUnit(i) {
  const f = draft.foods[i];
  if (!f?.unit) return;
  if (f.mode === "u") {
    f.qty = String(round(rowGrams(f)));
    f.mode = "g";
  } else {
    f.qty = String(Math.max(0.5, Math.round(((+f.qty || 0) / f.unit.g) * 2) / 2));
    f.mode = "u";
  }
  refreshFoodRow(i);
  refreshAnalyzeButton();
}

function editMeal(id) {
  const m = state.meals.find((x) => x.id === id);
  if (!m) return;
  draft = { ...structuredClone(m), image: null, foods: [emptyFood()], analyzed: true };
  renderDraft();
}

function typeSelect(value) {
  return `<select name="type" data-draft="type">${Object.entries(MEAL_TYPES).map(([k, v]) => `<option value="${k}" ${k === value ? "selected" : ""}>${v}</option>`).join("")}</select>`;
}

function renderDraft(loading = false) {
  const d = draft;
  const head = `<div class="sheet-head"><h1>${d.id ? "Modifier le repas" : "Nouveau repas"}</h1><button class="close" data-act="close" aria-label="Fermer">✕</button></div>`;

  if (loading) {
    openSheet(`${head}${d.image ? `<img class="preview" src="${d.image}" alt="">` : ""}<div class="card center"><div class="spinner"></div><p>Analyse du repas…</p><p class="small muted">Quelques secondes.</p></div>`);
    return;
  }

  if (!d.analyzed) {
    const st = analyzeButtonState(d);
    openSheet(`
      ${head}
      ${d.image
        ? `<img class="preview" src="${d.image}" alt="Photo du repas"><button class="link" data-act="clear-photo">Changer de photo</button>`
        : `<div class="pick"><button class="btn" data-act="camera"><span>📷</span>Prendre une photo</button><button class="btn" data-act="gallery"><span>🖼</span>Choisir une photo</button></div>`}
      <h2>Aliments ${d.image ? `<span class="small muted" style="font-weight:400">(facultatif avec une photo)</span>` : ""}</h2>
      ${state.recipes.length ? `<div class="chips">${state.recipes.map((r) => `<button class="chip" data-act="add-recipe" data-id="${r.id}">+ ${esc(r.name)}</button>`).join("")}</div>` : ""}
      <div class="card" id="food-rows">${d.foods.map(foodRow).join("")}</div>
      <button class="btn block" data-act="add-food">+ Ajouter un aliment</button>
      <p class="small muted" style="margin:8px 0 16px">Tape un aliment : la portion habituelle se remplit toute seule, change les grammes si besoin.</p>
      <label class="field"><span>Repas</span>${typeSelect(d.type)}</label>
      <button class="btn primary block" data-act="analyze" ${st.enabled ? "" : "disabled"}>${st.label}</button>
      <p class="center" style="margin-top:8px"><button class="link" data-act="manual">Saisir les valeurs à la main</button></p>`);
    return;
  }

  const t = mealTotals(d);
  const conf = { low: ["low", "estimation incertaine"], medium: ["", "estimation moyenne"], high: ["high", "estimation fiable"] }[d.confidence];
  openSheet(`
    ${head}
    ${d.image ? `<img class="preview" src="${d.image}" alt="">` : ""}
    ${d.id ? (d.review ? reviewCard(d.review, mealTotals(d)) : `<button class="btn block" style="margin-bottom:12px" data-act="retry-review" data-id="${d.id}">Obtenir la note du repas</button>`) : ""}
    <label class="field"><span>Nom du repas</span><input data-draft="name" value="${esc(d.name)}" maxlength="60"></label>
    <div class="grid-2">
      <label class="field"><span>Repas</span>${typeSelect(d.type)}</label>
      <label class="field"><span>Jour</span><input type="date" data-draft="date" value="${d.date}" max="${todayKey()}"></label>
    </div>
    <div class="card" id="draft-totals">${draftTotals(t)}</div>
    ${conf ? `<p class="small"><span class="badge ${conf[0]}">${conf[1]}</span> ${esc(d.comment)}</p>` : d.comment ? `<p class="small">${esc(d.comment)}</p>` : ""}
    <h2>Aliments</h2>
    <div class="card" id="items">
      ${d.items.length ? d.items.map(itemRow).join("") : `<p class="muted small">Aucun aliment. Ajoute-en un ci-dessous.</p>`}
    </div>
    <button class="btn block" data-act="add-item">+ Ajouter un aliment</button>
    <p class="small muted" style="margin:10px 0 16px">Change le nom ou la quantité d'un aliment : les valeurs se recalculent avec la table intégrée, ou l'IA les recherche si l'aliment n'y est pas.</p>
    <button class="btn primary block" data-act="save-meal">Enregistrer</button>
    ${d.id ? `<button class="btn danger block" style="margin-top:10px" data-act="delete-meal">Supprimer ce repas</button>` : ""}`);
}

function draftTotals(t) {
  return `
    <div class="totals">
      <div><b>${round(t.kcal)}</b><span>kcal</span></div>
      <div><b style="color:var(--protein)">${round(t.protein)} g</b><span>protéines</span></div>
      <div><b style="color:var(--carbs)">${round(t.carbs)} g</b><span>glucides</span></div>
      <div><b style="color:var(--fat)">${round(t.fat)} g</b><span>lipides</span></div>
    </div>`;
}

/* Aliments de l'écran du résultat.
   Chaque aliment garde son poids en grammes et la source de ses valeurs :
   "table" (table intégrée), "ai" (estimé par l'IA pour ce nom), "manual" (saisi à la main)
   ou "pending" (nom inconnu, l'IA l'estimera quand le nom est validé).
   Un aliment qui se compte peut s'afficher en unités (mode "u") : œufs, tranches, pots… */
const MACROS = ["kcal", "protein", "carbs", "fat"];
const SOURCES = {
  recipe: ["src-table", "Recette"],
  table: ["src-table", "Table"],
  ai: ["src-ai", "IA"],
  manual: ["src-manual", "Modifié"],
  pending: ["src-pending", "À estimer"],
  loading: ["src-pending", "Recherche…"],
};

function itemUnit(it) {
  return it.mode === "u" ? findFood(it.name)?.unit || null : null;
}

function itemQty(it) {
  const unit = itemUnit(it);
  return unit ? Math.round((it.grams / unit.g) * 100) / 100 : round(it.grams);
}

// Remplace les valeurs d'un aliment par celles de la table, pour son poids actuel.
function applyTable(it, food) {
  let grams = it.grams > 0 ? it.grams : defaultGrams(food);
  if (food.unit) {
    if (it.mode !== "g") {
      // Arrondi à la demi-unité : « 2 œufs » plutôt que 1,96 œuf.
      grams = Math.max(0.5, Math.round((grams / food.unit.g) * 2) / 2) * food.unit.g;
      it.mode = "u";
    }
  } else {
    it.mode = "g";
  }
  Object.assign(it, foodValues(food, grams, it.name), { src: food.recipe ? "recipe" : "table", per: null });
}

function tableItem(food, grams, mode = food.unit ? "u" : "g") {
  const it = { name: food.name, grams, mode, src: food.recipe ? "recipe" : "table" };
  Object.assign(it, foodValues(food, grams));
  return it;
}

function itemHint(it) {
  if (it.src === "loading") return "L'IA recherche les valeurs de cet aliment…";
  if (it.src === "pending") return "Pas dans la table : l'IA estimera les valeurs dès que tu valides le nom.";
  const unit = itemUnit(it);
  if (unit) return `≈ ${round(it.grams)} g`;
  const food = findFood(it.name);
  if (food?.unit && it.grams > 0) {
    const n = Math.round((it.grams / food.unit.g) * 2) / 2;
    if (n) return `≈ ${String(n).replace(".", ",")} ${unitLabel(food.unit, n)}`;
  }
  return "";
}

function itemUnitButton(it, i) {
  const food = findFood(it.name);
  if (!food?.unit || it.src === "pending" || it.src === "loading") return `<span class="unit-btn static" data-iunit="${i}">g</span>`;
  const label = it.mode === "u" ? unitLabel(food.unit, itemQty(it)) : "g";
  return `<button type="button" class="unit-btn" data-act="item-unit" data-i="${i}" data-iunit="${i}" title="Changer d'unité">${esc(label)} ⇄</button>`;
}

function srcBadge(it, i) {
  const s = SOURCES[it.src];
  return s ? `<span class="badge ${s[0]}" data-isrc="${i}">${s[1]}</span>` : `<span data-isrc="${i}"></span>`;
}

function itemRow(it, i) {
  const f = (k, label) => `<label>${label}<input type="number" inputmode="decimal" step="any" min="0" data-item="${i}" data-k="${k}" value="${round1(it[k])}"></label>`;
  return `
    <div class="item">
      <div class="item-top">
        <input class="name" list="food-list" data-item="${i}" data-k="name" value="${esc(it.name)}" placeholder="Aliment" autocomplete="off" autocapitalize="off">
        <button class="item-del" data-act="del-item" data-i="${i}" aria-label="Retirer">✕</button>
      </div>
      <div class="food-qty">
        <input type="number" inputmode="decimal" step="any" min="0" data-item="${i}" data-k="qty" value="${itemQty(it)}" aria-label="Quantité">
        ${itemUnitButton(it, i)}
        ${srcBadge(it, i)}
      </div>
      <p class="food-hint small muted" data-ihint="${i}">${itemHint(it)}</p>
      <div class="item-macros">${f("kcal", "kcal")}${f("protein", "prot.")}${f("carbs", "gluc.")}${f("fat", "lip.")}</div>
    </div>`;
}

// Met à jour une ligne sans la reconstruire, pour ne pas perdre le champ en cours de saisie.
function refreshItemRow(i) {
  const it = draft?.items[i];
  if (!it) return;
  const set = (sel, value) => {
    const el = $(sel);
    if (el && el !== document.activeElement) el.value = value;
  };
  set(`input[data-item="${i}"][data-k="name"]`, it.name);
  set(`input[data-item="${i}"][data-k="qty"]`, itemQty(it));
  for (const m of MACROS) set(`input[data-item="${i}"][data-k="${m}"]`, round1(it[m]));
  const unit = $(`[data-iunit="${i}"]`);
  if (unit) unit.outerHTML = itemUnitButton(it, i);
  const src = $(`[data-isrc="${i}"]`);
  if (src) src.outerHTML = srcBadge(it, i);
  const hint = $(`[data-ihint="${i}"]`);
  if (hint) hint.textContent = itemHint(it);
  const totals = $("#draft-totals");
  if (totals) totals.innerHTML = draftTotals(mealTotals(draft));
}

function normalizeItem(raw) {
  const it = {
    name: String(raw.name || "").slice(0, 60),
    grams: Math.max(0, +raw.grams || 0),
    kcal: Math.max(0, +raw.kcal || 0),
    protein: Math.max(0, +raw.protein || 0),
    carbs: Math.max(0, +raw.carbs || 0),
    fat: Math.max(0, +raw.fat || 0),
  };
  if (["table", "recipe", "ai", "manual"].includes(raw.src)) it.src = raw.src;
  if (raw.mode === "u" || raw.mode === "g") it.mode = raw.mode;
  if (raw.aiName) it.aiName = String(raw.aiName).slice(0, 60);
  return it;
}

// Aliment renvoyé par l'IA : valeurs de la table si on le connaît, sinon celles de l'IA.
function fromAi(raw) {
  const it = normalizeItem(raw);
  const food = findFood(it.name);
  if (food) {
    applyTable(it, food);
  } else {
    it.src = "ai";
    it.aiName = it.name;
    it.mode = "g";
  }
  return it;
}

/* Édition en direct d'un aliment. */
function onItemInput(el) {
  const i = +el.dataset.item;
  const k = el.dataset.k;
  const it = draft.items[i];
  if (!it) return;
  if (k === "name") {
    it.name = el.value;
    const food = findFood(it.name);
    if (food) applyTable(it, food);
    else if (it.aiName && normalizeFoodName(it.aiName) === normalizeFoodName(it.name)) it.src = "ai";
    else if (it.name.trim() && it.src !== "manual") {
      if (it.mode === "u") it.mode = "g";
      it.src = "pending";
    }
    refreshItemRow(i);
    return;
  }
  const v = Math.max(0, parseFloat(el.value.replace(",", ".")) || 0);
  if (k === "qty") {
    const unit = itemUnit(it);
    const grams = unit ? v * unit.g : v;
    const food = findFood(it.name);
    if ((it.src === "table" || it.src === "recipe") && food) {
      Object.assign(it, foodValues(food, grams, it.name));
    } else {
      // Valeurs par gramme mémorisées, pour qu'un champ vidé puis retapé ne remette pas tout à zéro.
      if (!it.per && it.grams > 0) it.per = Object.fromEntries(MACROS.map((m) => [m, it[m] / it.grams]));
      if (it.per) for (const m of MACROS) it[m] = it.per[m] * grams;
      it.grams = grams;
    }
  } else {
    it[k] = v;
    it.src = "manual";
    it.per = null;
  }
  refreshItemRow(i);
}

function toggleItemUnit(i) {
  const it = draft.items[i];
  if (!it || !findFood(it.name)?.unit) return;
  it.mode = it.mode === "u" ? "g" : "u";
  refreshItemRow(i);
}

// Nom validé mais inconnu de la table : l'IA estime cet aliment pour la quantité indiquée.
function lookupItem(i) {
  const d = draft;
  const it = d?.items[i];
  if (!it || it.src !== "pending" || !it.name.trim()) return;
  const name = it.name.trim();
  const token = uid();
  it.lookup = token;
  it.src = "loading";
  refreshItemRow(i);
  const done = (async () => {
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-key": ACCESS_KEY },
        body: JSON.stringify({ note: `Estime uniquement cet aliment, sans rien ajouter : ${name}${it.grams > 0 ? ` : ${round(it.grams)} g` : " (portion habituelle)"}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Recherche impossible.");
      const found = (data.items || []).map(normalizeItem).filter((x) => x.grams > 0);
      if (!found.length) throw new Error(data.comment || "Aliment non reconnu : saisis les valeurs à la main.");
      if (draft !== d || it.lookup !== token) return;
      // Plusieurs lignes possibles (ex. un plat) : on les additionne, ramenées au poids saisi.
      const sum = found.reduce((a, x) => ({ grams: a.grams + x.grams, kcal: a.kcal + x.kcal, protein: a.protein + x.protein, carbs: a.carbs + x.carbs, fat: a.fat + x.fat }), { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 });
      const grams = it.grams > 0 ? it.grams : sum.grams;
      for (const m of MACROS) it[m] = (sum[m] / sum.grams) * grams;
      Object.assign(it, { grams, src: "ai", aiName: name, per: null, mode: "g" });
    } catch (err) {
      if (draft !== d || it.lookup !== token) return;
      it.src = "manual";
      toast(navigator.onLine ? err.message : "Pas de connexion internet.");
    }
    delete it.lookup;
    refreshItemRow(d.items.indexOf(it));
  })();
  d.pending = (d.pending || new Set()).add(done);
  done.finally(() => d.pending.delete(done));
}

async function resizeImage(file, max = 1280) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    src = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(src.width * scale);
  canvas.height = Math.round(src.height * scale);
  canvas.getContext("2d").drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function onPhoto(file) {
  if (!file || !draft) return;
  try {
    draft.image = await resizeImage(file);
    renderDraft();
  } catch {
    toast("Impossible de lire cette photo. Essaie un autre format.");
  }
}

function foodsText(rows) {
  return rows.map((f) => `${f.name.trim()}${rowGrams(f) > 0 ? ` : ${qtyText(f)}` : " (quantité non précisée)"}`).join(" ; ");
}

function mealNameFrom(rows) {
  const s = rows.map((f) => f.name.trim()).join(", ");
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 60);
}

async function analyze() {
  const d = draft;
  const named = namedFoods(d);
  // Aliments de la table : calcul direct. Les autres partent à l'IA.
  const local = [];
  const unknown = [];
  for (const f of named) {
    const food = findFood(f.name);
    if (food && rowGrams(f) > 0) local.push(tableItem(food, rowGrams(f), f.mode === "u" && food.unit ? "u" : "g"));
    else unknown.push(f);
  }
  if (!d.image && !unknown.length) {
    d.items = local;
    d.name = mealNameFrom(named);
    d.comment = "Valeurs de la table nutritionnelle intégrée.";
    d.confidence = "high";
    d.analyzed = true;
    renderDraft();
    return;
  }
  const note = d.image
    ? (named.length ? `Aliments et quantités précisés (respecte ces quantités, et ajoute ce que tu vois d'autre sur la photo) : ${foodsText(named)}` : "")
    : `Estime uniquement ces aliments, avec ces quantités : ${foodsText(unknown)}`;
  renderDraft(true);
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-key": ACCESS_KEY },
      body: JSON.stringify({ image: d.image ? d.image.split(",")[1] : null, mediaType: "image/jpeg", note }),
    });
    const data = await res.json().catch(() => ({}));
    if (draft !== d) return; // fermé entre-temps
    if (!res.ok) throw new Error(data.error || "Analyse impossible, réessaie.");
    if (data.is_food === false || !data.items?.length) {
      toast(data.comment || "Aucun aliment reconnu. Ajoute les aliments à la main.");
      renderDraft();
      return;
    }
    const ai = data.items.map(fromAi);
    d.items = d.image ? ai : [...local, ...ai];
    d.name = d.image ? data.meal_name || "Repas" : mealNameFrom(named);
    d.comment = data.comment || "";
    d.confidence = data.confidence || null;
    d.analyzed = true;
    renderDraft();
  } catch (err) {
    if (draft !== d) return;
    toast(navigator.onLine ? err.message : "Pas de connexion internet.");
    renderDraft();
  }
}

async function saveDraft() {
  const d = draft;
  d.items.forEach((it, i) => { if (it.src === "pending") lookupItem(i); });
  if (d.pending?.size) {
    const btn = $('[data-act="save-meal"]');
    if (btn) { btn.disabled = true; btn.textContent = "Calcul des valeurs…"; }
    await Promise.allSettled([...d.pending]);
    if (draft !== d) return;
  }
  const items = d.items.map(normalizeItem).filter((it) => it.name || it.kcal);
  if (!items.length) { toast("Ajoute au moins un aliment."); renderDraft(); return; }
  const meal = { id: d.id || uid(), date: d.date, time: d.time, type: d.type, name: d.name.trim() || "Repas", items, comment: d.comment, confidence: d.confidence };
  // Le bilan n'est refait que si le contenu du repas a changé.
  const old = d.id ? state.meals.find((m) => m.id === d.id) : null;
  const changed = !old?.review || JSON.stringify(old.items) !== JSON.stringify(items) || old.type !== meal.type || old.date !== meal.date;
  if (!changed) meal.review = old.review;
  if (d.id) state.meals = state.meals.map((m) => (m.id === d.id ? meal : m));
  else state.meals.push(meal);
  saveMeals();
  state.day = meal.date;
  state.tab = "today";
  closeSheet();
  render();
  if (changed) requestReview(meal.id);
  else toast("Repas mis à jour.");
}

/* ---------- Mes recettes ----------
   Une recette (shaker, porridge…) = un nom + des ingrédients avec leurs quantités.
   Ses valeurs sont figées à l'enregistrement : table intégrée, sinon une seule estimation par l'IA.
   Elle se comporte ensuite comme un aliment de la table, compté en portions. */

function recipeTotals(items) {
  return items.reduce((a, it) => ({ grams: a.grams + (+it.grams || 0), kcal: a.kcal + it.kcal, protein: a.protein + it.protein, carbs: a.carbs + it.carbs, fat: a.fat + it.fat }), { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

// Une recette vue comme un aliment : valeurs pour 100 g, une portion = la recette entière.
function recipeFood(name) {
  const k = normalizeFoodName(name);
  const r = k && state.recipes.find((x) => normalizeFoodName(x.name) === k);
  if (!r) return null;
  const t = recipeTotals(r.items);
  const g = t.grams > 0 ? t.grams : 100;
  const per = (v) => (v / g) * 100;
  return { name: r.name, kcal: per(t.kcal), protein: per(t.protein), carbs: per(t.carbs), fat: per(t.fat), portion: 1, aliases: [], unit: { label: "portion", g }, recipe: true };
}

// Les recettes passent avant la table : « Shaker » trouve d'abord la recette de la personne.
const tableFindFood = findFood;
findFood = (name) => recipeFood(name) || tableFindFood(name);

function rowFromItem(it) {
  const unit = it.mode === "u" ? findFood(it.name)?.unit : null;
  const ai = it.src === "ai" ? { name: it.name, grams: it.grams, kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat } : null;
  return { name: it.name, qty: String(unit ? round2(it.grams / unit.g) : round(it.grams)), mode: unit ? "u" : "g", unit, auto: false, ai };
}

// Ingrédient déjà estimé par l'IA et pas renommé : on réutilise ses valeurs, ramenées au poids.
function cachedAi(f) {
  return f.ai && f.ai.grams > 0 && normalizeFoodName(f.ai.name) === normalizeFoodName(f.name) ? f.ai : null;
}

function rowValues(f) {
  const grams = rowGrams(f);
  const food = findFood(f.name);
  if (food && grams > 0) return { ...foodValues(food, grams), src: food.recipe ? "recipe" : "table", mode: f.mode === "u" && food.unit ? "u" : "g" };
  const ai = cachedAi(f);
  if (ai && grams > 0) {
    const r = grams / ai.grams;
    return { name: f.name.trim(), grams, kcal: ai.kcal * r, protein: ai.protein * r, carbs: ai.carbs * r, fat: ai.fat * r, src: "ai", aiName: ai.name, mode: "g" };
  }
  return null;
}

function recipeTotalsHtml(d) {
  const rows = namedFoods(d);
  const values = rows.map(rowValues);
  const t = recipeTotals(values.filter(Boolean));
  const missing = values.filter((v) => !v).length;
  return `
    <p class="small muted" style="margin-bottom:10px">Total de la recette (1 portion${t.grams ? ` ≈ ${round(t.grams)} g` : ""})</p>
    ${draftTotals(t)}
    ${missing ? `<p class="small muted" style="margin:10px 0 0">+ ${missing} ingrédient${missing > 1 ? "s" : ""} pas dans la table : l'IA ${missing > 1 ? "les " : "l'"}estimera à l'enregistrement.</p>` : ""}`;
}

function openRecipe(id) {
  const r = id ? state.recipes.find((x) => x.id === id) : null;
  draft = { kind: "recipe", id: r?.id || null, name: r?.name || "", foods: r ? r.items.map(rowFromItem) : [emptyFood()] };
  renderRecipe();
}

function renderRecipe(saving = false) {
  const d = draft;
  openSheet(`
    <div class="sheet-head"><h1>${d.id ? "Modifier la recette" : "Nouvelle recette"}</h1><button class="close" data-act="close" aria-label="Fermer">✕</button></div>
    <label class="field"><span>Nom</span><input data-draft="name" value="${esc(d.name)}" maxlength="40" placeholder="Ex. Shaker prise de masse"></label>
    <h2>Ingrédients</h2>
    <div class="card" id="food-rows">${d.foods.map(foodRow).join("")}</div>
    <button class="btn block" data-act="add-food">+ Ajouter un ingrédient</button>
    <div class="card" id="recipe-totals" style="margin-top:16px">${recipeTotalsHtml(d)}</div>
    <button class="btn primary block" data-act="save-recipe" ${saving ? "disabled" : ""}>${saving ? "Estimation des ingrédients…" : "Enregistrer la recette"}</button>
    ${d.id ? `<button class="btn danger block" style="margin-top:10px" data-act="delete-recipe">Supprimer la recette</button>` : ""}`);
}

function renderSheet() {
  if (draft?.kind === "recipe") renderRecipe();
  else renderDraft();
}

async function saveRecipe() {
  const d = draft;
  const name = d.name.trim();
  if (!name) { toast("Donne un nom à ta recette."); return; }
  if (state.recipes.some((r) => r.id !== d.id && normalizeFoodName(r.name) === normalizeFoodName(name))) { toast("Tu as déjà une recette avec ce nom."); return; }
  const rows = namedFoods(d);
  if (!rows.length) { toast("Ajoute au moins un ingrédient."); return; }
  if (rows.some((f) => !(rowGrams(f) > 0))) { toast("Indique la quantité de chaque ingrédient."); return; }
  const items = [];
  const unknown = [];
  for (const f of rows) {
    const v = rowValues(f);
    if (v) items.push(normalizeItem(v));
    else unknown.push(f);
  }
  if (unknown.length) {
    renderRecipe(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-key": ACCESS_KEY },
        body: JSON.stringify({ note: `Estime uniquement ces aliments, un par ligne, avec ces quantités : ${foodsText(unknown)}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Estimation impossible, réessaie.");
      if (!data.items?.length) throw new Error(data.comment || "Ingrédients non reconnus : vérifie leur nom.");
      if (draft !== d) return;
      for (const raw of data.items) items.push({ ...normalizeItem(raw), src: "ai", aiName: String(raw.name || "").slice(0, 60), mode: "g" });
    } catch (err) {
      if (draft !== d) return;
      toast(navigator.onLine ? err.message : "Pas de connexion internet.");
      renderRecipe();
      return;
    }
  }
  const recipe = { id: d.id || uid(), name, items, updatedAt: Date.now() };
  if (d.id) state.recipes = state.recipes.map((r) => (r.id === d.id ? recipe : r));
  else state.recipes.push(recipe);
  saveRecipes();
  closeSheet();
  render();
  toast(`« ${name} » : ${round(recipeTotals(items).kcal)} kcal par portion.`);
}

// Raccourci « + Shaker » dans « Nouveau repas » : une portion de la recette.
function addRecipeToMeal(id) {
  const r = state.recipes.find((x) => x.id === id);
  if (!r || !draft) return;
  const food = recipeFood(r.name);
  const last = draft.foods[draft.foods.length - 1];
  const row = last && !last.name.trim() ? last : (draft.foods.push(emptyFood()), draft.foods[draft.foods.length - 1]);
  Object.assign(row, { name: r.name, qty: "1", mode: "u", unit: food.unit, auto: true });
  renderDraft();
}

/* ---------- Bilan du repas : note sur 100, analyse, recommandations ---------- */

const zeroTotals = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
const addTotals = (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat });

function scoreColor(score) {
  return score >= 80 ? "var(--accent)" : score >= 60 ? "var(--carbs)" : "var(--over)";
}

function reviewPayload(meal) {
  const p = state.profile;
  const t = targets();
  const earlier = state.meals.filter((m) => m.date === meal.date && m.id !== meal.id && m.time <= meal.time);
  const before = earlier.map(mealTotals).reduce(addTotals, zeroTotals());
  const totals = mealTotals(meal);
  return {
    meal: {
      name: meal.name,
      type: MEAL_TYPES[meal.type] || "Repas",
      time: new Date(meal.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      items: meal.items.map(({ name, grams, kcal, protein, carbs, fat }) => ({ name, grams, kcal, protein, carbs, fat })),
      totals,
    },
    day: { targets: { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat }, before, after: addTotals(before, totals), mealsBefore: earlier.length },
    profile: { mode: computeTargets(p).mode, sex: p.sex, age: p.age, weight: p.weight, goalWeight: p.goalWeight },
  };
}

const GOAL_NAMES = { cut: "sèche", bulk: "prise de masse sèche", maintain: "maintien" };

// Détail par critère, selon le barème de l'objectif. Les protéines et les calories
// affichent le total du repas ; les autres critères, leurs points.
function critValue(c, totals) {
  if (totals && c.key === "protein") return `${round(totals.protein)} g`;
  if (totals && c.key === "calories") return `${round(totals.kcal)} kcal`;
  return `${c.points} / ${c.max}`;
}

function breakdownBlock(r, totals) {
  if (!Array.isArray(r.breakdown) || !r.breakdown.length) return "";
  return `
    <div class="breakdown">
      ${r.breakdown.map((c) => `
        <div class="crit">
          <div class="macro-head"><span>${esc(c.label)}</span><b>${critValue(c, totals)}</b></div>
          <div class="bar"><i style="width:${c.max ? (c.points / c.max) * 100 : 0}%;background:${scoreColor((c.points / c.max) * 100)}"></i></div>
        </div>`).join("")}
      ${r.goal ? `<p class="small muted" style="margin:6px 0 0">Barème « ${GOAL_NAMES[r.goal] || r.goal} »</p>` : ""}
    </div>`;
}

function reviewCard(r, totals) {
  const recos = r.recommendations || [];
  return `
    <div class="card review">
      <div class="review-head">
        <div class="score" style="--c:${scoreColor(r.score)}"><b>${r.score}</b><span>/100</span></div>
        <strong>${esc(r.title)}</strong>
      </div>
      ${breakdownBlock(r, totals)}
      <p class="small">${esc(r.analysis)}</p>
      ${recos.length ? `<p class="small muted" style="margin:12px 0 4px">Recommandations</p><ul class="recos small">${recos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    </div>`;
}

function reviewSheet(meal, status = "done", message = "") {
  const t = mealTotals(meal);
  const head = `<div class="sheet-head"><h1>Bilan du repas</h1><button class="close" data-act="close" aria-label="Fermer">✕</button></div>
    <p class="small muted">${esc(meal.name)} · ${round(t.kcal)} kcal · P ${round(t.protein)} g · G ${round(t.carbs)} g · L ${round(t.fat)} g</p>`;
  if (status === "loading") return `${head}<div class="card center"><div class="spinner"></div><p>Analyse du repas…</p><p class="small muted">Note sur 100 et conseils pour la suite de ta journée.</p></div>`;
  if (status === "error") return `${head}<div class="card"><p>${esc(message)}</p><button class="btn block" data-act="retry-review" data-id="${meal.id}">Réessayer</button></div>
    <button class="btn block" data-act="close">Fermer</button>`;
  return `${head}${reviewCard(meal.review, t)}
    <button class="btn primary block" data-act="close">Fermer</button>
    <p class="center"><button class="link" data-act="edit-meal" data-id="${meal.id}">Voir ou modifier le repas</button></p>`;
}

async function requestReview(id) {
  const meal = state.meals.find((m) => m.id === id);
  if (!meal) return;
  draft = null;
  const show = (html) => {
    openSheet(html);
    $("#sheet").dataset.review = id;
  };
  const stillOpen = () => !$("#sheet").hidden && $("#sheet").dataset.review === id;
  show(reviewSheet(meal, "loading"));
  try {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-key": ACCESS_KEY },
      body: JSON.stringify(reviewPayload(meal)),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Bilan impossible, réessaie.");
    const fresh = state.meals.find((m) => m.id === id);
    if (!fresh) return;
    fresh.review = { score: data.score, breakdown: data.breakdown, goal: data.goal, title: data.title, analysis: data.analysis, recommendations: data.recommendations, at: Date.now() };
    saveMeals();
    if (stillOpen()) show(reviewSheet(fresh));
    render();
  } catch (err) {
    if (stillOpen()) show(reviewSheet(meal, "error", navigator.onLine ? err.message : "Pas de connexion internet."));
  }
}

/* ---------- Export / import ---------- */

function exportData() {
  const data = { app: "assiette", version: 1, exportedAt: new Date().toISOString(), profile: state.profile, meals: state.meals, weights: state.weights, recipes: state.recipes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `assiette-sauvegarde-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "assiette" || !Array.isArray(data.meals)) throw new Error();
    if (!confirm("Remplacer les données de cet appareil par cette sauvegarde ?")) return;
    state.profile = data.profile;
    state.meals = data.meals;
    state.weights = Array.isArray(data.weights) ? data.weights : [];
    state.recipes = Array.isArray(data.recipes) ? data.recipes : [];
    saveProfile(); saveMeals(); saveWeights(); saveRecipes();
    state.tab = "today";
    render();
    toast("Sauvegarde restaurée.");
  } catch {
    toast("Fichier de sauvegarde invalide.");
  }
}

/* ---------- Évènements ---------- */

document.addEventListener("click", async (e) => {
  const tab = e.target.closest(".tab");
  if (tab) { state.tab = tab.dataset.tab; if (state.tab === "today") state.day = todayKey(); render(); return; }
  if (e.target.closest("#fab")) { startAdd(); return; }

  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  switch (act) {
    case "prev-day": state.day = shiftKey(state.day, -1); render(); break;
    case "next-day": if (state.day < todayKey()) { state.day = shiftKey(state.day, 1); render(); } break;
    case "open-day": state.day = el.dataset.date; state.tab = "today"; render(); break;
    case "add": startAdd(); break;
    case "edit-meal": editMeal(el.dataset.id); break;
    case "close": closeSheet(); break;
    case "camera": $("#file-camera").click(); break;
    case "gallery": $("#file-gallery").click(); break;
    case "clear-photo": draft.image = null; renderDraft(); break;
    case "analyze": analyze(); break;
    case "manual": {
      const named = namedFoods(draft);
      draft.items = named.length
        ? named.map((f) => { const food = findFood(f.name); return food && rowGrams(f) > 0 ? tableItem(food, rowGrams(f), f.mode === "u" && food.unit ? "u" : "g") : { ...normalizeItem({ name: f.name, grams: rowGrams(f) }), src: "manual", mode: "g" }; })
        : [normalizeItem({ name: "" })];
      draft.name = mealNameFrom(named);
      draft.analyzed = true;
      renderDraft();
      break;
    }
    case "toggle-unit": toggleUnit(+el.dataset.i); break;
    case "add-food":
      draft.foods.push(emptyFood());
      renderSheet();
      $(`input[data-food="${draft.foods.length - 1}"][data-k="name"]`)?.focus();
      break;
    case "del-food":
      draft.foods.splice(+el.dataset.i, 1);
      if (!draft.foods.length) draft.foods.push(emptyFood());
      renderSheet();
      break;
    case "add-item": draft.items.push({ ...normalizeItem({ name: "" }), mode: "g" }); renderDraft(); break;
    case "item-unit": toggleItemUnit(+el.dataset.i); break;
    case "retry-review": requestReview(el.dataset.id); break;
    case "del-item": draft.items.splice(+el.dataset.i, 1); renderDraft(); break;
    case "save-meal": saveDraft(); break;
    case "delete-meal":
      if (confirm("Supprimer ce repas ?")) {
        state.meals = state.meals.filter((m) => m.id !== draft.id);
        saveMeals(); closeSheet(); render();
      }
      break;
    case "del-weight":
      state.weights = state.weights.filter((w) => w.date !== el.dataset.date);
      saveWeights(); render();
      break;
    case "custom-targets": {
      const t = targets();
      const ask = (label, v) => { const r = prompt(label, v); return r === null ? null : Math.max(0, round(parseFloat(r.replace(",", ".")))); };
      const kcal = ask("Calories par jour", t.kcal); if (kcal === null) break;
      const protein = ask("Protéines (g)", t.protein); if (protein === null) break;
      const carbs = ask("Glucides (g)", t.carbs); if (carbs === null) break;
      const fat = ask("Lipides (g)", t.fat); if (fat === null) break;
      state.profile.custom = { kcal, protein, carbs, fat };
      saveProfile(); render();
      break;
    }
    case "adapt-accept": {
      const a = adaptiveStatus();
      if (a.state !== "suggest") break;
      state.profile.kcalAdjust = a.newAdjust;
      state.profile.adapt = { at: Date.now(), from: a.from, to: a.to };
      saveProfile(); render();
      toast(`Nouvel objectif : ${a.to} kcal par jour.`);
      break;
    }
    case "adapt-later":
      state.profile.adapt = { ...state.profile.adapt, dismissedAt: Date.now() };
      saveProfile(); render();
      break;
    case "adapt-reset":
      if (confirm("Revenir à l'objectif calculé par la formule, sans la correction apprise de ton poids ?")) {
        delete state.profile.kcalAdjust;
        state.profile.adapt = { at: Date.now() };
        saveProfile(); render();
      }
      break;
    case "new-recipe": openRecipe(null); break;
    case "edit-recipe": openRecipe(el.dataset.id); break;
    case "save-recipe": saveRecipe(); break;
    case "delete-recipe":
      if (confirm("Supprimer cette recette ? Les repas déjà enregistrés ne changent pas.")) {
        state.recipes = state.recipes.filter((r) => r.id !== draft.id);
        saveRecipes(); closeSheet(); render();
      }
      break;
    case "add-recipe": addRecipeToMeal(el.dataset.id); break;
    case "reset-targets": delete state.profile.custom; saveProfile(); render(); break;
    case "share":
      try {
        if (navigator.share) await navigator.share({ title: "Assiette", text: "Mon appli de suivi nutrition par photo", url: shareLink() });
        else { await navigator.clipboard.writeText(shareLink()); toast("Lien copié."); }
      } catch { /* partage annulé */ }
      break;
    case "export": exportData(); break;
    case "import": $("#file-import").click(); break;
    case "wipe":
      if (confirm("Effacer définitivement ton profil, tes repas et tes pesées sur cet appareil ?")) {
        state.profile = null; state.meals = []; state.weights = []; state.recipes = [];
        saveProfile(); saveMeals(); saveWeights(); saveRecipes();
        render();
      }
      break;
  }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.item !== undefined) { onItemInput(el); return; }
  if (el.dataset.food !== undefined && draft) { onFoodInput(el); return; }
  if (draft && el.dataset.draft) draft[el.dataset.draft] = el.value;
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.item !== undefined && el.dataset.k === "name" && draft) lookupItem(+el.dataset.item);
  if (el.id === "file-camera" || el.id === "file-gallery") { onPhoto(el.files[0]); el.value = ""; }
  if (el.id === "file-import" && el.files[0]) { importData(el.files[0]); el.value = ""; }
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "weight-form") return;
  e.preventDefault();
  const kg = parseKg(new FormData(e.target).get("kg"));
  if (!(kg > 30 && kg < 300)) { toast("Poids invalide."); return; }
  logWeight(kg);
  render();
});

// Suggestions d'aliments pour les champs « Aliment ».
function refreshFoodList() {
  let list = $("#food-list");
  if (!list) {
    document.body.insertAdjacentHTML("beforeend", `<datalist id="food-list"></datalist>`);
    list = $("#food-list");
  }
  list.innerHTML = [...state.recipes.map((r) => r.name), ...FOOD_TABLE.map((f) => f.name)].map((n) => `<option value="${esc(n)}"></option>`).join("");
}
refreshFoodList();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

render();
