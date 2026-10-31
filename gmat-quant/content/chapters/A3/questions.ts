import type { Question } from "@/lib/types";
import { DS_CHOICES, DS_LETTERS, dsAnswer, grid2 } from "@/lib/ds";

const md = String.raw;
const DS_VALUES = [...DS_LETTERS];

export const questions: Question[] = [
  // ───────────── FONDATION ─────────────
  {
    id: "A3-fondation-01",
    chapter: "A3",
    notions: ["A3.coefficient"],
    level: "fondation",
    format: "PS",
    prompt: md`Combien vaut 35 % de 240 ?`,
    choices: ["8,4", "72", "84", "96", "120"],
    choiceValues: [8.4, 72, 84, 96, 120],
    answer: 2,
    explanation: md`**Étape 1 — Traduire.** « 35 % de 240 » signifie $\dfrac{35}{100} \times 240$, soit $0{,}35 \times 240$.

**Étape 2 — Découper le pourcentage** (aucune calculatrice) :
- $10\,\%$ de 240 = 24 (on divise par 10) ;
- $30\,\%$ = $3 \times 24 = 72$ ;
- $5\,\%$ = la moitié de $10\,\%$ = 12 ;
- $35\,\%$ = $30\,\% + 5\,\%$ = $72 + 12 = 84$.

**Réponse : 84.**`,
    shortcut: md`$35\,\% \times 240 = 35 \times 2{,}4 = 84$ : on peut toujours échanger les rôles, « $a\,\%$ de $b$ » = « $b\,\%$ de $a$ ».`,
    traps: [
      { choice: 0, why: "Virgule mal placée : 8,4 correspond à 3,5 % de 240." },
      { choice: 1, why: "On s'est arrêté à 30 % en oubliant les 5 % restants." },
      { choice: 4, why: "120 est 50 % de 240 : estimation trop grossière." },
    ],
    targetSeconds: 45,
    verifiedBy: "code",
    verify: () => (35 / 100) * 240,
  },
  {
    id: "A3-fondation-02",
    chapter: "A3",
    notions: ["A3.coefficient"],
    level: "fondation",
    format: "PS",
    prompt: md`Un article coûte 80 €. Son prix augmente de 15 %. Quel est son nouveau prix ?`,
    choices: ["12 €", "68 €", "92 €", "95 €", "120 €"],
    choiceValues: [12, 68, 92, 95, 120],
    answer: 2,
    explanation: md`**Étape 1 — Coefficient multiplicateur.** Augmenter de $15\,\%$, c'est garder $100\,\%$ du prix et ajouter $15\,\%$ : on multiplie par $1 + \dfrac{15}{100} = 1{,}15$.

**Étape 2 — Calcul.** $80 \times 1{,}15 = 80 + 80 \times 0{,}15 = 80 + 12 = 92$.

(Pour $80 \times 0{,}15$ : $10\,\%$ de 80 = 8, $5\,\%$ = 4, donc $15\,\%$ = 12.)

**Réponse : 92 €.**`,
    shortcut: md`Hausse de $t\,\%$ → multiplier par $(1 + t/100)$. Ici $\times 1{,}15$.`,
    traps: [
      { choice: 0, why: "12 € est seulement le montant de la hausse, pas le nouveau prix." },
      { choice: 1, why: "68 € correspond à une baisse de 15 % (× 0,85), pas à une hausse." },
      { choice: 3, why: "On a ajouté 15 € au lieu de 15 % du prix." },
      { choice: 4, why: "Confusion entre 15 % (× 1,15) et × 1,5 (hausse de 50 %)." },
    ],
    targetSeconds: 45,
    verifiedBy: "code",
    verify: () => 80 * (1 + 15 / 100),
  },
  {
    id: "A3-fondation-03",
    chapter: "A3",
    notions: ["A3.base"],
    level: "fondation",
    format: "PS",
    prompt: md`18 représente quel pourcentage de 72 ?`,
    choices: ["18 %", "25 %", "40 %", "54 %", "400 %"],
    choiceValues: [18, 25, 40, 54, 400],
    answer: 1,
    explanation: md`**Étape 1 — Identifier la base.** « 18 est quel % **de 72** » : la base (le tout, le 100 %) est ce qui suit « de », donc 72.

**Étape 2 — Fraction puis pourcentage.** $\dfrac{18}{72}$. On simplifie par 18 : $\dfrac{18}{72} = \dfrac{1}{4}$.

**Étape 3 — Convertir.** $\dfrac{1}{4} = 0{,}25 = 25\,\%$.

**Réponse : 25 %.**`,
    shortcut: md`Formule universelle : $\dfrac{\text{partie}}{\text{base}} \times 100$. La base est toujours après « de » (*of*).`,
    traps: [
      { choice: 3, why: "54 = 72 − 18 : on a soustrait au lieu de diviser." },
      { choice: 4, why: "Base inversée : 72 ÷ 18 = 4 = 400 %, c'est « 72 est quel % de 18 »." },
    ],
    targetSeconds: 45,
    verifiedBy: "code",
    verify: () => (18 / 72) * 100,
  },
  {
    id: "A3-fondation-04",
    chapter: "A3",
    notions: ["A3.successives", "A3.coefficient"],
    level: "fondation",
    format: "PS",
    prompt: md`Le prix d'un article augmente de 10 %, puis le nouveau prix baisse de 10 %. Quelle est la variation totale par rapport au prix de départ ?`,
    choices: ["−10 %", "−2 %", "−1 %", "0 %", "+1 %"],
    choiceValues: [-10, -2, -1, 0, 1],
    answer: 2,
    explanation: md`**Étape 1 — Coefficients.** Hausse de $10\,\%$ → $\times 1{,}1$. Baisse de $10\,\%$ → $\times 0{,}9$.

**Étape 2 — Les coefficients se multiplient** (ils ne s'additionnent pas) : $1{,}1 \times 0{,}9 = 0{,}99$.

**Étape 3 — Lire le résultat.** Le prix final vaut $99\,\%$ du prix de départ : il a baissé de $1\,\%$.

Vérification avec 100 € : $100 \to 110 \to 110 - 11 = 99$.

**Réponse : −1 %.**`,
    shortcut: md`Partir de 100 : c'est la méthode la plus sûre pour toutes les variations successives.`,
    traps: [
      { choice: 3, why: "Piège n° 1 du chapitre : +10 % puis −10 % ne s'annulent pas, car la baisse s'applique à un prix plus grand (110, pas 100)." },
      { choice: 4, why: "Bon ordre de grandeur mais mauvais signe : le prix final (99) est inférieur au prix initial (100)." },
    ],
    targetSeconds: 45,
    verifiedBy: "code",
    verify: () => (1.1 * 0.9 - 1) * 100,
  },
  {
    id: "A3-fondation-05",
    chapter: "A3",
    notions: ["A3.marge"],
    level: "fondation",
    format: "PS",
    prompt: md`Un artisan fabrique une lampe pour 50 € et la vend 65 €. Quel est son profit, en pourcentage du coût de fabrication ?`,
    choices: ["15 %", "≈ 23 %", "30 %", "35 %", "130 %"],
    choiceValues: [15, (15 / 65) * 100, 30, 35, 130],
    answer: 2,
    explanation: md`**Étape 1 — Profit en euros.** Profit = prix de vente − coût = $65 - 50 = 15$ €.

**Étape 2 — Identifier la base.** « En pourcentage **du coût** » : la base est le coût, 50 €.

**Étape 3 — Calcul.** $\dfrac{15}{50} = \dfrac{30}{100} = 30\,\%$.

**Réponse : 30 %.**`,
    shortcut: md`Profit en % = $\dfrac{\text{vente} - \text{coût}}{\text{coût}} \times 100$, sauf si l'énoncé demande explicitement « en % du prix de vente ».`,
    traps: [
      { choice: 0, why: "15 est le profit en euros, pas un pourcentage." },
      { choice: 1, why: "Mauvaise base : 15 ÷ 65 ≈ 23 % est le profit en % du prix de vente." },
      { choice: 4, why: "130 % = 65 ÷ 50 : c'est le prix de vente en % du coût, pas le profit." },
    ],
    targetSeconds: 50,
    verifiedBy: "code",
    verify: () => ((65 - 50) / 50) * 100,
  },

  // ───────────── INTERMÉDIAIRE ─────────────
  {
    id: "A3-intermediaire-01",
    chapter: "A3",
    notions: ["A3.interets", "A3.coefficient"],
    level: "intermediaire",
    format: "PS",
    prompt: md`Maria deposits \$5,000 in an account that pays 10% interest, compounded annually. If she makes no other deposits or withdrawals, what will the balance of the account be at the end of 2 years?`,
    choices: [md`\$5,500`, md`\$6,000`, md`\$6,050`, md`\$6,100`, md`\$6,655`],
    choiceValues: [5500, 6000, 6050, 6100, 6655],
    answer: 2,
    explanation: md`**Vocabulaire.** *Compounded annually* = intérêts **composés** chaque année : les intérêts de l'année 1 rapportent eux-mêmes des intérêts l'année 2.

**Étape 1 — Année 1.** $5\,000 \times 1{,}1 = 5\,500$.

**Étape 2 — Année 2.** Les 10 % s'appliquent à 5 500 (et non à 5 000) : $5\,500 \times 1{,}1 = 5\,500 + 550 = 6\,050$.

**Formule générale.** $C_n = C_0 \times (1 + r)^n = 5\,000 \times 1{,}1^2 = 5\,000 \times 1{,}21 = 6\,050$.

**Réponse : \$6,050.**`,
    shortcut: md`À retenir : $1{,}1^2 = 1{,}21$ et $1{,}1^3 = 1{,}331$. Composé sur 2 ans à 10 % = +21 %.`,
    traps: [
      { choice: 0, why: "Solde après 1 an seulement." },
      { choice: 1, why: "Intérêts simples (2 × 500 = 1 000) : on a oublié que les intérêts de l'année 1 rapportent aussi." },
      { choice: 4, why: "Solde après 3 ans (5 000 × 1,331)." },
    ],
    targetSeconds: 90,
    verifiedBy: "code",
    verify: () => 5000 * 1.1 ** 2,
  },
  {
    id: "A3-intermediaire-02",
    chapter: "A3",
    notions: ["A3.base"],
    level: "intermediaire",
    format: "PS",
    prompt: md`Quantity $A$ is 25% greater than quantity $B$. Quantity $B$ is what percent less than quantity $A$?`,
    choices: ["15%", "20%", "25%", "30%", "80%"],
    choiceValues: [15, 20, 25, 30, 80],
    answer: 1,
    explanation: md`**Étape 1 — Choisir des valeurs simples.** Posons $B = 100$. « $A$ est 25 % plus grand que $B$ » (base = $B$) : $A = 125$.

**Étape 2 — Changer de base.** « $B$ est de combien % **plus petit que $A$** » : la base est maintenant $A = 125$.

**Étape 3 — Calcul.** Écart = $125 - 100 = 25$. En % de $A$ : $\dfrac{25}{125} = \dfrac{1}{5} = 20\,\%$.

**Réponse : 20 %.**`,
    shortcut: md`Une hausse de $\frac{1}{n}$ s'annule par une baisse de $\frac{1}{n+1}$ : $+25\,\% = +\frac14$ ↔ $-\frac15 = -20\,\%$. De même $+50\,\% ↔ -33\frac13\,\%$, $+100\,\% ↔ -50\,\%$.`,
    traps: [
      { choice: 2, why: "Piège de la base : l'écart (25) est le même, mais on le divise maintenant par A = 125, pas par B = 100." },
      { choice: 4, why: "80 % est B en pourcentage de A (100/125), pas l'écart en pourcentage." },
    ],
    targetSeconds: 90,
    verifiedBy: "code",
    verify: () => {
      const B = 100;
      const A = B * 1.25;
      return ((A - B) / A) * 100;
    },
  },
  {
    id: "A3-intermediaire-03",
    chapter: "A3",
    notions: ["A3.successives"],
    level: "intermediaire",
    format: "PS",
    prompt: md`The price of a share rose by 20% on Monday and then fell by 25% on Tuesday. Over the two days, the price of the share`,
    choices: ["decreased by 5%", "decreased by 10%", "decreased by 15%", "increased by 5%", "did not change"],
    choiceValues: [-5, -10, -15, 5, 0],
    answer: 1,
    explanation: md`**Étape 1 — Partir de 100.** Prix initial = 100.

**Étape 2 — Lundi (+20 %).** $100 \times 1{,}2 = 120$.

**Étape 3 — Mardi (−25 % de 120).** $25\,\%$ de 120 = 30, donc $120 - 30 = 90$.

**Étape 4 — Bilan.** De 100 à 90 : baisse de $10\,\%$.

Avec les coefficients : $1{,}2 \times 0{,}75 = 0{,}9$.

**Réponse : decreased by 10%.**`,
    shortcut: md`Formule des deux variations : $a + b + \dfrac{ab}{100}$, ici $20 - 25 + \dfrac{20 \times (-25)}{100} = -5 - 5 = -10$.`,
    traps: [
      { choice: 0, why: "On a additionné les pourcentages (+20 − 25 = −5) : les variations successives se multiplient." },
      { choice: 3, why: "Mauvais signe : le prix final (90) est inférieur au prix initial (100)." },
    ],
    targetSeconds: 75,
    verifiedBy: "code",
    verify: () => (1.2 * 0.75 - 1) * 100,
  },
  {
    id: "A3-intermediaire-04",
    chapter: "A3",
    notions: ["A3.marge", "A3.coefficient"],
    level: "intermediaire",
    format: "PS",
    prompt: md`A retailer sets the price of a jacket at 40% above its cost, and then sells the jacket at a 25% discount off that price. If the jacket sold for \$84, what was the retailer's cost for the jacket?`,
    choices: [md`\$60.00`, md`\$73.04`, md`\$80.00`, md`\$84.00`, md`\$88.20`],
    choiceValues: [60, 73.04, 80, 84, 88.2],
    answer: 2,
    explanation: md`**Vocabulaire.** *Cost* = coût d'achat ; *40% above its cost* = prix affiché = coût × 1,4 ; *25% discount off that price* = remise de 25 % sur le prix affiché.

**Étape 1 — Mettre en équation.** Soit $c$ le coût. Prix affiché : $1{,}4c$. Prix de vente : $0{,}75 \times 1{,}4c$.

**Étape 2 — Coefficient global.** $0{,}75 \times 1{,}4 = \dfrac34 \times \dfrac{7}{5} = \dfrac{21}{20} = 1{,}05$. Donc prix de vente $= 1{,}05c$.

**Étape 3 — Résoudre.** $1{,}05c = 84 \Rightarrow c = \dfrac{84}{1{,}05} = \dfrac{8\,400}{105} = 80$.

Vérification : $80 \times 1{,}4 = 112$ ; $112 \times 0{,}75 = 84$ ✓.

**Réponse : \$80.00.**`,
    shortcut: md`Tester les réponses : partir du coût proposé (80) et appliquer ×1,4 puis ×0,75. Une seule donne 84.`,
    traps: [
      { choice: 0, why: "On a seulement annulé la hausse de 40 % (84 ÷ 1,4) en oubliant la remise." },
      { choice: 1, why: "On a « additionné » les variations : +40 % − 25 % = +15 %, puis 84 ÷ 1,15. Les coefficients se multiplient." },
      { choice: 4, why: "On a appliqué le coefficient 1,05 dans le mauvais sens (84 × 1,05 au lieu de 84 ÷ 1,05)." },
    ],
    targetSeconds: 120,
    verifiedBy: "code",
    verify: () => 84 / (1.4 * 0.75),
  },
  {
    id: "A3-intermediaire-05",
    chapter: "A3",
    notions: ["A3.base"],
    level: "intermediaire",
    format: "DS",
    prompt: md`Did the price of item $P$ increase by more than 10% from 2024 to 2025?`,
    statements: [md`The price of $P$ increased by \$12 from 2024 to 2025.`, md`The price of $P$ in 2025 was \$132.`],
    choices: DS_CHOICES,
    choiceValues: DS_VALUES,
    answer: 2,
    explanation: md`**Reformuler la question.** Soit $p$ le prix 2024 et $q$ le prix 2025. La question est : $\dfrac{q - p}{p} > 10\,\%$ ? C'est une question **oui/non**. Il faut donc connaître la hausse **et** la base $p$.

**Énoncé (1) seul.** Hausse = 12 \$, mais base inconnue. Si $p = 100$ : $12\,\%$ → **oui**. Si $p = 200$ : $6\,\%$ → **non**. Insuffisant.

**Énoncé (2) seul.** $q = 132$, mais $p$ inconnu : si $p = 100$, hausse de 32 % → oui ; si $p = 130$, hausse ≈ 1,5 % → non. Insuffisant.

**Ensemble.** $p = 132 - 12 = 120$. Hausse en % : $\dfrac{12}{120} = 10\,\%$ exactement. Est-ce **plus de** 10 % ? **Non**, de façon certaine. Une réponse « non » certaine est une réponse : c'est suffisant.

**Réponse : C.**`,
    shortcut: md`En DS oui/non, « toujours non » = suffisant. Ne pas répondre E parce que la réponse est « non ».`,
    traps: [
      { choice: 0, why: md`Une hausse de 12 \$ ne dit rien en pourcentage sans connaître la base.` },
      { choice: 4, why: "Ensemble, on obtient exactement 10 %, donc « non, pas plus de 10 % » : une réponse certaine, donc suffisante." },
    ],
    targetSeconds: 120,
    verifiedBy: "code",
    verify: () =>
      dsAnswer({
        cases: grid2(1, 300, 1, 400), // [p, q] : prix 2024 et prix 2025 (en $)
        s1: ([p, q]) => q - p === 12,
        s2: ([, q]) => q === 132,
        ask: ([p, q]) => (q - p) * 10 > p, // hausse > 10 % de p ⇔ 10(q − p) > p
      }),
  },

  // ───────────── AVANCÉ ─────────────
  {
    id: "A3-avance-01",
    chapter: "A3",
    notions: ["A3.successives", "A3.base"],
    level: "avance",
    format: "PS",
    prompt: md`The population of a town increased by 20% during 2023 and by a further 25% during 2024. By what percent would the population have to decrease during 2025 to return to its level at the start of 2023?`,
    choices: [md`$33\frac{1}{3}\%$`, "40%", "45%", "50%", md`$66\frac{2}{3}\%$`],
    choiceValues: [100 / 3, 40, 45, 50, 200 / 3],
    answer: 0,
    explanation: md`**Étape 1 — Partir de 100.** Début 2023 : 100. Fin 2023 : $100 \times 1{,}2 = 120$. Fin 2024 : $120 \times 1{,}25 = 150$.

**Étape 2 — Ce qu'il faut perdre.** Pour revenir à 100, il faut perdre $150 - 100 = 50$ personnes.

**Étape 3 — La base, c'est 150** (la baisse s'applique à la population fin 2024). $\dfrac{50}{150} = \dfrac13 = 33\frac13\,\%$.

**Réponse : $33\frac13\,\%$.**`,
    shortcut: md`Hausse totale de $+50\,\% = +\frac12$ → elle s'annule par une baisse de $\frac{1}{3}$ (règle $+\frac1n ↔ -\frac{1}{n+1}$).`,
    traps: [
      { choice: 1, why: "On a « défait » chaque hausse avec le même pourcentage (−20 % puis −25 %) : 150 × 0,8 × 0,75 = 90, pas 100." },
      { choice: 2, why: "Addition des pourcentages (20 + 25) : interdit pour des variations successives." },
      { choice: 3, why: "La hausse totale est bien de 50 %, mais la baisse se calcule sur 150, pas sur 100." },
      { choice: 4, why: "66⅔ % est ce qui reste (100/150), pas la baisse." },
    ],
    targetSeconds: 120,
    verifiedBy: "code",
    verify: () => {
      const f = 1.2 * 1.25;
      return (1 - 1 / f) * 100;
    },
  },
  {
    id: "A3-avance-02",
    chapter: "A3",
    notions: ["A3.base", "A3.coefficient"],
    level: "avance",
    format: "PS",
    prompt: md`Last year, Company X's revenue was 60% of Company Y's revenue. This year, X's revenue increased by 50% and Y's revenue decreased by 10%. This year, X's revenue is what percent of Y's revenue?`,
    choices: ["about 82%", "90%", "100%", "110%", "120%"],
    choiceValues: [900 / 11, 90, 100, 110, 120],
    answer: 2,
    explanation: md`**Étape 1 — Choisir une valeur pour la base.** Posons le chiffre d'affaires de Y l'an dernier = 100. Alors X = 60 % de 100 = 60.

**Étape 2 — Cette année.**
- X : $60 \times 1{,}5 = 90$ ;
- Y : $100 \times 0{,}9 = 90$.

**Étape 3 — Comparer.** $\dfrac{X}{Y} = \dfrac{90}{90} = 100\,\%$.

**Réponse : 100 %.**`,
    shortcut: md`Avec des coefficients : $0{,}6 \times \dfrac{1{,}5}{0{,}9} = 0{,}6 \times \dfrac{5}{3} = 1$.`,
    traps: [
      { choice: 0, why: "On a appliqué +10 % à Y au lieu de −10 % (90 ÷ 110 ≈ 82 %)." },
      { choice: 1, why: "On a oublié la baisse de Y : 90 ÷ 100." },
      { choice: 3, why: "On a additionné des points de pourcentage (60 + 50) au lieu de multiplier." },
      { choice: 4, why: "Addition de tous les pourcentages (60 + 50 + 10) : aucun sens mathématique." },
    ],
    targetSeconds: 120,
    verifiedBy: "code",
    verify: () => {
      const Y0 = 100;
      const X0 = 0.6 * Y0;
      return ((X0 * 1.5) / (Y0 * 0.9)) * 100;
    },
  },
  {
    id: "A3-avance-03",
    chapter: "A3",
    notions: ["A3.interets", "A3.coefficient"],
    level: "avance",
    format: "PS",
    prompt: md`An investment of \$10,000 earns interest at an annual rate of 8%, compounded quarterly. Which of the following is closest to the value of the investment after 1 year?`,
    choices: [md`\$10,800`, md`\$10,816`, md`\$10,824`, md`\$13,200`, md`\$13,605`],
    choiceValues: [10800, 10816, 10824, 13200, 13605],
    match: "closest",
    answer: 2,
    explanation: md`**Vocabulaire.** *Annual rate of 8%, compounded quarterly* = taux annuel de 8 %, intérêts composés chaque **trimestre** (*quarter* = 3 mois). On applique donc $\dfrac{8\,\%}{4} = 2\,\%$, **4 fois**.

**Étape 1 — Coefficient sur un an.** $1{,}02^4$.
- $1{,}02^2 = 1{,}0404$ ;
- $1{,}02^4 = 1{,}0404^2 = 1{,}0404 + 0{,}0404 \times 1{,}0404 \approx 1{,}0404 + 0{,}0420 = 1{,}0824$.

**Étape 2 — Valeur.** $10\,000 \times 1{,}0824 \approx 10\,824$.

**Raisonnement par élimination** (plus rapide) : plus on compose souvent, plus on gagne. Annuel → 10 800 ; semestriel ($1{,}04^2$) → 10 816 ; trimestriel → un peu plus que 10 816. Seul 10 824 convient.

**Réponse : \$10,824.**`,
    shortcut: md`Ordre : simple/annuel < semestriel < trimestriel < mensuel, et l'écart reste petit. Les réponses à 13 000 + sont absurdes pour 8 % par an.`,
    traps: [
      { choice: 0, why: "C'est le résultat avec des intérêts annuels (une seule fois 8 %) : on a ignoré « compounded quarterly »." },
      { choice: 1, why: "C'est la composition semestrielle (2 fois 4 %), pas trimestrielle (4 fois 2 %)." },
      { choice: 3, why: "On a appliqué 8 % à chaque trimestre en intérêts simples (4 × 8 % = 32 %)." },
      { choice: 4, why: "On a appliqué 8 % à chaque trimestre (1,08⁴) : 8 % est le taux annuel, il faut le diviser par 4." },
    ],
    targetSeconds: 150,
    verifiedBy: "code",
    verify: () => 10000 * (1 + 0.08 / 4) ** 4,
  },
  {
    id: "A3-avance-04",
    chapter: "A3",
    notions: ["A3.marge", "A3.coefficient"],
    level: "avance",
    format: "PS",
    prompt: md`A merchant bought 200 identical lamps for \$15 each. She sold 75% of the lamps at a price 40% above her cost and sold the rest at a price 20% below her cost. Her total profit was what percent of her total cost?`,
    choices: ["10%", "20%", "25%", "30%", "40%"],
    choiceValues: [10, 20, 25, 30, 40],
    answer: 2,
    explanation: md`**Étape 1 — Coût total.** $200 \times 15 = 3\,000$ \$.

**Étape 2 — Recettes.**
- 75 % de 200 = 150 lampes à $15 \times 1{,}4 = 21$ \$ : $150 \times 21 = 3\,150$ \$ ;
- les 50 autres à $15 \times 0{,}8 = 12$ \$ : $50 \times 12 = 600$ \$ ;
- total : $3\,750$ \$.

**Étape 3 — Profit et pourcentage.** Profit = $3\,750 - 3\,000 = 750$ \$. En % du coût : $\dfrac{750}{3\,000} = 25\,\%$.

**Réponse : 25 %.**`,
    shortcut: md`Moyenne pondérée des marges (les lampes coûtent toutes pareil) : $0{,}75 \times 40\,\% + 0{,}25 \times (-20\,\%) = 30\,\% - 5\,\% = 25\,\%$.`,
    traps: [
      { choice: 0, why: "Moyenne simple de +40 % et −20 % : il faut pondérer par les quantités (75 % / 25 %)." },
      { choice: 1, why: "750 ÷ 3 750 = 20 % : c'est le profit en % des recettes, pas du coût." },
      { choice: 3, why: "On a oublié la perte sur les 25 % vendus à perte (0,75 × 40 % seulement)." },
    ],
    targetSeconds: 150,
    verifiedBy: "code",
    verify: () => {
      const cost = 200 * 15;
      const revenue = 150 * 15 * 1.4 + 50 * 15 * 0.8;
      return ((revenue - cost) / cost) * 100;
    },
  },
  {
    id: "A3-avance-05",
    chapter: "A3",
    notions: ["A3.base"],
    level: "avance",
    format: "DS",
    prompt: md`Last month, a store sold only shirts and hats. Were more than 40% of the items the store sold last month shirts?`,
    statements: [
      md`Last month, the store sold 30 more hats than shirts.`,
      md`Last month, the number of hats the store sold was less than 150% of the number of shirts it sold.`,
    ],
    choices: DS_CHOICES,
    choiceValues: DS_VALUES,
    answer: 1,
    explanation: md`**Reformuler la question.** Soit $s$ le nombre de chemises (*shirts*) et $h$ le nombre de chapeaux (*hats*). Question : $\dfrac{s}{s + h} > 0{,}4$ ?

On transforme (tout est positif, on peut multiplier sans changer le sens) : $s > 0{,}4s + 0{,}4h \iff 0{,}6s > 0{,}4h \iff h < 1{,}5s$.

La question devient : **« $h < 1{,}5s$ ? »**

**Énoncé (1) seul.** $h = s + 30$. Si $s = 100$, $h = 130 < 150$ → **oui**. Si $s = 10$, $h = 40 > 15$ → **non**. Insuffisant.

**Énoncé (2) seul.** $h < 1{,}5s$ : c'est exactement la question reformulée → **toujours oui**. Suffisant.

**Réponse : B.**`,
    shortcut: md`Reformuler la question avant de lire les énoncés. Ici, « plus de 40 % de chemises » ⇔ « moins de 1,5 chapeau par chemise ».`,
    traps: [
      { choice: 2, why: "Croire qu'il faut les vraies quantités : un ratio suffit pour répondre à une question de pourcentage." },
      { choice: 3, why: "L'énoncé (1) donne un écart en nombre (30), qui ne fixe pas la proportion : elle dépend de la taille totale." },
    ],
    targetSeconds: 150,
    verifiedBy: "code",
    verify: () =>
      dsAnswer({
        cases: grid2(0, 300, 0, 300).filter(([s, h]) => s + h > 0), // [s, h]
        s1: ([s, h]) => h === s + 30,
        s2: ([s, h]) => 2 * h < 3 * s, // h < 1,5 s
        ask: ([s, h]) => 5 * s > 2 * (s + h), // s/(s+h) > 0,4
      }),
  },
];
