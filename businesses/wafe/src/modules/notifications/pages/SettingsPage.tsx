import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BellRing, FlaskConical, Layers, Mail, MoonStar, Play, RotateCcw, Smartphone, Sparkles, Trash2 } from "lucide-react";
import type { Member, NotificationKind } from "@/data/core";
import { cn } from "@/lib/cn";
import { relative } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, Notice, PageTitle, Section } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Button, Tag } from "@/components/ui/primitives";
import notifications from "../module";
import { ALL_KINDS, atLocal, hhmm, inQuietHours, KIND_LABEL, MODULE_PATH, mirrorHref, mirrorIdsFor, nextOpenWindow, prefsFor, rulesByJob, todayLoad } from "../derive";
import { JOB_LABEL, OUTCOME_LABEL, type DigestMode, type FollowUpRule, type NotifPrefs, type Outcome } from "../types";

/**
 * Follow-ups: how the engine speaks to this family.
 *
 * Preferences first, because they are what a member actually changes — the
 * channels, the hours the house is quiet, whether an over-busy day arrives as
 * one digest, and the categories they would rather not hear about. Then the
 * rules themselves, as data: every one carries the job that evaluates it and
 * the number of times it will ask before it gives up and parks the thing in
 * Needs attention.
 *
 * The tester is not a toy: it runs the real engine against a real recipient
 * and shows exactly what it decided, which is the only honest way to explain
 * quiet hours, the daily ceiling and the reminder cap.
 */

const OUTCOME_TONE: Record<Outcome, "ok" | "warn" | "danger" | "neutral" | "brand"> = {
    delivered: "ok",
    duplicate: "neutral",
    held: "brand",
    digest: "brand",
    muted: "neutral",
    parked: "warn",
    blocked: "danger",
};

