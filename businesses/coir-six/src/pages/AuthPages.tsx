import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import type { CategoryId } from "@/data/types";
import { cn } from "@/lib/cn";
import { isEmail } from "@/lib/format";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Button, Field, Sparkle } from "@/components/ui/primitives";
import { CATEGORY_LABEL } from "@/components/ui/icons";

const MIN_PASSWORD = 8;

/** The shared auth frame: brand panel on the left, the form on the right. */
function AuthFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
    const { name } = useTenant();
    return (
        <div className="grid min-h-dvh md:grid-cols-[1fr_1fr]">
            <section className="relative isolate hidden overflow-hidden bg-brand p-12 text-white md:flex md:flex-col">
                <span className="absolute -right-20 -top-24 -z-10 size-[420px] rounded-full bg-brand-glow opacity-70 blur-[100px]" aria-hidden="true" />
                <Sparkle className="pointer-events-none absolute -top-16 right-10 w-64 opacity-70" />
                <Sparkle className="pointer-events-none absolute bottom-24 right-48 w-16 opacity-40" />
                <div className="flex items-center gap-3 text-[22px] font-semibold">
                    <span className="grid size-8 place-items-center rounded-full bg-white/20"><Sparkle className="w-4" /></span> {name}
                </div>
                <div className="mt-auto max-w-md">
                    <div className="text-[12px] font-semibold tracking-[0.14em]">ONLINE COURSE</div>
                    <h1 className="mt-4 text-[34px] font-semibold leading-[42px]">Sharpen Your Skills with Professional Online Courses</h1>
                    <p className="mt-4 text-[15px] leading-6 text-white/85">Pick up where you left off, see your momentum, and know what's next — every time you open it.</p>
                </div>
            </section>
            <section className="flex flex-col justify-center px-6 py-10 md:px-16">
                <div className="mb-8 flex items-center gap-3 text-[20px] font-semibold md:hidden">
                    <span className="grid size-8 place-items-center rounded-full bg-brand"><Sparkle className="w-4" /></span> {name}
                </div>
                <div className="mx-auto w-full max-w-sm">
                    <h2 className="text-[26px] font-semibold leading-8">{title}</h2>
                    <p className="mt-1.5 text-[14px] text-muted">{sub}</p>
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
            <Button variant="tonal" block onClick={() => { enterDemo(); navigate("/", { replace: true }); }}>
                Explore the demo as Jason
            </Button>
            <p className="mt-2 text-center text-[12px] text-caption">Every screen works. Kept in this browser, nothing to sign up for.</p>
        </div>
    );
}

export function LoginPage() {
    const { signIn, configured } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEmail(email)) return setErr("Enter a valid email.");
        setBusy(true);
        const msg = await signIn(email.trim(), pw);
        setBusy(false);
        if (msg) return setErr(msg);
        navigate("/", { replace: true });
    };
    return (
        <AuthFrame title="Welcome back" sub="Sign in to pick up where you left off.">
            {configured ? (
                <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
                    <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <PasswordField value={pw} onChange={setPw} autoComplete="current-password" error={err} />
                    <div className="-mt-1 text-right">
                        <Link to="/forgot" className="text-[13px] font-medium text-brand underline underline-offset-4">Forgot password?</Link>
                    </div>
                    <Button type="submit" loading={busy} block>Sign in</Button>
                    <p className="text-center text-[13px] text-muted">
                        New here? <Link to="/signup" className="font-semibold text-brand underline underline-offset-4">Create an account</Link>
                    </p>
                </form>
            ) : (
                <p className="rounded-md bg-peach-soft px-4 py-3 text-[13px] text-peach">Accounts aren't available on this address yet. The demo has everything.</p>
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
    const submit = async (e: React.FormEvent) => {
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
        <AuthFrame title="Create your account" sub="Free. Your progress is saved from the first lesson.">
            {configured ? (
                <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
                    <Field label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <PasswordField value={pw} onChange={setPw} autoComplete="new-password" error={err} />
                    <Button type="submit" loading={busy} block>Create account</Button>
                    <p className="text-center text-[13px] text-muted">
                        Already have one? <Link to="/login" className="font-semibold text-brand underline underline-offset-4">Sign in</Link>
                    </p>
                </form>
            ) : (
                <p className="rounded-md bg-peach-soft px-4 py-3 text-[13px] text-peach">Accounts aren't available on this address yet. Try the demo instead.</p>
            )}
            <DemoButton />
        </AuthFrame>
    );
}

export function ForgotPage() {
    const { sendReset } = useAuth();
    const [email, setEmail] = useState("");
    const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
    const [msg, setMsg] = useState<string | null>(null);
    const submit = async (e: React.FormEvent) => {
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
            {state === "sent" ? (
                <p className="rounded-md bg-mint-soft px-4 py-3 text-[14px] text-mint">If that address has an account, a reset link is on its way.</p>
            ) : (
                <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
                    <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={msg} />
                    <Button type="submit" loading={state === "busy"} block>Send reset link</Button>
                </form>
            )}
            <p className="mt-4 text-center text-[13px] text-muted">
                <Link to="/login" className="font-semibold text-brand underline underline-offset-4">Back to sign in</Link>
            </p>
        </AuthFrame>
    );
}

/** First run for a real account: interests and a goal — nothing else stands between them and a lesson. */
export function OnboardingPage() {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [interests, setInterests] = useState<CategoryId[]>(user.profile.interests);
    const [goal, setGoal] = useState(user.profile.weeklyGoalMin || 180);
    const [busy, setBusy] = useState(false);
    const finish = async () => {
        setBusy(true);
        try {
            await mutate((r) => r.updateProfile({ interests, weeklyGoalMin: goal, onboarded: true }));
            navigate("/", { replace: true });
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't save", "danger");
            setBusy(false);
        }
    };
    return (
        <AuthFrame title={`Hi ${user.profile.name.split(" ")[0]} — what are you here for?`} sub="Two questions. Both can change later in Settings.">
            <div className="flex flex-col gap-6">
                <div>
                    <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">I want to get better at</div>
                    <div className="flex flex-wrap gap-2">
                        {(["fe", "ux", "br"] as CategoryId[]).map((c) => {
                            const on = interests.includes(c);
                            return (
                                <button key={c} type="button" aria-pressed={on} onClick={() => setInterests((v) => (on ? v.filter((x) => x !== c) : [...v, c]))} className={cn("h-11 rounded-full border px-5 text-[14px] font-semibold", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                                    {CATEGORY_LABEL[c]}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Each week I can give it</div>
                    <div className="flex flex-wrap gap-2">
                        {[60, 120, 180, 300, 420].map((g) => (
                            <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(g)} className={cn("h-11 rounded-full border px-5 text-[14px] font-semibold", goal === g ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                                {g / 60} h
                            </button>
                        ))}
                    </div>
                </div>
                <Button block loading={busy} onClick={() => void finish()}>Take me to my dashboard</Button>
            </div>
        </AuthFrame>
    );
}
