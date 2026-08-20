import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Home-page ordering block.
 *
 * Replaces the dine-in reservation widget: this kitchen is digital-first, so
 * the two things a visitor wants from the home page are "start an order" and
 * "where is the one I already placed". Both are one field away.
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
      <div className="row g-3 justify-content-center">
        <div className="col-lg-6">
          <form onSubmit={start} className="p-4 border rounded-4 h-100" style={{ background: "#fff" }}>
            <h3 className="h5 mb-1">Order now</h3>
            <p className="text-muted" style={{ fontSize: 14 }}>Freshly made, delivered or ready to collect.</p>

            <div className="btn-group w-100 mb-3" role="group" aria-label="Fulfilment">
              <button type="button" onClick={() => setMode("delivery")} aria-pressed={mode === "delivery"}
                      className={`btn ${mode === "delivery" ? "btn-dark" : "btn-outline-dark"}`}>Delivery</button>
              <button type="button" onClick={() => setMode("pickup")} aria-pressed={mode === "pickup"}
                      className={`btn ${mode === "pickup" ? "btn-dark" : "btn-outline-dark"}`}>Collection</button>
            </div>

            <button className="btn btn-dark w-100">Browse the menu</button>
          </form>
        </div>

        <div className="col-lg-6">
          <form onSubmit={track} className="p-4 border rounded-4 h-100" style={{ background: "#fff" }}>
            <h3 className="h5 mb-1">Track an order</h3>
            <p className="text-muted" style={{ fontSize: 14 }}>Enter the reference from your confirmation email.</p>
            <div className="d-flex gap-2">
              <input className="form-control" value={ref} onChange={(e) => setRef(e.target.value)}
                     placeholder="Order reference" aria-label="Order reference" />
              <button className="btn btn-outline-dark px-4">Track</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
