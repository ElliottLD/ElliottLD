import { guard, askJson } from "./_shared.js";

// Analyse d'un repas (photo et/ou description) -> aliments + macros estimés.
// La photo n'est jamais stockée : elle transite vers l'API puis est oubliée.

export const config = { maxDuration: 60 };

const MAX_IMAGE_CHARS = 4_000_000; // ~3 Mo en base64, la photo est déjà réduite côté téléphone

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "meal_name", "items", "confidence", "comment"],
  properties: {
    is_food: { type: "boolean" },
    meal_name: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "grams", "kcal", "protein", "carbs", "fat"],
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
          kcal: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
        },
      },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    comment: { type: "string" },
  },
};

const SYSTEM = `Tu es un nutritionniste qui estime le contenu d'un repas à partir d'une photo et/ou d'une description.

Liste chaque aliment séparément (pas de plat global quand on distingue les composants) avec : un nom court en français, le poids estimé en grammes, les kcal, protéines, glucides et lipides (en grammes) pour CETTE portion.

Noms : utilise des noms simples et courants qui précisent la cuisson quand elle change les calories, par exemple « Riz basmati cuit », « Pâtes cuites », « Blanc de poulet grillé », « Œuf au plat », « Œufs brouillés », « Pommes de terre sautées », « Frites (friteuse, fast-food) », « Brocolis vapeur », « Huile d'olive », « Saumon cuit (four, poêle) ». Pas de marque, pas d'adjectif inutile.

Méthode :
- Estime les portions avec les repères visuels (taille de l'assiette, couverts, main, emballage).
- Compte les graisses cachées : huile de cuisson, beurre, sauces, vinaigrette, fromage râpé. Ajoute-les comme lignes séparées quand elles sont probables.
- Si l'utilisateur précise des aliments ou des quantités, ils priment sur la photo.
- Utilise des valeurs nutritionnelles standard (type table Ciqual) et reste réaliste, ni optimiste ni pessimiste.
- Boissons caloriques : à inclure si visibles.

meal_name : un nom court pour le repas (ex. « Poulet riz brocolis »).
confidence : "high" si les aliments et portions sont clairs, "medium" si les portions sont incertaines, "low" si la photo est ambiguë.
comment : une phrase courte et utile en français (ce qui est incertain, par exemple). Pas de morale.
Si l'image ne montre pas de nourriture, mets is_food à false, items vide, et explique-le dans comment.`;

export default async function handler(req, res) {
  const body = guard(req, res, "analyze");
  if (!body) return;

  const { image, mediaType = "image/jpeg", note = "" } = body;
  const text = String(note).slice(0, 1500).trim();
  if (!image && !text) return res.status(400).json({ error: "Envoie une photo ou une description du repas." });
  if (image && (typeof image !== "string" || image.length > MAX_IMAGE_CHARS)) {
    return res.status(413).json({ error: "Photo trop lourde." });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) {
    return res.status(400).json({ error: "Format d'image non pris en charge." });
  }

  const content = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: image } });
  content.push({ type: "text", text: text ? `Précisions de l'utilisateur : ${text}` : "Analyse ce repas." });

  const result = await askJson(res, { system: SYSTEM, content, schema: SCHEMA });
  if (result) res.status(200).json(result);
}
