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
  tab: "today",
  day: todayKey(),
};

function saveMeals() { store.set("meals", state.meals); }
function saveWeights() { store.set("weights", state.weights); }
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

function computeTargets(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "f" ? -161 : 5);
  const tdee = bmr * p.activity;
  const diff = p.weight - p.goalWeight;
  let mode = "maintain";
  let kcal = tdee;
  if (diff > 0.5) {
    mode = "cut";
    const deficit = Math.min((p.pace * 7700) / 7, tdee * 0.25);
    kcal = Math.max(tdee - deficit, p.sex === "f" ? 1200 : 1500);
  } else if (diff < -0.5) {
    mode = "bulk";
    kcal = tdee + 250;
  }
  // Sèche : protéines hautes pour garder le muscle.
  let protein = mode === "cut" ? 2 * p.goalWeight : 1.8 * p.weight;
  protein = Math.min(protein, (kcal * 0.35) / 4);
  const fat = Math.max(0.8 * Math.min(p.weight, p.goalWeight + 10), (kcal * 0.25) / 9);
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  return { kcal: round(kcal / 10) * 10, protein: round(protein), carbs: round(carbs), fat: round(fat), tdee: round(tdee), bmr: round(bmr), mode };
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
      <img class="logo" src="/icons/icon.svg" alt="">
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
      <label class="field"><span>Poids actuel (kg)</span><input name="weight" type="number" inputmode="decimal" step="0.1" min="35" max="250" required value="${p.weight ?? ""}"></label>
      <label class="field"><span>Poids visé (kg)</span><input name="goalWeight" type="number" inputmode="decimal" step="0.1" min="35" max="250" required value="${p.goalWeight ?? ""}"></label>
    </div>
    <label class="field"><span>Activité</span>
      <select name="activity">${ACTIVITY.map((a) => `<option value="${a.v}" ${a.v === activity ? "selected" : ""}>${a.label}</option>`).join("")}</select>
    </label>
    <label class="field"><span>Rythme de perte (si tu veux perdre du poids)</span>
      <select name="pace">${PACE.map((a) => `<option value="${a.v}" ${a.v === pace ? "selected" : ""}>${a.label}</option>`).join("")}</select>
    </label>`;
}

function renderOnboarding() {
  return `
    <div class="hero">
      <img class="logo" src="/icons/icon.svg" alt="">
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
  const num = (k) => parseFloat(String(f.get(k)).replace(",", "."));
  const p = {
    name: String(f.get("name") || "").trim(),
    sex: f.get("sex") === "f" ? "f" : "m",
    age: num("age"),
    height: num("height"),
    weight: num("weight"),
    goalWeight: num("goalWeight"),
    activity: num("activity"),
    pace: num("pace"),
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
  if (t.mode === "bulk") return `Prise de masse propre : +250 kcal au-dessus de ta maintenance (${t.tdee} kcal).`;
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
      <div class="meal-kcal"><strong>${round(t.kcal)}</strong><span class="small muted">kcal</span></div>
    </div>`;
}

/* ----- Écran Poids ----- */

function logWeight(kg, date = todayKey(), notify = true) {
  const value = round1(kg);
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
      ${ticks.map((v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${round1(v)}</text>`).join("")}
      <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--accent)" stroke-dasharray="4 4"/>
      <text x="${W - pad.r}" y="${y(goal) - 5}" text-anchor="end" font-size="10" fill="var(--accent)">objectif ${goal} kg</text>
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
  const left = round1(current - p.goalWeight);
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
      <label class="field" style="flex:1;margin:0"><span>Pesée du jour (kg)</span><input name="kg" type="number" inputmode="decimal" step="0.1" min="35" max="250" placeholder="${current}" required></label>
      <button class="btn primary" type="submit">Enregistrer</button>
    </form>
    <div class="card stats">
      <div><b>${start}</b><span>départ</span></div>
      <div><b>${current}</b><span>actuel</span></div>
      <div><b>${left > 0 ? left : Math.abs(left)}</b><span>${left > 0 ? "kg à perdre" : left < 0 ? "kg à prendre" : "objectif atteint"}</span></div>
    </div>
    <div class="card chart">
      ${weightChart(pts, p.goalWeight)}
      ${trend !== null ? `<p class="small" style="margin:10px 0 0">Tendance : <b>${trend > 0 ? "+" : ""}${round1(trend)} kg / semaine</b>. ${eta}</p>` : `<p class="small muted" style="margin:10px 0 0">Pèse-toi le matin à jeun, 2 à 3 fois par semaine. La tendance s'affiche après une semaine.</p>`}
    </div>
    ${recent.length ? `<h2>Dernières pesées</h2><div class="card">${recent.map((w) => `<div class="weight-row"><span>${dayLabel(w.date)}</span><span><b>${w.kg} kg</b> <button data-act="del-weight" data-date="${w.date}" aria-label="Supprimer">✕</button></span></div>`).join("")}</div>` : ""}`;
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
  draft = { id: null, date, time, type: guessMealType(now), image: null, note: "", items: [], name: "", comment: "", confidence: null, analyzed: false };
  renderDraft();
}

function editMeal(id) {
  const m = state.meals.find((x) => x.id === id);
  if (!m) return;
  draft = { ...structuredClone(m), image: null, note: "", analyzed: true };
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
    openSheet(`
      ${head}
      ${d.image
        ? `<img class="preview" src="${d.image}" alt="Photo du repas"><button class="link" data-act="clear-photo">Changer de photo</button>`
        : `<div class="pick"><button class="btn" data-act="camera"><span>📷</span>Prendre une photo</button><button class="btn" data-act="gallery"><span>🖼</span>Choisir une photo</button></div>`}
      <label class="field" style="margin-top:8px"><span>Précisions (facultatif) : quantités, marque, sauce…</span>
        <textarea data-draft="note" placeholder="Ex. 150 g de riz, 1 c. à soupe d'huile d'olive">${esc(d.note)}</textarea></label>
      <label class="field"><span>Repas</span>${typeSelect(d.type)}</label>
      <button class="btn primary block" data-act="analyze" ${d.image || d.note.trim() ? "" : "disabled"}>Analyser</button>
      <p class="small muted center" style="margin-top:12px">Sans photo, décris simplement ce que tu as mangé.</p>
      <p class="center"><button class="link" data-act="manual">Saisir à la main</button></p>`);
    return;
  }

  const t = mealTotals(d);
  const conf = { low: ["low", "estimation incertaine"], medium: ["", "estimation moyenne"], high: ["high", "estimation fiable"] }[d.confidence];
  openSheet(`
    ${head}
    ${d.image ? `<img class="preview" src="${d.image}" alt="">` : ""}
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
    <p class="small muted" style="margin:10px 0 16px">Modifie les grammes : les calories et macros s'ajustent automatiquement.</p>
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

