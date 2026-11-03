import Anthropic, { APIError } from "@anthropic-ai/sdk";

// Code commun aux fonctions /api/* (le préfixe « _ » empêche Vercel d'en faire une route).

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 40);

export const client = new Anthropic();

// Limite indicative par adresse IP et par route. En mémoire : elle repart à zéro
// quand Vercel recycle la fonction, ce n'est qu'un garde-fou contre les abus.
const usage = new Map();
function overLimit(route, ip, limit) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}:${route}:${ip}`;
  const count = (usage.get(key) || 0) + 1;
  usage.set(key, count);
  if (usage.size > 5000) usage.clear();
  return count > limit;
}

function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return null;
  }
}

// Vérifie méthode, lien d'accès et limite du jour. Renvoie le corps JSON, ou null
// si une réponse d'erreur a déjà été envoyée.
export function guard(req, res, route, limitFactor = 1) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Méthode non autorisée." });
    return null;
  }
  const accessKey = process.env.APP_ACCESS_KEY;
  if (!accessKey || req.headers["x-access-key"] !== accessKey) {
    res.status(401).json({ error: "Lien d'accès invalide. Redemande le lien complet à la personne qui te l'a partagé." });
    return null;
  }
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "inconnue";
  const limit = DAILY_LIMIT * limitFactor;
  if (overLimit(route, ip, limit)) {
    res.status(429).json({ error: `Limite de ${limit} demandes par jour atteinte. Réessaie demain.` });
    return null;
  }
  const body = readJson(req);
  if (!body) res.status(400).json({ error: "Requête illisible." });
  return body;
}

// Appel à Claude avec une sortie JSON imposée par le schéma. Renvoie l'objet, ou
// envoie l'erreur au client et renvoie null.
export async function askJson(res, { system, content, schema, maxTokens = 8000 }) {
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") {
      res.status(422).json({ error: "La demande a été refusée. Essaie avec une autre photo ou une description." });
      return null;
    }
    if (response.stop_reason === "max_tokens") {
      res.status(502).json({ error: "Réponse incomplète, réessaie." });
      return null;
    }
    const block = response.content.find((b) => b.type === "text");
    return JSON.parse(block?.text ?? "");
  } catch (err) {
    if (err instanceof APIError) {
      console.error("Anthropic API error", err.status, err.message);
      const status = err.status === 429 || err.status === 529 ? 503 : 502;
      res.status(status).json({ error: "Le service d'analyse est indisponible pour le moment, réessaie dans une minute." });
      return null;
    }
    console.error("Réponse inexploitable", err);
    res.status(502).json({ error: "Analyse impossible, réessaie." });
    return null;
  }
}
