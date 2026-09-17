import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlarmClock, Bell, CheckCheck, Inbox, Layers, MoonStar, Settings2, Sparkles, TriangleAlert } from "lucide-react";
import type { Member, NotificationKind } from "@/data/core";
import { cn } from "@/lib/cn";
import { longDate, time } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Avatar, Button, EmptyState, Tag } from "@/components/ui/primitives";
import notifications from "../module";
import { groupInbox, hhmm, inboxFor, isUnread, KIND_LABEL, mirrorIdsFor, prefsFor, ruleByKey, snoozeChoices, SETTINGS_PATH, todayLoad, type InboxItem } from "../derive";
import { useRecordBridge, type BridgePlan } from "../bridge";
import { InboxRow, type RowActions } from "../components/InboxRow";

/**
 * The notification centre — one calm inbox.
 *
 * Everything that needs a person is here once: the rows the follow-up engine
 * raised and the shell's own notifications, grouped Today and Earlier, with
 * the three things a real inbox needs beside them — what is snoozed, what
 * quiet hours are holding, and what got folded into the digest. Nothing is
 * ever dropped, so nothing is hidden: every deferred thing says when it will
 * arrive.
 *
 * A parent can switch to a child's inbox and act on their behalf; a child
 * sees only their own, and only in-app.
 */