function itemRow(it, i) {
  const f = (k, label) => `<label>${label}<input type="number" inputmode="decimal" step="any" min="0" data-item="${i}" data-k="${k}" value="${round1(it[k])}"></label>`;
  return `
    <div class="item">
      <div class="item-top">
        <input class="name" data-item="${i}" data-k="name" value="${esc(it.name)}" placeholder="Aliment">
        <div class="grams"><input type="number" inputmode="decimal" step="any" min="0" data-item="${i}" data-k="grams" value="${round(it.grams)}"></div>
        <button class="item-del" data-act="del-item" data-i="${i}" aria-label="Retirer">✕</button>
      </div>
      <div class="item-macros">${f("kcal", "kcal")}${f("protein", "prot.")}${f("carbs", "gluc.")}${f("fat", "lip.")}</div>
    </div>`;
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
  return it;
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

async function analyze() {
  const d = draft;
  renderDraft(true);
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-key": ACCESS_KEY },
      body: JSON.stringify({ image: d.image ? d.image.split(",")[1] : null, mediaType: "image/jpeg", note: d.note }),
    });
    const data = await res.json().catch(() => ({}));
    if (draft !== d) return; // fermé entre-temps
    if (!res.ok) throw new Error(data.error || "Analyse impossible, réessaie.");
    if (data.is_food === false || !data.items?.length) {
      toast(data.comment || "Aucun aliment reconnu. Ajoute une description.");
      renderDraft();
      return;
    }
    d.items = data.items.map(normalizeItem);
    d.name = data.meal_name || "Repas";
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

