/**
 * Programme complet (section 5 de la spec) : blocs → chapitres → notions.
 * Chaque notion = une puce du programme. Les id de notions sont référencés par les questions (champ `notions`).
 */

export interface Notion {
  id: string;
  label: string;
}

export interface ChapterInfo {
  id: string;
  block: string;
  title: string;
  notions: Notion[];
  ds: boolean; // Data Sufficiency pertinent pour ce chapitre
}

export interface BlockInfo {
  id: string;
  title: string;
}

export const BLOCKS: BlockInfo[] = [
  { id: "A", title: "Fondations du calcul" },
  { id: "B", title: "Propriétés des nombres" },
  { id: "C", title: "Algèbre" },
  { id: "D", title: "Problèmes concrets (word problems)" },
  { id: "E", title: "Statistiques, dénombrement, probabilités" },
  { id: "F", title: "Data Sufficiency (méthode)" },
];

const ch = (id: string, title: string, ds: boolean, notions: [string, string][]): ChapterInfo => ({
  id,
  block: id[0],
  title,
  ds,
  notions: notions.map(([slug, label]) => ({ id: `${id}.${slug}`, label })),
});

export const CHAPTERS: ChapterInfo[] = [
  // Bloc A
  ch("A1", "Opérations, priorités et calcul mental", false, [
    ["priorites", "Priorités opératoires, signes, distributivité, factorisation simple"],
    ["calcul-mental", "Calcul mental : ×5, ×25, ×11 ; carrés de 1 à 25 ; cubes de 1 à 10"],
    ["estimation", "Estimation et arrondis pour éliminer des réponses"],
  ]),
  ch("A2", "Fractions, décimaux et droite des nombres", false, [
    ["position", "Valeur de position, arrondis, problèmes sur les chiffres d'un nombre"],
    ["droite", "Droite des nombres : ordonner, comparer, distance"],
    ["operations", "Opérations sur les fractions, fractions complexes"],
    ["comparer", "Comparer des fractions (produit en croix, référence 1/2)"],
    ["conversions", "Conversions fraction ↔ décimal incontournables"],
    ["carre-0-1", "Fractions entre 0 et 1 : au carré, elles diminuent"],
  ]),
  ch("A3", "Pourcentages", false, [
    ["coefficient", "Pourcentage d'un nombre, variation en %, coefficient multiplicateur"],
    ["successives", "Variations successives (+20 % puis −20 % = −4 %)"],
    ["base", "« X est quel % de Y », « de combien % A dépasse B » (la base)"],
    ["interets", "Intérêts simples et composés"],
    ["marge", "Marge, prix de vente, remise, profit"],
  ]),
  ch("A4", "Ratios et proportions", false, [
    ["ratio", "Écrire et manipuler un ratio, partie sur le tout"],
    ["combiner", "Combiner deux ratios (a:b et b:c → a:b:c)"],
    ["proportionnalite", "Proportionnalité directe et inverse"],
  ]),
  ch("A5", "Puissances et racines", false, [
    ["exposants", "Règles des exposants, négatifs, fractionnaires, puissance 0"],
    ["factoriser", "Factoriser des sommes de puissances"],
    ["racines", "Racines : simplifier, rationaliser, comparer"],
    ["scientifique", "Notation scientifique, puissances de 10"],
  ]),
  // Bloc B
  ch("B1", "Entiers, parité, signes", true, [
    ["parite", "Pair/impair : somme, différence, produit, puissances"],
    ["signes", "Positif/négatif/zéro : produits, quotients, puissances"],
    ["consecutifs", "Entiers consécutifs : somme, produit, propriétés"],
  ]),
  ch("B2", "Divisibilité, nombres premiers, PGCD, PPCM", true, [
    ["criteres", "Critères de divisibilité (2, 3, 4, 5, 6, 8, 9, 10, 11)"],
    ["premiers", "Nombres premiers jusqu'à 100, décomposition en facteurs premiers"],
    ["nb-diviseurs", "Nombre de diviseurs à partir de la décomposition"],
    ["pgcd-ppcm", "PGCD et PPCM, PGCD × PPCM = a × b"],
    ["factorielle", "Puissance d'un premier dans n! (zéros à la fin)"],
  ]),
  ch("B3", "Restes et chiffres des unités", true, [
    ["division", "Division euclidienne : n = qd + r, 0 ≤ r < d"],
    ["restes", "Restes de sommes, de produits, conditions simultanées"],
    ["unites", "Cycles du chiffre des unités"],
  ]),
  ch("B4", "Valeur absolue", true, [
    ["definition", "Distance, équations et inégalités avec |x|"],
    ["sommes", "Sommes de valeurs absolues |x − a| + |x − b|"],
  ]),
  // Bloc C
  ch("C1", "Équations du premier degré et systèmes", true, [
    ["resoudre", "Résoudre, isoler une variable, systèmes 2×2"],
    ["sans-solution-unique", "Systèmes sans solution unique"],
  ]),
  ch("C2", "Identités remarquables et second degré", true, [
    ["identites", "Identités remarquables dans les deux sens"],
    ["second-degre", "Factorisation de x² + bx + c, racines, somme et produit"],
    ["diviser-zero", "Ne jamais diviser par une variable qui peut valoir 0"],
  ]),
  ch("C3", "Inégalités", true, [
    ["regles", "Règles (inversion du sens avec un négatif)"],
    ["composees", "Inégalités composées, avec carrés, avec valeurs absolues"],
    ["x-x2-racine", "Comparer x, x² et √x selon la position de x"],
  ]),
  ch("C4", "Fonctions, expressions et suites", true, [
    ["fonctions", "Fonctions et symboles inventés"],
    ["suites", "Suites récurrentes, arithmétiques et géométriques"],
  ]),
  // Bloc D
  ch("D1", "Mise en équation", true, [
    ["traduire", "Traduire l'anglais en équation (more than, less than, times as many, percent of)"],
  ]),
  ch("D2", "Vitesse, distance, temps", true, [
    ["vitesse-moyenne", "Vitesse moyenne (pas la moyenne des vitesses)"],
    ["poursuite-croisement", "Poursuite et croisement"],
    ["aller-retour", "Aller-retour"],
  ]),
  ch("D3", "Travail et débits", true, [
    ["debits", "Additionner les débits, jamais les durées"],
    ["travail-partiel", "Travail partiel"],
  ]),
  ch("D4", "Mélanges et moyennes pondérées", true, [
    ["concentrations", "Concentrations et mélanges"],
    ["ecarts", "Moyenne pondérée : méthode des écarts à la moyenne"],
  ]),
  ch("D5", "Âges, intérêts, profit", true, [
    ["ages", "Problèmes d'âges"],
    ["interets", "Intérêts (schémas classiques)"],
    ["profit", "Profit (schémas classiques)"],
  ]),
  ch("D6", "Ensembles et diagrammes de Venn", true, [
    ["deux-ensembles", "Deux ensembles, « ni l'un ni l'autre »"],
    ["trois-ensembles", "Trois ensembles"],
    ["tableaux", "Tableaux à double entrée"],
  ]),
  // Bloc E
  ch("E1", "Statistiques", true, [
    ["moyenne-mediane", "Moyenne (passer par la somme), médiane, mode, étendue"],
    ["ajout-retrait", "Effet de l'ajout ou du retrait d'une valeur"],
    ["ecart-type", "Écart-type : sens intuitif et transformations"],
    ["consecutifs", "Moyenne d'entiers consécutifs et de suites arithmétiques"],
  ]),
  ch("E2", "Dénombrement", true, [
    ["multiplicatif", "Principe multiplicatif, factorielles"],
    ["perm-comb", "Permutations vs combinaisons"],
    ["contraintes", "Contraintes : ensemble, jamais côte à côte, identiques, table ronde"],
    ["contraire", "Méthode du contraire"],
  ]),
  ch("E3", "Probabilités", true, [
    ["simple", "Probabilité simple, indépendance, « et » vs « ou »"],
    ["remise", "Tirages avec et sans remise"],
    ["au-moins-un", "« Au moins un » = 1 − P(aucun)"],
    ["denombrement", "Probabilités combinées au dénombrement"],
  ]),
  // Bloc F
  ch("F1", "La méthode Data Sufficiency", true, [
    ["cinq-reponses", "Les 5 réponses standards et l'arbre de décision"],
    ["valeur-oui-non", "Question de valeur vs question oui/non"],
    ["tester-cas", "Tester des cas : positifs, négatifs, 0, fractions, grands nombres"],
    ["pieges", "Pièges : entier supposé, négatifs oubliés, 2 équations ≠ toujours 2 inconnues"],
  ]),
];

export const ALL_NOTIONS: (Notion & { chapter: string })[] = CHAPTERS.flatMap((c) =>
  c.notions.map((n) => ({ ...n, chapter: c.id })),
);

export function getChapterInfo(id: string): ChapterInfo | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function notionLabel(id: string): string {
  return ALL_NOTIONS.find((n) => n.id === id)?.label ?? id;
}
