export type Level = "fondation" | "intermediaire" | "avance";
export type Format = "PS" | "DS";
export type ErrorType = "Concept" | "Lecture" | "Temps" | "Étourderie" | "Devinée juste";

export const ERROR_TYPES: ErrorType[] = ["Concept", "Lecture", "Temps", "Étourderie", "Devinée juste"];

export const LEVEL_LABEL: Record<Level, string> = {
  fondation: "Fondation",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

/** Valeur machine d'un choix : nombre (comparé avec tolérance) ou chaîne (lettre DS, expression…). */
export type ChoiceValue = number | string;

export interface Question {
  id: string; // ex. "A3-avance-04"
  chapter: string; // ex. "A3"
  notions: string[]; // ex. ["A3.base"]
  level: Level;
  format: Format;
  prompt: string; // Markdown + LaTeX ($…$). Les dollars littéraux s'écrivent \$.
  statements?: [string, string]; // DS
  choices: string[]; // 5 choix (pour DS : générés automatiquement)
  answer: number; // index 0-4
  explanation: string; // français, étape par étape
  shortcut?: string;
  traps: { choice: number; why: string }[];
  targetSeconds: number;
  verifiedBy: "code" | "manual";
  /** Valeur de chaque choix, comparée au résultat de verify(). Obligatoire si verifiedBy = "code". */
  choiceValues?: ChoiceValue[];
  /** "exact" (défaut) : verify() doit égaler un seul choix ; "closest" : le choix le plus proche doit être la bonne réponse. */
  match?: "exact" | "closest";
  /** Recalcule la réponse indépendamment (calcul direct ou force brute). */
  verify?: () => ChoiceValue;
}

export interface WorkedExample {
  level: Level;
  prompt: string;
  steps: string; // Markdown
}

export interface Course {
  chapter: string;
  why: string;
  basics: string;
  rules: string[]; // encadrés
  methods: string;
  traps: string;
  examples: WorkedExample[];
  summary: string; // fiche récap
}

export interface Attempt {
  questionId: string;
  date: string; // ISO
  correct: boolean;
  seconds: number;
  choice: number;
  mode?: "practice" | "timed";
}

export interface ErrorEntry {
  id: string;
  questionId: string;
  date: string;
  errorType: ErrorType;
  note: string; // « Règle que je retiens »
  reread: boolean; // « Relue »
}
