import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { AgeBand, Role } from "@/data/core";
import type { NewMember, NewSpace } from "@/data/coreRepo";
import { SupabaseCoreRepo, acceptInvite, createSpace } from "@/data/supabaseCore";
import { cn } from "@/lib/cn";
import { isEmail } from "@/lib/format";
import { useAuth } from "@/state/auth";
import { useSpace } from "@/state/space";
import { useTenant } from "@/state/tenant";
import { useToast } from "@/state/toast";
import { Sprig, Wordmark } from "@/components/brand";
import { Notice } from "@/components/shared";
import { Button, Field } from "@/components/ui/primitives";
import { SplitLines } from "@/components/ui/motion";

/**
 * The way in.
 *
 * Login, signup and forgot mirror Coir Six's; every one of them also carries
 * the DEMO button, because the demo is a first-class way in — a visitor from
 * the marketplace should feel the product as the Adeyemi family before they
 * decide anything. Onboarding is three short steps that end in a real family:
 * a name, a few values and a mission, the people — and value on the first
 * screen after it.
 */

const MIN_PASSWORD = 8;
const LOOP = ["Values", "Vision", "Plans", "Daily actions", "Family growth"];

// ---- the frame --------------------------------------------------------------

function AuthFrame({ title, sub, children, wide }: { title: string; sub: string; children: ReactNode; wide?: boolean }) {
    const { name } = useTenant();
    return (
        <div className={cn("grid min-h-dvh", wide ? "md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : "md:grid-cols-2")}>
            <section className="relative isolate hidden overflow-hidden bg-brand p-10 text-white md:flex md:flex-col lg:p-12">
                <span
                    className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,rgba(255,255,255,0.16),transparent_58%),radial-gradient(90%_80%_at_100%_100%,rgba(202,133,4,0.22),transparent_62%)]"
                    aria-hidden="true"
                />
                {/* Two sprigs, out of phase, drifting slowly: the mark breathing
                    rather than a photograph competing with the headline. */}
                <Sprig className="wf-float pointer-events-none absolute -bottom-14 -right-10 w-72 text-white/10" strokeWidth={1} />
                <Sprig className="wf-float--slow pointer-events-none absolute -top-8 right-24 w-32 text-white/[0.07]" strokeWidth={1} />
                <Wordmark name={name} light size={34} />
                <div className="mt-auto max-w-md">
                    <SplitLines
                        as="h1"
                        className="font-display text-8xl leading-[1.15] text-brand-soft lg:text-[40px]"
                        text="We exist for what matters most — our love, our family, our legacy."
                        step={70}
                    />
                    <p className="mt-4 text-base leading-6 text-white/80">For today. For tomorrow. For generations.</p>
                    <ol className="mt-9 flex items-start" aria-label="The Wàfè loop">
                        {LOOP.map((l, i) => (
                            <li key={l} className="flex items-start">
                                <span className="flex w-[66px] flex-col items-center">
                                    <span className={cn("grid size-7 place-items-center rounded-full border text-2xs font-semibold", i === 0 ? "border-white bg-white text-brand" : "border-white/50 text-white")}>{i + 1}</span>
                                    <span className="mt-2 text-center text-[9.5px] font-semibold uppercase leading-3 tracking-[0.12em] text-white/80">{l}</span>
                                </span>
                                {i < LOOP.length - 1 && <ChevronRight size={12} className="mt-2 shrink-0 text-white/50" aria-hidden="true" />}
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
            <section className="flex flex-col justify-center px-6 py-10 md:px-12 lg:px-16">
                <div className="mb-8 md:hidden">
                    <Wordmark name={name} size={30} />
                </div>
                <div className={cn("mx-auto w-full", wide ? "max-w-xl" : "max-w-sm")}>
                    <h2 className="font-display text-6xl leading-9">{title}</h2>
                    <p className="mt-1.5 text-md leading-5 text-muted">{sub}</p>
                    <div className="mt-7">{children}</div>
                </div>
            </section>
        </div>
    );
}

function PasswordField({ value, onChange, error, label = "Password", autoComplete }: { value: string; onChange: (v: string) => void; error?: string | null; label?: string; autoComplete: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Field label={label} type={show ? "text" : "password"} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} error={error} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] text-caption hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

function DemoButton() {
    const { enterDemo } = useAuth();
    const navigate = useNavigate();
    return (
        <div className="mt-6 border-t border-line pt-6">
            <Button
                variant="tonal"
                block
                onClick={() => {
                    enterDemo();
                    navigate("/", { replace: true });
                }}
            >
                <Sprig className="w-4" /> Explore the demo as the Adeyemi family
            </Button>
            <p className="mt-2 text-center text-xs leading-4 text-caption">Every screen works — as Dad, Mum, Tobi (9) or Grandma. Kept in this browser, nothing to sign up for.</p>
        </div>
    );
}

function NotConfigured({ children }: { children: ReactNode }) {
    return <p className="rounded-md bg-peach-soft px-4 py-3 text-sm leading-5 text-peach">{children}</p>;
}

// ---- login / signup / forgot -------------------------------------------------

export function LoginPage() {
    const { signIn, configured } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: string } | null)?.from;
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isEmail(email)) return setErr("Enter a valid email.");
        setBusy(true);
        const msg = await signIn(email.trim(), pw);
        setBusy(false);
        if (msg) return setErr(msg);
        navigate(from && from !== "/login" ? from : "/", { replace: true });
    };
    return (
        <AuthFrame title="Welcome back" sub="Sign in to your family.">
            {configured ? (
                <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
                    <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <PasswordField value={pw} onChange={setPw} autoComplete="current-password" error={err} />
                    <div className="-mt-1 text-right">
                        <Link to="/forgot" className="text-sm font-medium text-brand underline underline-offset-4">
                            Forgot password?
                        </Link>
                    </div>
                    <Button type="submit" loading={busy} block>
                        Sign in
                    </Button>
                    <p className="text-center text-sm text-muted">
                        New here?{" "}
                        <Link to="/signup" className="font-semibold text-brand underline underline-offset-4">
                            Create your family
                        </Link>
                    </p>
                </form>
            ) : (
                <NotConfigured>Accounts aren't available on this address yet. The demo has everything.</NotConfigured>
            )}
            <DemoButton />
        </AuthFrame>
    );
}

