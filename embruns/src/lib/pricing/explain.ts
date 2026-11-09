/**
 * Explication d'une recommandation de prix (spec pricing, § 5).
 *
 * L'IA reçoit uniquement ces faits, déjà calculés et déjà mis en forme. Tout
 * texte (IA ou modèle de phrase) est vérifié : chaque nombre qu'il contient
 * doit figurer dans les faits, sinon il est rejeté.
 */
import type { ProductAnalysis } from "./engine";

export type ExplanationFacts = {
  produit: string;
  prix_actuel: string;
  prix_recommande: string;
  sens: "hausse" | "baisse";
  variation: string;
  gain_marge_par_semaine: string;
  sensibilite_au_prix: "faible" | "forte";
  fiabilite: "haute" | "moyenne" | "faible";
  position_concurrents: "aligné" | "plus cher" | "moins cher" | "inconnue";
  seuil_de_marge: string;
  marge_actuelle_sous_le_seuil: boolean;
  hausse_limitee_car_plus_cher_que_les_concurrents: boolean;
};

const euros = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const CONFIDENCE_FR = { high: "haute", medium: "moyenne", low: "faible" } as const;

export function buildExplanationFacts(a: ProductAnalysis): ExplanationFacts | null {
  if (!a.suggestion) return null;
  const s = a.suggestion;
  const change = s.recommendedPrice / a.product.price - 1;
  const index = a.priceIndex;
  return {
    produit: a.product.name,
    prix_actuel: euros(a.product.price),
    prix_recommande: euros(s.recommendedPrice),
    sens: change >= 0 ? "hausse" : "baisse",
    variation: `${Math.round(Math.abs(change) * 100)} %`,
    gain_marge_par_semaine: `${Math.max(0, Math.round(s.weeklyImpact))} €`,
    sensibilite_au_prix: s.elasticity < -1 ? "forte" : "faible",
    fiabilite: CONFIDENCE_FR[s.confidence],
    position_concurrents: index === null ? "inconnue" : index > 105 ? "plus cher" : index < 95 ? "moins cher" : "aligné",
    seuil_de_marge: `${Math.round(a.product.minMarginPct)} %`,
    marge_actuelle_sous_le_seuil: a.belowThreshold,
    hausse_limitee_car_plus_cher_que_les_concurrents: s.constraints.includes("high_index_cap"),
  };
}

/** Phrase de repli, calculée sans IA (pas de clé API, refus ou texte invalide). */
export function templateExplanation(f: ExplanationFacts): string {
  const reaction =
    f.sensibilite_au_prix === "faible"
      ? `Vos clients réagissent peu au prix de ce produit (${f.produit.toLowerCase()}).`
      : `Vos clients sont sensibles au prix de ce produit (${f.produit.toLowerCase()}).`;
  const move = `Passer de ${f.prix_actuel} à ${f.prix_recommande}`;
  const gain =
    f.gain_marge_par_semaine === "0 €"
      ? "protégerait votre marge sans perte notable de ventes"
      : `rapporterait environ ${f.gain_marge_par_semaine} de marge en plus par semaine`;
  let tail = "";
  if (f.marge_actuelle_sous_le_seuil) tail = `, et rapprocherait votre marge de votre seuil de ${f.seuil_de_marge}`;
  else if (f.hausse_limitee_car_plus_cher_que_les_concurrents) tail = ", une hausse volontairement limitée car vous êtes déjà plus cher que vos concurrents";
  else if (f.position_concurrents === "aligné") tail = ", et vous resteriez au niveau de vos concurrents";
  else if (f.position_concurrents === "plus cher" && f.sens === "baisse") tail = ", et vous rapprocherait du prix de vos concurrents";
  const caution = f.fiabilite === "faible" ? " Estimation prudente : vos ventes de ce produit varient beaucoup d'une semaine à l'autre." : "";
  return `${reaction} ${move} ${gain}${tail}.${caution}`;
}

/** Nombres présents dans un texte, normalisés (virgule décimale, espaces de milliers). */
export function extractNumbers(text: string): number[] {
  const matches = text.replace(/(\d)[\s  ](?=\d{3}\b)/g, "$1").match(/\d+(?:[.,]\d+)?/g) ?? [];
  return matches.map((m) => Number(m.replace(",", ".")));
}

/** Vrai si le texte ne contient que des nombres issus des faits, et respecte la forme attendue. */
export function isValidExplanation(text: string, facts: ExplanationFacts): boolean {
  const t = text.trim();
  if (t.length < 20 || t.length > 420) return false;
  if (/élasticit|indice|R²|régression/i.test(t)) return false;
  const allowed = new Set(
    extractNumbers(
      [facts.prix_actuel, facts.prix_recommande, facts.variation, facts.gain_marge_par_semaine, facts.seuil_de_marge, facts.produit].join(" "),
    ).map((n) => n.toFixed(2)),
  );
  return extractNumbers(t).every((n) => allowed.has(n.toFixed(2)));
}