export default function InboxPage() {
    const sp = useSpace();
    const { state, loading, error, mutate } = useModule(notifications);
    const { toast } = useToast();
    const navigate = useNavigate();
    const ai = useAi();
    const bridge = useRecordBridge();

    const [who, setWho] = useState(sp.me.id);
    const [kind, setKind] = useState<NotificationKind | "all">("all");
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [confirmItem, setConfirmItem] = useState<InboxItem | null>(null);
    const [confirmAct, setConfirmAct] = useState<{ item: InboxItem; plan: BridgePlan } | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [now, setNow] = useState(() => new Date().toISOString());

    // Snoozed things come back by themselves; the page notices without a reload.
    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date().toISOString()), 30_000);
        return () => window.clearInterval(t);
    }, []);
    useEffect(() => {
        setWho(sp.me.id);
        setSummary(null);
    }, [sp.me.id]);

    const inboxes: Member[] = useMemo(() => (sp.role === "parent" ? [sp.me, ...sp.members.filter((m) => m.role === "child")] : [sp.me]), [sp.role, sp.me, sp.members]);
    const viewing = inboxes.find((m) => m.id === who) ?? sp.me;
    const onBehalf = viewing.id !== sp.me.id;

    const all = useMemo(() => (state ? inboxFor(state, sp.coreState.notifications, viewing.id) : []), [state, sp.coreState.notifications, viewing.id]);
    const filtered = useMemo(() => all.filter((i) => (kind === "all" || i.kind === kind) && (!unreadOnly || isUnread(i, now))), [all, kind, unreadOnly, now]);
    const prefs = state ? prefsFor(state, viewing.id, sp.space.timezone) : null;
    const groups = useMemo(() => groupInbox(filtered, now, prefs?.digestAt ?? "18:00"), [filtered, now, prefs?.digestAt]);
    // The tiles count the whole inbox: a category filter narrows the lists below,
    // it does not change how much is snoozed or how much quiet hours are holding.
    const totals = useMemo(() => groupInbox(all, now, prefs?.digestAt ?? "18:00"), [all, now, prefs?.digestAt]);
    const load = state ? todayLoad(state, viewing.id, now) : { delivered: 0, bundled: 0, ceiling: 5 };
    const kinds = useMemo(() => [...new Set(all.map((i) => i.kind))], [all]);
    const snoozeOptions = useMemo(() => snoozeChoices(now, prefs?.quietEnd ?? "07:00"), [now, prefs?.quietEnd]);

    const child = sp.role === "child";
    const engineUnread = all.filter((i) => i.source === "engine" && isUnread(i, now)).length;
    const shellUnread = totals.unread - engineUnread;
    const nextWake = totals.snoozed.map((i) => i.snoozedUntil).filter((x): x is string => Boolean(x)).sort()[0] ?? null;

    // ---- writes -----------------------------------------------------------

    /**
     * The bell counts the shell's notifications, so every engine row that is
     * dealt with here settles its mirror in the same breath — otherwise the
     * badge keeps a number the inbox no longer agrees with.
     */
    const settleBell = async (items: InboxItem[]) => {
        const mirrors = mirrorIdsFor(sp.coreState.notifications, items.filter((i) => i.source === "engine").map((i) => i.id));
        const own = items.filter((i) => i.source === "shell" && !i.readAt).map((i) => i.id);
        const ids = [...mirrors, ...own];
        if (ids.length) await sp.mutateCore((r) => r.markRead(ids));
    };

    const readOne = async (item: InboxItem) => {
        try {
            if (item.source === "engine") await mutate((r) => r.markRead([item.id]));
            await settleBell([item]);
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't do that", "danger");
        }
    };

    /**
     * An inline action does the real thing first.
     *
     * The record it names is completed through the module that owns it, and
     * only then is the notification marked acted — so the inbox can never say
     * "Approved" while Money still says "waiting on a parent". If the other
     * module refuses, the row is left exactly as it was and says why.
     */
    const act = async (item: InboxItem) => {
        const label = item.action?.done ?? "Done";
        try {
            const done = await bridge.run(item);
            // The stamp on the row is what the owning module now says, not what
            // the button was called: "You said yes — 1 of 2", never "Approved".
            await mutate((r) => r.act(item.id, done?.outcome ?? label, item.memberId));
            await settleBell([item]);
            toast(done?.note ?? (onBehalf ? `${label} for ${viewing.name.split(" ")[0]}` : label), "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't do that", "danger");
        }
    };

    const actions: RowActions = {
        onMarkRead: (item) => void readOne(item),
        onOpen: (item) => {
            void readOne(item);
            if (item.href) navigate(item.href);
        },
        onAct: (item) => {
            const plan = bridge.plan(item);
            // Anything that changes a record elsewhere is proposed, then confirmed.
            if (plan) setConfirmAct({ item, plan });
            else void act(item);
        },
        onSnooze: async (item, until) => {
            try {
                await mutate((r) => r.snooze(item.id, until, item.memberId));
                if (until) await settleBell([item]);
                toast(until ? `Back at ${hhmm(until)}` : "It's back in your inbox", "success");
            } catch (e) {
                toast(e instanceof Error ? e.message : "Couldn't do that", "danger");
            }
        },
        onRemove: (item) => setConfirmItem(item),
    };

    const markAll = async () => {
        const unread = all.filter((i) => isUnread(i, now));
        try {
            await mutate((r) => r.markAllRead(viewing.id));
            await settleBell(unread);
            toast("All caught up", "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't do that", "danger");
        }
    };

    const summarise = async () => {
        const missed = all.filter((i) => isUnread(i, now));
        setSummary(null);
        try {
            const r = await ai.ask({
                action: "ask",
                prompt: `Summarise what ${onBehalf ? viewing.name : "I"} missed. Group it by what needs a decision today and what can wait, in three or four sentences, warm and plain. Do not invent anything that is not listed.`,
                payload: { unread: missed.map((i) => ({ title: i.title, body: i.body, kind: i.kind, when: i.createdAt })) },
                extraContext: missed.map((i) => `- ${i.title}: ${i.body}`).join("\n"),
            });
            setSummary(r.unavailable ?? r.text ?? "");
        } catch {
            setSummary("The companion couldn't answer just now. Everything below is still here.");
        }
    };

    // ---- render -----------------------------------------------------------

    if (loading) return <p className="text-md text-muted">Opening your inbox…</p>;
    if (error || !state) return <Notice tone="danger">{error ?? "The inbox couldn't load."}</Notice>;

    const ruleLabel = (i: InboxItem): string => (i.ruleKey ? (ruleByKey(state.rules, i.ruleKey)?.label ?? i.ruleKey) : "From the bell");
    const rows = (list: InboxItem[]) =>
        list.map((i) => <InboxRow key={i.id} item={i} ruleLabel={ruleLabel(i)} unread={isUnread(i, now)} snoozeOptions={snoozeOptions} actions={actions} canRemove={i.source === "engine"} />);

    return (
        <div>
            <PageTitle
                title={child ? "Your messages" : "Notifications"}
                sub={child ? "Everything waiting for you, in one place." : "One inbox for everything that needs a person — and nothing that doesn't."}
                area="home"
                actions={
                    <>
                        {totals.unread > 0 && (
                            <Button variant="outline" size="md" onClick={() => void markAll()}>
                                <CheckCheck size={15} aria-hidden="true" /> Mark all read
                            </Button>
                        )}
                        <Button variant="tonal" size="md" onClick={() => navigate(SETTINGS_PATH)}>
                            <Settings2 size={15} aria-hidden="true" /> {child ? "My settings" : "Follow-ups"}
                        </Button>
                    </>
                }
            />

            {inboxes.length > 1 && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted">Inbox</span>
                    {inboxes.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            aria-pressed={m.id === who}
                            onClick={() => setWho(m.id)}
                            className={cn("inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-medium", m.id === who ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                        >
                            <Avatar name={m.name} hue={m.hue} src={m.avatarUrl} size="xs" />
                            {m.id === sp.me.id ? "Mine" : m.name.split(" ")[0]}
                        </button>
                    ))}
                </div>
            )}

            {onBehalf && (
                <Notice tone="info" className="mb-5">
                    You are in {viewing.name.split(" ")[0]}'s inbox. Anything you do here is done on their behalf, and they will see it.
                </Notice>
            )}

            <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Waiting" value={totals.unread} sub={totals.unread === 0 ? "Nothing unread" : `${engineUnread} follow-up${engineUnread === 1 ? "" : "s"}${shellUnread ? ` · ${shellUnread} from the bell` : ""}`} tone={totals.unread > 5 ? "warn" : "neutral"} />
                <Stat label="Snoozed" value={totals.snoozed.length} sub={nextWake ? `Next back at ${hhmm(nextWake)}` : "Nothing put off"} />
                <Stat label="Held" value={totals.heldItems.length} sub={prefs ? `Quiet hours ${prefs.quietStart}–${prefs.quietEnd}` : "Quiet hours"} />
                <Stat label="Today" value={`${load.delivered}/${load.ceiling}`} sub={load.bundled ? `${load.bundled} rolled into the digest` : "Below the daily ceiling"} tone={load.delivered >= load.ceiling ? "warn" : "neutral"} />
            </div>

            {!child && (
                <div className="mb-6 rounded-xl bg-card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                            <Sparkles size={16} aria-hidden="true" />
                        </span>
                        <p className="min-w-0 flex-1 text-md text-muted">Ask the companion what you missed. It reads only what is in this inbox.</p>
                        <Button size="md" variant="outline" loading={ai.busy} onClick={() => void summarise()} disabled={totals.unread === 0}>
                            Summarise what I missed
                        </Button>
                    </div>
                    {summary !== null && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-page p-4 text-md leading-6">{summary || "Nothing to summarise."}</p>}
                    {ai.error && !summary && <p className="mt-3 text-sm text-danger-ink">{ai.error}</p>}
                </div>
            )}

            {kinds.length > 1 && (
                <div className="mb-5 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
                    <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")} className={chip(kind === "all")}>
                        Everything
                    </button>
                    {kinds.map((k) => (
                        <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>
                            {KIND_LABEL[k]}
                        </button>
                    ))}
                    <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly((v) => !v)} className={chip(unreadOnly)}>
                        Unread only
                    </button>
                </div>
            )}

            {groups.attention.length > 0 && (
                <Section title="Needs attention">
                    <p className="mb-3 text-sm text-muted">These asked three times and then stopped. They are waiting for a decision, not another reminder.</p>
                    <ul className="grid gap-2.5 rounded-xl bg-peach-soft/50 p-2">{rows(groups.attention)}</ul>
                </Section>
            )}

            <Section title="Today" action={<span className="text-xs text-caption">{longDate(now)}</span>}>
                {groups.today.length ? (
                    <ul className="grid gap-2.5">{rows(groups.today)}</ul>
                ) : (
                    <EmptyState
                        icon={<Inbox size={20} aria-hidden="true" />}
                        title={child ? "Nothing new today" : "Nothing has come in today"}
                        body={child ? "Have a look at your lessons and chores instead." : "The engine runs through the morning; anything it raises lands here."}
                        action={
                            <Link to="/" className="text-sm font-semibold text-brand underline underline-offset-4">
                                Back to the dashboard
                            </Link>
                        }
                    />
                )}
            </Section>

            {groups.earlier.length > 0 && (
                <Section title="Earlier">
                    <ul className="grid gap-2.5">{rows(groups.earlier)}</ul>
                </Section>
            )}

            {groups.digests.length > 0 && (
                <Section title="Digests">
                    <ul className="grid gap-2.5">
                        {groups.digests.map((d) => (
                            <li key={d.day}>
                                <details className="rounded-xl bg-card p-4">
                                    <summary className="flex cursor-pointer list-none items-center gap-3">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
                                            <Layers size={16} aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-base font-semibold">
                                                {d.pending ? "Today's digest" : `Digest · ${longDate(`${d.day}T12:00:00`)}`}
                                            </span>
                                            <span className="mt-0.5 block text-sm text-muted">
                                                {d.items.length} {d.items.length === 1 ? "thing" : "things"} collapsed into one so the day stayed calm
                                                {d.pending && prefs ? ` · goes out at ${prefs.digestAt}` : ""}
                                            </span>
                                        </span>
                                        {d.pending && <Tag tone="warn">Pending</Tag>}
                                    </summary>
                                    <ul className="mt-3 grid gap-2.5">
                                        {d.items.map((i) => (
                                            <InboxRow key={i.id} item={i} ruleLabel={ruleLabel(i)} unread={false} snoozeOptions={snoozeOptions} actions={actions} canRemove={i.source === "engine"} />
                                        ))}
                                    </ul>
                                </details>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {groups.heldItems.length > 0 && (
                <Section title="Held by quiet hours">
                    <p className="mb-3 flex items-center gap-2 text-sm text-muted">
                        <MoonStar size={14} aria-hidden="true" />
                        Nothing is dropped. These arrive when the quiet window ends.
                    </p>
                    <ul className="grid gap-2.5">
                        {groups.heldItems.map((i) => (
                            <InboxRow key={i.id} item={i} ruleLabel={ruleLabel(i)} unread={false} snoozeOptions={snoozeOptions} actions={actions} canRemove={i.source === "engine"} />
                        ))}
                    </ul>
                </Section>
            )}

            {groups.snoozed.length > 0 && (
                <Section title="Snoozed">
                    <p className="mb-3 flex items-center gap-2 text-sm text-muted">
                        <AlarmClock size={14} aria-hidden="true" />
                        Back in the inbox at the time you chose — or wake one now.
                    </p>
                    <ul className="grid gap-2.5">
                        {groups.snoozed.map((i) => (
                            <InboxRow key={i.id} item={i} ruleLabel={ruleLabel(i)} unread={false} snoozeOptions={snoozeOptions} actions={actions} canRemove={i.source === "engine"} />
                        ))}
                    </ul>
                </Section>
            )}

            {all.length === 0 && (
                <EmptyState
                    icon={<Bell size={20} aria-hidden="true" />}
                    title="You're all caught up"
                    body="Follow-ups, approvals and celebrations for you will land here."
                    action={
                        <Link to={SETTINGS_PATH} className="text-sm font-semibold text-brand underline underline-offset-4">
                            See which follow-ups are on
                        </Link>
                    }
                />
            )}

            {groups.attention.length > 0 && (
                <p className="mt-8 flex items-start gap-2 text-xs text-caption">
                    <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Parked items also show on the family dashboard under Needs attention.
                </p>
            )}

            <Confirm
                open={Boolean(confirmItem)}
                title="Remove this notification?"
                body={confirmItem ? `"${confirmItem.title}" disappears from the inbox. The thing it is about stays exactly where it is.` : undefined}
                confirmLabel="Remove"
                danger
                onClose={() => setConfirmItem(null)}
                onConfirm={async () => {
                    if (!confirmItem) return;
                    try {
                        await settleBell([confirmItem]);
                        await mutate((r) => r.remove(confirmItem.id));
                        toast("Removed", "success");
                    } catch (e) {
                        toast(e instanceof Error ? e.message : "Couldn't remove it", "danger");
                    }
                }}
            />

            <Confirm
                open={Boolean(confirmAct)}
                title={confirmAct ? `${confirmAct.item.action?.label ?? "Do it"} — ${confirmAct.plan.recordName}?` : ""}
                body={confirmAct ? `${confirmAct.plan.summary} You can undo it in ${confirmAct.plan.moduleName}.` : undefined}
                confirmLabel={confirmAct?.item.action?.label ?? "Do it"}
                onClose={() => setConfirmAct(null)}
                onConfirm={async () => {
                    if (!confirmAct) return;
                    await act(confirmAct.item);
                }}
            />

            {groups.heldItems.length > 0 && prefs && (
                <p className="sr-only">
                    Quiet hours run from {prefs.quietStart} to {prefs.quietEnd}; the next delivery is at {time(groups.heldItems[0].deferredUntil ?? now)}.
                </p>
            )}
        </div>
    );
}

const chip = (on: boolean): string =>
    cn("inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink");