export function SignupPage() {
    const { signUp, configured } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (name.trim().length < 2) return setErr("Tell us your name.");
        if (!isEmail(email)) return setErr("Enter a valid email.");
        if (pw.length < MIN_PASSWORD) return setErr(`Use at least ${MIN_PASSWORD} characters.`);
        setBusy(true);
        const msg = await signUp(email.trim(), pw, name.trim());
        setBusy(false);
        if (msg) return setErr(msg);
        navigate("/onboarding", { replace: true });
    };
    return (
        <AuthFrame title="Start your family's space" sub="Three short steps after this, and you're in.">
            {configured ? (
                <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
                    <Field label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <PasswordField value={pw} onChange={setPw} autoComplete="new-password" error={err} />
                    <Button type="submit" loading={busy} block>
                        Create account
                    </Button>
                    <p className="text-center text-sm text-muted">
                        Already have one?{" "}
                        <Link to="/login" className="font-semibold text-brand underline underline-offset-4">
                            Sign in
                        </Link>
                    </p>
                </form>
            ) : (
                <NotConfigured>Accounts aren't available on this address yet. The demo has everything.</NotConfigured>
            )}
            <DemoButton />
        </AuthFrame>
    );
}

export function ForgotPage() {
    const { sendReset, configured } = useAuth();
    const [email, setEmail] = useState("");
    const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
    const [msg, setMsg] = useState<string | null>(null);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isEmail(email)) return setMsg("Enter a valid email.");
        setState("busy");
        const err = await sendReset(email.trim());
        if (err) {
            setState("error");
            setMsg(err);
        } else setState("sent");
    };
    return (
        <AuthFrame title="Reset your password" sub="We'll email you a link to choose a new one.">
            {!configured ? (
                <NotConfigured>Accounts aren't available on this address yet. The demo has everything.</NotConfigured>
            ) : state === "sent" ? (
                <p className="rounded-md bg-mint-soft px-4 py-3 text-md text-mint">If that address has an account, a reset link is on its way.</p>
            ) : (
                <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
                    <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={msg} />
                    <Button type="submit" loading={state === "busy"} block>
                        Send reset link
                    </Button>
                </form>
            )}
            <p className="mt-4 text-center text-sm text-muted">
                <Link to="/login" className="font-semibold text-brand underline underline-offset-4">
                    Back to sign in
                </Link>
            </p>
            <DemoButton />
        </AuthFrame>
    );
}

