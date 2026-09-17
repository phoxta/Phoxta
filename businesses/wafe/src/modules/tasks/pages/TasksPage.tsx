import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, Gift, ListChecks, Pencil, Plus, RefreshCw, Sparkles, Sprout, Users } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { relative } from "@/lib/format";
import { Confirm, EmptyModule, MemberAvatar, MemberMultiPicker, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, EmptyState, ProgressBar, Skeleton, Tag } from "@/components/ui/primitives";
import {
    BASE,
    applyFilter,
    awaitingProof,
    choresFor,
    dueRotations,
    groupTasks,
    isDone,
    ledgerFor,
    nextReward,
    orphans,
    pendingRedemptions,
    rotaNext,
    rotaTurn,
    sproutsBalance,
    sproutsThisWeek,
    weekStats,
} from "../derive";
import type { ChoreRota, Reward, Task } from "../types";
import { REWARD_KIND_LABEL } from "../types";
import { Celebration, FilterBar, SproutsPill, TaskRow, TickButton, ViewTabs } from "../components/pieces";
import { CompanionDialog } from "../components/CompanionDialog";
import { GuestTasks } from "../components/GuestTasks";
import { ProofDialog } from "../components/ProofDialog";
import { AdjustDialog, RewardDialog } from "../components/RewardDialog";
import { RotaDialog } from "../components/RotaDialog";
import { TaskDialog } from "../components/TaskDialog";
import { useFilters } from "../components/useFilters";
import { useTasks } from "../components/useTasks";

/**
 * Tasks & chores — the list, and the two rooms behind it.
 *
 * A parent gets the whole household: everything grouped by when it is due,
 * filters that mean the same thing on every view, the chore rota, the photos
 * waiting on a yes and the rewards ledger. A child gets a different door to
 * the same data — today's jobs, big enough to tap, their Sprouts and what
 * those Sprouts are nearly worth. A guest gets the two things they were asked
 * to do, and nothing else exists for them here.
 */

// ---------------------------------------------------------------------------
// Whose turn it is
// ---------------------------------------------------------------------------

/**
 * The rota's fallback voice.
 *
 * The swap itself happens by itself (below), but if it hasn't landed yet — or
 * the write was refused — whoever is looking should still be told whose week it
 * is, rather than quietly seeing the wrong name on the chore.
 */
function RotaNotice({ rotas, members }: { rotas: ChoreRota[]; members: Member[] }) {
    if (!rotas.length) return null;
    return (
        <Notice className="mb-5">
            {rotas.map((r) => `${r.name}: it's ${members.find((m) => m.id === rotaNext(r))?.name.split(" ")[0] ?? "someone else"}'s turn this week.`).join(" ")}
        </Notice>
    );
}

// ---------------------------------------------------------------------------
// Child
// ---------------------------------------------------------------------------

