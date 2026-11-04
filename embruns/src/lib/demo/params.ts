/**
 * Paramètres du jeu de démo « Au Pain Doré » (cahier des charges, section 6.2).
 *
 * Toutes les valeurs de la démo sont ici, et nulle part ailleurs : le
 * générateur SQL (`public.generate_demo`) les reçoit en JSON. Même graine et
 * même date du jour → mêmes données.
 */

type Category = "pains" | "viennoiseries" | "pâtisseries" | "snacking" | "boissons";

export type DemoProduct = {
  name: string;
  category: Category;
  price: number;
  /** Poids relatif dans les paniers. */
  weight: number;
  /** Quantité maximale par ligne (la plupart des lignes restent à 1). */
  qty_max: number;
  /** Mois de vente (1-12) ; absent = toute l'année. */
  months?: number[];
  /** Mois de forte demande et multiplicateur associé. */
  boost_months?: number[];
  boost?: number;
};

const products: DemoProduct[] = [
  // Pains
  { name: "Baguette", category: "pains", price: 1.2, weight: 30, qty_max: 3 },
  { name: "Baguette tradition", category: "pains", price: 1.4, weight: 34, qty_max: 3 },
  { name: "Pain de campagne", category: "pains", price: 3.2, weight: 6, qty_max: 1 },
  { name: "Pain complet", category: "pains", price: 2.9, weight: 4, qty_max: 1 },
  { name: "Pain aux céréales", category: "pains", price: 3.4, weight: 5, qty_max: 1 },
  { name: "Ficelle", category: "pains", price: 0.9, weight: 4, qty_max: 2 },
  { name: "Pain de mie", category: "pains", price: 3.6, weight: 3, qty_max: 1 },
  { name: "Fougasse aux olives", category: "pains", price: 3.8, weight: 4, qty_max: 1 },
  // Viennoiseries
  { name: "Croissant", category: "viennoiseries", price: 1.3, weight: 22, qty_max: 4 },
  { name: "Pain au chocolat", category: "viennoiseries", price: 1.45, weight: 22, qty_max: 4 },
  { name: "Pain aux raisins", category: "viennoiseries", price: 1.7, weight: 6, qty_max: 2 },
  { name: "Chausson aux pommes", category: "viennoiseries", price: 2.1, weight: 5, qty_max: 2 },
  { name: "Brioche individuelle", category: "viennoiseries", price: 1.6, weight: 4, qty_max: 2 },
  { name: "Croissant aux amandes", category: "viennoiseries", price: 2.4, weight: 4, qty_max: 2 },
  { name: "Navette provençale", category: "viennoiseries", price: 1.2, weight: 3, qty_max: 4, boost_months: [2], boost: 4 },
  // Pâtisseries
  { name: "Flan pâtissier (part)", category: "pâtisseries", price: 2.8, weight: 8, qty_max: 2 },
  { name: "Éclair au chocolat", category: "pâtisseries", price: 3.2, weight: 6, qty_max: 2 },
  { name: "Éclair au café", category: "pâtisseries", price: 3.2, weight: 3, qty_max: 2 },
  { name: "Tarte aux fraises", category: "pâtisseries", price: 4.2, weight: 5, qty_max: 2, months: [4, 5, 6, 7] },
  { name: "Tarte au citron", category: "pâtisseries", price: 3.9, weight: 4, qty_max: 2 },
  { name: "Mille-feuille", category: "pâtisseries", price: 3.8, weight: 4, qty_max: 2 },
  { name: "Paris-Brest", category: "pâtisseries", price: 4.2, weight: 3, qty_max: 2 },
  { name: "Tropézienne (part)", category: "pâtisseries", price: 4.5, weight: 4, qty_max: 2, boost_months: [6, 7, 8], boost: 1.5 },
  { name: "Macaron", category: "pâtisseries", price: 1.6, weight: 3, qty_max: 6 },
  { name: "Galette des rois (4 parts)", category: "pâtisseries", price: 18, weight: 9, qty_max: 1, months: [1] },
  { name: "Bûche de Noël (6 parts)", category: "pâtisseries", price: 28, weight: 5, qty_max: 1, months: [12] },
  { name: "Glace artisanale (pot)", category: "pâtisseries", price: 3.5, weight: 7, qty_max: 2, months: [6, 7, 8, 9] },
  // Snacking
  { name: "Sandwich jambon-beurre", category: "snacking", price: 4.9, weight: 10, qty_max: 1 },
  { name: "Sandwich poulet crudités", category: "snacking", price: 5.9, weight: 8, qty_max: 1 },
  { name: "Pan bagnat", category: "snacking", price: 6.2, weight: 5, qty_max: 1, boost_months: [5, 6, 7, 8, 9], boost: 2 },
  { name: "Quiche lorraine", category: "snacking", price: 4.5, weight: 5, qty_max: 1 },
  { name: "Pizza (part)", category: "snacking", price: 3.2, weight: 5, qty_max: 2 },
  { name: "Salade composée", category: "snacking", price: 7.5, weight: 3, qty_max: 1 },
  { name: "Formule déjeuner", category: "snacking", price: 8.9, weight: 9, qty_max: 1 },
  { name: "Croque-monsieur", category: "snacking", price: 4.8, weight: 4, qty_max: 1 },
  // Boissons
  { name: "Café", category: "boissons", price: 1.5, weight: 6, qty_max: 2 },
  { name: "Jus d'orange", category: "boissons", price: 2.8, weight: 4, qty_max: 1 },
  { name: "Eau minérale", category: "boissons", price: 1.5, weight: 4, qty_max: 1 },
  { name: "Soda", category: "boissons", price: 2.2, weight: 4, qty_max: 1 },
  { name: "Thé", category: "boissons", price: 1.8, weight: 2, qty_max: 1 },
  { name: "Chocolat chaud", category: "boissons", price: 2.5, weight: 3, qty_max: 1, months: [1, 2, 3, 10, 11, 12] },
];