// ---- onboarding ---------------------------------------------------------------

const VALUE_OPTIONS = [
    "Faith first",
    "We show up for each other",
    "Learn something every day",
    "Generous with what we have",
    "Rest is holy",
    "Tell the truth kindly",
    "We eat together",
    "Adventure often",
    "Create, don't just consume",
    "Honour our elders",
    "Work hard, play hard",
    "The door is always open",
];

const MY_RELATIONS = ["Dad", "Mum", "Me", "Partner", "Guardian", "Grandma", "Grandpa"];
const RELATIONS = ["Son", "Daughter", "Mum", "Dad", "Partner", "Grandma", "Grandpa", "Aunt", "Uncle", "Cousin", "Friend"];
const AGE_BANDS: Array<{ v: AgeBand; label: string }> = [
    { v: "little", label: "Little · 4–6" },
    { v: "junior", label: "Junior · 7–10" },
    { v: "teen", label: "Teen · 11–14" },
    { v: "young-adult", label: "Young adult · 15–17" },
    { v: "adult", label: "Adult" },
];
const CURRENCIES = ["GBP", "USD", "EUR", "NGN", "CAD", "AUD", "KES", "GHS", "ZAR", "INR"];
const CURRENCY_BY_REGION: Record<string, string> = { GB: "GBP", US: "USD", NG: "NGN", CA: "CAD", AU: "AUD", KE: "KES", GH: "GHS", ZA: "ZAR", IN: "INR", IE: "EUR", DE: "EUR", FR: "EUR", NL: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", BE: "EUR", AT: "EUR" };

/** The role a relation implies; a parent can change it on the row. */
function roleFor(relation: string): Role {
    if (relation === "Son" || relation === "Daughter") return "child";
    if (relation === "Mum" || relation === "Dad" || relation === "Partner") return "parent";
    return "guest";
}

function browserDefaults(): { currency: string; timezone: string } {
    const region = (typeof navigator !== "undefined" ? navigator.language : "en-GB").split("-")[1]?.toUpperCase() ?? "GB";
    let timezone = "Europe/London";
    try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
    } catch {
        /* keep the default */
    }
    return { currency: CURRENCY_BY_REGION[region] ?? "USD", timezone };
}

/** "The Adeyemi family" from "Femi Adeyemi" — a starting point, not a rule. */
function familyNameFrom(fullName: string): string {
    const last = fullName.trim().split(/\s+/).slice(-1)[0];
    return last && last.length > 1 ? `The ${last} family` : "";
}

function missionFrom(family: string, values: string[]): string {
    const who = family.trim() || "Our family";
    const v = values.slice(0, 3).map((x) => x.toLowerCase());
    const tail = v.length ? ` We believe in ${v.length === 1 ? v[0] : `${v.slice(0, -1).join(", ")} and ${v[v.length - 1]}`}.` : "";
    return `${who}: a home where each of us grows into who we were made to be, where we plan on purpose and rest without guilt, and where the door is always open.${tail}`;
}

function Select({ label, value, onChange, children, className, id }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string; id?: string }) {
    return (
        <label className={cn("flex flex-col gap-1.5", className)}>
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]">
                {children}
            </select>
        </label>
    );
}

