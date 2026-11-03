"use strict";

// Table d'aliments courants : valeurs pour 100 g (ou 100 ml), proches de la table Ciqual.
// Les plats préparés ont des valeurs moyennes. Les modes de cuisson qui changent
// nettement les calories (matière grasse, panure, friture) ont chacun leur ligne.
//
// [nom, kcal, protéines, glucides, lipides, portion, autres noms, unité]
// Sans unité, la portion est en grammes. Avec une unité [libellé, grammes par unité],
// la portion est un nombre d'unités (ex. 2 œufs).
const FOOD_TABLE = [
  // Volailles
  ["Blanc de poulet grillé", 165, 31, 0, 3.6, 150, ["poulet", "blanc de poulet", "filet de poulet", "poulet grille", "poulet poele", "blanc de poulet cuit"]],
  ["Poulet rôti (avec peau)", 215, 27, 0, 12, 150, ["poulet roti"]],
  ["Cuisse de poulet rôtie", 210, 26, 0, 11.5, 1, ["cuisse de poulet", "pilon de poulet"], ["cuisse", 110]],
  ["Escalope de poulet panée", 230, 18, 13, 12, 1, ["poulet pane", "cordon bleu"], ["escalope", 130]],
  ["Nuggets de poulet", 260, 15, 17, 15, 6, ["nuggets", "nugget", "tenders"], ["nugget", 18]],
  ["Blanc de dinde grillé", 135, 29, 0, 1.5, 150, ["dinde", "escalope de dinde", "blanc de dinde"]],
  // Bœuf, porc, agneau
  ["Steak haché 5 % cuit", 160, 26, 0, 6, 1, ["steak hache", "steak hache 5", "boeuf hache"], ["steak", 100]],
  ["Steak haché 15 % cuit", 250, 26, 0, 16, 1, ["steak hache 15"], ["steak", 100]],
  ["Steak haché 20 % cuit", 275, 25, 0, 19.5, 1, ["steak hache 20"], ["steak", 100]],
  ["Bœuf grillé (rumsteck, bavette)", 180, 30, 0, 6.5, 150, ["boeuf", "steak", "rumsteck", "bavette", "faux filet"]],
  ["Entrecôte grillée", 230, 27, 0, 13.5, 200, ["entrecote", "cote de boeuf"]],
  ["Rôti de bœuf", 180, 29, 0, 7, 120, ["roti de boeuf", "rosbif"]],
  ["Bœuf bourguignon", 130, 14, 3, 6.5, 300, ["bourguignon"]],
  ["Côte de porc grillée", 230, 28, 0, 13, 1, ["cote de porc", "porc"], ["côte", 150]],
  ["Filet mignon de porc", 160, 29, 0, 4.5, 150, ["filet mignon", "filet de porc"]],
  ["Rôti de porc", 180, 28, 0, 7, 120, ["roti de porc"]],
  ["Gigot d'agneau rôti", 230, 27, 0, 13.5, 150, ["agneau", "gigot"]],
  ["Saucisse de Toulouse cuite", 300, 16, 1, 26, 1, ["saucisse"], ["saucisse", 100]],
  ["Saucisse de Strasbourg", 270, 12, 2, 24, 2, ["knacki", "saucisse de strasbourg"], ["saucisse", 35]],
  ["Merguez cuite", 300, 16, 1, 26, 2, ["merguez"], ["merguez", 50]],
  ["Jambon blanc", 115, 21, 1, 3, 2, ["jambon", "jambon cuit"], ["tranche", 40]],
  ["Jambon cru", 250, 27, 0.5, 16, 2, ["jambon de bayonne", "jambon serrano", "prosciutto"], ["tranche", 20]],
  ["Bacon grillé", 400, 30, 1, 31, 2, ["bacon"], ["tranche", 10]],
  ["Lardons cuits", 300, 17, 0.5, 26, 50, ["lardons"]],
  ["Chorizo", 455, 24, 2, 39, 30, []],
  ["Saucisson sec", 410, 26, 2, 33, 30, ["saucisson"]],
  ["Pâté", 320, 13, 3, 28, 40, ["pate de campagne", "terrine"]],
  // Poissons, fruits de mer
  ["Saumon cuit (four, poêle)", 206, 22, 0, 13, 130, ["saumon", "pave de saumon", "saumon cuit", "saumon grille"]],
  ["Saumon fumé", 180, 22, 0, 10, 2, ["saumon fume"], ["tranche", 25]],
  ["Saumon cru (tartare, sushi)", 180, 20, 0, 11, 100, ["saumon cru", "tartare de saumon"]],
  ["Thon au naturel (boîte)", 116, 26, 0, 1, 1, ["thon", "thon en boite", "thon au naturel"], ["boîte", 110]],
  ["Thon à l'huile (égoutté)", 190, 26, 0, 9.5, 1, ["thon a l'huile"], ["boîte", 110]],
  ["Steak de thon grillé", 140, 30, 0, 1.5, 150, ["steak de thon", "thon frais"]],
  ["Cabillaud vapeur", 95, 21, 0, 0.8, 150, ["cabillaud", "poisson blanc", "colin", "lieu", "merlu", "cabillaud poche"]],
  ["Cabillaud poêlé", 120, 22, 0, 3.5, 150, ["poisson poele", "cabillaud poele"]],
  ["Poisson pané", 220, 13, 18, 11, 2, ["poisson pane", "fish stick", "batonnet de poisson"], ["pièce", 50]],
  ["Crevettes cuites", 99, 24, 0, 0.3, 100, ["crevettes", "gambas"]],
  ["Sardines à l'huile (égouttées)", 210, 24, 0, 12.5, 1, ["sardines", "sardine"], ["boîte", 90]],
  ["Maquereau", 220, 20, 0, 15.5, 100, ["maquereaux"]],
  ["Moules cuites", 120, 18, 4, 3.5, 200, ["moules", "moules marinieres"]],
  ["Surimi", 100, 7, 14, 1.5, 4, ["batonnet de surimi"], ["bâtonnet", 17]],
  ["Sushi / maki", 150, 6, 25, 2.5, 6, ["sushi", "sushis", "maki", "makis", "california"], ["pièce", 30]],
  // Œufs (≈ 55 g par œuf sans coquille ; la matière grasse est comptée pour au plat, brouillé, omelette)
  ["Œuf dur", 145, 12.5, 0.7, 10, 2, ["oeuf", "oeufs", "oeufs durs"], ["œuf", 55]],
  ["Œuf à la coque", 145, 12.5, 0.7, 10, 2, ["oeuf coque", "oeufs a la coque", "oeuf mollet"], ["œuf", 55]],
  ["Œuf poché", 143, 12.5, 0.7, 9.5, 2, ["oeufs poches"], ["œuf", 55]],
  ["Œuf au plat", 196, 13.6, 0.8, 15, 2, ["oeufs au plat", "oeuf sur le plat", "oeufs sur le plat", "oeuf frit", "oeufs frits"], ["œuf", 55]],
  ["Œufs brouillés", 165, 11, 1.6, 13, 2, ["oeuf brouille", "oeufs brouilles"], ["œuf", 65]],
  ["Omelette nature", 155, 11, 0.8, 12, 2, ["omelette"], ["œuf", 62]],
  ["Blanc d'œuf", 52, 11, 0.7, 0.2, 3, ["blanc d'oeuf", "blancs d'oeufs"], ["blanc", 33]],
  // Protéines végétales, compléments
  ["Tofu nature", 145, 15.5, 2.5, 8.5, 100, ["tofu"]],
  ["Tofu poêlé", 180, 17, 2, 11.5, 100, ["tofu fume", "tofu grille"]],
  ["Tempeh", 190, 19, 9, 11, 100, []],
  ["Steak végétal", 210, 17, 8, 12, 1, ["steak vegetal", "steak vegan"], ["steak", 100]],
  ["Protéine en poudre (whey)", 380, 78, 8, 5, 1, ["whey", "proteine", "shaker"], ["dose", 30]],
  ["Barre protéinée", 360, 33, 35, 12, 1, ["barre proteinee"], ["barre", 60]],
  // Produits laitiers
  ["Fromage blanc 0 %", 49, 7.6, 4.1, 0.2, 150, ["fromage blanc"]],
  ["Fromage blanc 3 %", 75, 7, 4, 3.2, 150, ["fromage blanc entier"]],
  ["Skyr", 63, 11, 4, 0.2, 1, [], ["pot", 150]],
  ["Yaourt nature", 61, 4.2, 5.2, 2.8, 1, ["yaourt", "yogourt", "yaourt nature"], ["pot", 125]],
  ["Yaourt aux fruits", 95, 3.8, 14, 2.5, 1, ["yaourt sucre", "yaourt fruits"], ["pot", 125]],
  ["Yaourt grec", 120, 6, 4, 9, 1, [], ["pot", 150]],
  ["Petit-suisse", 110, 9, 3.5, 6.5, 2, ["petit suisse", "petits suisses"], ["pot", 60]],
  ["Lait demi-écrémé", 46, 3.3, 4.8, 1.6, 1, ["lait"], ["verre", 200]],
  ["Lait entier", 65, 3.2, 4.7, 3.6, 1, [], ["verre", 200]],
  ["Lait écrémé", 34, 3.4, 4.8, 0.1, 1, [], ["verre", 200]],
  ["Lait d'amande sans sucre", 15, 0.5, 0.3, 1.1, 1, ["lait d'amande"], ["verre", 200]],
  ["Lait d'avoine", 45, 0.5, 7, 1.5, 1, ["boisson avoine"], ["verre", 200]],
  ["Emmental", 380, 28, 0, 30, 30, ["gruyere"]],
  ["Fromage râpé", 380, 28, 0, 30, 30, ["fromage rape"]],
  ["Comté", 410, 27, 0, 34, 30, ["fromage", "beaufort"]],
  ["Camembert", 270, 20, 0.5, 21, 1, ["brie", "coulommiers"], ["portion", 30]],
  ["Fromage de chèvre", 300, 19, 1, 25, 30, ["chevre", "buche de chevre"]],
  ["Feta", 265, 14, 1, 22.5, 40, []],
  ["Mozzarella", 250, 18, 1, 19.5, 1, [], ["boule", 125]],
  ["Parmesan", 392, 35, 0, 28, 10, []],
  ["Fromage à raclette", 350, 24, 0.5, 28, 5, ["raclette"], ["tranche", 30]],
  ["Beurre", 745, 0.7, 0.6, 82, 10, []],
  ["Crème fraîche épaisse 30 %", 290, 2.4, 3, 30, 1, ["creme fraiche", "creme"], ["c. à soupe", 15]],
  ["Crème fraîche légère 15 %", 165, 3, 4, 15, 1, ["creme legere"], ["c. à soupe", 15]],
  ["Glace (crème glacée)", 210, 3.5, 25, 10.5, 2, ["glace", "creme glacee"], ["boule", 50]],
  // Riz, pâtes, céréales (poids cuit)
  ["Riz blanc cuit", 130, 2.7, 28, 0.3, 200, ["riz", "riz blanc"]],
  ["Riz basmati cuit", 130, 2.7, 28, 0.3, 200, ["riz basmati", "basmati", "riz thai"]],
  ["Riz complet cuit", 123, 2.7, 25.5, 1, 200, ["riz complet"]],
  ["Riz cantonais", 165, 5, 25, 5, 250, ["riz frit", "riz cantonnais"]],
  ["Pâtes cuites", 155, 5.5, 30, 0.9, 200, ["pates", "spaghetti", "penne", "coquillettes", "tagliatelles", "fusilli"]],
  ["Pâtes complètes cuites", 140, 5.5, 26, 1.2, 200, ["pates completes"]],
  ["Pâtes bolognaise", 135, 7, 17, 4, 350, ["spaghetti bolognaise", "bolognaise"]],
  ["Pâtes carbonara", 220, 9, 22, 10.5, 350, ["carbonara"]],
  ["Lasagnes", 150, 8, 13, 7, 300, ["lasagne"]],
  ["Nouilles sautées (wok)", 140, 6, 20, 4, 350, ["nouilles", "wok", "pad thai"]],
  ["Quinoa cuit", 120, 4.4, 21, 1.9, 150, ["quinoa"]],
  ["Boulgour cuit", 85, 3, 18, 0.2, 200, ["boulgour"]],
  ["Semoule cuite", 112, 3.8, 23, 0.2, 200, ["semoule"]],
  ["Lentilles cuites", 116, 9, 20, 0.4, 200, ["lentilles"]],
  ["Pois chiches cuits", 164, 8.9, 27, 2.6, 150, ["pois chiches"]],
  ["Haricots rouges cuits", 127, 8.7, 22.8, 0.5, 150, ["haricots rouges"]],
  ["Haricots blancs cuits", 105, 7.5, 17, 0.5, 150, ["haricots blancs", "flageolets"]],
  // Pommes de terre selon la cuisson
  ["Pommes de terre vapeur", 85, 2, 18.5, 0.1, 200, ["pomme de terre", "pommes de terre", "patate", "patates", "pommes de terre a l'eau"]],
  ["Pommes de terre au four (avec huile)", 140, 2.5, 21, 5, 200, ["pommes de terre roties", "potatoes", "pommes de terre au four"]],
  ["Pommes de terre sautées", 150, 2.5, 20, 6.5, 200, ["pommes de terre sautees", "pommes sautees"]],
  ["Purée de pommes de terre", 100, 2, 13.5, 4, 200, ["puree"]],
  ["Frites au four", 200, 3, 30, 7, 150, ["frites four", "frites surgelees"]],
  ["Frites (friteuse, fast-food)", 300, 3.4, 37, 15, 150, ["frites", "frite"]],
  ["Gratin dauphinois", 140, 3, 13, 8.5, 200, ["gratin de pommes de terre"]],
  ["Chips", 535, 6, 50, 34, 30, []],
  ["Patate douce cuite", 86, 1.6, 20, 0.1, 200, ["patate douce"]],
  // Pains, petit-déjeuner
  ["Baguette", 270, 9, 55, 1.3, 60, ["pain", "pain blanc", "tradition"]],
  ["Pain complet", 245, 9, 44, 3, 2, ["pain aux cereales", "pain complet"], ["tranche", 35]],
  ["Pain de mie", 270, 8, 49, 4, 2, [], ["tranche", 25]],
  ["Pain de mie complet", 250, 9, 43, 4.5, 2, [], ["tranche", 25]],
  ["Pain burger", 280, 9, 50, 5, 1, ["bun"], ["pain", 60]],
  ["Biscotte", 410, 11, 74, 6.5, 2, ["biscottes"], ["biscotte", 9]],
  ["Galette de riz", 390, 8, 81, 3, 2, ["galettes de riz"], ["galette", 8]],
  ["Wrap (tortilla)", 300, 8, 50, 7, 1, ["wrap", "tortilla"], ["wrap", 60]],
  ["Flocons d'avoine", 370, 13, 60, 7, 50, ["avoine", "porridge"]],
  ["Muesli", 370, 9, 64, 6, 50, []],
  ["Granola", 450, 9, 62, 17, 50, []],
  ["Céréales (corn flakes)", 380, 7, 84, 1, 40, ["cereales", "corn flakes"]],
  ["Croissant", 410, 8, 45, 21, 1, [], ["croissant", 50]],
  ["Pain au chocolat", 420, 7.5, 47, 22, 1, ["chocolatine"], ["pièce", 65]],
  ["Brioche", 360, 8, 50, 14, 2, [], ["tranche", 30]],
  ["Crêpe nature", 210, 6.5, 27, 8.5, 2, ["crepe", "crepes"], ["crêpe", 60]],
  ["Pancake", 230, 6, 30, 9, 2, ["pancakes"], ["pancake", 40]],
  ["Gaufre", 400, 6.5, 50, 19, 1, ["gaufres"], ["gaufre", 60]],
  // Légumes selon la cuisson
  ["Brocolis vapeur", 35, 2.4, 4, 0.4, 150, ["brocolis", "brocoli"]],
  ["Haricots verts vapeur", 30, 1.8, 4.5, 0.2, 150, ["haricots verts"]],
  ["Courgette vapeur", 18, 1.2, 2.5, 0.3, 150, ["courgette", "courgettes"]],
  ["Courgette poêlée (huile)", 55, 1.2, 2.5, 4.5, 150, ["courgettes poelees"]],
  ["Légumes vapeur (mélange)", 30, 1.8, 4.5, 0.3, 200, ["legumes", "legumes vapeur"]],
  ["Légumes poêlés (huile)", 70, 2, 7, 4, 200, ["poelee de legumes", "legumes poeles", "legumes sautes"]],
  ["Ratatouille", 55, 1.3, 5.5, 3, 200, []],
  ["Chou-fleur vapeur", 25, 2, 3, 0.3, 150, ["chou fleur"]],
  ["Épinards cuits", 23, 3, 1.5, 0.3, 150, ["epinards"]],
  ["Poireaux cuits", 25, 1.2, 4, 0.3, 150, ["poireau", "poireaux"]],
  ["Aubergine poêlée (huile)", 110, 1, 4, 10, 150, ["aubergine", "aubergines"]],
  ["Carottes râpées", 36, 0.8, 7, 0.2, 100, ["carotte", "carottes", "carottes crues"]],
  ["Carottes cuites", 30, 0.7, 6, 0.2, 150, []],
  ["Champignons crus", 22, 3.1, 0.5, 0.3, 100, ["champignons"]],
  ["Champignons poêlés", 45, 3, 1, 3.5, 100, []],
  ["Tomate", 18, 0.9, 3, 0.2, 1, ["tomates"], ["tomate", 120]],
  ["Tomates cerises", 22, 1, 3.5, 0.3, 100, ["tomate cerise"]],
  ["Salade verte", 15, 1.3, 1.5, 0.2, 50, ["salade", "laitue", "mesclun", "roquette"]],
  ["Concombre", 13, 0.6, 2.2, 0.1, 100, []],
  ["Poivron", 26, 1, 4.5, 0.3, 100, ["poivrons"]],
  ["Oignon", 40, 1.2, 8, 0.2, 50, ["oignons"]],
  ["Petits pois cuits", 80, 5.4, 10, 0.4, 100, ["petits pois"]],
  ["Maïs (boîte)", 90, 3, 16, 1.5, 80, ["mais"]],
  ["Edamame", 120, 11, 7, 5, 100, []],
  ["Avocat", 160, 2, 2, 15, 0.5, ["avocats"], ["avocat", 140]],
  ["Soupe de légumes", 35, 1, 5, 1.2, 1, ["soupe", "veloute"], ["bol", 300]],
  // Fruits
  ["Banane", 90, 1.1, 20, 0.3, 1, ["bananes"], ["banane", 120]],
  ["Pomme", 52, 0.3, 12, 0.2, 1, ["pommes"], ["pomme", 150]],
  ["Poire", 55, 0.4, 12.5, 0.1, 1, ["poires"], ["poire", 160]],
  ["Orange", 47, 0.9, 9.5, 0.1, 1, ["oranges"], ["orange", 150]],
  ["Clémentine", 47, 0.8, 10, 0.2, 2, ["clementines", "mandarine", "mandarines"], ["clémentine", 60]],
  ["Kiwi", 60, 1.1, 11, 0.5, 1, ["kiwis"], ["kiwi", 75]],
  ["Pêche", 40, 0.9, 8.5, 0.2, 1, ["peche", "nectarine", "brugnon"], ["pêche", 140]],
  ["Abricot", 45, 0.9, 9, 0.1, 3, ["abricots"], ["abricot", 40]],
  ["Fraises", 32, 0.7, 6, 0.3, 150, ["fraise"]],
  ["Framboises", 43, 1.2, 5, 0.3, 100, ["framboise"]],
  ["Myrtilles", 57, 0.7, 12, 0.3, 100, ["myrtille", "fruits rouges"]],
  ["Raisin", 70, 0.7, 16, 0.2, 100, []],
  ["Cerises", 60, 1, 13, 0.3, 100, ["cerise"]],
  ["Ananas", 52, 0.5, 11.5, 0.2, 150, []],
  ["Mangue", 62, 0.8, 13.5, 0.3, 150, []],
  ["Melon", 35, 0.8, 7.5, 0.2, 250, []],
  ["Pastèque", 30, 0.6, 7, 0.2, 300, ["pasteque"]],
  ["Dattes", 280, 2.5, 66, 0.4, 3, ["datte"], ["datte", 8]],
  ["Raisins secs", 300, 3, 70, 0.5, 30, []],
  ["Compote sans sucre ajouté", 50, 0.3, 11.5, 0.1, 1, ["compote"], ["pot", 100]],
  // Matières grasses, oléagineux
  ["Huile d'olive", 900, 0, 0, 100, 1, ["huile", "huile de colza", "huile de tournesol"], ["c. à soupe", 10]],
  ["Beurre de cacahuète", 600, 25, 15, 50, 1, ["beurre de cacahuete", "peanut butter"], ["c. à soupe", 15]],
  ["Amandes", 610, 21, 9, 52, 30, ["amande"]],
  ["Noix", 700, 15, 7, 65, 30, ["cerneaux de noix"]],
  ["Noix de cajou", 590, 18, 27, 46, 30, ["cajou"]],
  ["Noisettes", 650, 15, 7, 62, 30, []],
  ["Cacahuètes", 600, 25, 12, 49, 30, ["cacahuetes"]],
  ["Graines de chia", 490, 17, 8, 31, 15, ["chia", "graines de lin"]],
  // Sucré, snacks
  ["Chocolat noir 70 %", 580, 8, 33, 42, 4, ["chocolat", "chocolat noir"], ["carré", 5]],
  ["Chocolat au lait", 540, 7, 56, 31, 4, [], ["carré", 5]],
  ["Pâte à tartiner (type Nutella)", 540, 6, 57, 31, 1, ["nutella", "pate a tartiner"], ["c. à soupe", 15]],
  ["Miel", 320, 0.4, 80, 0, 1, [], ["c. à soupe", 20]],
  ["Sucre", 400, 0, 100, 0, 1, ["sucre en poudre", "morceau de sucre"], ["c. à café", 5]],
  ["Confiture", 250, 0.4, 60, 0.1, 1, [], ["c. à soupe", 20]],
  ["Biscuits (type petit-beurre)", 440, 7.5, 75, 12, 4, ["biscuit", "biscuits", "petit beurre"], ["biscuit", 8]],
  ["Cookie", 490, 5.5, 64, 23, 1, ["cookies"], ["cookie", 30]],
  ["Gâteau (part)", 400, 6, 50, 19, 1, ["gateau", "cake"], ["part", 80]],
  ["Brownie", 450, 5.5, 55, 23, 1, [], ["part", 60]],
  ["Barre chocolatée (type Mars, Snickers)", 480, 6, 60, 23, 1, ["barre chocolatee", "mars", "snickers", "twix", "kinder bueno"], ["barre", 50]],
  ["Bonbons", 350, 5, 80, 0.5, 30, ["haribo"]],
  // Sauces
  ["Ketchup", 110, 1.2, 25, 0.2, 1, [], ["c. à soupe", 15]],
  ["Mayonnaise", 700, 1.2, 1.5, 76, 1, ["mayo"], ["c. à soupe", 15]],
  ["Moutarde", 150, 7, 5, 11, 1, [], ["c. à café", 5]],
  ["Vinaigrette", 400, 0.3, 3, 42, 1, ["sauce salade"], ["c. à soupe", 15]],
  ["Sauce soja", 55, 8, 5, 0.1, 1, [], ["c. à soupe", 15]],
  ["Sauce barbecue", 160, 1, 38, 0.5, 1, ["barbecue", "bbq"], ["c. à soupe", 15]],
  ["Pesto", 460, 5, 5, 46, 1, [], ["c. à soupe", 20]],
  ["Sauce tomate", 50, 1.5, 8, 1.5, 100, ["coulis de tomate"]],
  ["Houmous", 280, 8, 13, 22, 50, ["hummus"]],
  ["Guacamole", 155, 2, 5, 14, 50, []],
  // Plats et fast-food (valeurs moyennes)
  ["Pizza (part)", 260, 11, 30, 10, 4, ["pizza", "pizzas"], ["part", 100]],
  ["Burger (fast-food)", 250, 13, 25, 11, 1, ["burger", "hamburger"], ["burger", 220]],
  ["Cheeseburger", 260, 14, 28, 11, 1, [], ["burger", 120]],
  ["Tacos (français)", 230, 10, 24, 10.5, 1, ["tacos"], ["tacos", 450]],
  ["Kebab (sandwich complet)", 230, 11, 22, 11, 1, ["kebab", "doner"], ["kebab", 400]],
  ["Sandwich jambon-beurre", 270, 12, 30, 11, 1, ["jambon beurre", "sandwich"], ["sandwich", 200]],
  ["Sandwich poulet crudités", 220, 11, 26, 7.5, 1, ["sandwich poulet"], ["sandwich", 220]],
  ["Croque-monsieur", 270, 14, 22, 14, 1, ["croque monsieur"], ["croque", 150]],
  ["Quiche lorraine", 270, 10, 18, 18, 1, ["quiche"], ["part", 150]],
  ["Salade César", 160, 10, 6, 11, 300, ["salade cesar"]],
  ["Poke bowl", 140, 8, 17, 4.5, 1, ["poke"], ["bowl", 450]],
  ["Chili con carne", 120, 8, 10, 5, 300, ["chili"]],
  ["Couscous (plat complet)", 140, 8, 15, 5, 400, ["couscous"]],
  ["Hachis parmentier", 130, 7, 11, 6.5, 300, ["parmentier"]],
  ["Poulet au curry (sans riz)", 150, 15, 4, 8.5, 250, ["curry", "poulet curry"]],
  // Boissons (pour 100 ml)
  ["Jus d'orange", 45, 0.7, 10, 0.2, 1, ["jus", "jus de fruits"], ["verre", 200]],
  ["Smoothie", 55, 0.7, 12, 0.3, 1, [], ["verre", 250]],
  ["Coca-Cola", 42, 0, 10.6, 0, 1, ["coca", "soda", "pepsi", "fanta", "ice tea"], ["canette", 330]],
  ["Coca-Cola zéro", 0.3, 0, 0, 0, 1, ["coca zero", "soda zero", "pepsi max"], ["canette", 330]],
  ["Bière", 43, 0.4, 3.5, 0, 1, ["biere"], ["demi (25 cl)", 250]],
  ["Vin", 85, 0.1, 2.6, 0, 1, ["vin rouge", "vin blanc", "rose"], ["verre", 125]],
  ["Café", 2, 0.1, 0, 0, 1, ["expresso", "the", "cafe noir"], ["tasse", 100]],
  ["Café au lait (latte)", 42, 2.6, 4, 1.6, 1, ["latte", "cappuccino", "cafe au lait"], ["tasse", 250]],
].map(([name, kcal, protein, carbs, fat, portion, aliases, unit]) => ({
  name, kcal, protein, carbs, fat, portion, aliases,
  unit: unit ? { label: unit[0], g: unit[1] } : null,
}));

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

// Poids de la portion habituelle, en grammes.
function defaultGrams(food) {
  return food.unit ? food.unit.g * food.portion : food.portion;
}

// « 2 œufs », « 1 c. à soupe » : pluriel simple pour les libellés d'un seul mot.
function unitLabel(unit, count) {
  const label = unit.label;
  return count > 1 && !/[sx]$/.test(label) && !/[\s.(]/.test(label) ? label + "s" : label;
}

// Valeurs d'un aliment de la table pour une quantité en grammes.
function foodValues(food, grams, name = food.name) {
  const r = grams / 100;
  return { name, grams, kcal: food.kcal * r, protein: food.protein * r, carbs: food.carbs * r, fat: food.fat * r };
}