function Toggle({ on, onChange, label, disabled, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; hint?: string }) {
    return (
        <div className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
                <span className="block text-md font-medium">{label}</span>
                {hint && <span className="mt-0.5 block text-xs text-caption">{hint}</span>}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!on)}
                className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-45", on ? "bg-brand" : "bg-line-strong")}
            >
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-[left]", on ? "left-[22px]" : "left-0.5")} aria-hidden="true" />
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const sp = useSpace();
    const { state, repo, loading, error, mutate, reload } = useModule(notifications);
    const { toast } = useToast();
    const ai = useAi();

    const parent = sp.role === "parent";
    const [who, setWho] = useState(sp.me.id);
    const [quiet, setQuiet] = useState<{ start: string; end: string } | null>(null);
    const [digestCopy, setDigestCopy] = useState<string | null>(null);
    const [testRule, setTestRule] = useState<FollowUpRule | null>(null);
    const [testWho, setTestWho] = useState(sp.me.id);
    const [testWhen, setTestWhen] = useState<"now" | "tonight" | "morning">("now");
    const [log, setLog] = useState<Array<{ id: string; outcome: Outcome; note: string }>>([]);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    const people: Member[] = useMemo(() => (parent ? [sp.me, ...sp.members.filter((m) => m.id !== sp.me.id)] : [sp.me]), [parent, sp.me, sp.members]);
    const viewing = people.find((m) => m.id === who) ?? sp.me;
    const prefs: NotifPrefs | null = state ? prefsFor(state, viewing.id, sp.space.timezone) : null;
    const isChild = viewing.role === "child";
    const now = new Date().toISOString();

    if (loading) return <p className="text-md text-muted">Loading your follow-ups…</p>;
    if (error || !state || !prefs) return <Notice tone="danger">{error ?? "Follow-ups couldn't load."}</Notice>;

    const load = todayLoad(state, viewing.id, now);
    const quietStart = quiet?.start ?? prefs.quietStart;
    const quietEnd = quiet?.end ?? prefs.quietEnd;
    const quietNow = inQuietHours(now, prefs.quietStart, prefs.quietEnd);

    const save = async (patch: Partial<Omit<NotifPrefs, "memberId">>, message: string) => {
        try {
            await mutate((r) => r.setPrefs(viewing.id, patch));
            toast(message, "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't save that", "danger");
        }
    };

    const saveQuiet = async (e: FormEvent) => {
        e.preventDefault();
        await save({ quietStart, quietEnd }, `Quiet hours ${quietStart}–${quietEnd}`);
        setQuiet(null);
    };

    const toggleMute = async (k: NotificationKind) => {
        const next = prefs.mutedKinds.includes(k) ? prefs.mutedKinds.filter((x) => x !== k) : [...prefs.mutedKinds, k];
        await save({ mutedKinds: next }, next.includes(k) ? `${KIND_LABEL[k]} muted for ${viewing.name.split(" ")[0]}` : `${KIND_LABEL[k]} back on`);
    };

    const warmUpDigest = async () => {
        setDigestCopy(null);
        try {
            const r = await ai.ask({
                action: "briefing",
                prompt: "Write the opening two sentences of our morning digest email in our family's own voice: warm, plain, never breathless. Mention that it gathers what came in after the day's fifth notification.",
                payload: { audience: viewing.name, digestAt: prefs.digestAt, values: sp.space.values },
            });
            setDigestCopy(r.unavailable ?? r.text ?? "");
        } catch {
            setDigestCopy("The companion couldn't write that just now — the plain wording still goes out.");
        }
    };

    // --- the rule tester ---------------------------------------------------

    const whenIso = (offsetDays = 0): string => {
        const base = testWhen === "tonight" ? atLocal(now, "23:00") : testWhen === "morning" ? atLocal(now, "07:00") : now;
        if (!offsetDays) return base;
        const d = new Date(base);
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString();
    };

    const runOnce = async (rule: FollowUpRule, at: string, record: string) => {
        const title = `Test: ${rule.label}`;
        const res = await repo.raise({
            memberId: testWho,
            ruleKey: rule.ruleKey,
            title,
            body: rule.trigger,
            href: MODULE_PATH,
            recordType: "test",
            recordId: record,
            at,
            isTest: true,
        });
        // A delivered nudge has to reach the bell, or the tester would prove the
        // engine works while the nav quietly disagreed. Held, bundled, muted and
        // parked outcomes are not deliveries, so they raise nothing.
        if (res.outcome === "delivered" && res.itemId) {
            const href = mirrorHref(res.itemId, MODULE_PATH);
            await sp.mutateCore((c) => c.notify({ memberId: testWho, kind: rule.kind, title, body: rule.trigger, href }));
        }
        setLog((l) => [{ id: `${Date.now()}-${l.length}`, outcome: res.outcome, note: res.note }, ...l].slice(0, 12));
        return res;
    };

    const runTest = async (mode: "once" | "reminders" | "ceiling") => {
        if (!testRule) return;
        try {
            if (mode === "once") {
                await runOnce(testRule, whenIso(), `test-${testRule.ruleKey}`);
            } else if (mode === "reminders") {
                const record = `test-cap-${testRule.ruleKey}`;
                for (let i = testRule.maxReminders; i >= 0; i -= 1) await runOnce(testRule, whenIso(-i), record);
            } else {
                for (let i = 0; i < 8; i += 1) {
                    const res = await runOnce(testRule, whenIso(), `test-fill-${i}`);
                    if (res.outcome === "digest") break;
                }
            }
            await reload();
        } catch (e) {
            toast(e instanceof Error ? e.message : "The engine refused that", "danger");
        }
    };

    return (
        <div>
            <PageTitle
                title="Follow-ups"
                sub="How, when and how often Wàfè is allowed to interrupt this family."
                area="home"
                actions={
                    <Link to={MODULE_PATH} className="text-sm font-semibold text-brand underline underline-offset-4">
                        Back to the inbox
                    </Link>
                }
            />

            {people.length > 1 && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted">Settings for</span>
                    {people.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            aria-pressed={m.id === who}
                            onClick={() => {
                                setWho(m.id);
                                setQuiet(null);
                            }}
                            className={cn("inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-medium", m.id === who ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                        >
                            <Avatar name={m.name} hue={m.hue} src={m.avatarUrl} size="xs" />
                            {m.id === sp.me.id ? "Me" : m.name.split(" ")[0]}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
                {/* Channels ------------------------------------------------ */}
                <Section title="How it reaches you" className="mb-0">
                    <div className="rounded-xl bg-card p-4">
                        <div className="divide-y divide-line">
                            <Toggle on label="In the app" hint="Always on. The bell and this inbox." disabled onChange={() => undefined} />
                            <Toggle on={prefs.email} label="Email" hint={isChild ? "Children are in-app only." : "One message per notification, or a digest."} disabled={isChild} onChange={(v) => void save({ email: v }, v ? "Email on" : "Email off")} />
                            <Toggle on={prefs.push} label="Push" hint={isChild ? "Children are in-app only." : "Only for the things that cannot wait."} disabled={isChild} onChange={(v) => void save({ push: v }, v ? "Push on" : "Push off")} />
                        </div>
                        {isChild && (
                            <p className="mt-3 flex items-start gap-2 rounded-lg bg-page p-3 text-xs leading-5 text-muted">
                                <BellRing size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                                {viewing.name.split(" ")[0]} receives notifications in the app only — no email, no push, whatever is ticked here.
                            </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-2xs text-caption">
                            <span className="inline-flex items-center gap-1">
                                <BellRing size={11} aria-hidden="true" /> In-app
                            </span>
                            {prefs.email && !isChild && (
                                <span className="inline-flex items-center gap-1">
                                    <Mail size={11} aria-hidden="true" /> Email
                                </span>
                            )}
                            {prefs.push && !isChild && (
                                <span className="inline-flex items-center gap-1">
                                    <Smartphone size={11} aria-hidden="true" /> Push
                                </span>
                            )}
                        </div>
                    </div>
                </Section>

                {/* Quiet hours --------------------------------------------- */}
                <Section title="Quiet hours" className="mb-0">
                    <form onSubmit={saveQuiet} className="overflow-hidden rounded-xl bg-card">
                        <img src="/images/notifications-quiet.jpg" alt="A lamp-lit living room in the evening" width={800} height={500} loading="lazy" className="h-32 w-full object-cover" />
                        <div className="p-4">
                            <p className="text-sm leading-5 text-muted">Nothing is dropped in the quiet window — it waits and arrives when the window ends.</p>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-medium text-muted">From</span>
                                    <input type="time" value={quietStart} onChange={(e) => setQuiet({ start: e.target.value, end: quietEnd })} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-medium text-muted">Until</span>
                                    <input type="time" value={quietEnd} onChange={(e) => setQuiet({ start: quietStart, end: e.target.value })} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                                </label>
                            </div>
                            <p className="mt-3 flex items-start gap-2 rounded-lg bg-page p-3 text-xs leading-5 text-muted">
                                <MoonStar size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                                {quietNow ? `It is quiet time now — anything raised waits until ${hhmm(nextOpenWindow(now, prefs.quietEnd))}.` : `Anything raised after ${prefs.quietStart} waits until ${prefs.quietEnd}.`}
                            </p>
                            {quiet && (
                                <Button type="submit" size="md" className="mt-3">
                                    Save quiet hours
                                </Button>
                            )}
                        </div>
                    </form>
                </Section>

                {/* Digest --------------------------------------------------- */}
                <Section title="Digest" className="mb-0">
                    <div className="overflow-hidden rounded-xl bg-card">
                        <img src="/images/notifications-morning.jpg" alt="A mug on a windowsill at sunrise" width={800} height={500} loading="lazy" className="h-32 w-full object-cover" />
                        <div className="p-4">
                            <p className="text-sm leading-5 text-muted">
                                Past {load.ceiling} notifications in a day, the rest are collected into one message instead of arriving separately. {viewing.name.split(" ")[0]} has had {load.delivered} today
                                {load.bundled ? `, and ${load.bundled} went to the digest` : ""}.
                            </p>
                            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Digest mode">
                                {(["off", "auto", "always"] as DigestMode[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        role="radio"
                                        aria-checked={prefs.digestMode === m}
                                        onClick={() => void save({ digestMode: m }, m === "off" ? "Digest off" : m === "auto" ? "Digest engages past the daily ceiling" : "Everything goes to the digest")}
                                        className={cn("rounded-sm border px-3 py-2 text-left", prefs.digestMode === m ? "border-brand bg-brand-soft" : "border-line-strong hover:border-line")}
                                    >
                                        <span className="block text-sm font-semibold capitalize">{m}</span>
                                        <span className="block text-2xs text-caption">{m === "off" ? "Never bundle" : m === "auto" ? `Past ${load.ceiling} a day` : "One message a day"}</span>
                                    </button>
                                ))}
                            </div>
                            <label className="mt-3 block max-w-40">
                                <span className="mb-1.5 block text-xs font-medium text-muted">Goes out at</span>
                                <input type="time" value={prefs.digestAt} onChange={(e) => void save({ digestAt: e.target.value }, `Digest at ${e.target.value}`)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                            </label>
                            <div className="mt-4 border-t border-line pt-3">
                                <Button size="sm" variant="outline" loading={ai.busy} onClick={() => void warmUpDigest()}>
                                    <Sparkles size={13} aria-hidden="true" /> Write the morning digest in our tone
                                </Button>
                                {digestCopy !== null && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-page p-3 text-sm leading-6">{digestCopy || "Nothing came back."}</p>}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Mute ----------------------------------------------------- */}
                <Section title="Categories" className="mb-0">
                    <div className="rounded-xl bg-card p-4">
                        <p className="text-sm leading-5 text-muted">Mute a category and {viewing.id === sp.me.id ? "you" : viewing.name.split(" ")[0]} stop{viewing.id === sp.me.id ? "" : "s"} hearing about it. Everyone else still does.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {ALL_KINDS.map((k) => {
                                const muted = prefs.mutedKinds.includes(k);
                                return (
                                    <button key={k} type="button" aria-pressed={muted} onClick={() => void toggleMute(k)} className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium", muted ? "border-line-strong bg-page text-caption line-through" : "border-brand/40 bg-brand-soft text-brand-ink")}>
                                        {KIND_LABEL[k]}
                                    </button>
                                );
                            })}
                        </div>
                        {prefs.mutedKinds.length > 0 && <p className="mt-3 text-xs text-caption">Muted: {prefs.mutedKinds.map((k) => KIND_LABEL[k]).join(", ")}.</p>}
                    </div>
                </Section>
            </div>

            {/* Rules ------------------------------------------------------- */}
            {parent ? (
                <Section
                    title="The rules"
                    className="mt-8"
                    action={
                        <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)}>
                            <RotateCcw size={13} aria-hidden="true" /> Reset to defaults
                        </Button>
                    }
                >
                    <p className="mb-4 text-sm leading-5 text-muted">
                        {state.rules.filter((r) => r.enabled).length} of {state.rules.length} are on. Each one names the job that evaluates it and how many times it will ask before it stops and parks the thing in Needs attention.
                    </p>
                    <div className="grid gap-5">
                        {rulesByJob(state.rules).map((group) => (
                            <div key={group.job} className="rounded-xl bg-card p-4">
                                <h3 className="text-md font-semibold">{JOB_LABEL[group.job]}</h3>
                                <p className="mt-0.5 text-xs text-caption">
                                    {group.rules.length} {group.rules.length === 1 ? "rule" : "rules"}
                                </p>
                                <ul className="mt-3 divide-y divide-line">
                                    {group.rules.map((r) => (
                                        <li key={r.ruleKey} className="flex flex-wrap items-center gap-3 py-3">
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className={cn("text-md font-medium", !r.enabled && "text-caption line-through")}>{r.label}</span>
                                                    <Tag tone="neutral">{r.moduleId}</Tag>
                                                    {r.sensitivity !== "general" && <Tag tone="warn">{r.sensitivity}</Tag>}
                                                </span>
                                                <span className="mt-0.5 block text-xs leading-5 text-muted">{r.trigger}</span>
                                                <span className="mt-0.5 block text-2xs text-caption">
                                                    One per {r.windowUnit === "once" ? "record" : r.windowUnit} · {r.maxReminders} {r.maxReminders === 1 ? "reminder" : "reminders"}
                                                    {r.escalateTo ? ` · then ${r.escalateTo}` : ""} · {r.recipientRole}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <label className="flex items-center gap-1.5 text-2xs text-caption">
                                                    <span className="sr-only sm:not-sr-only">Reminders</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={9}
                                                        value={r.maxReminders}
                                                        aria-label={`Reminders for ${r.label}`}
                                                        onChange={(e) => void mutate((repo2) => repo2.setRule(r.ruleKey, { ruleKey: r.ruleKey, maxReminders: Math.max(0, Math.min(9, Number(e.target.value) || 0)) }))}
                                                        className="h-9 w-14 rounded-sm border border-line-strong bg-card px-2 text-sm outline-none focus:border-brand"
                                                    />
                                                </label>
                                                <Button size="sm" variant="ghost" onClick={() => setTestRule(r)} aria-label={`Try ${r.label}`}>
                                                    <FlaskConical size={13} aria-hidden="true" /> Try it
                                                </Button>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={r.enabled}
                                                    aria-label={`${r.label} is ${r.enabled ? "on" : "off"}`}
                                                    onClick={() => void mutate((repo2) => repo2.setRule(r.ruleKey, { ruleKey: r.ruleKey, enabled: !r.enabled }))}
                                                    className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", r.enabled ? "bg-brand" : "bg-line-strong")}
                                                >
                                                    <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-[left]", r.enabled ? "left-[22px]" : "left-0.5")} aria-hidden="true" />
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Section>
            ) : (
                <Notice tone="info" className="mt-8">
                    A parent decides which follow-ups the family gets. You can change how they reach you above.
                </Notice>
            )}

            {/* History ------------------------------------------------------ */}
            {state.history.length > 0 && (
                <Section title="What the engine did" className="mt-8">
                    <div className="overflow-x-auto rounded-xl bg-card">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-line text-2xs uppercase tracking-[0.06em] text-caption">
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Rule
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Who
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Outcome
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Why
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        When
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {state.history.slice(0, 14).map((h) => (
                                    <tr key={h.id}>
                                        <td className="px-4 py-3 font-medium">{state.rules.find((r) => r.ruleKey === h.ruleKey)?.label ?? h.ruleKey}</td>
                                        <td className="px-4 py-3 text-muted">{sp.members.find((m) => m.id === h.memberId)?.name.split(" ")[0] ?? "—"}</td>
                                        <td className="px-4 py-3">
                                            <Tag tone={OUTCOME_TONE[h.outcome]}>{OUTCOME_LABEL[h.outcome]}</Tag>
                                        </td>
                                        <td className="px-4 py-3 text-muted">{h.note}</td>
                                        <td className="px-4 py-3 text-caption">{relative(h.sentAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {parent && (
                        <div className="mt-3">
                            <Button size="sm" variant="ghost" className="text-danger-ink" onClick={() => setConfirmClear(true)}>
                                <Trash2 size={13} aria-hidden="true" /> Clear test notifications
                            </Button>
                        </div>
                    )}
                </Section>
            )}

            {/* The tester --------------------------------------------------- */}
            <Dialog open={Boolean(testRule)} onClose={() => setTestRule(null)} title={testRule ? `Try "${testRule.label}"` : "Try a rule"} wide>
                {testRule && (
                    <div>
                        <p className="text-sm leading-5 text-muted">{testRule.trigger}</p>
                        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-muted">Send it to</span>
                                <select value={testWho} onChange={(e) => setTestWho(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                    {sp.members.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} · {m.relation}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-muted">Pretend the job runs</span>
                                <select value={testWhen} onChange={(e) => setTestWhen(e.target.value as typeof testWhen)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                    <option value="now">Now</option>
                                    <option value="tonight">Tonight at 23:00</option>
                                    <option value="morning">This morning at 07:00</option>
                                </select>
                            </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="md" onClick={() => void runTest("once")}>
                                <Play size={14} aria-hidden="true" /> Run once
                            </Button>
                            <Button size="md" variant="outline" onClick={() => void runTest("reminders")}>
                                Run {testRule.maxReminders + 1} days running
                            </Button>
                            <Button size="md" variant="outline" onClick={() => void runTest("ceiling")}>
                                <Layers size={14} aria-hidden="true" /> Fill today's ceiling
                            </Button>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-caption">
                            These are real notifications, marked as tests. "Run {testRule.maxReminders + 1} days running" shows the reminder cap parking the item; "Fill today's ceiling" shows the digest taking over.
                        </p>
                        {log.length > 0 && (
                            <ul className="mt-4 grid gap-2">
                                {log.map((l) => (
                                    <li key={l.id} className="flex items-start gap-2 rounded-lg bg-page p-3 text-sm">
                                        <Tag tone={OUTCOME_TONE[l.outcome]}>{OUTCOME_LABEL[l.outcome]}</Tag>
                                        <span className="min-w-0 flex-1 text-muted">{l.note}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </Dialog>

            <Confirm
                open={confirmReset}
                title="Put every rule back?"
                body="Every rule goes back to the way the product ships it. Your channels, quiet hours and digest are untouched."
                confirmLabel="Reset the rules"
                danger
                onClose={() => setConfirmReset(false)}
                onConfirm={async () => {
                    try {
                        await mutate((r) => r.resetRules());
                        toast("Rules reset", "success");
                    } catch (e) {
                        toast(e instanceof Error ? e.message : "Couldn't reset", "danger");
                    }
                }}
            />
            <Confirm
                open={confirmClear}
                title="Clear the test notifications?"
                body="Everything raised from the tester disappears. Real notifications stay."
                confirmLabel="Clear them"
                danger
                onClose={() => setConfirmClear(false)}
                onConfirm={async () => {
                    try {
                        // Their mirrors go quiet with them, so the bell does not
                        // keep counting notifications that no longer exist.
                        const mirrors = mirrorIdsFor(sp.coreState.notifications, state.items.filter((i) => i.isTest).map((i) => i.id));
                        if (mirrors.length) await sp.mutateCore((c) => c.markRead(mirrors));
                        await mutate((r) => r.clearTests());
                        setLog([]);
                        toast("Tests cleared", "success");
                    } catch (e) {
                        toast(e instanceof Error ? e.message : "Couldn't clear them", "danger");
                    }
                }}
            />
        </div>
    );
}
