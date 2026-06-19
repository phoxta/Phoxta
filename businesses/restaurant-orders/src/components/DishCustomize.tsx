import { useState } from "react";
import { useCart, type SelOption } from "@/util/cart";
import { money, type Dish } from "@/data/menu";

const qtyBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 16 };

// Item customization sheet — choose modifier options + special instructions + qty,
// then add to the cart. Mirrors the DoorDash/UberEats item flow.
export default function DishCustomize({ dish, onClose }: { dish: Dish; onClose: () => void }) {
    const { add } = useCart();
    const groups = dish.modifiers ?? [];
    const [sel, setSel] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        groups.forEach((g) => { if (g.required && g.options[0]) init[g.name] = g.options[0].label; });
        return init;
    });
    const [note, setNote] = useState("");
    const [qty, setQty] = useState(1);

    const chosen: SelOption[] = groups.flatMap((g) => {
        const opt = g.options.find((o) => o.label === sel[g.name]);
        return opt ? [{ group: g.name, label: opt.label, price: opt.price }] : [];
    });
    const unit = dish.price + chosen.reduce((s, o) => s + o.price / 100, 0);
    const missingRequired = groups.some((g) => g.required && !sel[g.name]);

    function addToOrder() {
        if (missingRequired) return;
        add(dish, { qty, options: chosen, note: note.trim() });
        onClose();
    }

    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} className="card-box" style={{ width: "100%", maxWidth: 520, maxHeight: "88vh", overflow: "auto", borderRadius: "18px 18px 0 0", margin: 0 }}>
                <img src={dish.img} alt={dish.name} style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: 12, marginBottom: 12 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 className="serif" style={{ fontSize: 24, marginBottom: 4 }}>{dish.name}</h3>
                    <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "var(--text-light)" }}>×</button>
                </div>
                <p style={{ color: "var(--text-light)", marginBottom: 16 }}>{dish.desc}</p>

                {groups.map((g) => (
                    <div key={g.name} style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{g.name}{g.required && <span style={{ color: "var(--accent)" }}> *</span>}</div>
                        {g.options.map((o) => (
                            <label key={o.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                                <span><input type="radio" name={g.name} checked={sel[g.name] === o.label} onChange={() => setSel({ ...sel, [g.name]: o.label })} style={{ marginRight: 10 }} />{o.label}</span>
                                {o.price > 0 && <span style={{ color: "var(--text-light)" }}>+{money(o.price / 100)}</span>}
                            </label>
                        ))}
                    </div>
                ))}

                <div className="field" style={{ marginBottom: 16 }}>
                    <label>Special instructions</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. no onions, extra crispy…" />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} style={qtyBtn}>−</button>
                        <span style={{ minWidth: 18, textAlign: "center" }}>{qty}</span>
                        <button type="button" onClick={() => setQty(qty + 1)} style={qtyBtn}>+</button>
                    </div>
                    <button type="button" className="btn-accent" style={{ flex: 1, justifyContent: "center", borderRadius: 8, opacity: missingRequired ? 0.5 : 1 }} onClick={addToOrder} disabled={missingRequired}>
                        Add to order · {money(unit * qty)}
                    </button>
                </div>
            </div>
        </div>
    );
}
