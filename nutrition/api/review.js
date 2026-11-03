import { guard, askJson } from "./_shared.js";

// Bilan d'un repas enregistré : note sur 100, analyse et recommandations,
// au regard de l'objectif de la personne et de ce qu'elle a déjà mangé dans la journée.

export const config = { maxDuration: 60 };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["points", "title", "analysis", "recommendations"],
  properties: {
    points: {
      type: "object",
      additionalProperties: false,
      required: ["protein", "calories", "quality", "balance"],
      properties: {
        protein: { type: "integer" },
        calories: { type: "integer" },
        quality: { type: "integer" },
        balance: { type: "integer" },
      },
    },
    title: { type: "string" },
    analysis: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

// Barème propre à chaque objectif : les priorités ne sont pas les mêmes en sèche,
// en prise de masse sèche et au maintien.
const RUBRICS = {
  cut: {
    protein: [35, "Protéines : part de l'objectif protéique du jour couverte par ce repas (repas principal ≈ 25 à 35 %, collation ≈ 10 à 15 %). En sèche, c'est ce qui protège le muscle."],
    calories: [30, "Calories : rester dans le budget. Pénalise un repas qui prend plus que sa part de ce qu'il reste à manger ; un repas un peu léger n'est pas un problème."],
    quality: [25, "Qualité et satiété : beaucoup de volume pour peu de calories (légumes, fibres, protéines maigres), aliments peu transformés ; pénalise friture, sucres ajoutés, gras cachés, alcool."],
    balance: [10, "Équilibre : glucides et lipides modérés, adaptés au moment de la journée."],
  },
  bulk: {
    protein: [30, "Protéines : part de l'objectif protéique du jour couverte par ce repas (repas principal ≈ 25 à 35 %, collation ≈ 10 à 15 %)."],
    calories: [30, "Calories : atteindre le surplus. Un repas trop léger, qui laisse trop à rattraper sur la journée, est pénalisé ; un excès important qui ferait prendre du gras aussi."],
    quality: [25, "Qualité : aliments peu transformés, légumes ou fruits, bonnes graisses ; pénalise friture, sucres ajoutés, ultra-transformé."],
    balance: [15, "Équilibre : assez de glucides pour l'énergie et l'entraînement, lipides raisonnables."],
  },
  maintain: {
    protein: [25, "Protéines : part de l'objectif protéique du jour couverte par ce repas (repas principal ≈ 25 à 35 %, collation ≈ 10 à 15 %)."],
    calories: [25, "Calories : proches de la part du budget du jour qui revient à ce repas, ni trop ni trop peu."],
    quality: [35, "Qualité : aliments peu transformés, variété, légumes ou fruits, fibres, bonnes graisses ; pénalise friture, sucres ajoutés, ultra-transformé."],
    balance: [15, "Équilibre : répartition glucides / lipides raisonnable pour le moment de la journée."],
  },
};
const LABELS = { protein: "Protéines", calories: "Calories", quality: "Qualité", balance: "Équilibre" };

function systemPrompt(mode) {
  const rubric = RUBRICS[mode];
  const lines = Object.entries(rubric).map(([key, [max, text]]) => `- ${key} (sur ${max}) : ${text}`).join("\n");
  return `Tu es un coach en nutrition sportive, direct et concret. Tu notes un repas pour l'objectif de la personne, puis tu donnes une courte analyse et des recommandations.

Barème pour l'objectif « ${GOALS[mode]} » (total sur 100) :
${lines}
Donne les points de chaque critère dans points (entier entre 0 et le maximum du critère). Sois juste et étalonné : un repas correct totalise environ 65-75, un excellent repas 85 et plus, un fast-food déséquilibré 30-50.

title : un verdict de 2 à 5 mots (ex. « Très bon repas », « Manque de protéines »).
analysis : 2 ou 3 phrases, avec des chiffres (protéines, calories, ce qui manque ou ce qui est en trop), qui expliquent les points perdus.
recommendations : 2 ou 3 conseils actionnables et précis, en tutoyant. Au moins un conseil porte sur la suite de la journée (ce qu'il reste à manger pour atteindre les objectifs), un autre sur ce repas la prochaine fois. Donne des aliments et des quantités concrètes.
Pas de morale, pas de mise en garde médicale.`;
}

const GOALS = { cut: "sèche (perte de gras en gardant le muscle)", bulk: "prise de masse sèche (prendre du muscle sans trop de gras)", maintain: "maintien" };
const r = (n) => Math.round(Number(n) || 0);

export default async function handler(req, res) {
  const body = guard(req, res, "review", 2);
  if (!body) return;

  const { meal, day, profile } = body;
  if (!meal || !Array.isArray(meal.items) || !meal.items.length || !day?.targets) {
    return res.status(400).json({ error: "Repas incomplet." });
  }

  const items = meal.items.slice(0, 40).map((it) =>
    `- ${String(it.name).slice(0, 60)} : ${r(it.grams)} g, ${r(it.kcal)} kcal, P ${r(it.protein)} g, G ${r(it.carbs)} g, L ${r(it.fat)} g`).join("\n");
  const t = day.targets;
  const before = day.before || {};
  const after = day.after || {};
  const text = `Objectif : ${GOALS[RUBRICS[profile?.mode] ? profile.mode : "maintain"]}. ${profile?.sex === "f" ? "Femme" : "Homme"}, ${r(profile?.age)} ans, ${profile?.weight} kg, poids visé ${profile?.goalWeight} kg.
Objectifs du jour : ${r(t.kcal)} kcal, protéines ${r(t.protein)} g, glucides ${r(t.carbs)} g, lipides ${r(t.fat)} g.

Repas à noter : ${String(meal.type || "repas")} à ${String(meal.time || "?")}, « ${String(meal.name || "").slice(0, 60)} »
${items}
Total du repas : ${r(meal.totals?.kcal)} kcal, P ${r(meal.totals?.protein)} g, G ${r(meal.totals?.carbs)} g, L ${r(meal.totals?.fat)} g.

Déjà mangé aujourd'hui avant ce repas (${r(day.mealsBefore)} repas) : ${r(before.kcal)} kcal, P ${r(before.protein)} g, G ${r(before.carbs)} g, L ${r(before.fat)} g.
Total de la journée avec ce repas : ${r(after.kcal)} kcal, P ${r(after.protein)} g. Il reste ${r(t.kcal - after.kcal)} kcal et ${r(t.protein - after.protein)} g de protéines pour atteindre les objectifs.`;

  const mode = RUBRICS[profile?.mode] ? profile.mode : "maintain";
  const result = await askJson(res, { system: systemPrompt(mode), content: [{ type: "text", text }], schema: SCHEMA, maxTokens: 4000 });
  if (!result) return;
  // Points bornés au maximum de chaque critère ; la note est leur somme.
  const breakdown = Object.entries(RUBRICS[mode]).map(([key, [max]]) => ({
    key, label: LABELS[key], max, points: Math.max(0, Math.min(max, r(result.points?.[key]))),
  }));
  res.status(200).json({
    score: breakdown.reduce((sum, c) => sum + c.points, 0),
    breakdown,
    goal: mode,
    title: result.title,
    analysis: result.analysis,
    recommendations: (result.recommendations || []).slice(0, 4),
  });
}
