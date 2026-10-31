import type { Course } from "@/lib/types";

const md = String.raw;

export const course: Course = {
  chapter: "A3",
  why: md`Les pourcentages sont partout au GMAT : questions directes, *word problems* (profit, intérêts, populations) et tableaux de Data Insights. Les erreurs viennent presque toujours de la **base** (« pourcentage de quoi ? ») et des **variations successives**.`,

  basics: md`### Qu'est-ce qu'un pourcentage ?

« Pour cent » veut dire « sur 100 ». Donc $t\,\% = \dfrac{t}{100}$.

- $25\,\% = \dfrac{25}{100} = \dfrac14 = 0{,}25$
- $7\,\% = 0{,}07$ ; $150\,\% = 1{,}5$ ; $0{,}5\,\% = 0{,}005$

### Prendre un pourcentage d'un nombre

« $t\,\%$ de $N$ » se calcule $\dfrac{t}{100} \times N$. Le mot « de » (*of* en anglais) se traduit par une **multiplication**.

Exemple : $20\,\%$ de $45$ = $0{,}2 \times 45 = 9$.

### La base

Tout pourcentage se rapporte à une quantité de référence, la **base** (le « 100 % »). En anglais, la base est presque toujours ce qui suit **of**, **than** ou **from** :

- *X is what percent **of** Y?* → base $Y$ ;
- *A is 20% greater **than** B* → base $B$ ;
- *the price increased by 10% **from** 2024 to 2025* → base : le prix de 2024 (la valeur de départ).

### Variation en pourcentage

Quand une quantité passe d'une valeur de départ $V_d$ à une valeur d'arrivée $V_a$ :

$$\text{variation en \%} = \frac{V_a - V_d}{V_d} \times 100$$

La base est toujours la valeur **de départ**. Résultat positif = hausse, négatif = baisse.

Exemple : de 40 à 50, variation $= \dfrac{50 - 40}{40} = \dfrac{10}{40} = 25\,\%$. De 50 à 40 : $\dfrac{-10}{50} = -20\,\%$. Même écart (10), bases différentes, pourcentages différents.

### Le coefficient multiplicateur

C'est l'outil central du chapitre. Augmenter de $t\,\%$, c'est garder $100\,\%$ et ajouter $t\,\%$, donc multiplier par $1 + \dfrac{t}{100}$. Diminuer de $t\,\%$, c'est multiplier par $1 - \dfrac{t}{100}$.

| Variation | Coefficient |
| --- | --- |
| +10 % | × 1,1 |
| +25 % | × 1,25 |
| +100 % (doubler) | × 2 |
| −20 % | × 0,8 |
| −35 % | × 0,65 |

Pour retrouver la valeur de départ, on **divise** par le coefficient : si un prix après une hausse de 25 % vaut 50, le prix de départ vaut $50 \div 1{,}25 = 40$ (et non $50 \times 0{,}75$).

### Intérêts simples et composés

- **Intérêts simples** (*simple interest*) : chaque année, on gagne le même montant, calculé sur le capital de départ $C_0$. Après $n$ années : $C_0(1 + nr)$.
- **Intérêts composés** (*compound interest*) : les intérêts s'ajoutent au capital et rapportent à leur tour. Après $n$ périodes : $C_0(1 + r)^n$.
- *Compounded semiannually / quarterly / monthly* : le taux annuel est divisé en 2, 4 ou 12, et appliqué autant de fois par an.

### Vocabulaire commercial

- **Coût** (*cost*) : ce que le vendeur paie.
- **Prix de vente** (*selling price*) ; **prix affiché** (*list price, marked price*).
- **Majoration** (*markup*) : pourcentage ajouté **au coût** pour obtenir le prix affiché.
- **Remise** (*discount*) : pourcentage retiré **du prix affiché**.
- **Profit** = prix de vente − coût. Sauf mention contraire, le profit en % se calcule **sur le coût**.`,

  rules: [
    md`**Pourcentage d'un nombre :** $t\,\%$ de $N = \dfrac{t}{100} \times N$. Et $a\,\%$ de $b$ = $b\,\%$ de $a$.`,
    md`**« $X$ est quel % de $Y$ » :** $\dfrac{X}{Y} \times 100$. La base est après *of*.`,
    md`**Variation en % :** $\dfrac{\text{arrivée} - \text{départ}}{\text{départ}} \times 100$. La base est la valeur de départ.`,
    md`**Coefficient multiplicateur :** $+t\,\% \to \times\left(1 + \dfrac{t}{100}\right)$ ; $-t\,\% \to \times\left(1 - \dfrac{t}{100}\right)$. Retrouver le départ : diviser par le coefficient.`,
    md`**Variations successives :** on **multiplie** les coefficients, on n'additionne jamais les %. Deux variations $a\,\%$ et $b\,\%$ : variation totale $= a + b + \dfrac{ab}{100}$ (en %).`,
    md`**Annuler une variation :** $+\frac1n$ s'annule par $-\frac{1}{n+1}$. $+25\,\% \leftrightarrow -20\,\%$ ; $+50\,\% \leftrightarrow -33\frac13\,\%$ ; $+100\,\% \leftrightarrow -50\,\%$.`,
    md`**Intérêts :** simples $C_0(1 + nr)$ ; composés $C_0(1 + r)^n$ ; composés $k$ fois par an : $C_0\left(1 + \dfrac{r}{k}\right)^{kn}$.`,
    md`**Profit :** profit = vente − coût ; profit en % $= \dfrac{\text{profit}}{\text{coût}} \times 100$. Majoration sur le coût, remise sur le prix affiché.`,
  ],

  methods: md`### 1. Partir de 100
Quand l'énoncé ne donne pas de valeur (« a price increased by 20%… »), posez la valeur de départ égale à 100. Tous les pourcentages se lisent alors directement.

### 2. Découper le pourcentage
$10\,\%$ = diviser par 10 ; $5\,\%$ = moitié de $10\,\%$ ; $1\,\%$ = diviser par 100. Donc $35\,\%$ de 240 = $3 \times 24 + 12 = 84$ ; $15\,\%$ = $10\,\% + 5\,\%$.

### 3. Échanger les rôles
$16\,\%$ de 25 = $25\,\%$ de 16 = $4$. Choisissez le sens le plus facile.

### 4. Connaître les fractions-clés
$12{,}5\,\% = \frac18$ ; $16\frac23\,\% = \frac16$ ; $20\,\% = \frac15$ ; $25\,\% = \frac14$ ; $33\frac13\,\% = \frac13$ ; $37{,}5\,\% = \frac38$ ; $40\,\% = \frac25$ ; $60\,\% = \frac35$ ; $62{,}5\,\% = \frac58$ ; $66\frac23\,\% = \frac23$ ; $75\,\% = \frac34$ ; $87{,}5\,\% = \frac78$.

### 5. Tester les réponses (*backsolving*)
Quand on cherche une valeur de départ (« the jacket sold for \$84, what was its cost? »), prenez une réponse du milieu et appliquez les variations : vous saurez s'il faut monter ou descendre.

### 6. Estimer et éliminer
Avant de calculer, situez l'ordre de grandeur : 8 % composé trimestriellement sur 1 an donne « un peu plus de 8 % ». Toute réponse à +30 % est éliminée immédiatement.`,

  traps: md`1. **Mauvaise base.** « A est 25 % plus grand que B » ne veut pas dire « B est 25 % plus petit que A » (c'est 20 %). Cherchez toujours *of*, *than*, *from*.
2. **Additionner des variations successives.** $+20\,\%$ puis $-20\,\%$ = $1{,}2 \times 0{,}8 = 0{,}96$, soit $-4\,\%$, pas 0 %.
3. **Retrouver une valeur de départ en appliquant l'inverse du pourcentage.** Après $+25\,\%$, le prix vaut 50 : le prix initial est $50 \div 1{,}25 = 40$, pas $50 \times 0{,}75 = 37{,}5$.
4. **Confondre « pourcentage » et « points de pourcentage ».** Un taux qui passe de 10 % à 12 % augmente de 2 points de pourcentage, mais de 20 % (en relatif).
5. **Profit sur le mauvais prix.** Profit en % du coût (par défaut) ≠ profit en % du prix de vente.
6. **Intérêts : simple vs composé, annuel vs trimestriel.** Lire chaque mot : *simple*, *compounded*, *annually*, *semiannually*, *quarterly*.
7. **Moyenne de pourcentages non pondérée.** Si 75 % des articles gagnent 40 % et 25 % perdent 20 %, la marge globale n'est pas $(40 - 20)/2$.`,

  examples: [
    {
      level: "fondation",
      prompt: md`Un pull coûte 60 € après une remise de 25 %. Quel était son prix avant la remise ?`,
      steps: md`1. Remise de 25 % → coefficient $1 - 0{,}25 = 0{,}75$.
2. Prix avant $\times 0{,}75$ = 60, donc prix avant $= \dfrac{60}{0{,}75} = \dfrac{60}{3/4} = 60 \times \dfrac43 = 80$ €.
3. Vérification : 25 % de 80 = 20, et $80 - 20 = 60$ ✓.

**Piège évité :** $60 \times 1{,}25 = 75$ € est faux, car la remise de 25 % se calcule sur 80, pas sur 60.`,
    },
    {
      level: "intermediaire",
      prompt: md`A company's revenue fell by 20% in 2023 and then rose by 30% in 2024. By what percent did revenue change from the start of 2023 to the end of 2024?`,
      steps: md`1. Partir de 100 (début 2023).
2. 2023 : $100 \times 0{,}8 = 80$.
3. 2024 : $80 \times 1{,}3 = 104$.
4. De 100 à 104 : **hausse de 4 %**.

Avec la formule $a + b + \frac{ab}{100}$ : $-20 + 30 + \dfrac{(-20)(30)}{100} = 10 - 6 = 4$.

**Piège évité :** « +10 % » (addition des pourcentages).`,
    },
    {
      level: "avance",
      prompt: md`In a survey, 40% of the respondents were men. If 30% of the men and 55% of the women said yes, what percent of all respondents who said yes were men?`,
      steps: md`1. Partir de 100 répondants : 40 hommes, 60 femmes.
2. « Oui » chez les hommes : $30\,\% \times 40 = 12$. Chez les femmes : $55\,\% \times 60 = 33$.
3. Total des « oui » : $12 + 33 = 45$.
4. La question demande « parmi ceux qui ont dit oui » : la **base** est 45, pas 100. Proportion d'hommes : $\dfrac{12}{45} = \dfrac{4}{15} \approx 26{,}7\,\%$.

**Pièges évités :** répondre 12 % (base = tous les répondants) ou 30 % (base = les hommes).`,
    },
  ],

  summary: md`**Base** : après *of*, *than*, *from*. Variation : $\dfrac{\text{arrivée} - \text{départ}}{\text{départ}}$.

**Coefficients** : $+t\,\% = \times(1 + t/100)$ ; $-t\,\% = \times(1 - t/100)$ ; revenir en arrière = **diviser**.

**Successives** : multiplier les coefficients. $a$ puis $b$ : $a + b + ab/100$. $+20/-20 = -4\,\%$ ; $+10/-10 = -1\,\%$.

**Annuler** : $+25 \leftrightarrow -20$ ; $+50 \leftrightarrow -33\frac13$ ; $+100 \leftrightarrow -50$.

**Intérêts** : simples $C_0(1 + nr)$ ; composés $C_0(1 + r)^n$ ; $k$ fois/an : $C_0(1 + r/k)^{kn}$. $1{,}1^2 = 1{,}21$ ; $1{,}1^3 = 1{,}331$.

**Profit** : (vente − coût)/coût. *Markup* sur le coût, *discount* sur le prix affiché.

**Fractions-clés** : $\frac18 = 12{,}5\,\%$, $\frac16 \approx 16{,}7\,\%$, $\frac15 = 20\,\%$, $\frac14$, $\frac13 \approx 33{,}3\,\%$, $\frac38 = 37{,}5\,\%$, $\frac23$, $\frac34$, $\frac78 = 87{,}5\,\%$.

**Réflexes** : partir de 100 ; découper (10 %, 5 %, 1 %) ; $a\,\%$ de $b$ = $b\,\%$ de $a$ ; tester les réponses ; estimer avant de calculer.`,
};