type PersonRow = { key: number; name: string; relation: string; role: Role; ageBand: AgeBand };

function Steps({ step }: { step: number }) {
    const labels = ["Your family", "What you value", "Add people"];
    return (
        <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
            {labels.map((l, i) => {
                const n = i + 1;
                const state = n < step ? "done" : n === step ? "current" : "todo";
                return (
                    <li key={l} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
                        <span className={cn("grid size-6 place-items-center rounded-full text-2xs font-semibold", state === "todo" ? "bg-subtle text-muted" : "bg-brand text-white")}>{n}</span>
                        <span className={cn("text-xs font-medium max-sm:hidden", state === "current" ? "text-ink" : "text-caption")}>{l}</span>
                        {n < labels.length && <span className="h-px w-5 bg-line-strong" aria-hidden="true" />}
                    </li>
                );
            })}
        </ol>
    );
}

export function OnboardingPage() {
    const { session, demo, configured, leaveDemo } = useAuth();
    const { tenant } = useTenant();
    const sp = useSpace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const defaults = useMemo(browserDefaults, []);
    const accountName = (session?.user?.user_metadata?.full_name as string | undefined) ?? "";

    const [step, setStep] = useState(1);
    const [mode, setMode] = useState<"create" | "invite">("create");
    const [family, setFamily] = useState(() => familyNameFrom(accountName));
    const [myName, setMyName] = useState(accountName);
    const [myRelation, setMyRelation] = useState("Dad");
    const [place, setPlace] = useState("");
    const [currency, setCurrency] = useState(defaults.currency);
    const [timezone, setTimezone] = useState(defaults.timezone);
    const [values, setValues] = useState<string[]>([]);
    const [mission, setMission] = useState("");
    const [missionTouched, setMissionTouched] = useState(false);
    const [people, setPeople] = useState<PersonRow[]>([{ key: 1, name: "", relation: "Son", role: "child", ageBand: "junior" }]);
    const [code, setCode] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Already in a family (or exploring the demo)? Onboarding has nothing to do.
    if (demo) {
        return (
            <AuthFrame title="You're exploring the demo" sub="Onboarding is for a real account.">
                <Notice tone="info">The Adeyemi family is already set up for you. To start your own, create an account.</Notice>
                <div className="mt-5 flex flex-col gap-2">
                    <Button
                        block
                        onClick={() => {
                            leaveDemo();
                            navigate("/signup");
                        }}
                    >
                        Create my own family
                    </Button>
                    <Button variant="ghost" block onClick={() => navigate("/")}>
                        Back to the demo
                    </Button>
                </div>
            </AuthFrame>
        );
    }
    if (!configured || !tenant) {
        return (
            <AuthFrame title="Almost" sub="This address isn't linked to a Wàfè service yet.">
                <NotConfigured>Accounts aren't available on this address yet. The demo has everything.</NotConfigured>
                <DemoButton />
            </AuthFrame>
        );
    }
    if (!sp.noSpace) {
        return (
            <AuthFrame title={`Welcome back to ${sp.space.name}`} sub="Your family is already set up.">
                <Button block onClick={() => navigate("/", { replace: true })}>
                    Go to your dashboard
                </Button>
            </AuthFrame>
        );
    }

    const orgId = tenant.id;
    const suggested = missionFrom(family, values);
    const missionText = missionTouched ? mission : suggested;

    const toggleValue = (v: string) => setValues((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : cur.length >= 5 ? cur : [...cur, v]));
    const updatePerson = (key: number, patch: Partial<PersonRow>) =>
        setPeople((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch, ...(patch.relation && !("role" in patch) ? { role: roleFor(patch.relation) } : {}) } : r)));
    const addPerson = () => setPeople((rows) => [...rows, { key: (rows[rows.length - 1]?.key ?? 0) + 1, name: "", relation: "Daughter", role: "child", ageBand: "junior" }]);
    const removePerson = (key: number) => setPeople((rows) => rows.filter((r) => r.key !== key));

    /** The provider lists spaces once at boot, so a fresh family needs a reload to appear. */
    const land = (spaceId: string) => {
        sp.switchSpace(spaceId);
        window.location.assign("/");
    };

    const next = (e: FormEvent) => {
        e.preventDefault();
        setErr(null);
        if (step === 1) {
            if (family.trim().length < 2) return setErr("Give your family a name.");
            if (myName.trim().length < 2) return setErr("Tell us your name.");
            return setStep(2);
        }
        if (step === 2) {
            if (values.length < 3) return setErr("Pick at least three values — they shape the briefings.");
            if (missionText.trim().length < 10) return setErr("A one-line mission helps Wàfè know what to protect.");
            return setStep(3);
        }
        void finish();
    };

    const finish = async () => {
        const rows = people.filter((p) => p.name.trim().length > 0);
        setBusy(true);
        try {
            const year = new Date().getFullYear();
            const input: NewSpace = {
                name: family.trim(),
                tagline: place.trim() ? `${place.trim()} · since ${year}` : `Since ${year}`,
                myName: myName.trim(),
                myRelation,
                values,
                mission: missionText.trim(),
                currency,
                timezone,
            };
            const summary = await createSpace(orgId, input);
            // The provider's repo is still the demo one until the reload below, so
            // the members go through a repo bound to the new space directly.
            const repo = new SupabaseCoreRepo(orgId, summary.id, summary.memberId);
            for (const p of rows) {
                const member: NewMember = { name: p.name.trim(), relation: p.relation, role: p.role, ageBand: p.ageBand };
                await repo.addMember(member);
            }
            toast(`${family.trim()} is ready`, "success");
            land(summary.id);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Couldn't create your family. Try again.");
            setBusy(false);
        }
    };

    const join = async (e: FormEvent) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (c.length < 4) return setErr("Enter the code from your invitation.");
        setBusy(true);
        setErr(null);
        try {
            const summary = await acceptInvite(orgId, c);
            toast(`Welcome to ${summary.name}`, "success");
            land(summary.id);
        } catch (ex) {
            setErr(ex instanceof Error ? ex.message : "That code didn't work.");
            setBusy(false);
        }
    };

    if (mode === "invite") {
        return (
            <AuthFrame title="Join your family" sub="Enter the invitation code a parent sent you.">
                <form onSubmit={(e) => void join(e)} className="flex flex-col gap-4" noValidate>
                    <Field label="Invitation code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WAFE-XXXX-2026" autoComplete="off" error={err} className="font-mono" />
                    <Button type="submit" loading={busy} block>
                        Join
                    </Button>
                    <button type="button" onClick={() => setMode("create")} className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                        <ArrowLeft size={14} aria-hidden="true" /> Start a new family instead
                    </button>
                </form>
            </AuthFrame>
        );
    }

    const titles: Record<number, { title: string; sub: string }> = {
        1: { title: `Hi${myName ? ` ${myName.split(" ")[0]}` : ""}, let's set up your family`, sub: "Who you are, and where home is. All of it can change later." },
        2: { title: "What you value", sub: "Pick three to five. They shape the briefings, the nudges and what Wàfè protects for you." },
        3: { title: "Who's in the family?", sub: "Add the people now or later. Children get their own calmer screens; everyone else can be invited to sign in." },
    };

    return (
        <AuthFrame title={titles[step].title} sub={titles[step].sub} wide={step === 3}>
            <Steps step={step} />
            <form onSubmit={next} className="flex flex-col gap-4" noValidate>
                {step === 1 && (
                    <>
                        <Field label="Family name" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="The Adeyemi family" autoComplete="off" />
                        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                            <Field label="Your name" value={myName} onChange={(e) => setMyName(e.target.value)} autoComplete="name" />
                            <Select label="You are" value={myRelation} onChange={setMyRelation}>
                                {MY_RELATIONS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <Field label="Where home is" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Manchester" hint="Optional — it goes under your family's name." autoComplete="address-level2" />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label="Currency" value={currency} onChange={setCurrency}>
                                {(CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES]).map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </Select>
                            <Field label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} autoComplete="off" hint="From your browser." />
                        </div>
                    </>
                )}
                {step === 2 && (
                    <>
                        <fieldset>
                            <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">
                                Our values <span className="normal-case tracking-normal text-caption">· {values.length}/5</span>
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {VALUE_OPTIONS.map((v) => {
                                    const on = values.includes(v);
                                    return (
                                        <button key={v} type="button" aria-pressed={on} onClick={() => toggleValue(v)} className={cn("h-10 rounded-full border px-4 text-sm font-semibold transition-colors", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                                            {v}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="ob-mission" className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                                Our mission, in a line
                            </label>
                            <textarea
                                id="ob-mission"
                                rows={4}
                                value={missionText}
                                onChange={(e) => {
                                    setMissionTouched(true);
                                    setMission(e.target.value);
                                }}
                                className="rounded-md border border-line-strong bg-card px-4 py-3 text-md leading-6 outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
                            />
                            <div className="flex items-center justify-between text-xs text-caption">
                                <span>{missionTouched ? "Yours." : "A suggestion from your values — edit it freely."}</span>
                                {missionTouched && (
                                    <button type="button" onClick={() => setMissionTouched(false)} className="font-medium text-brand underline underline-offset-4">
                                        Use the suggestion
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
                {step === 3 && (
                    <>
                        <ul className="flex flex-col gap-3">
                            {people.map((p, i) => (
                                <li key={p.key} className="rounded-lg bg-card p-3">
                                    <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                                        <Field label={`Name ${i + 1}`} value={p.name} onChange={(e) => updatePerson(p.key, { name: e.target.value })} placeholder="Tobi" autoComplete="off" />
                                        <Select label="Relation" value={p.relation} onChange={(v) => updatePerson(p.key, { relation: v })}>
                                            {RELATIONS.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </Select>
                                        <Select label="Age" value={p.ageBand} onChange={(v) => updatePerson(p.key, { ageBand: v as AgeBand, ...(v === "adult" && p.role === "child" ? { role: "guest" as Role } : {}) })}>
                                            {AGE_BANDS.map((b) => (
                                                <option key={b.v} value={b.v}>
                                                    {b.label}
                                                </option>
                                            ))}
                                        </Select>
                                        <div className="flex items-end">
                                            <button type="button" onClick={() => removePerson(p.key)} className="grid size-[46px] place-items-center rounded-md text-caption hover:bg-page hover:text-danger-ink" aria-label={`Remove ${p.name || `person ${i + 1}`}`}>
                                                <Trash2 size={16} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted" role="radiogroup" aria-label={`Role for ${p.name || `person ${i + 1}`}`}>
                                        <span className="mr-1">Role:</span>
                                        {(["parent", "child", "guest"] as Role[]).map((r) => (
                                            <button key={r} type="button" role="radio" aria-checked={p.role === r} onClick={() => updatePerson(p.key, { role: r })} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium capitalize", p.role === r ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong hover:text-ink")}>
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <button type="button" onClick={addPerson} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline">
                            <Plus size={14} aria-hidden="true" /> Add another person
                        </button>
                        <p className="text-xs leading-5 text-caption">Rows without a name are skipped. Parents and guests can be invited to sign in from Family → People.</p>
                    </>
                )}

                {err && <Notice tone="danger">{err}</Notice>}

                <div className="mt-2 flex items-center gap-2">
                    {step > 1 && (
                        <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                            <ArrowLeft size={15} aria-hidden="true" /> Back
                        </Button>
                    )}
                    <Button type="submit" loading={busy} className="ml-auto" tail={step < 3}>
                        {step < 3 ? "Continue" : "Create our family"}
                    </Button>
                </div>
            </form>
            {step === 1 && (
                <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
                    Invited by a parent?{" "}
                    <button type="button" onClick={() => setMode("invite")} className="font-semibold text-brand underline underline-offset-4">
                        I have an invitation code
                    </button>
                </p>
            )}
        </AuthFrame>
    );
}
