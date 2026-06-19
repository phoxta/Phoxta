// Demo catalogue for the Gearo storefront (images ship in /public/images/shop).
// A real deployment would pull these from the Phoxta backend (see businesses/CONTRACT.md).
export type Product = {
    id: number;
    /** Live (DB) product UUID when from the Phoxta backend; used for orders. */
    dbId?: string;
    title: string;
    price: number;
    oldPrice?: number;
    sale?: string;
    img: string;
    imgHover: string;
    colors: { name: string; cls: string; img?: string }[];
    category: string;
};

const C = (name: string, cls: string, img?: string) => ({ name, cls, img });

export const products: Product[] = [
    { id: 1, title: "Ergonomic Chair Pro", price: 79.99, img: "/images/shop/product-1.jpg", imgHover: "/images/shop/product-1.1.jpg", colors: [C("Light Blue", "bg-light-blue"), C("Blue", "bg-light-blue-2")], category: "Office Chairs" },
    { id: 2, title: "Adjustable Laptop Stand", price: 79.99, oldPrice: 98, sale: "-25%", img: "/images/shop/product-2.jpg", imgHover: "/images/shop/product-2.1.jpg", colors: [C("Light Blue", "bg-light-blue"), C("Grey", "bg-light-grey")], category: "Tech Accessories" },
    { id: 3, title: "Minimal Laptop Stand", price: 89.99, oldPrice: 98, sale: "-25%", img: "/images/shop/product-3.jpg", imgHover: "/images/shop/product-3.1.jpg", colors: [C("Light Orange", "bg-light-orange"), C("Grey", "bg-light-grey")], category: "Tech Accessories" },
    { id: 4, title: "Wireless Charging Dock", price: 49.99, img: "/images/shop/product-4.jpg", imgHover: "/images/shop/product-4.1.jpg", colors: [C("Black", "bg-dark"), C("White", "bg-white")], category: "Tech Accessories" },
    { id: 5, title: "Storage Cabinet", price: 149.0, img: "/images/shop/product-5.jpg", imgHover: "/images/shop/product-5.1.jpg", colors: [C("Wood", "bg-light-orange")], category: "Storage Solutions" },
    { id: 6, title: "Desk Organizer Set", price: 29.99, oldPrice: 39, sale: "-23%", img: "/images/shop/product-6.jpg", imgHover: "/images/shop/product-6.1.jpg", colors: [C("Grey", "bg-light-grey"), C("Blue", "bg-light-blue")], category: "Office Supplies" },
    { id: 7, title: "Standing Desk Frame", price: 299.0, img: "/images/shop/product-7.jpg", imgHover: "/images/shop/product-7.1.jpg", colors: [C("Black", "bg-dark"), C("White", "bg-white")], category: "Office Furniture" },
    { id: 8, title: "Task Lamp LED", price: 39.99, img: "/images/shop/product-8.jpg", imgHover: "/images/shop/product-8.1.jpg", colors: [C("White", "bg-white"), C("Black", "bg-dark")], category: "Lighting" },
];

export const money = (n: number) => `$${n.toFixed(2)}`;
