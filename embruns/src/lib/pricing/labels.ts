import type { Confidence } from "./elasticity";
import type { Constraint } from "./recommend";

export const CONFIDENCE_LABEL: Record<Confidence, string> = { high: "Haute", medium: "Moyenne", low: "Faible" };

export const CONSTRAINT_LABEL: Record<Constraint, string> = {
  max_change: "Variation limitée à ±10 % du prix actuel",
  high_index_cap: "Hausse plafonnée à +2 % : vous êtes déjà plus cher que vos concurrents",
  margin_floor: "Prix relevé pour respecter votre marge minimale",
  margin_floor_unreachable: "Marge minimale hors de portée en une fois : hausse limitée à +10 %",
};

export const formatIndex = (v: number | null) => (v === null ? "—" : Math.round(v).toString());

/** Seuil d'alerte visuel de l'indice (spec : orange au-dessus de 110). */
export const HIGH_INDEX_WARNING = 110;