const firstNames = [
  "Léa", "Emma", "Chloé", "Camille", "Manon", "Inès", "Jade", "Louise", "Sarah", "Julie",
  "Lucas", "Hugo", "Louis", "Gabriel", "Arthur", "Jules", "Nathan", "Théo", "Tom", "Paul",
  "Marie", "Claire", "Sophie", "Isabelle", "Nathalie", "Sandrine", "Céline", "Aurélie", "Élodie", "Anaïs",
  "Pierre", "Nicolas", "Julien", "Thomas", "Mathieu", "Sébastien", "Olivier", "Laurent", "Frédéric", "Marc",
  "Mireille", "Josette", "Marcel", "Gérard", "Monique", "Bernard", "Odile", "René", "Yvette", "Lucien",
];

export const DEMO_PARAMS = {
  seed: "au-pain-dore-v1",
  /** Profondeur d'historique, en jours, jusqu'à hier inclus. */
  days: 365,
  /** Jours de fermeture (ISO : 1 = lundi). */
  closed_isodows: [1],

  // --- Ventes ---------------------------------------------------------------
  /** Tickets moyens par jour d'ouverture (ISO), avant saisonnalité et bruit. */
  tickets_by_isodow: { "2": 262, "3": 268, "4": 265, "5": 275, "6": 340, "7": 320 } as Record<string, number>,
  /** Bruit quotidien maximal (± fraction). */
  daily_noise: 0.07,
  /** Facteur mensuel d'affluence (janvier → décembre), volontairement doux. */
  month_factor: [0.96, 0.95, 0.97, 1.0, 1.0, 1.02, 1.04, 1.0, 0.98, 0.98, 0.97, 1.06],
  /** Poids des heures d'ouverture (7 h → 19 h) : pics 7-9 h, 12-13 h 30, 17-19 h. */
  hour_weights: { "7": 12, "8": 16, "9": 10, "10": 6, "11": 7, "12": 14, "13": 9, "14": 4, "15": 4, "16": 6, "17": 11, "18": 12, "19": 5 } as Record<string, number>,
  /** Dernière heure d'ouverture par jour (ISO) ; dimanche : fermeture à 13 h. */
  last_hour_by_isodow: { "7": 12 } as Record<string, number>,
  /** Répartition du nombre de lignes par ticket (1, 2, 3, 4 lignes). */
  lines_weights: [26, 38, 24, 12],
  /** Affinité des catégories selon le moment de la journée. */
  daypart_category_factor: {
    morning: { pains: 1.0, viennoiseries: 1.6, "pâtisseries": 0.4, snacking: 0.2, boissons: 1.0 },
    midday: { pains: 1.0, viennoiseries: 0.3, "pâtisseries": 0.8, snacking: 2.5, boissons: 1.4 },
    afternoon: { pains: 1.2, viennoiseries: 0.6, "pâtisseries": 1.4, snacking: 0.3, boissons: 0.6 },
  },
  /** Parts des moyens de paiement (carte, espèces, titre-restaurant). */
  payment_weights: { carte: 70, "espèces": 25, "titre-restaurant": 5 } as Record<string, number>,
  products,

  // --- Clients ----------------------------------------------------------------
  customers: 650,
  /** Clients inscrits dès le premier jour (premiers fidèles). */
  initial_customers: 40,
  /** Forme de la courbe d'inscription (1 = linéaire). */
  signup_curve: 1.0,
  /** Fréquence de visite par semaine : min + (max - min) × u^skew. */
  visits_per_week: { min: 0.25, max: 3.5, skew: 3.2, early_boost: 1.3 },
  /** Part des passages habituels manqués, et probabilité d'un passage imprévu par jour. */
  visit_skip_rate: 0.12,
  extra_visit_rate: 0.015,
  /** Part des visites à l'heure préférée du client. */
  preferred_hour_share: 0.7,
  /** Part des clients perdus (plus de visite depuis plus de 90 jours). */
  lost_rate: 0.12,
  marketing_consent_rate: 0.78,
  unsubscribe_rate: 0.04,
  phone_rate: 0.35,
  birthday_rate: 0.6,
  first_names: firstNames,

  // --- Scénarios injectés (un par détecteur à démontrer) ---------------------
  scenarios: {
    /** Mardi après-midi en baisse sur les 3 dernières semaines. */
    slot_drop: { isodow: 2, from_hour: 13, days: 21, drop: 0.18 },
    /** Réguliers qui décrochent : dernière visite il y a 25 à 45 jours. */
    at_risk: { count: 20, min_days: 25, max_days: 45, min_visits_per_week: 1.5 },
    /**
     * Produit en hausse sur les 4 dernières semaines. `uplift` multiplie le
     * poids du produit dans les paniers ; la hausse mesurée (~35 %) est un peu
     * plus faible, car d'autres produits bougent aussi avec la saison.
     */
    product_uplift: { product: "Flan pâtissier (part)", days: 28, uplift: 0.6 },
  },

  // --- Avis -------------------------------------------------------------------
  reviews: {
    count: 180,
    rating_weights: { "5": 72, "4": 19, "3": 4, "2": 2.5, "1": 2.5 } as Record<string, number>,
    /** Avis négatifs récents restés sans réponse (détecteur « avis à traiter »). */
    pending: [
      { rating: 2, days_ago: 3, author: "Karine B.", text: "Baguette pas assez cuite samedi et 10 minutes d'attente. Dommage, d'habitude c'est bien." },
      { rating: 3, days_ago: 6, author: "Stéphane M.", text: "Bons produits mais l'accueil était un peu froid ce matin." },
    ],
    texts: {
      "5": [
        "La meilleure baguette tradition du quartier, toujours croustillante.",
        "Le flan est incroyable, on fait le détour exprès.",
        "Accueil adorable et viennoiseries au top. Merci !",
        "Les croissants au beurre sont parfaits, on sent le fait maison.",
        "Super boulangerie, la tropézienne est une tuerie.",
        "Toujours un sourire, des pains variés et de qualité.",
      ],
      "4": [
        "Très bons produits, un peu d'attente le dimanche matin.",
        "Bonne boulangerie, les sandwichs du midi sont copieux.",
        "Pâtisseries délicieuses, un peu chères mais ça vaut le coup.",
      ],
      "3": ["Correct sans plus, la baguette était un peu molle.", "Bons gâteaux mais service lent à midi."],
      "2": ["Déçu par le pain au chocolat, pas assez cuit.", "Attente trop longue et plus de tradition à 18 h."],
      "1": ["Commande de gâteau oubliée pour un anniversaire. Très déçue.", "Accueil désagréable ce jour-là."],
    } as Record<string, string[]>,
    replies: {
      positive: [
        "Merci beaucoup {prenom}, toute l'équipe est ravie ! À très vite au Pain Doré.",
        "Merci {prenom} pour ce gentil message, on vous attend pour la prochaine fournée !",
      ],
      negative: [
        "Bonjour {prenom}, merci pour votre retour et toutes nos excuses. Passez nous voir, nous tenons à nous rattraper.",
        "Bonjour {prenom}, nous sommes désolés de cette expérience. Votre remarque a été partagée avec l'équipe.",
      ],
    },
  },

  // --- Campagnes passées ------------------------------------------------------
  campaigns: [
    {
      name: "Noël : précommandez votre bûche",
      month: 12,
      day: 12,
      audience: "all",
      segment: null,
      subject: "Votre bûche de Noël vous attend",
      message: "Bûches pâtissières, chocolat ou praliné : précommandez la vôtre en boutique avant le 22 décembre.",
      offer: "Un ballotin de 6 macarons offert pour toute bûche précommandée",
      open_rate: 0.58,
      return_boost: 0.45,
    },
    {
      name: "Épiphanie : la galette du Pain Doré",
      month: 1,
      day: 3,
      audience: "lapsed",
      segment: "at_risk",
      subject: "La galette des rois est arrivée",
      message: "Frangipane maison ou briochée provençale : venez tirer les rois avec nous.",
      offer: null,
      open_rate: 0.52,
      return_boost: 0.05,
    },
    {
      name: "Fête des mères",
      month: 5,
      day: 27,
      audience: "lapsed",
      segment: "at_risk",
      subject: "Pour la fête des mères, pensez entremets",
      message: "Fraisier, tarte au citron meringuée, macarons : une douceur pour elle.",
      offer: "-10 % sur les entremets jusqu'au dimanche",
      open_rate: 0.41,
      return_boost: 0.08,
    },
  ],
} as const;

export type DemoParams = typeof DEMO_PARAMS;
