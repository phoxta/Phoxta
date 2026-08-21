import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Home-page ordering block.
 *
 * Replaces the dine-in reservation widget: this kitchen is digital-first, so
 * the two things a visitor wants from the home page are "start an order" and
 * "where is the one I already placed". Both are one field away.
 *
 * Styled from index.css rather than Bootstrap — .card-box surfaces, the
 * .menu-cat pill pair for fulfilment (the same control the menu uses for
 * categories) and .field inputs, so it reads as part of the restaurant.
 */
export default function OrderWidget() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [ref, setRef] = useState("");

  function start(e: FormEvent) {
    e.preventDefault();
    // The menu reads the intent so checkout opens on the right fulfilment.
    try {
      localStorage.setItem("saveur:fulfilment", mode);
    } catch {
      /* private mode — checkout just defaults to delivery */
    }
    navigate("/menu");
  }

  function track(e: FormEvent) {
    e.preventDefault();
    navigate(ref.trim() ? `/track?ref=${encodeURIComponent(ref.trim())}` : "/track");
  }

  return (
    <div className="container">
      <div
        className="contact-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch" }}
      >
        <form onSubmit={start} className="card-box">
          <h3 className="serif" style={{ fontSize: 26, marginBottom: 6 }}>Order now</h3>
          <p style={{ fontSize: 14, color: "var(--text-light)", marginBottom: 20 }}>
            Freshly made, delivered or ready to collect.
          </p>

          <div className="menu-cats" style={{ justifyContent: "flex-start", marginBottom: 20 }} role="group" aria-label="Fulfilment">
            <button
              type="button"
              onClick={() => setMode("delivery")}
              aria-pressed={mode === "delivery"}
              className={`menu-cat${mode === "delivery" ? " active" : ""}`}
            >
              Delivery
            </button>
            <button
              type="button"
              onClick={() => setMode("pickup")}
              aria-pressed={mode === "pickup"}
              className={`menu-cat${mode === "pickup" ? " active" : ""}`}
            >
              Collection
            </button>
          </div>

          <button className="btn-accent" style={{ width: "100%", justifyContent: "center" }}>
            Browse the menu
          </button>
        </form>

        <form onSubmit={track} className="card-box">
          <h3 className="serif" style={{ fontSize: 26, marginBottom: 6 }}>Track an order</h3>
          <p style={{ fontSize: 14, color: "var(--text-light)", marginBottom: 20 }}>
            Enter the reference from your confirmation email.
          </p>

          <div className="field">
            <label htmlFor="ow-ref">Order reference</label>
            <input
              id="ow-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="SVR-0000"
            />
          </div>

          <button className="btn-dark-outline" style={{ width: "100%", justifyContent: "center" }}>
            Track
          </button>
        </form>
      </div>
    </div>
  );
}
