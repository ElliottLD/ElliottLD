import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Client Claude, côté serveur uniquement (cahier des charges, § 5.6). Sans
 * ANTHROPIC_API_KEY, renvoie null : l'app reste utilisable avec des textes
 * calculés par le code.
 */
export function getClaude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ timeout: 20_000, maxRetries: 1 });
}

/** Modèle pour la rédaction courte, configurable par variable d'environnement. */
export const WRITING_MODEL = process.env.CLAUDE_MODEL_WRITING ?? "claude-opus-5-5";

/** Texte d'une réponse, uniquement si le modèle a terminé normalement. */
export function responseText(message: Anthropic.Message): string | null {
  if (message.stop_reason !== "end_turn") return null;
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return text || null;
}
