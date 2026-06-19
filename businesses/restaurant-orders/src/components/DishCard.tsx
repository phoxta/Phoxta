import { useState } from "react";
import { money, type Dish } from "@/data/menu";
import DishCustomize from "@/components/DishCustomize";

export default function DishCard({ dish }: { dish: Dish }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="dish-card">
            <div className="dish-card-img">
                <img src={dish.img} alt={dish.name} loading="lazy" />
                {dish.badge && <div className="dish-badge"><span className={dish.popular ? "popular" : ""}>{dish.badge}</span></div>}
            </div>
            <div className="dish-card-body">
                <h3>{dish.name}</h3>
                <p className="dish-desc">{dish.desc}</p>
                <div className="dish-card-footer">
                    <div className="dish-price">{money(dish.price)}</div>
                    <div className="dish-tags">{dish.tags.map((t) => <span key={t}>{t}</span>)}</div>
                </div>
                <button className="btn-accent dish-add" onClick={() => setOpen(true)}>
                    <i className="fas fa-plus" /> Add to Order
                </button>
            </div>
            {open && <DishCustomize dish={dish} onClose={() => setOpen(false)} />}
        </div>
    );
}
