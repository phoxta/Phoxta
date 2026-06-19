// Aurelia catalogue — demo data (a live store pulls this from the Phoxta backend;
// see businesses/CONTRACT.md). Images come from the Phoxta design assets.
export type Product = {
    id: string;
    title: string;
    brand: string;
    price: number;
    oldPrice?: number;
    img: string;
    category: "woman" | "man";
    type: string;
    isNew?: boolean;
    sale?: boolean;
    colors: string[];
    sizes: string[];
};

const img = (n: number) => `/assets/imgs/pages/product/product-${n}.webp`;

export const products: Product[] = [
    { id: "tailored-wool-coat", title: "Tailored Wool Coat", brand: "Aurelia Atelier", price: 320, img: img(1), category: "woman", type: "Outerwear", isNew: true, colors: ["Camel", "Charcoal"], sizes: ["XS", "S", "M", "L"] },
    { id: "silk-slip-dress", title: "Silk Slip Dress", brand: "Maison Lune", price: 185, img: img(2), category: "woman", type: "Dresses", isNew: true, colors: ["Ivory", "Noir"], sizes: ["XS", "S", "M", "L"] },
    { id: "relaxed-linen-shirt", title: "Relaxed Linen Shirt", brand: "Aurelia Studio", price: 95, img: img(3), category: "man", type: "Shirts", colors: ["White", "Sand"], sizes: ["S", "M", "L", "XL"] },
    { id: "cashmere-knit", title: "Cashmere Knit Sweater", brand: "Maison Lune", price: 180, oldPrice: 240, sale: true, img: img(4), category: "woman", type: "Knitwear", colors: ["Oat", "Slate"], sizes: ["XS", "S", "M", "L"] },
    { id: "pleated-midi-skirt", title: "Pleated Midi Skirt", brand: "Aurelia Atelier", price: 130, img: img(5), category: "woman", type: "Skirts", colors: ["Olive", "Black"], sizes: ["XS", "S", "M", "L"] },
    { id: "structured-blazer", title: "Structured Blazer", brand: "Aurelia Studio", price: 275, img: img(6), category: "man", type: "Tailoring", isNew: true, colors: ["Navy", "Stone"], sizes: ["S", "M", "L", "XL"] },
    { id: "wide-leg-trousers", title: "Wide-Leg Trousers", brand: "Maison Lune", price: 145, img: img(7), category: "woman", type: "Trousers", colors: ["Cream", "Black"], sizes: ["XS", "S", "M", "L"] },
    { id: "merino-roll-neck", title: "Merino Roll-Neck", brand: "Aurelia Studio", price: 96, oldPrice: 120, sale: true, img: img(8), category: "man", type: "Knitwear", colors: ["Charcoal", "Camel"], sizes: ["S", "M", "L", "XL"] },
    { id: "belted-trench", title: "Belted Trench Coat", brand: "Aurelia Atelier", price: 360, img: img(9), category: "woman", type: "Outerwear", colors: ["Sand", "Khaki"], sizes: ["XS", "S", "M", "L"] },
    { id: "cotton-poplin-dress", title: "Cotton Poplin Dress", brand: "Maison Lune", price: 160, img: img(10), category: "woman", type: "Dresses", colors: ["White", "Sky"], sizes: ["XS", "S", "M", "L"] },
    { id: "selvedge-denim-jacket", title: "Selvedge Denim Jacket", brand: "Aurelia Studio", price: 210, img: img(11), category: "man", type: "Outerwear", isNew: true, colors: ["Indigo"], sizes: ["S", "M", "L", "XL"] },
    { id: "ribbed-cardigan", title: "Ribbed Knit Cardigan", brand: "Maison Lune", price: 140, oldPrice: 175, sale: true, img: img(12), category: "woman", type: "Knitwear", colors: ["Ecru", "Rose"], sizes: ["XS", "S", "M", "L"] },
];

export const detailGallery = [1, 2, 3, 4, 5, 6].map((n) => `/assets/imgs/pages/product/product-details-${n}.webp`);
export const money = (n: number) => `$${n.toFixed(0)}`;
export const getProduct = (id?: string) => products.find((p) => p.id === id) ?? products[0];
