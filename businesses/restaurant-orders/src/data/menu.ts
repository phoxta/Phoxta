// Saveur menu — demo catalogue (a live deployment pulls this from the Phoxta
// backend; see businesses/CONTRACT.md). Imagery via Unsplash so the demo renders.
export type ModOption = { label: string; price: number }; // price in CENTS (server-authoritative)
export type ModGroup = { name: string; required?: boolean; options: ModOption[] };

export type Dish = {
    id: string;
    name: string;
    desc: string;
    price: number;
    category: string;
    img: string;
    tags: string[];
    badge?: string;
    popular?: boolean;
    modifiers?: ModGroup[];
};

const u = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop`;

export const dishes: Dish[] = [
    { id: "duck", name: "Seared Duck Breast", desc: "Cherry gastrique, roasted heritage beets, thyme jus and micro greens.", price: 42, category: "Mains", img: u("photo-1504674900247-0877df9cc836"), tags: ["GF"], badge: "Chef's Pick", popular: true },
    { id: "risotto", name: "Black Truffle Risotto", desc: "Carnaroli rice slow-folded with aged parmesan and shaved winter truffle.", price: 36, category: "Mains", img: u("photo-1565299624946-b28f40a0ae38"), tags: ["V"] },
    { id: "tenderloin", name: "Aged Beef Tenderloin", desc: "Red-wine reduction, gratin dauphinois and charred asparagus.", price: 54, category: "Mains", img: u("photo-1544025162-d76694265947"), tags: ["GF"], popular: true },
    { id: "salmon", name: "Herb-Crusted Salmon", desc: "Fennel purée, lemon beurre blanc and a tangle of garden asparagus.", price: 38, category: "Seafood", img: u("photo-1467003909585-2f8a72700288"), tags: ["GF", "DF"] },
    { id: "bisque", name: "Lobster Bisque", desc: "Cognac cream, saffron threads, chive oil and a warm brioche crouton.", price: 28, category: "Seafood", img: u("photo-1551504734-5ee1c4a1479b"), tags: ["GF"] },
    { id: "scallops", name: "Hand-Dived Scallops", desc: "Cauliflower velouté, brown-butter hazelnuts and crisp pancetta.", price: 34, category: "Seafood", img: u("photo-1559737558-2f5a35f4523b"), tags: ["GF"], badge: "Seasonal" },
    { id: "burrata", name: "Heirloom Burrata", desc: "Vine tomatoes, basil oil, aged balsamic and toasted sourdough.", price: 22, category: "Starters", img: u("photo-1505253716362-afaea1d3d1af"), tags: ["V"] },
    { id: "tartare", name: "Beef Tartare", desc: "Hand-cut fillet, cured yolk, capers, shallot and crostini.", price: 26, category: "Starters", img: u("photo-1432139555190-58524dae6a55"), tags: [] },
    { id: "mushroom", name: "Wild Mushroom Tart", desc: "Forest mushrooms, taleggio and truffle honey on flaky pastry.", price: 20, category: "Starters", img: u("photo-1473093295043-cdd812d0e601"), tags: ["V"] },
    { id: "brulee", name: "Vanilla Crème Brûlée", desc: "Madagascar vanilla custard, caramelised sugar and fresh berries.", price: 16, category: "Desserts", img: u("photo-1488477181946-6428a0291777"), tags: ["V", "GF"], popular: true },
    { id: "tart", name: "Dark Chocolate Tart", desc: "70% single-origin ganache, sea salt and crème fraîche.", price: 17, category: "Desserts", img: u("photo-1606313564200-e75d5e30476c"), tags: ["V"] },
    { id: "sorbet", name: "Seasonal Sorbet Trio", desc: "Three house sorbets churned daily from market fruit.", price: 14, category: "Desserts", img: u("photo-1488900128323-21503983a07e"), tags: ["V", "DF", "GF"] },
    { id: "burgundy", name: "Côte de Nuits, Pinot Noir", desc: "Burgundy, France — silky red with cherry and forest-floor notes.", price: 19, category: "Cellar", img: u("photo-1510812431401-41d2bd2722f3"), tags: ["Glass"] },
    { id: "chablis", name: "Premier Cru Chablis", desc: "Crisp, mineral Chardonnay — a classic pairing for seafood.", price: 21, category: "Cellar", img: u("photo-1553361371-9b22f78e8b1d"), tags: ["Glass"] },
    { id: "champagne", name: "Grower Champagne", desc: "Brut, blanc de blancs — fine bead, citrus and brioche.", price: 24, category: "Cellar", img: u("photo-1547595628-c61a29f496f0"), tags: ["Glass"], badge: "Sommelier" },
];

export const categories: Dish["category"][] = ["Starters", "Mains", "Seafood", "Desserts", "Cellar"];
export const money = (n: number) => `$${n.toFixed(0)}`;
