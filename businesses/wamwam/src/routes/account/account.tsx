import { useEffect, useState, type FormEvent } from "react";
import ButtonPrimary from "@/components/primitives/button-primary";
import ButtonSecondary from "@/components/primitives/button-secondary";
import { Field, Label } from "@/components/primitives/fieldset";
import Input from "@/components/primitives/input";
import { useAccount } from "@/integration/account-context";
import { resolveTenant } from "@/integration/tenant";
import {
    signIn, signUp, signOut, sendReset,
    fetchMyOrders, fetchMyBookings, cancelMyBooking, fetchMyProfile, saveMyProfile,
    type CustomerOrder, type CustomerBooking,
} from "@/integration/phoxta";
import { formatDate, formatMoney } from "@/lib/format";
import AppLink from "@/lib/nav/link";
import type { RouteProps } from "@/app/route-renderer";

/**
 * Customer account: sign in or create an account, then order and booking
 * history and contact details.
 *
 * This single screen serves /account, /account-billing, /account-password,
 * /account-savelists, /login, /signup and /forgot-password. The mode is held
 * in state, never derived from the pathname — the router mounts a fresh copy
 * per URL, so the sign-in / create-account toggle does not leak across them.
 *
 * Resolves its own tenant from the hostname rather than depending on a
 * catalogue context, so the same page drops into every storefront unchanged.
 * Everything shown is scoped server-side to the caller's verified email
 * (migration 0077) — this page grants nothing by itself.
 */

// The shared cached formatters; the null guard is this screen's own, because a
// missing total renders as nothing rather than as a zero.
const money = (cents?: number, ccy?: string) => (cents == null ? "" : formatMoney(cents, ccy));

const day = (iso?: string) => (iso ? formatDate(iso) : "");

const STATUS_COPY: Record<string, string> = {
    pending: "Awaiting payment",
    paid: "Paid",
    fulfilled: "Completed",
    partially_refunded: "Partially refunded",
    refunded: "Refunded",
    cancelled: "Cancelled",
    confirmed: "Confirmed",
};

