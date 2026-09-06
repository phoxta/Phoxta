import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, isEmail } from "@/lib/format";
import { IconArrow } from "@/lib/icons";
import {
    fetchMyOrders,
    fetchMyProfile,
    saveMyProfile,
    sendReset,
    signIn,
    signOut,
    signUp,
    type CustomerOrder,
} from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import { useAccount } from "@/state/account";
import { useCatalog, useMoney } from "@/state/catalog";
import { useCart } from "@/state/cart";
import { useUi } from "@/state/ui";
import { useWishlist } from "@/state/wishlist";

type Pane = "orders" | "wishlist" | "refills" | "details";

const PANES: { id: Pane; label: string }[] = [
    { id: "orders", label: "📦 Orders" },
    { id: "wishlist", label: "♡ Wishlist" },
    { id: "refills", label: "↺ Refills & routine" },
    { id: "details", label: "👤 Details" },
];

export default function AccountPage() {
    const { session, email, name, ready } = useAccount();

    return (
        <div className="page">
            <PageMeta title="Account" />
            <div className="wrap">{!ready ? null : session && email ? <Dashboard email={email} name={name} /> : <AuthPanel />}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------

function AuthPanel() {
    const { toast } = useUi();
    const [mode, setMode] = useState<"in" | "up">("in");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        if (!isEmail(email)) return setError("Enter a valid email address.");
        if (password.length < 8) return setError("Passwords need at least 8 characters.");
        setBusy(true);
        setError(null);
        const result = mode === "in" ? await signIn(email, password) : await signUp(email, password, fullName);
        setBusy(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        if (mode === "up") {
            // Depending on the shop's auth settings the account may need
            // confirming by email, so don't promise them a session they may not
            // have yet — the provider tells us by leaving them signed out.
            setNotice("Account created. If we've asked you to confirm your email, check your inbox.");
        }
        toast(mode === "in" ? "Welcome back" : "Account created");
    }

    async function reset() {
        if (!isEmail(email)) return setError("Enter your email first, then ask for a reset link.");
        const result = await sendReset(email);
        setError(result.error);
        if (!result.error) setNotice("Reset link sent — check your inbox.");
    }

    return (
        <div className="auth-box">
            <div className="eyebrow">Welcome</div>
            <h1 className="serif">{mode === "in" ? "Sign in" : "Create account"}</h1>
            <p className="muted small" style={{ marginBottom: 20 }}>
                Track orders, manage refills and keep your wishlist.
            </p>

            <form className="form-grid" onSubmit={submit} noValidate>
                {mode === "up" && (
                    <div className="field span">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            value={fullName}
                            placeholder="Your name"
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                )}
                <div className="field span">
                    <label htmlFor="auth-email">Email</label>
                    <input
                        id="auth-email"
                        type="email"
                        value={email}
                        placeholder="you@email.com"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="field span">
                    <label htmlFor="auth-pw">Password</label>
                    <input
                        id="auth-pw"
                        type="password"
                        value={password}
                        placeholder="••••••••"
                        autoComplete={mode === "in" ? "current-password" : "new-password"}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                {error && (
                    <p className="span small" style={{ color: "#C0392B" }}>
                        {error}
                    </p>
                )}
                {notice && (
                    <p className="span small" style={{ color: "var(--sage)" }}>
                        {notice}
                    </p>
                )}
                <button className="btn block span" style={{ marginTop: 6 }} disabled={busy}>
                    {busy ? "One moment…" : "Continue"}
                    <span className="arr">
                        <IconArrow />
                    </span>
                </button>
            </form>

            <div className="sw">
                {mode === "in" ? "New here?" : "Already have an account?"}{" "}
                <button
                    type="button"
                    className="link"
                    onClick={() => {
                        setMode(mode === "in" ? "up" : "in");
                        setError(null);
                        setNotice(null);
                    }}
                >
                    {mode === "in" ? "Create an account" : "Sign in"}
                </button>
            </div>
            {mode === "in" && (
                <div className="sw">
                    <button type="button" className="link" onClick={reset}>
                        Forgotten your password?
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------

function Dashboard({ email, name }: { email: string; name: string | null }) {
    const { orgId, products } = useCatalog();
    const money = useMoney();
    const { toast } = useUi();
    const { slugs } = useWishlist();
    const { add } = useCart();

    const [pane, setPane] = useState<Pane>("orders");
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState(name ?? "");
    const [phone, setPhone] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!orgId) {
            setLoading(false);
            return;
        }
        let active = true;
        void Promise.all([fetchMyOrders(orgId), fetchMyProfile(orgId)]).then(([rows, profile]) => {
            if (!active) return;
            setOrders(rows);
            if (profile) {
                setDisplayName(profile.name ?? name ?? "");
                setPhone(profile.phone ?? "");
            }
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [orgId, name]);

    const saved = useMemo(
        () => slugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
        [slugs, products],
    );

    // What to refill: things this customer has bought, then what the shop sells
    // in a refill — so the panel is useful before the first order too.
    const refillables = useMemo(() => {
        const bought = new Set(orders.flatMap((o) => o.items.map((i) => i.name.split(" — ")[0])));
        const mine = products.filter((p) => bought.has(p.name));
        const withRefill = products.filter((p) => p.sizes.some((s) => s.refill));
        return (mine.length ? mine : withRefill).slice(0, 4);
    }, [orders, products]);

    const spent = orders.reduce((n, o) => n + o.total_cents - o.refunded_cents, 0);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!orgId || saving) return;
        setSaving(true);
        const result = await saveMyProfile(orgId, displayName, phone);
        setSaving(false);
        toast(result.ok ? "Details saved" : (result.error ?? "That didn't save"));
    }

    return (
        <>
            <div className="page-head">
                <div className="crumbs">
                    <Link to="/">Home</Link> / <b>Account</b>
                </div>
                <h1 className="serif">Hello, {displayName || name || email.split("@")[0]}</h1>
                <p>{email}</p>
            </div>

            <div className="acct">
                <nav className="acct-nav">
                    {PANES.map((p) => (
                        <button
                            type="button"
                            key={p.id}
                            className={p.id === pane ? "on" : undefined}
                            onClick={() => setPane(p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            void signOut();
                            toast("Signed out");
                        }}
                    >
                        → Sign out
                    </button>
                </nav>

                <div>
                    {pane === "orders" && (
                        <div className="acct-pane on">
                            <div className="stat-tiles">
                                <div>
                                    <b>{orders.length}</b>
                                    <small>Orders</small>
                                </div>
                                <div>
                                    <b>{money(spent)}</b>
                                    <small>Total spent</small>
                                </div>
                                <div>
                                    <b>{slugs.length}</b>
                                    <small>Saved items</small>
                                </div>
                            </div>

                            {loading ? (
                                <p className="muted small">Loading your orders…</p>
                            ) : orders.length === 0 ? (
                                <div className="empty">
                                    <b>No orders yet</b>
                                    Your first ritual is waiting.
                                    <br />
                                    <br />
                                    <Link className="btn sm" to="/shop">
                                        Shop
                                        <span className="arr">
                                            <IconArrow />
                                        </span>
                                    </Link>
                                </div>
                            ) : (
                                orders.map((o) => (
                                    <div className="order-card" key={o.id}>
                                        <div className="top">
                                            <div>
                                                <b>{o.reference || o.id.slice(0, 8).toUpperCase()}</b>
                                                <div className="small muted">{formatDate(o.placed_at)}</div>
                                            </div>
                                            <span className="badge">{o.status}</span>
                                            <div style={{ fontWeight: 600 }}>{money(o.total_cents)}</div>
                                        </div>
                                        <ul className="order-items">
                                            {o.items.map((i, n) => (
                                                <li key={`${o.id}-${n}`}>
                                                    {i.quantity} × {i.name}
                                                </li>
                                            ))}
                                        </ul>
                                        <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                                            <Link
                                                className="link"
                                                to={`/order/${encodeURIComponent(o.id)}?email=${encodeURIComponent(email)}`}
                                            >
                                                View order
                                            </Link>
                                            <Link className="link" to="/contact">
                                                Start a return
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {pane === "wishlist" && (
                        <div className="acct-pane on">
                            <div className="grid3">
                                {saved.length === 0 ? (
                                    <div className="empty" style={{ gridColumn: "1/-1" }}>
                                        <b>Nothing saved yet</b>
                                        Tap the heart on any product.
                                    </div>
                                ) : (
                                    saved.map((p) => <ProductCard product={p} key={p.id} />)
                                )}
                            </div>
                        </div>
                    )}

                    {pane === "refills" && (
                        <div className="acct-pane on">
                            <div className="card-box">
                                <h3 className="serif" style={{ fontSize: 24, fontWeight: 400 }}>
                                    Your routine
                                </h3>
                                <p className="muted small" style={{ margin: "6px 0 18px" }}>
                                    Based on what you&rsquo;ve bought. Refill pods are cheaper than a new jar, and the
                                    glass stays with you.
                                </p>
                                <div className="opt-list">
                                    {refillables.map((p) => {
                                        const refill = p.sizes.find((s) => s.refill) ?? p.sizes[0];
                                        return (
                                            <div className="opt-card" key={p.id}>
                                                <img
                                                    src={p.img}
                                                    alt=""
                                                    width={48}
                                                    height={58}
                                                    loading="lazy"
                                                    style={{ borderRadius: 8, objectFit: "cover" }}
                                                />
                                                <div>
                                                    <b>{p.name}</b>
                                                    <small>
                                                        {refill.label} · {money(refill.priceCents)}
                                                    </small>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn sm plain"
                                                    style={{ marginLeft: "auto" }}
                                                    onClick={() => {
                                                        add(p, refill);
                                                        toast(`${p.name} added to bag`, {
                                                            to: "/cart",
                                                            label: "View bag",
                                                        });
                                                    }}
                                                >
                                                    {refill.refill ? "Refill" : "Reorder"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {pane === "details" && (
                        <div className="acct-pane on">
                            <div className="card-box">
                                <h3 className="serif" style={{ fontSize: 24, fontWeight: 400, marginBottom: 16 }}>
                                    Details
                                </h3>
                                <form className="form-grid" onSubmit={save}>
                                    <div className="field">
                                        <label htmlFor="acct-name">Name</label>
                                        <input
                                            id="acct-name"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                        />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="acct-phone">Phone</label>
                                        <input
                                            id="acct-phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="field span">
                                        <label htmlFor="acct-email">Email</label>
                                        <input id="acct-email" value={email} disabled />
                                        <span className="msg" />
                                    </div>
                                    <div className="span">
                                        <button className="btn sm plain" disabled={saving || !orgId}>
                                            {saving ? "Saving…" : "Save changes"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
