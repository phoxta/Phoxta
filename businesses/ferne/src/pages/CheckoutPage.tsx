import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { STORE, type ShippingOption } from "@/config/brand";
import { isEmail, isUkPostcode } from "@/lib/format";
import { IconArrow } from "@/lib/icons";
import { openPaystackPopup } from "@/lib/paystackPopup";
import { lookupOrder, orderIsPaid, placeOrder, startPayment } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import { useAccount } from "@/state/account";
import { useCatalog, useMoney } from "@/state/catalog";
import { shippingFor, useCart } from "@/state/cart";

const COUNTRIES = ["United Kingdom", "Ireland", "France", "Germany", "United States"];
const STEPS = ["Information", "Delivery", "Payment"];
const DETAILS_KEY = "ferne:checkout";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 120_000;

type Details = {
    email: string;
    first: string;
    last: string;
    address: string;
    city: string;
    postcode: string;
    country: string;
    phone: string;
};

const EMPTY: Details = {
    email: "",
    first: "",
    last: "",
    address: "",
    city: "",
    postcode: "",
    country: COUNTRIES[0],
    phone: "",
};

/** Remembered between visits so a returning shopper doesn't retype their
 *  address. Kept on the device only — it never leaves the browser until the
 *  order is placed. */
function loadDetails(): Details {
    try {
        const raw = localStorage.getItem(DETAILS_KEY);
        return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Details>) } : EMPTY;
    } catch {
        return EMPTY;
    }
}

type Placed = { id: string; email: string; totalCents: number };
type Payment = { accessCode: string | null; url: string };