export default function Account(_props: RouteProps) {
    const { session, email, ready } = useAccount();
    const [orgId, setOrgId] = useState<string | null>(null);

    const [mode, setMode] = useState<"in" | "up">("in");
    const [form, setForm] = useState({ email: "", password: "", name: "" });
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [bookings, setBookings] = useState<CustomerBooking[]>([]);
    const [pForm, setPForm] = useState({ name: "", phone: "" });
    const [loading, setLoading] = useState(false);

    // Resolve the tenant here so the page is portable across storefronts.
    useEffect(() => {
        let active = true;
        resolveTenant().then((t) => {
            if (active) setOrgId(t?.id ?? null);
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!session || !orgId) return;
        let active = true;
        setLoading(true);
        Promise.all([fetchMyOrders(orgId), fetchMyBookings(orgId), fetchMyProfile(orgId)]).then(([o, b, p]) => {
            if (!active) return;
            setOrders(o);
            setBookings(b);
            setPForm({ name: p?.name ?? "", phone: p?.phone ?? "" });
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [session, orgId]);

    async function submitAuth(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        setMsg(null);
        const r = mode === "in"
            ? await signIn(form.email.trim(), form.password)
            : await signUp(form.email.trim(), form.password, form.name.trim());
        setBusy(false);
        if (r.error) { setErr(r.error); return; }
        if (mode === "up") setMsg("Account created. Check your email if a confirmation is required, then sign in.");
    }

    async function reset() {
        if (!form.email.trim()) { setErr("Enter your email first, then tap reset."); return; }
        const r = await sendReset(form.email.trim());
        if (r.error) setErr(r.error);
        else setMsg("If that address has an account, a reset link is on its way.");
    }

    async function saveProfile(e: FormEvent) {
        e.preventDefault();
        if (!orgId) return;
        setBusy(true);
        const r = await saveMyProfile(orgId, pForm.name, pForm.phone);
        setBusy(false);
        setMsg(r.ok ? "Details saved." : null);
        setErr(r.ok ? null : r.error);
    }

    async function cancel(id: string) {
        if (!orgId) return;
        const r = await cancelMyBooking(orgId, id);
        if (!r.ok) { setErr(r.error ?? "That booking cannot be cancelled online."); return; }
        setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
        setMsg("Booking cancelled.");
    }

    if (!ready) return <div style={{ padding: "80px 20px", textAlign: "center" }}>Loading…</div>;

    // ── Signed out ───────────────────────────────────────────────────────────
    if (!session) {
        return (
            <div style={{ maxWidth: 460, margin: "0 auto", padding: "60px 20px" }}>
                <h1 style={{ marginBottom: 8 }}>{mode === "in" ? "Sign in" : "Create an account"}</h1>
                <p style={{ opacity: 0.7 }}>
                    {mode === "in"
                        ? "See your orders and bookings in one place."
                        : "Save your details and keep track of everything you order."}
                </p>

                <form onSubmit={submitAuth} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
                    {mode === "up" && (
                        <Field className="block">
                            <Label htmlFor="account-name">Name</Label>
                            <Input id="account-name" className="mt-1" value={form.name} autoComplete="name"
                                   onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </Field>
                    )}
                    <Field className="block">
                        <Label htmlFor="account-email">Email</Label>
                        <Input id="account-email" className="mt-1" type="email" required value={form.email} autoComplete="email"
                               onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </Field>
                    <Field className="block">
                        <Label htmlFor="account-password">Password</Label>
                        <Input id="account-password" className="mt-1" type="password" required minLength={8} value={form.password}
                               autoComplete={mode === "in" ? "current-password" : "new-password"}
                               onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </Field>

                    {err && <p role="alert" style={{ color: "#b02a37", margin: 0 }}>{err}</p>}
                    {msg && <p role="alert" style={{ color: "#1b6e45", margin: 0 }}>{msg}</p>}

                    <ButtonPrimary type="submit" disabled={busy} className="w-full">
                        {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
                    </ButtonPrimary>
                </form>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                    <button type="button" className="text-sm text-primary underline-offset-2 hover:underline"
                            onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); setMsg(null); }}>
                        {mode === "in" ? "Create an account" : "I already have an account"}
                    </button>
                    {mode === "in" && <button type="button" className="text-sm text-primary underline-offset-2 hover:underline" onClick={reset}>Forgot password</button>}
                </div>

                <p style={{ opacity: 0.6, fontSize: 13, marginTop: 28 }}>
                    You can also continue without an account — <AppLink href="/">keep browsing</AppLink>.
                </p>
            </div>
        );
    }

    // ── Signed in ────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "60px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
                <div>
                    <h1 style={{ marginBottom: 4 }}>Your account</h1>
                    <p style={{ opacity: 0.7, margin: 0 }}>{email}</p>
                </div>
                <ButtonSecondary className="ml-auto" onClick={() => signOut()}>Sign out</ButtonSecondary>
            </div>

            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your details</h2>
            <form onSubmit={saveProfile} style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
                <Field className="block flex-1 min-w-[220px]">
                    <Label htmlFor="profile-name">Name</Label>
                    <Input id="profile-name" className="mt-1" value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} />
                </Field>
                <Field className="block flex-1 min-w-[220px]">
                    <Label htmlFor="profile-phone">Phone</Label>
                    <Input id="profile-phone" className="mt-1" value={pForm.phone} onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} />
                </Field>
                <div style={{ flex: "1 1 100%", display: "flex", alignItems: "center", gap: 14 }}>
                    <ButtonPrimary type="submit" disabled={busy}>{busy ? "…" : "Save"}</ButtonPrimary>
                    {msg && <span role="alert" style={{ color: "#1b6e45", fontSize: 14 }}>{msg}</span>}
                    {err && <span role="alert" style={{ color: "#b02a37", fontSize: 14 }}>{err}</span>}
                </div>
            </form>

            {loading && <p style={{ opacity: 0.7 }}>Loading your history…</p>}

            {bookings.length > 0 && (
                <>
                    <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your bookings</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
                        {bookings.map((b) => (
                            <div key={b.id} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <b>#{b.reference}</b>
                                    <span style={{ fontSize: 13, opacity: 0.75 }}>{STATUS_COPY[b.status] ?? b.status}</span>
                                    <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.7 }}>
                                        {day(b.when)}{b.until ? ` → ${day(b.until)}` : ""}
                                    </span>
                                </div>
                                {b.total_cents != null && <div style={{ marginTop: 6 }}><b>{money(b.total_cents, b.currency)}</b></div>}
                                {["pending", "confirmed"].includes(b.status) && (
                                    <ButtonSecondary className="mt-3" onClick={() => cancel(b.id)}>
                                        Cancel booking
                                    </ButtonSecondary>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Order history</h2>
            {!loading && orders.length === 0 ? (
                <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 20, textAlign: "center" }}>
                    <p style={{ marginBottom: 10 }}>No orders yet.</p>
                    <ButtonPrimary href="/">Start browsing</ButtonPrimary>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {orders.map((o) => (
                        <div key={o.id} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <b>#{o.reference}</b>
                                <span style={{ fontSize: 13, opacity: 0.75 }}>{STATUS_COPY[o.status] ?? o.status}</span>
                                <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.7 }}>{day(o.placed_at)}</span>
                            </div>
                            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", fontSize: 14, opacity: 0.8 }}>
                                {o.items.map((it, i) => (
                                    <li key={i}>{it.quantity} × {it.name}</li>
                                ))}
                            </ul>
                            <b>{money(o.total_cents, o.currency)}</b>
                            {o.refunded_cents > 0 && (
                                <span style={{ marginLeft: 10, fontSize: 13, opacity: 0.7 }}>
                                    {money(o.refunded_cents, o.currency)} refunded
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
