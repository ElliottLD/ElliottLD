/**
 * Data Sufficiency : choix standards et moteur de vérification par force brute.
 */

export const DS_CHOICES: string[] = [
  "Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.",
  "Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.",
  "BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.",
  "EACH statement ALONE is sufficient.",
  "Statements (1) and (2) TOGETHER are NOT sufficient.",
];

export const DS_LETTERS = ["A", "B", "C", "D", "E"] as const;
export type DsLetter = (typeof DS_LETTERS)[number];

/**
 * Un énoncé est suffisant si, parmi tous les cas qui le respectent, la question n'a qu'une seule réponse.
 * `ask` renvoie la réponse à la question (nombre pour une question de valeur, booléen pour oui/non).
 */
function sufficient<C>(cases: C[], cond: (c: C) => boolean, ask: (c: C) => number | boolean | string): boolean {
  const answers = new Set<string>();
  for (const c of cases) {
    if (!cond(c)) continue;
    const a = ask(c);
    answers.add(typeof a === "number" ? a.toFixed(9) : String(a));
    if (answers.size > 1) return false;
  }
  if (answers.size === 0) throw new Error("DS : aucun cas ne satisfait l'énoncé — l'espace de recherche est mal choisi.");
  return true;
}

export function dsAnswer<C>(opts: {
  cases: C[];
  s1: (c: C) => boolean;
  s2: (c: C) => boolean;
  ask: (c: C) => number | boolean | string;
}): DsLetter {
  const { cases, s1, s2, ask } = opts;
  const one = sufficient(cases, s1, ask);
  const two = sufficient(cases, s2, ask);
  if (one && two) return "D";
  if (one) return "A";
  if (two) return "B";
  if (sufficient(cases, (c) => s1(c) && s2(c), ask)) return "C";
  return "E";
}

/** Produit cartésien d'entiers (bornes incluses), pratique pour générer les cas. */
export function grid2(aMin: number, aMax: number, bMin: number, bMax: number, step = 1): [number, number][] {
  const out: [number, number][] = [];
  for (let a = aMin; a <= aMax; a += step) for (let b = bMin; b <= bMax; b += step) out.push([a, b]);
  return out;
}