export default function CheckoutPage() {
    const { lines, subtotalCents, discountCents, promo, clear } = useCart();
    const { orgId } = useCatalog();
    const { email: accountEmail } = useAccount();
    const money = useMoney();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [details, setDetails] = useState<Details>(() => loadDetails());
    const [errors, setErrors] = useState<Partial<Record<keyof Details, boolean>>>({});
    const [shipMethod, setShipMethod] = useState<ShippingOption["id"]>(STORE.shipping[0].id);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [placed, setPlaced] = useState<Placed | null>(null);
    const [payment, setPayment] = useState<Payment | null>(null);
    const [paid, setPaid] = useState(false);
    const [payNote, setPayNote] = useState<string | null>(null);
    const checkNow = useRef<(() => void) | null>(null);
    const autoOpened = useRef(false);

    useEffect(() => {
        if (accountEmail && !details.email) setDetails((d) => ({ ...d, email: accountEmail }));
    }, [accountEmail, details.email]);

    const payable = Math.max(0, subtotalCents - discountCents);
    const shippingCents = shippingFor(shipMethod, payable);
    const totalCents = payable + shippingCents;
    const option = STORE.shipping.find((s) => s.id === shipMethod) ?? STORE.shipping[0];

    // An empty bag has nothing to check out. Bounce rather than render a form
    // that can only fail — but not once an order exists, or placing one would
    // clear the bag and eject the shopper off their own confirmation.
    useEffect(() => {
        if (!lines.length && !placed) navigate("/cart", { replace: true });
    }, [lines.length, placed, navigate]);

    const set = (key: keyof Details, value: string) => {
        setDetails((d) => ({ ...d, [key]: value }));
        setErrors((e) => ({ ...e, [key]: false }));
    };

    const validate = useCallback((): boolean => {
        const next: Partial<Record<keyof Details, boolean>> = {
            email: !isEmail(details.email),
            first: details.first.trim().length < 2,
            last: details.last.trim().length < 2,
            address: details.address.trim().length < 4,
            city: details.city.trim().length < 2,
            postcode:
                details.country === "United Kingdom"
                    ? !isUkPostcode(details.postcode)
                    : details.postcode.trim().length < 2,
        };
        setErrors(next);
        return !Object.values(next).some(Boolean);
    }, [details]);

    async function place() {
        if (busy || !lines.length) return;
        setBusy(true);
        setError(null);
        try {
            if (!orgId) {
                setError(
                    "This preview isn't connected to a store, so an order can't be placed. Try the live site.",
                );
                return;
            }
            try {
                localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
            } catch {
                /* not remembering the address is not worth failing an order over */
            }

            const id = await placeOrder(
                orgId,
                `${details.first} ${details.last}`.trim(),
                details.email.trim(),
                lines.map((l) => ({ product_id: l.productId, quantity: l.qty, size: l.size })),
                "",
                promo?.code ?? "",
                {
                    name: `${details.first} ${details.last}`.trim(),
                    address: details.address.trim(),
                    city: details.city.trim(),
                    postcode: details.postcode.trim().toUpperCase(),
                    country: details.country,
                    phone: details.phone.trim(),
                    // One readable line for whoever packs the order. The fee is
                    // spelled out here because the RPC strips `fee_cents` from
                    // the stored payload once it has charged it.
                    method: `${option.name} · ${option.eta} · ${
                        shippingCents ? `${money(shippingCents)} delivery` : "free delivery"
                    }`,
                    fee_cents: shippingCents,
                },
            );
            if (!id) {
                setError("We couldn't place that order. Please try again.");
                return;
            }

            setPlaced({ id, email: details.email.trim(), totalCents });
            clear();

            // Best-effort online payment. A tenant with no payment provider
            // connected keeps the pay-later confirmation instead.
            const returnUrl = `${location.origin}/order/${encodeURIComponent(id)}?email=${encodeURIComponent(
                details.email.trim(),
            )}`;
            const session = await startPayment(orgId, id, returnUrl);
            if (session) setPayment(session);
        } catch (err) {
            setError(err instanceof Error ? err.message : "We couldn't place that order. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    const openPayment = useCallback(() => {
        if (!payment) return;
        if (payment.accessCode) {
            void openPaystackPopup(payment.accessCode, payment.url, {
                // Popup callbacks are best-effort — they can fire for a payment
                // that later fails. Use them only to trigger an immediate
                // server-side check, never to mark the order paid.
                onSuccess: () => checkNow.current?.(),
                onCancel: () => {
                    /* the shopper stays on this screen; "Pay now" re-opens it */
                },
            });
        } else if (payment.url) {
            window.location.assign(payment.url);
        }
    }, [payment]);

    useEffect(() => {
        if (payment && !paid && !autoOpened.current) {
            autoOpened.current = true;
            openPayment();
        }
    }, [payment, paid, openPayment]);

    // Payment is confirmed ONLY from the server-side order record, polled through
    // the same guest lookup the tracking page uses.
    useEffect(() => {
        if (!payment || paid || !orgId || !placed) return;
        let stopped = false;
        const startedAt = Date.now();
        const check = async (): Promise<boolean> => {
            const r = await lookupOrder(orgId, placed.id, placed.email);
            if (!stopped && orderIsPaid(r)) {
                setPaid(true);
                return true;
            }
            return false;
        };
        checkNow.current = () => void check();
        const timer = window.setInterval(() => {
            if (Date.now() - startedAt > POLL_MAX_MS) {
                window.clearInterval(timer);
                setPayNote(
                    "We haven't seen your payment yet. If you've already paid it can take a moment to show — track the order, or press Pay now to try again.",
                );
                return;
            }
            void check().then((ok) => {
                if (ok) window.clearInterval(timer);
            });
        }, POLL_INTERVAL_MS);
        return () => {
            stopped = true;
            window.clearInterval(timer);
            checkNow.current = null;
        };
    }, [payment, paid, orgId, placed]);

    // Once the money has landed, the order page is the receipt.
    useEffect(() => {
        if (paid && placed) {
            navigate(`/order/${encodeURIComponent(placed.id)}?email=${encodeURIComponent(placed.email)}`, {
                replace: true,
            });
        }
    }, [paid, placed, navigate]);

    const summary = useMemo(
        () => (
            <aside className="summary-box">
                <h3>Order summary</h3>
                {lines.map((l) => (
                    <div
                        className="line"
                        key={`${l.productId}__${l.size}`}
                        style={{ gridTemplateColumns: "52px 1fr auto", padding: "10px 0" }}
                    >
                        <div className="ph" style={{ width: 52, height: 62 }}>
                            <img src={l.img} alt="" width={52} height={62} loading="lazy" />
                        </div>
                        <div>
                            <b>{l.name}</b>
                            <small>
                                {l.sizeLabel} × {l.qty}
                            </small>
                        </div>
                        <div className="amt">{money(l.unitPriceCents * l.qty)}</div>
                    </div>
                ))}
                <div className="sum">
                    <span>Subtotal</span>
                    <span>{money(subtotalCents)}</span>
                </div>
                {discountCents > 0 && (
                    <div className="sum">
                        <span>Discount ({promo?.code})</span>
                        <span className="free">−{money(discountCents)}</span>
                    </div>
                )}
                <div className="sum">
                    <span>Delivery · {option.name}</span>
                    <span className={shippingCents ? undefined : "free"}>
                        {shippingCents ? money(shippingCents) : "Free"}
                    </span>
                </div>
                <div className="sum total">
                    <span>Total</span>
                    <span>{money(totalCents)}</span>
                </div>
            </aside>
        ),
        [lines, money, subtotalCents, discountCents, promo, option, shippingCents, totalCents],
    );

    // ---- Order placed, waiting on payment -------------------------------------
    if (placed) {
        return (
            <div className="page">
                <PageMeta title="Payment" />
                <div className="wrap">
                    <div className="confirm">
                        <div className="eyebrow">Almost there</div>
                        <h1 className="serif">
                            {payment ? (
                                <>
                                    One step left — <em>payment</em>
                                </>
                            ) : (
                                <>
                                    Your order is <em>in</em>
                                </>
                            )}
                        </h1>
                        <p className="muted" style={{ marginTop: 12 }}>
                            {payment
                                ? `We're holding your order while you pay ${money(placed.totalCents)}.`
                                : "We've received your order and emailed a confirmation. We'll be in touch about payment."}
                        </p>
                        <div className="order-no">
                            Order <b>{placed.id.slice(0, 8).toUpperCase()}</b>
                        </div>
                    </div>

                    {payment && (
                        <div className="card-box" style={{ maxWidth: 520, margin: "0 auto" }}>
                            <button type="button" className="btn block" onClick={openPayment}>
                                Pay now
                                <span className="arr">{money(placed.totalCents)}</span>
                            </button>
                            <p className="small muted" style={{ marginTop: 12 }}>
                                {payNote ?? "Waiting for your payment to clear — this page updates itself."}
                            </p>
                        </div>
                    )}

                    <div style={{ textAlign: "center", marginTop: 32, display: "flex", gap: 12, justifyContent: "center" }}>
                        <Link
                            className="btn sm plain ghost"
                            to={`/order/${encodeURIComponent(placed.id)}?email=${encodeURIComponent(placed.email)}`}
                        >
                            Track this order
                        </Link>
                        <Link className="btn sm" to="/shop">
                            Continue shopping
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ---- The three steps ------------------------------------------------------
    return (
        <div className="page">
            <PageMeta title="Checkout" />
            <div className="wrap">
                <div className="page-head" style={{ paddingBottom: 16 }}>
                    <h1 className="serif">Checkout</h1>
                </div>

                <div className="cart-layout">
                    <div>
                        <div className="steps-bar">
                            {STEPS.map((label, i) => {
                                const n = i + 1;
                                if (n === step)
                                    return (
                                        <b key={label}>
                                            <i>{n}</i>
                                            {label}
                                        </b>
                                    );
                                return (
                                    <span key={label} className={n < step ? "done" : undefined}>
                                        <i>{n < step ? "✓" : n}</i>
                                        {label}
                                    </span>
                                );
                            })}
                        </div>

                        <div className={`co-step${step === 1 ? " on" : ""}`}>
                            <h2>Contact &amp; delivery address</h2>
                            <div className="form-grid">
                                <Field
                                    span
                                    id="email"
                                    label="Email"
                                    type="email"
                                    value={details.email}
                                    error={errors.email}
                                    message="Enter a valid email"
                                    placeholder="you@email.com"
                                    onChange={(v) => set("email", v)}
                                />
                                <Field
                                    id="first"
                                    label="First name"
                                    value={details.first}
                                    error={errors.first}
                                    onChange={(v) => set("first", v)}
                                />
                                <Field
                                    id="last"
                                    label="Last name"
                                    value={details.last}
                                    error={errors.last}
                                    onChange={(v) => set("last", v)}
                                />
                                <Field
                                    span
                                    id="address"
                                    label="Address"
                                    value={details.address}
                                    error={errors.address}
                                    placeholder="Street and number"
                                    onChange={(v) => set("address", v)}
                                />
                                <Field
                                    id="city"
                                    label="City"
                                    value={details.city}
                                    error={errors.city}
                                    onChange={(v) => set("city", v)}
                                />
                                <Field
                                    id="postcode"
                                    label="Postcode"
                                    value={details.postcode}
                                    error={errors.postcode}
                                    message={
                                        details.country === "United Kingdom"
                                            ? "Enter a valid UK postcode"
                                            : "Required"
                                    }
                                    placeholder="B1 1AA"
                                    onChange={(v) => set("postcode", v)}
                                />
                                <div className="field span">
                                    <label htmlFor="country">Country</label>
                                    <select
                                        id="country"
                                        value={details.country}
                                        onChange={(e) => set("country", e.target.value)}
                                    >
                                        {COUNTRIES.map((c) => (
                                            <option key={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <Field
                                    span
                                    id="phone"
                                    label="Phone (for delivery updates)"
                                    type="tel"
                                    value={details.phone}
                                    placeholder="Optional"
                                    onChange={(v) => set("phone", v)}
                                />
                            </div>
                            <div className="co-nav">
                                <Link className="link" to="/cart">
                                    ← Back to bag
                                </Link>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        if (validate()) setStep(2);
                                    }}
                                >
                                    Continue to delivery
                                    <span className="arr">
                                        <IconArrow />
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className={`co-step${step === 2 ? " on" : ""}`}>
                            <h2>Delivery method</h2>
                            <div className="opt-list">
                                {STORE.shipping.map((s) => {
                                    const fee = shippingFor(s.id, payable);
                                    return (
                                        <label className={`opt-card${s.id === shipMethod ? " on" : ""}`} key={s.id}>
                                            <input
                                                type="radio"
                                                name="ship"
                                                value={s.id}
                                                checked={s.id === shipMethod}
                                                onChange={() => setShipMethod(s.id)}
                                            />
                                            <div>
                                                <b>{s.name}</b>
                                                <small>{s.eta}</small>
                                            </div>
                                            <span className="p">{fee ? money(fee) : "Free"}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="co-nav">
                                <button type="button" className="link" onClick={() => setStep(1)}>
                                    ← Back
                                </button>
                                <button type="button" className="btn" onClick={() => setStep(3)}>
                                    Continue to payment
                                    <span className="arr">
                                        <IconArrow />
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className={`co-step${step === 3 ? " on" : ""}`}>
                            <h2>Payment</h2>
                            <div className="review-block">
                                <div>
                                    <b>Deliver to</b>
                                    <br />
                                    <span>
                                        {details.first} {details.last}, {details.address}, {details.city}{" "}
                                        {details.postcode.toUpperCase()}, {details.country}
                                    </span>
                                    <br />
                                    <span className="small muted">
                                        {option.name} · {option.eta}
                                    </span>
                                </div>
                                <button type="button" className="link" onClick={() => setStep(1)}>
                                    Edit
                                </button>
                            </div>

                            <p className="small muted" style={{ marginTop: 16, lineHeight: 1.7 }}>
                                Card details are entered on the secure payment window that opens after you place the
                                order — they never touch this site. Your order is held until the payment clears.
                            </p>

                            {error && (
                                <p className="small" style={{ color: "#C0392B", marginTop: 12 }}>
                                    {error}
                                </p>
                            )}

                            <div className="secure">🔒 Payments are encrypted end to end.</div>

                            <div className="co-nav">
                                <button type="button" className="link" onClick={() => setStep(2)}>
                                    ← Back
                                </button>
                                <button type="button" className="btn sage" onClick={place} disabled={busy}>
                                    {busy ? "Placing order…" : "Place order"}
                                    <span className="arr">{money(totalCents)}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {summary}
                </div>
            </div>
        </div>
    );
}

function Field({
    id,
    label,
    value,
    onChange,
    error,
    message = "Required",
    placeholder,
    type = "text",
    span = false,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: boolean;
    message?: string;
    placeholder?: string;
    type?: string;
    span?: boolean;
}) {
    return (
        <div className={`field${span ? " span" : ""}${error ? " err" : ""}`}>
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                type={type}
                value={value}
                placeholder={placeholder}
                aria-invalid={error || undefined}
                onChange={(e) => onChange(e.target.value)}
            />
            <span className="msg">{message}</span>
        </div>
    );
}
