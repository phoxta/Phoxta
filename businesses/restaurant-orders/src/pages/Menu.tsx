import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { money, type Dish } from "@/data/menu";
import { useMenu } from "@/util/menu";
import DishCustomize from "@/components/DishCustomize";

const DIETS = ["All", "V", "GF", "DF"];

export default function Menu() {
    const { dishes } = useMenu();
    const [customizing, setCustomizing] = useState<Dish | null>(null);
    const [cat, setCat] = useState<string>("All");
    const [diet, setDiet] = useState("All");

    // Category tabs are derived from the live menu, so owner-defined sections show up.
    const categories = useMemo(() => Array.from(new Set(dishes.map((d) => d.category).filter(Boolean))), [dishes]);

    const list = useMemo(
        () => dishes.filter((d) => (cat === "All" || d.category === cat) && (diet === "All" || d.tags.includes(diet))),
        [dishes, cat, diet],
    );

    return (
        <Layout>
            <header className="page-header">
                <div className="container inner">
                    <h1 className="serif">Our Menu</h1>
                    <p>Seasonal dishes crafted daily. Add anything to your order for pickup or dine-in.</p>
                </div>
            </header>

            <section className="menu-section">
                <div className="container">
                    <div className="menu-cats">
                        {["All", ...categories].map((c) => (
                            <button key={c} className={`menu-cat${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</button>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-light)", alignSelf: "center" }}>
                            <i className="fas fa-robot" style={{ color: "var(--accent)", marginRight: 6 }} />Dietary filter
                        </span>
                        {DIETS.map((d) => (
                            <button key={d} className={`menu-cat${diet === d ? " active" : ""}`} style={{ padding: "6px 16px" }} onClick={() => setDiet(d)}>
                                {d === "V" ? "Vegetarian" : d === "GF" ? "Gluten-Free" : d === "DF" ? "Dairy-Free" : d}
                            </button>
                        ))}
                    </div>

                    <div className="menu-list">
                        {list.map((d) => (
                            <div className="menu-row" key={d.id}>
                                <img src={d.img} alt={d.name} loading="lazy" />
                                <div className="menu-row-main">
                                    <h3 className="serif">
                                        {d.name}
                                        {d.popular && <span className="badge-pill">Popular</span>}
                                        {d.tags.map((t) => <span key={t} style={{ fontSize: 10, border: "1px solid var(--border)", padding: "2px 7px", borderRadius: 4, color: "var(--text-light)" }}>{t}</span>)}
                                    </h3>
                                    <p>{d.desc}</p>
                                </div>
                                <div className="menu-row-price">{money(d.price)}</div>
                                <button className="btn-accent" style={{ padding: "10px 18px", borderRadius: 8, fontSize: 12 }} onClick={() => setCustomizing(d)}>
                                    <i className="fas fa-plus" /> Add
                                </button>
                            </div>
                        ))}
                        {list.length === 0 && <p style={{ textAlign: "center", color: "var(--text-light)", padding: "40px 0" }}>No dishes match that filter.</p>}
                    </div>
                </div>
            </section>
            {customizing && <DishCustomize dish={customizing} onClose={() => setCustomizing(null)} />}
        </Layout>
    );
}