function ChildView() {
    const { state, sp, mutate, toast, complete, celebration, clearCelebration, loading } = useTasks();
    const [proofFor, setProofFor] = useState<Task | null>(null);
    const [adding, setAdding] = useState(false);
    const [asking, setAsking] = useState<string | null>(null);

    if (loading) return <Skeleton className="h-64" />;

    const balance = sproutsBalance(state, sp.me.id);
    const week = sproutsThisWeek(state, sp.me.id, sp.today);
    const next = nextReward(state, sp.me.id);
    const todayChores = choresFor(state, sp.me.id, sp.today);
    const mine = state.tasks.filter((t) => !t.isChore && !isDone(t) && t.assigneeMemberIds.includes(sp.me.id));
    const myRequests = state.redemptions.filter((r) => r.memberId === sp.me.id);

    const request = async (rewardId: string) => {
        try {
            await mutate((r) => r.requestReward(rewardId));
            toast("Asked a parent — they'll say yes or no", "success");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't ask for that", "danger");
        } finally {
            setAsking(null);
        }
    };

    return (
        <div>
            {celebration && <Celebration sprouts={celebration.sprouts} title={celebration.title} onDone={clearCelebration} />}
            <PageTitle title="Your jobs" sub="Tick them off as you go. Chores grow your Sprouts." area="execute" actions={<Button onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Add my own</Button>} />

            <RotaNotice rotas={dueRotations(state, sp.today)} members={sp.members} />

            <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                <Stat label="Your Sprouts" value={balance} sub={week ? `+${week} this week` : "None yet this week"} tone="ok" />
                <Stat label="Jobs today" value={todayChores.filter((t) => !isDone(t)).length} sub={`${todayChores.filter(isDone).length} already done`} />
                <Stat label="Next reward" value={next ? next.short : "—"} sub={next ? `more for ${next.reward.name}` : "You can have anything on the list"} tone="warn" />
            </div>

            <Section title="Chores today">
                {todayChores.length === 0 ? (
                    <EmptyState title="Nothing on your list today" body="Enjoy it — or ask a parent for something to earn Sprouts with." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                        {todayChores.map((t) => {
                            const waiting = t.needsProof && Boolean(t.proofUrl) && !t.proofApprovedBy;
                            return (
                                <Card as="li" key={t.id} className={cn("flex items-start gap-3", isDone(t) && "opacity-70")}>
                                    <TickButton
                                        task={t}
                                        big
                                        onTick={() => {
                                            if (t.needsProof && !t.proofApprovedBy) setProofFor(t);
                                            else void complete(t);
                                        }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <Link to={`${BASE}/${t.id}`} className="block text-lg font-semibold leading-6">
                                            {t.title}
                                        </Link>
                                        {t.notes && <p className="mt-0.5 text-md leading-5 text-muted">{t.notes}</p>}
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <SproutsPill n={t.sprouts} />
                                            {waiting && <Tag tone="warn">Waiting for a parent</Tag>}
                                            {t.needsProof && !t.proofUrl && <Tag tone="neutral" icon={<Camera size={11} aria-hidden="true" />}>Photo needed</Tag>}
                                            {isDone(t) && <Tag tone="ok">Done</Tag>}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </ul>
                )}
            </Section>

            <Section title="Everything else on your list" action={<Link to={`${BASE}/board`} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">See the board</Link>}>
                {mine.length === 0 ? (
                    <EmptyState title="You're all clear" body="Nothing else has your name on it." />
                ) : (
                    <Card>
                        <ul>
                            {mine.map((t) => (
                                <TaskRow key={t.id} task={t} today={sp.today} canTick onTick={() => void complete(t)} />
                            ))}
                        </ul>
                    </Card>
                )}
            </Section>

            <Section title="What Sprouts are worth">
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {state.rewards.map((r) => {
                        const can = balance >= r.costSprouts;
                        const pending = myRequests.find((x) => x.rewardId === r.id && x.status === "requested");
                        return (
                            <Card as="li" key={r.id} className="flex flex-col">
                                {r.imageUrl && <img src={r.imageUrl} alt="" width={400} height={220} loading="lazy" className="mb-3 aspect-[16/9] w-full rounded-md object-cover" />}
                                <h3 className="text-lg font-semibold">{r.name}</h3>
                                {r.note && <p className="mt-0.5 text-sm leading-5 text-muted">{r.note}</p>}
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <SproutsPill n={r.costSprouts} />
                                    {pending ? (
                                        <Tag tone="warn">Asked</Tag>
                                    ) : (
                                        <Button size="sm" variant={can ? "brand" : "outline"} disabled={!can} onClick={() => setAsking(r.id)}>
                                            {can ? "Ask for it" : `${r.costSprouts - balance} to go`}
                                        </Button>
                                    )}
                                </div>
                                {!can && <ProgressBar value={(balance / r.costSprouts) * 100} className="mt-3" label={`${r.name} progress`} />}
                            </Card>
                        );
                    })}
                </ul>
            </Section>

            <Section title="Your Sprouts, one by one">
                <Card>
                    <ul className="flex flex-col">
                        {ledgerFor(state, sp.me.id).slice(0, 12).map((e) => (
                            <li key={e.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
                                <span className="min-w-0">
                                    <span className="block truncate text-md">{e.note}</span>
                                    <span className="block text-xs text-caption">{relative(e.at)}</span>
                                </span>
                                <span className={cn("shrink-0 text-md font-semibold tabular-nums", e.delta >= 0 ? "text-grow-ink" : "text-danger-ink")}>
                                    {e.delta >= 0 ? "+" : ""}
                                    {e.delta}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </Section>

            {proofFor && <ProofDialog open onClose={() => setProofFor(null)} task={proofFor} onSent={() => void complete(proofFor)} />}
            <TaskDialog open={adding} onClose={() => setAdding(false)} state={state} />
            <Confirm
                open={Boolean(asking)}
                title="Ask for this reward?"
                body="A parent has to say yes. The Sprouts come off when they do."
                confirmLabel="Ask"
                onConfirm={() => (asking ? request(asking) : undefined)}
                onClose={() => setAsking(null)}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Parent — the list
// ---------------------------------------------------------------------------

function BulkBar({ ids, onDone, onClear }: { ids: string[]; onDone: () => void; onClear: () => void }) {
    const { mutate, toast } = useTasks();
    const [open, setOpen] = useState(false);
    const [who, setWho] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const assign = async () => {
        setBusy(true);
        try {
            await mutate((r) => r.bulkAssign(ids, who));
            toast(`${ids.length} task${ids.length === 1 ? "" : "s"} assigned`, "success");
            setOpen(false);
            onDone();
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't assign those", "danger");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="sticky bottom-20 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-ink px-4 py-3 text-white md:bottom-6">
            <span className="text-sm font-semibold">{ids.length} selected</span>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                <Users size={14} aria-hidden="true" /> Assign
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onClear}>
                Clear
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} title={`Assign ${ids.length} task${ids.length === 1 ? "" : "s"}`}>
                <MemberMultiPicker value={who} onChange={setWho} label="Give them to" />
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button loading={busy} onClick={assign}>
                        Assign
                    </Button>
                </div>
            </Dialog>
        </div>
    );
}

function TaskListTab() {
    const { state, sp, complete, mutate } = useTasks();
    const { filter, set, toggle, clear, active, qs } = useFilters();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const manage = sp.can("tasks.manage");

    const filtered = useMemo(() => applyFilter(state.tasks, filter, sp.today), [state.tasks, filter, sp.today]);
    const groups = useMemo(() => groupTasks(filtered, sp.today), [filtered, sp.today]);
    const loose = orphans(state).filter((t) => !t.goalId).slice(0, 3);

    return (
        <>
            <FilterBar state={state} members={sp.members.filter((m) => m.role !== "guest")} filter={filter} set={set} toggle={toggle} clear={clear} active={active} />

            {selected.size > 0 && manage && <BulkBar ids={[...selected]} onDone={() => setSelected(new Set())} onClear={() => setSelected(new Set())} />}

            {loose.length > 0 && active === 0 && (
                <Notice tone="info" className="mb-5">
                    {loose.length} task{loose.length === 1 ? " isn't" : "s aren't"} pointed at anything we said mattered — {loose.map((t) => `"${t.title}"`).join(", ")}.{" "}
                    <Link to={`${BASE}/${loose[0].id}`} className="font-semibold underline underline-offset-4">
                        Link one to a goal
                    </Link>
                    .
                </Notice>
            )}

            {groups.length === 0 ? (
                <EmptyModule title={active ? "Nothing matches those filters" : "Nothing on the list"} body={active ? "Clear a chip or two." : "Add the first thing and it will show up here, grouped by when it's due."} action={active ? <Button variant="outline" onClick={clear}>Clear filters</Button> : undefined} />
            ) : (
                groups.map((g) => (
                    <Section
                        key={g.key}
                        title={g.label}
                        action={
                            <span className={cn("text-xs font-semibold", g.tone === "danger" ? "text-danger-ink" : g.tone === "warn" ? "text-peach" : "text-caption")}>
                                {g.tasks.length}
                            </span>
                        }
                    >
                        <Card>
                            <ul>
                                {g.tasks.map((t) => (
                                    <TaskRow
                                        key={t.id}
                                        task={t}
                                        today={sp.today}
                                        canTick={!isDone(t)}
                                        onTick={() => void complete(t)}
                                        onUndo={() => void mutate((r) => r.reopenTask(t.id))}
                                        selected={selected.has(t.id)}
                                        onSelect={
                                            manage
                                                ? (on) => {
                                                      const next = new Set(selected);
                                                      if (on) next.add(t.id);
                                                      else next.delete(t.id);
                                                      setSelected(next);
                                                  }
                                                : undefined
                                        }
                                    />
                                ))}
                            </ul>
                        </Card>
                    </Section>
                ))
            )}
            <p className="sr-only">Filters carry across views: {qs || "none set"}.</p>
        </>
    );
}

// ---------------------------------------------------------------------------
// Parent — chores and the rota
// ---------------------------------------------------------------------------

function ChoresTab() {
    const { state, sp, mutate, approve, toast } = useTasks();
    const [declining, setDeclining] = useState<Task | null>(null);
    const [reason, setReason] = useState("");
    const [addingRota, setAddingRota] = useState(false);
    const [removingRota, setRemovingRota] = useState<ChoreRota | null>(null);
    const kids = sp.members.filter((m) => m.role === "child");
    const waiting = awaitingProof(state);
    const manage = sp.can("tasks.manage");

    return (
        <>
            <Section
                title="The rota"
                action={
                    manage ? (
                        <Button size="sm" variant="outline" onClick={() => setAddingRota(true)}>
                            <Plus size={14} aria-hidden="true" /> Set up a rota
                        </Button>
                    ) : undefined
                }
            >
                {state.rotas.length === 0 ? (
                    <EmptyState
                        title="No rota yet"
                        body="A rota takes one chore and passes it between two or more children, every planning day."
                        action={manage ? <Button onClick={() => setAddingRota(true)}>Set one up</Button> : undefined}
                    />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.rotas.map((rota) => {
                            const due = rota.nextRotateAt <= sp.today;
                            return (
                                <Card as="li" key={rota.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-semibold">{rota.name}</h3>
                                            <p className="mt-0.5 text-sm text-muted">Turns every {rota.rotation === "weekly" ? "week" : "fortnight"} on the family's planning day.</p>
                                        </div>
                                        <Tag tone={due ? "warn" : "neutral"}>{due ? "Turns today" : `Turns ${rota.nextRotateAt}`}</Tag>
                                    </div>
                                    <div className="mt-3 flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <MemberAvatar memberId={rotaTurn(rota)} size="sm" showName />
                                            <span className="text-xs text-caption">this week</span>
                                        </div>
                                        <span className="text-caption" aria-hidden="true">
                                            →
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <MemberAvatar memberId={rotaNext(rota)} size="sm" showName />
                                            <span className="text-xs text-caption">next</span>
                                        </div>
                                    </div>
                                    {manage && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => void mutate((r) => r.rotateRota(rota.id)).then(() => toast("Rota turned", "success"))}>
                                                <RefreshCw size={14} aria-hidden="true" /> Hand it over now
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setRemovingRota(rota)}>
                                                Stop the rota
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </ul>
                )}
            </Section>

            <Section title="Photos waiting on you" action={<span className="text-xs text-caption">{waiting.length}</span>}>
                {waiting.length === 0 ? (
                    <EmptyState title="Nothing to check" body="When a photo chore is finished, the picture lands here and the Sprouts wait for your yes." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {waiting.map((t) => (
                            <Card as="li" key={t.id}>
                                {t.proofUrl && <img src={t.proofUrl} alt={`Proof for ${t.title}`} width={480} height={320} loading="lazy" className="mb-3 aspect-[3/2] w-full rounded-md object-cover" />}
                                <h3 className="text-base font-semibold">{t.title}</h3>
                                <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                                    <MemberAvatar memberId={t.assigneeMemberIds[0] ?? null} size="xs" showName /> · {t.proofSubmittedAt ? relative(t.proofSubmittedAt) : "just now"} · <SproutsPill n={t.sprouts} />
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <Button size="sm" onClick={() => void approve(t)}>
                                        <CheckCircle2 size={14} aria-hidden="true" /> Yes, {t.sprouts} Sprouts
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setDeclining(t)}>
                                        Send it back
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="Who's on what">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
                    {kids.map((kid) => {
                        const mine = state.tasks.filter((t) => t.isChore && !isDone(t) && t.assigneeMemberIds.includes(kid.id));
                        return (
                            <Card as="section" key={kid.id}>
                                <div className="mb-3 flex items-center justify-between">
                                    <MemberAvatar member={kid} size="sm" showName />
                                    <SproutsPill n={sproutsBalance(state, kid.id)} />
                                </div>
                                {mine.length === 0 ? (
                                    <p className="text-sm text-caption">No chores on their list.</p>
                                ) : (
                                    <ul className="flex flex-col gap-1.5">
                                        {mine.map((t) => (
                                            <li key={t.id} className="flex items-center justify-between gap-2">
                                                <Link to={`${BASE}/${t.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                                                    {t.title}
                                                </Link>
                                                <SproutsPill n={t.sprouts} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </Section>

            <Dialog open={Boolean(declining)} onClose={() => setDeclining(null)} title="Send it back">
                <p className="text-md leading-6 text-muted">Say what still needs doing. The chore goes back on their list and the photo is cleared.</p>
                <label className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Note</span>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="The shoes under the bench too, please" />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDeclining(null)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            if (!declining) return;
                            await mutate((r) => r.declineProof(declining.id, reason));
                            toast("Sent back", "default");
                            setReason("");
                            setDeclining(null);
                        }}
                    >
                        Send it back
                    </Button>
                </div>
            </Dialog>

            <RotaDialog open={addingRota} onClose={() => setAddingRota(false)} state={state} />
            <Confirm
                open={Boolean(removingRota)}
                title={removingRota ? `Stop "${removingRota.name}"?` : "Stop this rota?"}
                body="The chore stays, and whoever has it now keeps it. Only the taking turns stops."
                confirmLabel="Stop it"
                danger
                onConfirm={async () => {
                    if (!removingRota) return;
                    await mutate((r) => r.removeRota(removingRota.id));
                    toast("Rota stopped", "default");
                }}
                onClose={() => setRemovingRota(null)}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Parent — rewards and the ledger
// ---------------------------------------------------------------------------

function RewardsTab() {
    const { state, sp, mutate, decide, toast } = useTasks();
    const [removing, setRemoving] = useState<Reward | null>(null);
    const [editing, setEditing] = useState<Reward | null>(null);
    const [addingReward, setAddingReward] = useState(false);
    const [adjusting, setAdjusting] = useState<Member | null>(null);
    const kids = sp.members.filter((m) => m.role === "child");
    const pending = pendingRedemptions(state);
    const promised = state.redemptions.filter((r) => r.status === "approved");
    const manage = sp.can("tasks.manage");

    return (
        <>
            <Section title="Waiting on you" action={<span className="text-xs text-caption">{pending.length}</span>}>
                {pending.length === 0 ? (
                    <EmptyState title="No requests" body="When a child asks to spend their Sprouts, it lands here. Nothing comes off a balance until you say yes." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {pending.map((r) => {
                            const reward = state.rewards.find((x) => x.id === r.rewardId);
                            const balance = sproutsBalance(state, r.memberId);
                            return (
                                <Card as="li" key={r.id}>
                                    <div className="flex items-center gap-3">
                                        <MemberAvatar memberId={r.memberId} size="md" />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base font-semibold">{reward?.name ?? "A reward"}</h3>
                                            <p className="text-xs text-caption">
                                                {r.costSprouts} Sprouts · balance {balance} · asked {relative(r.at)}
                                            </p>
                                        </div>
                                    </div>
                                    {r.note && <p className="mt-2 text-sm leading-5 text-muted">“{r.note}”</p>}
                                    <div className="mt-3 flex gap-2">
                                        <Button size="sm" onClick={() => void decide(r.id, true)}>
                                            Approve
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => void decide(r.id, false)}>
                                            Not this time
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </ul>
                )}
            </Section>

            <Section title="Promised, not yet given" action={<span className="text-xs text-caption">{promised.length}</span>}>
                {promised.length === 0 ? (
                    <EmptyState title="Nothing outstanding" body="Approved rewards sit here until they've actually happened — then you mark them given and the record closes." />
                ) : (
                    <Card>
                        <ul className="flex flex-col">
                            {promised.map((r) => {
                                const reward = state.rewards.find((x) => x.id === r.rewardId);
                                return (
                                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
                                        <span className="flex min-w-0 items-center gap-2 text-md">
                                            <MemberAvatar memberId={r.memberId} size="xs" showName />
                                            <span className="truncate">{reward?.name ?? "A reward"}</span>
                                            <span className="text-xs text-caption">approved {r.decidedAt ? relative(r.decidedAt) : "recently"}</span>
                                        </span>
                                        {manage && (
                                            <Button size="sm" variant="outline" onClick={() => void mutate((x) => x.fulfilRedemption(r.id)).then(() => toast("Marked as given", "success"))}>
                                                <CheckCircle2 size={14} aria-hidden="true" /> Mark it given
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                )}
            </Section>

            <Section title="Balances">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                    {kids.map((kid) => (
                        <Card as="section" key={kid.id}>
                            <Stat label={kid.name.split(" ")[0]} value={sproutsBalance(state, kid.id)} sub={`+${sproutsThisWeek(state, kid.id, sp.today)} this week`} tone="ok" />
                            {manage && (
                                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAdjusting(kid)}>
                                    <Pencil size={13} aria-hidden="true" /> Adjust by hand
                                </Button>
                            )}
                        </Card>
                    ))}
                </div>
            </Section>

            <Section
                title="The catalogue"
                action={
                    manage ? (
                        <Button size="sm" variant="outline" onClick={() => setAddingReward(true)}>
                            <Plus size={14} aria-hidden="true" /> Add a reward
                        </Button>
                    ) : undefined
                }
            >
                {state.rewards.length === 0 ? (
                    <EmptyState
                        title="Nothing to spend Sprouts on"
                        body="A reward is what the Sprouts are for — a cinema trip, half an hour more screen time, choosing Friday's dinner."
                        action={manage ? <Button onClick={() => setAddingReward(true)}>Add the first one</Button> : undefined}
                    />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {state.rewards.map((r) => (
                            <Card as="li" key={r.id} className={cn("flex flex-col", !r.active && "opacity-70")}>
                                {r.imageUrl && <img src={r.imageUrl} alt="" width={400} height={220} loading="lazy" className="mb-3 aspect-[16/9] w-full rounded-md object-cover" />}
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-base font-semibold">{r.name}</h3>
                                    <SproutsPill n={r.costSprouts} />
                                </div>
                                {r.note && <p className="mt-1 text-sm leading-5 text-muted">{r.note}</p>}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Tag tone="neutral">{REWARD_KIND_LABEL[r.kind]}</Tag>
                                    {!r.active && <Tag tone="warn">Put away</Tag>}
                                    {manage && (
                                        <span className="ml-auto flex items-center gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => void mutate((x) => x.updateReward(r.id, { active: !r.active })).then(() => toast(r.active ? "Put away — the children won't see it" : "Back on the children's list", "default"))}>
                                                {r.active ? "Put away" : "Bring it back"}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>
                                                Remove
                                            </Button>
                                        </span>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="The Sprouts ledger" action={<span className="text-xs text-caption">Every delta has a source</span>}>
                <Card className="overflow-x-auto p-0">
                    <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-line text-2xs uppercase tracking-[0.06em] text-caption">
                                <th scope="col" className="px-4 py-2.5 font-medium">Who</th>
                                <th scope="col" className="px-4 py-2.5 font-medium">What for</th>
                                <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
                                <th scope="col" className="px-4 py-2.5 text-right font-medium">Sprouts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...state.ledger]
                                .sort((a, b) => b.at.localeCompare(a.at))
                                .slice(0, 25)
                                .map((e) => (
                                    <tr key={e.id} className="border-b border-line last:border-0">
                                        <td className="px-4 py-2.5">
                                            <MemberAvatar memberId={e.memberId} size="xs" showName />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {e.note}
                                            <span className="block text-2xs text-caption">{relative(e.at)}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-caption">{e.sourceType}</td>
                                        <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", e.delta >= 0 ? "text-grow-ink" : "text-danger-ink")}>
                                            {e.delta >= 0 ? "+" : ""}
                                            {e.delta}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </Card>
            </Section>

            <RewardDialog open={addingReward} onClose={() => setAddingReward(false)} />
            {editing && <RewardDialog key={editing.id} open onClose={() => setEditing(null)} reward={editing} />}
            {adjusting && <AdjustDialog key={adjusting.id} open onClose={() => setAdjusting(null)} memberId={adjusting.id} name={adjusting.name.split(" ")[0]} />}
            <Confirm
                open={Boolean(removing)}
                title={removing ? `Remove "${removing.name}"?` : "Remove this reward?"}
                body="It disappears from the children's list for good. Sprouts already spent on it stay in the ledger. If you might want it back, put it away instead."
                confirmLabel="Remove"
                danger
                onConfirm={async () => {
                    if (!removing) return;
                    await mutate((r) => r.removeReward(removing.id));
                    toast("Reward removed", "default");
                }}
                onClose={() => setRemoving(null)}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const TABS = [
    { id: "tasks", label: "Everything", icon: ListChecks },
    { id: "chores", label: "Chores & rota", icon: Sprout },
    { id: "rewards", label: "Rewards", icon: Gift },
];

export default function TasksPage() {
    const { state, sp, loading, error, mutate } = useTasks();
    const { qs, tab } = useFilters();
    const [params, setParams] = useSearchParams();
    const [adding, setAdding] = useState(false);
    const [asking, setAsking] = useState(false);
    const rotated = useRef(false);

    // The rota turns on the planning day, by itself, the first time anyone ON
    // IT opens the module that day (AC 2) — a child's Sunday morning counts,
    // not just a parent's. A parent can also hand it over early. Guests hold no
    // rota, so they never trigger it.
    const due = state ? dueRotations(state, sp.today) : [];
    useEffect(() => {
        if (rotated.current || loading || !state || sp.role === "guest") return;
        if (!dueRotations(state, sp.today).length) return;
        rotated.current = true;
        mutate((r) => r.runDueRotations()).catch(() => {
            rotated.current = false;
        });
    }, [state, loading, sp.role, sp.today, mutate]);

    // Quick-add: "q" anywhere that isn't a text box.
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== "q" || e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
            e.preventDefault();
            setAdding(true);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (sp.role === "guest") return <GuestTasks />;
    if (sp.role === "child" && !sp.can("tasks.manage")) return <ChildView />;

    if (loading) {
        return (
            <div className="flex flex-col gap-4" aria-busy="true">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
            </div>
        );
    }
    if (error) return <Notice tone="danger">{error}</Notice>;

    const stats = weekStats(state, sp.today);
    const open = state.tasks.filter((t) => !isDone(t)).length;
    const setTab = (id: string) => {
        const next = new URLSearchParams(params);
        if (id === "tasks") next.delete("tab");
        else next.set("tab", id);
        setParams(next, { replace: true });
    };

    return (
        <div>
            <PageTitle
                title="Tasks & chores"
                sub="Everything the household has to do, and what each of us is carrying this week."
                area="execute"
                actions={
                    <>
                        <Button variant="outline" onClick={() => setAsking(true)}>
                            <Sparkles size={16} aria-hidden="true" /> Ask the companion
                        </Button>
                        <Button onClick={() => setAdding(true)}>
                            <Plus size={16} aria-hidden="true" /> New task
                        </Button>
                    </>
                }
            />

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <nav aria-label="Sections" className="flex items-center gap-1 rounded-full bg-card p-1">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const on = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                aria-current={on ? "page" : undefined}
                                onClick={() => setTab(t.id)}
                                className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors", on ? "bg-brand text-white" : "text-muted hover:text-ink")}
                            >
                                <Icon size={14} aria-hidden="true" />
                                {t.label}
                            </button>
                        );
                    })}
                </nav>
                {tab === "tasks" && <ViewTabs qs={qs} />}
            </div>

            <RotaNotice rotas={due} members={sp.members} />

            {tab === "tasks" && (
                <>
                    <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Stat label="Open" value={open} sub={`${stats.unassigned} with nobody's name on`} />
                        <Stat label="Overdue" value={stats.overdue} sub={stats.parked ? `${stats.parked} need a decision` : "Nothing parked"} tone={stats.overdue ? "danger" : "neutral"} />
                        <Stat label="Done this week" value={`${stats.done}/${stats.total}`} sub={`${stats.pct}% of what was due`} tone="ok" />
                        <Stat label="Sprouts this week" value={sp.members.filter((m) => m.role === "child").reduce((n, m) => n + sproutsThisWeek(state, m.id, sp.today), 0)} sub="Earned by the children" tone="warn" />
                    </div>
                    <TaskListTab />
                </>
            )}
            {tab === "chores" && <ChoresTab />}
            {tab === "rewards" && <RewardsTab />}

            <TaskDialog open={adding} onClose={() => setAdding(false)} state={state} />
            <CompanionDialog open={asking} onClose={() => setAsking(false)} state={state} />
        </div>
    );
}
