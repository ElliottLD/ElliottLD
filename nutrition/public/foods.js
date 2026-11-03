"use strict";

// Table d'aliments courants : valeurs pour 100 g (ou 100 ml), proches de la table Ciqual.
// [nom, kcal, protéines, glucides, lipides, portion habituelle en g, autres noms acceptés]
const FOOD_TABLE = [
  // Viandes, poissons, œufs
  ["Blanc de poulet cuit", 165, 31, 0, 3.6, 150, ["poulet", "blanc de poulet", "filet de poulet", "poulet grillé"]],
  ["Blanc de dinde cuit", 135, 29, 0, 1.5, 150, ["dinde", "escalope de dinde"]],
  ["Steak haché 5 % cuit", 160, 26, 0, 6, 125, ["steak haché", "steak hache 5", "boeuf haché"]],
  ["Steak haché 15 % cuit", 250, 26, 0, 16, 125, ["steak hache 15"]],
  ["Bœuf (rumsteck) cuit", 180, 30, 0, 6.5, 150, ["boeuf", "steak", "rumsteck", "bavette"]],
  ["Filet de porc cuit", 160, 29, 0, 4.5, 150, ["porc", "filet mignon"]],
  ["Jambon blanc", 115, 21, 1, 3, 40, ["jambon", "tranche de jambon"]],
  ["Lardons", 270, 15, 0, 23, 50, []],
  ["Saumon cuit", 206, 22, 0, 13, 130, ["saumon", "pavé de saumon"]],
  ["Thon au naturel (boîte)", 116, 26, 0, 1, 100, ["thon", "thon en boite"]],
  ["Cabillaud cuit", 105, 23, 0, 0.9, 150, ["cabillaud", "poisson blanc", "colin"]],
  ["Crevettes cuites", 99, 24, 0, 0.3, 100, ["crevettes"]],
  ["Œuf", 143, 12.6, 0.7, 9.5, 60, ["oeuf", "oeufs", "œufs", "oeuf dur", "oeufs brouillés", "omelette"]],
  ["Blanc d'œuf", 52, 11, 0.7, 0.2, 33, ["blanc d'oeuf", "blancs d'oeufs"]],
  ["Tofu", 145, 15.5, 2.5, 8.5, 100, []],
  ["Protéine en poudre (whey)", 380, 78, 8, 5, 30, ["whey", "protéine", "proteine"]],
  // Produits laitiers
  ["Fromage blanc 0 %", 49, 7.6, 4.1, 0.2, 150, ["fromage blanc"]],
  ["Skyr", 63, 11, 4, 0.2, 150, []],
  ["Yaourt nature", 61, 4.2, 5.2, 2.8, 125, ["yaourt", "yogourt"]],
  ["Yaourt grec", 120, 6, 4, 9, 150, []],
  ["Lait demi-écrémé", 46, 3.3, 4.8, 1.6, 250, ["lait"]],
  ["Lait d'amande sans sucre", 15, 0.5, 0.3, 1.1, 250, ["lait d'amande"]],
  ["Emmental", 380, 28, 0, 30, 30, ["gruyère", "fromage râpé"]],
  ["Comté", 410, 27, 0, 34, 30, ["fromage"]],
  ["Mozzarella", 250, 18, 1, 19.5, 60, []],
  ["Parmesan", 392, 35, 0, 28, 10, []],
  ["Beurre", 745, 0.7, 0.6, 82, 10, []],
  ["Crème fraîche", 290, 2.4, 3, 30, 30, ["creme"]],
  // Féculents (poids cuit)
  ["Riz blanc cuit", 130, 2.7, 28, 0.3, 200, ["riz", "riz blanc"]],
  ["Riz basmati cuit", 130, 2.7, 28, 0.3, 200, ["riz basmati", "basmati"]],
  ["Riz complet cuit", 123, 2.7, 25.5, 1, 200, ["riz complet"]],
  ["Pâtes cuites", 155, 5.5, 30, 0.9, 200, ["pâtes", "pates", "spaghetti", "penne", "coquillettes"]],
  ["Pâtes complètes cuites", 140, 5.5, 26, 1.2, 200, ["pâtes complètes", "pates completes"]],
  ["Pomme de terre cuite", 85, 2, 18.5, 0.1, 200, ["pomme de terre", "pommes de terre", "patate"]],
  ["Patate douce cuite", 86, 1.6, 20, 0.1, 200, ["patate douce"]],
  ["Frites", 290, 3.4, 36, 15, 150, []],
  ["Quinoa cuit", 120, 4.4, 21, 1.9, 150, ["quinoa"]],
  ["Semoule cuite", 112, 3.8, 23, 0.2, 200, ["semoule", "couscous"]],
  ["Lentilles cuites", 116, 9, 20, 0.4, 200, ["lentilles"]],
  ["Pois chiches cuits", 164, 8.9, 27, 2.6, 150, ["pois chiches"]],
  ["Haricots rouges cuits", 127, 8.7, 22.8, 0.5, 150, ["haricots rouges"]],
  ["Baguette", 270, 9, 55, 1.3, 60, ["pain", "pain blanc"]],
  ["Pain complet", 245, 9, 44, 3, 50, []],
  ["Pain de mie", 270, 8, 49, 4, 25, []],
  ["Wrap (tortilla)", 300, 8, 50, 7, 60, ["wrap", "tortilla"]],
  ["Flocons d'avoine", 370, 13, 60, 7, 50, ["avoine", "porridge"]],
  ["Muesli", 370, 9, 64, 6, 50, ["céréales"]],
  ["Granola", 450, 9, 62, 17, 50, []],
  // Légumes
  ["Brocolis cuits", 35, 2.4, 4, 0.4, 150, ["brocolis", "brocoli"]],
  ["Haricots verts cuits", 30, 1.8, 4.5, 0.2, 150, ["haricots verts"]],
  ["Courgette cuite", 18, 1.2, 2.5, 0.3, 150, ["courgette", "courgettes"]],
  ["Carottes", 36, 0.8, 7, 0.2, 100, ["carotte"]],
  ["Tomate", 18, 0.9, 3, 0.2, 120, ["tomates"]],
  ["Salade verte", 15, 1.3, 1.5, 0.2, 50, ["salade"]],
  ["Épinards cuits", 23, 3, 1.5, 0.3, 150, ["epinards"]],
  ["Avocat", 160, 2, 2, 15, 100, []],
  ["Concombre", 13, 0.6, 2.2, 0.1, 100, []],
  ["Champignons", 22, 3.1, 0.5, 0.3, 100, []],
  ["Poivron", 26, 1, 4.5, 0.3, 100, []],
  ["Petits pois cuits", 80, 5.4, 10, 0.4, 100, ["petits pois"]],
  ["Maïs", 90, 3, 16, 1.5, 80, ["mais"]],
  ["Légumes poêlés", 60, 2, 7, 2.5, 200, ["légumes", "legumes", "poêlée de légumes"]],
  // Fruits
  ["Banane", 90, 1.1, 20, 0.3, 120, []],
  ["Pomme", 52, 0.3, 12, 0.2, 150, []],
  ["Orange", 47, 0.9, 9.5, 0.1, 150, []],
  ["Fraises", 32, 0.7, 6, 0.3, 150, ["fraise"]],
  ["Myrtilles", 57, 0.7, 12, 0.3, 100, []],
  ["Kiwi", 60, 1.1, 11, 0.5, 75, []],
  ["Raisin", 70, 0.7, 16, 0.2, 100, []],
  ["Dattes", 280, 2.5, 66, 0.4, 30, ["datte"]],
  ["Compote sans sucre ajouté", 50, 0.3, 11.5, 0.1, 100, ["compote"]],
  // Matières grasses, oléagineux
  ["Huile d'olive", 900, 0, 0, 100, 10, ["huile", "huile de colza"]],
  ["Amandes", 610, 21, 9, 52, 30, []],
  ["Noix", 700, 15, 7, 65, 30, []],
  ["Cacahuètes", 600, 25, 12, 49, 30, ["cacahuetes"]],
  ["Beurre de cacahuète", 600, 25, 15, 50, 20, ["beurre de cacahuete", "peanut butter"]],
  ["Chocolat noir 70 %", 580, 8, 33, 42, 20, ["chocolat", "chocolat noir"]],
  // Sucré, sauces
  ["Miel", 320, 0.4, 80, 0, 15, []],
  ["Sucre", 400, 0, 100, 0, 5, []],
  ["Confiture", 250, 0.4, 60, 0.1, 20, []],
  ["Ketchup", 110, 1.2, 25, 0.2, 15, []],
  ["Mayonnaise", 700, 1.2, 1.5, 76, 15, ["mayo"]],
  ["Sauce soja", 55, 8, 5, 0.1, 10, []],
  ["Pesto", 460, 5, 5, 46, 20, []],
  ["Croissant", 410, 8, 45, 21, 50, []],
  ["Pain au chocolat", 420, 7.5, 47, 22, 60, ["chocolatine"]],
  ["Barre protéinée", 360, 33, 35, 12, 60, []],
  // Plats
  ["Pizza", 260, 11, 30, 10, 300, []],
  ["Burger", 250, 13, 25, 11, 220, ["hamburger", "cheeseburger"]],
  ["Sandwich jambon-beurre", 270, 12, 30, 11, 200, ["jambon beurre", "sandwich"]],
  // Boissons (pour 100 ml)
  ["Jus d'orange", 45, 0.7, 10, 0.2, 200, []],
  ["Coca-Cola", 42, 0, 10.6, 0, 330, ["coca", "soda"]],
  ["Bière", 43, 0.4, 3.5, 0, 250, ["biere"]],
  ["Vin rouge", 85, 0.1, 2.6, 0, 125, ["vin"]],
].map(([name, kcal, protein, carbs, fat, portion, aliases]) => ({ name, kcal, protein, carbs, fat, portion, aliases }));

function normalizeFoodName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FOOD_INDEX = new Map();
for (const food of FOOD_TABLE) {
  for (const key of [food.name, ...food.aliases]) {
    const k = normalizeFoodName(key);
    if (!FOOD_INDEX.has(k)) FOOD_INDEX.set(k, food);
  }
}

// Retrouve un aliment de la table à partir de ce que la personne a tapé.
function findFood(name) {
  const k = normalizeFoodName(name);
  if (!k) return null;
  return FOOD_INDEX.get(k) || FOOD_INDEX.get(k.replace(/s$/, "")) || null;
}

// Valeurs d'un aliment de la table pour une quantité donnée.
function foodValues(food, grams) {
  const r = grams / 100;
  return { name: food.name, grams, kcal: food.kcal * r, protein: food.protein * r, carbs: food.carbs * r, fat: food.fat * r };
}
