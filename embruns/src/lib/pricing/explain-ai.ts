import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { WRITING_MODEL, getClaude, responseText } from "@/lib/ai/claude";
import { isValidExplanation, templateExplanation, type ExplanationFacts } from "./explain";

const SYSTEM = `Tu rédiges, pour un commerçant indépendant, l'explication d'une suggestion de prix calculée par son logiciel.

Règles :
- 1 ou 2 phrases, en français simple, en vouvoyant le commerçant.
- Pas de jargon : n'écris jamais « élasticité », « indice », « régression » ni « R² ». Dis plutôt « vos clients réagissent peu au prix » ou « vos clients sont sensibles au prix ».
- N'utilise que les chiffres fournis, recopiés exactement dans le format donné (par exemple « 1,29 € »). N'en calcule, n'en arrondis et n'en ajoute aucun.
- Si la fiabilité est « faible », dis que l'estimation est prudente.
- Réponds uniquement par le texte de l'explication.`;

/** Explication IA vérifiée ; phrase calculée par le code en repli. */
export async function explainRecommendation(facts: ExplanationFacts): Promise<{ text: string; source: "ai" | "template" }> {
  const fallback = { text: templateExplanation(facts), source: "template" as const };
  const client = getClaude();
  if (!client) return fallback;
  try {
    const message = await client.messages.create({
      model: WRITING_MODEL,
      max_tokens: 1000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    });
    const text = responseText(message);
    if (text && isValidExplanation(text, facts)) return { text, source: "ai" };
    return fallback;
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`Explication IA indisponible (${error.status})`);
    else console.error("Explication IA indisponible", error);
    return fallback;
  }
}
