import { guard, askJson } from "./_shared.js";

// Bilan d'un repas enregistré : note sur 100, analyse et recommandations,
// au regard de l'objectif de la personne et de ce qu'elle a déjà mangé dans la journée.

export const config = { maxDuration: 60 };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "title", "analysis", "recommendations"],
  properties: {
    score: { type: "integer" },
    title: { type: "string" },
    analysis: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `Tu es un coach en nutrition sportive, direct et concret. Tu notes un repas sur 100 pour l'objectif de la personne, puis tu donnes une courte analyse et des recommandations.

Barème (sur 100) :
- Protéines (35 pts) : la part de l'objectif protéique du jour couverte par ce repas, au regard du type de repas (un repas principal devrait en apporter environ 25 à 35 %, une collation 10 à 15 %).
- Calories (25 pts) : cohérence avec l'objectif du jour et avec ce qu'il reste à manger. En prise de masse, un repas trop léger est aussi pénalisé qu'un repas trop lourd en sèche.
- Qualité (30 pts) : aliments peu transformés, légumes ou fruits, fibres, bonnes graisses ; pénalise friture, sucres ajoutés, ultra-transformé.
- Équilibre (10 pts) : glucides et lipides adaptés à l'objectif et au moment de la journée.
Sois juste et étalonné : un repas correct se situe vers 65-75, un excellent repas 85 et plus, un fast-food déséquilibré 30-50.

title : un verdict de 2 à 5 mots (ex. « Très bon repas », « Manque de protéines »).
analysis : 2 ou 3 phrases, avec des chiffres (protéines, calories, ce qui manque ou ce qui est en trop).
recommendations : 2 ou 3 conseils actionnables et précis, en tutoyant. Au moins un conseil porte sur la suite de la journée (ce qu'il reste à manger pour atteindre les objectifs), un autre sur ce repas la prochaine fois. Donne des aliments et des quantités concrètes.
Pas de morale, pas de mise en garde médicale.`;

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
  const text = `Objectif : ${GOALS[profile?.mode] || "maintien"}. ${profile?.sex === "f" ? "Femme" : "Homme"}, ${r(profile?.age)} ans, ${profile?.weight} kg, poids visé ${profile?.goalWeight} kg.
Objectifs du jour : ${r(t.kcal)} kcal, protéines ${r(t.protein)} g, glucides ${r(t.carbs)} g, lipides ${r(t.fat)} g.

Repas à noter : ${String(meal.type || "repas")} à ${String(meal.time || "?")}, « ${String(meal.name || "").slice(0, 60)} »
${items}
Total du repas : ${r(meal.totals?.kcal)} kcal, P ${r(meal.totals?.protein)} g, G ${r(meal.totals?.carbs)} g, L ${r(meal.totals?.fat)} g.

Déjà mangé aujourd'hui avant ce repas (${r(day.mealsBefore)} repas) : ${r(before.kcal)} kcal, P ${r(before.protein)} g, G ${r(before.carbs)} g, L ${r(before.fat)} g.
Total de la journée avec ce repas : ${r(after.kcal)} kcal, P ${r(after.protein)} g. Il reste ${r(t.kcal - after.kcal)} kcal et ${r(t.protein - after.protein)} g de protéines pour atteindre les objectifs.`;

  const result = await askJson(res, { system: SYSTEM, content: [{ type: "text", text }], schema: SCHEMA, maxTokens: 4000 });
  if (!result) return;
  result.score = Math.max(0, Math.min(100, r(result.score)));
  result.recommendations = (result.recommendations || []).slice(0, 4);
  res.status(200).json(result);
}
