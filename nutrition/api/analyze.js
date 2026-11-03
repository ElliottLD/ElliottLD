import Anthropic, { APIError } from "@anthropic-ai/sdk";

// Analyse d'un repas (photo et/ou description) -> aliments + macros estimés.
// La photo n'est jamais stockée : elle transite vers l'API puis est oubliée.

export const config = { maxDuration: 60 };

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 40);
const MAX_IMAGE_CHARS = 4_000_000; // ~3 Mo en base64, la photo est déjà réduite côté téléphone

const client = new Anthropic();

// Limite indicative par adresse IP. En mémoire : elle repart à zéro quand
// Vercel recycle la fonction, ce n'est qu'un garde-fou contre les abus.
const usage = new Map();
function overLimit(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}:${ip}`;
  const count = (usage.get(key) || 0) + 1;
  usage.set(key, count);
  if (usage.size > 5000) usage.clear();
  return count > DAILY_LIMIT;
}

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

Pour chaque aliment visible ou mentionné, donne : un nom court en français, le poids estimé en grammes, les kcal, protéines, glucides et lipides (en grammes) pour CETTE portion.

Méthode :
- Estime les portions avec les repères visuels (taille de l'assiette, couverts, main, emballage).
- Compte les graisses cachées : huile de cuisson, beurre, sauces, vinaigrette, fromage râpé. Ajoute-les comme lignes séparées quand elles sont probables.
- Si la description donne des quantités ou des marques, elles priment sur la photo.
- Utilise des valeurs nutritionnelles standard (type table Ciqual) et reste réaliste, ni optimiste ni pessimiste.
- Boissons caloriques : à inclure si visibles.

meal_name : un nom court pour le repas (ex. « Poulet riz brocolis »).
confidence : "high" si les aliments et portions sont clairs, "medium" si les portions sont incertaines, "low" si la photo est ambiguë.
comment : une phrase courte et utile en français (ex. ce qui est incertain, ou un conseil pour atteindre ses protéines). Pas de morale.
Si l'image ne montre pas de nourriture, mets is_food à false, items vide, et explique-le dans comment.`;

function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const accessKey = process.env.APP_ACCESS_KEY;
  if (!accessKey || req.headers["x-access-key"] !== accessKey) {
    return res.status(401).json({ error: "Lien d'accès invalide. Redemande le lien complet à la personne qui te l'a partagé." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "inconnue";
  if (overLimit(ip)) {
    return res.status(429).json({ error: `Limite de ${DAILY_LIMIT} analyses par jour atteinte. Réessaie demain.` });
  }

  const body = readJson(req);
  if (!body) return res.status(400).json({ error: "Requête illisible." });

  const { image, mediaType = "image/jpeg", note = "" } = body;
  const text = String(note).slice(0, 1000).trim();
  if (!image && !text) return res.status(400).json({ error: "Envoie une photo ou une description du repas." });
  if (image && (typeof image !== "string" || image.length > MAX_IMAGE_CHARS)) {
    return res.status(413).json({ error: "Photo trop lourde." });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) {
    return res.status(400).json({ error: "Format d'image non pris en charge." });
  }

  const content = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: image } });
  content.push({
    type: "text",
    text: text ? `Précisions de l'utilisateur : ${text}` : "Analyse ce repas.",
  });

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "L'analyse a été refusée pour cette image. Essaie avec une autre photo ou une description." });
    }
    if (response.stop_reason === "max_tokens") {
      return res.status(502).json({ error: "Réponse incomplète, réessaie." });
    }

    const block = response.content.find((b) => b.type === "text");
    const result = JSON.parse(block?.text ?? "");
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof APIError) {
      console.error("Anthropic API error", err.status, err.message);
      const status = err.status === 429 || err.status === 529 ? 503 : 502;
      return res.status(status).json({ error: "Le service d'analyse est indisponible pour le moment, réessaie dans une minute." });
    }
    console.error("Analyse impossible", err);
    return res.status(502).json({ error: "Analyse impossible, réessaie." });
  }
}