function saveDraft() {
  const d = draft;
  const items = d.items.map(normalizeItem).filter((it) => it.name || it.kcal);
  if (!items.length) { toast("Ajoute au moins un aliment."); return; }
  const meal = { id: d.id || uid(), date: d.date, time: d.time, type: d.type, name: d.name.trim() || "Repas", items, comment: d.comment, confidence: d.confidence };
  if (d.id) state.meals = state.meals.map((m) => (m.id === d.id ? meal : m));
  else state.meals.push(meal);
  saveMeals();
  state.day = meal.date;
  state.tab = "today";
  closeSheet();
  render();
  toast(`${round(mealTotals(meal).kcal)} kcal ajoutées.`);
}

/* Édition en direct d'un aliment : les grammes recalculent les macros au prorata. */
function onItemInput(el) {
  const i = +el.dataset.item;
  const k = el.dataset.k;
  const it = draft.items[i];
  if (!it) return;
  if (k === "name") { it.name = el.value; return; }
  const v = Math.max(0, parseFloat(el.value.replace(",", ".")) || 0);
  const MACROS = ["kcal", "protein", "carbs", "fat"];
  if (k === "grams") {
    // Valeurs par gramme mémorisées, pour qu'un champ vidé puis retapé ne remette pas tout à zéro.
    if (!it._per && it.grams > 0) it._per = Object.fromEntries(MACROS.map((m) => [m, it[m] / it.grams]));
    if (it._per) {
      for (const m of MACROS) {
        it[m] = it._per[m] * v;
        const input = $(`input[data-item="${i}"][data-k="${m}"]`);
        if (input) input.value = round1(it[m]);
      }
    }
  } else {
    it._per = null;
  }
  it[k] = v;
  $("#draft-totals").innerHTML = draftTotals(mealTotals(draft));
}

/* ---------- Export / import ---------- */

function exportData() {
  const data = { app: "assiette", version: 1, exportedAt: new Date().toISOString(), profile: state.profile, meals: state.meals, weights: state.weights };
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
    saveProfile(); saveMeals(); saveWeights();
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
    case "manual": draft.analyzed = true; draft.items = [normalizeItem({ name: "" })]; draft.name = draft.note.trim().slice(0, 60); renderDraft(); break;
    case "add-item": draft.items.push(normalizeItem({ name: "" })); renderDraft(); break;
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
        state.profile = null; state.meals = []; state.weights = [];
        saveProfile(); saveMeals(); saveWeights();
        render();
      }
      break;
  }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.item !== undefined) { onItemInput(el); return; }
  if (draft && el.dataset.draft) {
    draft[el.dataset.draft] = el.value;
    if (el.dataset.draft === "note") {
      const btn = $('[data-act="analyze"]');
      if (btn) btn.disabled = !(draft.image || draft.note.trim());
    }
  }
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "file-camera" || el.id === "file-gallery") { onPhoto(el.files[0]); el.value = ""; }
  if (el.id === "file-import" && el.files[0]) { importData(el.files[0]); el.value = ""; }
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "weight-form") return;
  e.preventDefault();
  const kg = parseFloat(String(new FormData(e.target).get("kg")).replace(",", "."));
  if (!(kg > 30 && kg < 300)) { toast("Poids invalide."); return; }
  logWeight(kg);
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

render();
