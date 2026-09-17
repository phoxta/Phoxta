import { useCallback, useMemo } from "react";
import { money } from "@/lib/format";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import type { InboxItem } from "./derive";

/**
 * The completion path across modules.
 *
 * An inline action in the inbox has to do the real thing. "Approve" on Dami's
 * laptop must approve the purchase request in Money; "Mark it done" on the
 * library books must complete that task in Tasks. A notification that says
 * "Approved" while Money still says "waiting on a parent" is worse than no
 * button at all.
 *
 * The rule everywhere else in Wàfè is that a module reads another module's
 * loaded slice and never touches its repo. That rule exists so a module cannot
 * quietly reach into rows it does not own — and this file does not break it so
 * much as declare the one exception the product needs, in one place, out loud:
 *
 *   · Only the four verbs below cross a boundary — approve, decline, complete,
 *     RSVP — and only on a record the notification already named.
 *   · The write goes through the owning module's own repo method, so that
 *     module's rules (a parent's permission, two approvals over the threshold,
 *     Sprouts, the recurrence that follows a chore) all still run. Nothing here
 *     writes another module's rows itself.
 *   · Everything is duck-typed and structural — like the calendar's overlays —
 *     so a module that has not shipped, or has moved on, simply reports that it
 *     cannot do it rather than breaking the inbox.
 *   · It is honest about failure. If the record cannot be found, or the owning
 *     module refuses, `run` throws and the caller leaves the notification
 *     exactly as it was. The two never diverge.
 *
 * The inbox confirms before calling any of this: the companion proposes, the
 * person decides.
 */

// ---------------------------------------------------------------------------
// The shapes we need from the modules that own the records
// ---------------------------------------------------------------------------

interface WishRow {
    id: string;
    name: string;
    status: string;
    priceCents: number;
}
interface FinanceSlice {
    wishes?: WishRow[];
    settings?: { currency?: string };
}
interface WishOutcome {
    status?: string;
    approvals?: number;
    required?: number;
    buyTaskTitle?: string;
}
interface FinanceWriter {
    decideWish?(id: string, decision: "approve" | "defer" | "decline", comment?: string, plannedMonth?: string | null): Promise<WishOutcome>;
    lockState?(): { unlocked: boolean };
}

interface TaskRow {
    id: string;
    title: string;
    status?: string;
    doneAt?: string | null;
    sprouts?: number;
}
interface TasksSlice {
    tasks?: TaskRow[];
}
interface TaskOutcome {
    sprouts?: number;
    memberId?: string | null;
    awaitingApproval?: boolean;
}
interface TasksWriter {
    completeTask?(id: string, byMemberId?: string): Promise<TaskOutcome>;
}

interface EventRow {
    id: string;
    title: string;
    startAt?: string;
}
interface CalendarSlice {
    events?: EventRow[];
}
interface CalendarWriter {
    setRsvp?(eventId: string, response: "yes" | "no" | "maybe", memberId?: string, note?: string): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// What the inbox asks for
// ---------------------------------------------------------------------------

export interface BridgePlan {
    /** The module that owns the record, for the reload and the copy. */
    moduleId: string;
    /** What the family calls it: "Money", "Tasks", "Calendar". */
    moduleName: string;
    /** One sentence: exactly what this button changes, and where. */
    summary: string;
    /** The record's name, for the confirmation's title. */
    recordName: string;
}

const MODULE_NAME: Record<string, string> = { finance: "Money", tasks: "Tasks", calendar: "Calendar" };

/** Which module owns which kind of record the engine names. */
const OWNER: Record<string, string> = {
    purchase_request: "finance",
    task: "tasks",
    event: "calendar",
};

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");
const same = (a: string | null | undefined, b: string | null | undefined): boolean => Boolean(a && b && norm(a) === norm(b));
const openTask = (t: TaskRow): boolean => t.status !== "done" && t.status !== "dropped" && !t.doneAt;

/**
 * Find the record the notification is about.
 *
 * Live rows carry the owning module's real id and the first lookup wins. The
 * demo seed cannot know the ids another module's seed will generate, so a row
 * also carries the record's name — and a name plus a record type is a perfectly
 * good key inside one family's data.
 */
function findBy<T>(rows: T[] | undefined, id: string | null, title: string | null, idOf: (r: T) => string, titleOf: (r: T) => string, prefer?: (r: T) => boolean): T | undefined {
    if (!rows?.length) return undefined;
    const byId = rows.find((r) => Boolean(id) && idOf(r) === id);
    if (byId) return byId;
    const named = rows.filter((r) => same(titleOf(r), title));
    return (prefer ? named.find(prefer) : undefined) ?? named[0];
}

/** What actually happened, in two lengths. */
export interface BridgeDone {
    /** The stamp left on the notification row — the truth, not the button's wording. */
    outcome: string;
    /** The sentence for the toast. */
    note: string;
}

export interface RecordBridge {
    /** What this inline action would change, or null when it only opens a page. */
    plan(item: InboxItem): BridgePlan | null;
    /** Do it, and answer with what to say. Throws a plain reason if it cannot. */
    run(item: InboxItem): Promise<BridgeDone | null>;
}

export function useRecordBridge(): RecordBridge {
    const { slices, reload } = useData();
    const sp = useSpace();

    /** The owning module for an item's action, or null when nothing crosses over. */
    const owner = useCallback(
        (item: InboxItem): string | null => {
            const kind = item.action?.kind;
            if (!kind || kind === "open" || !item.recordType) return null;
            const moduleId = OWNER[item.recordType];
            if (!moduleId || !slices[moduleId]) return null;
            const pairs: Record<string, string[]> = { finance: ["approve", "decline"], tasks: ["complete"], calendar: ["rsvp"] };
            return pairs[moduleId]?.includes(kind) ? moduleId : null;
        },
        [slices],
    );

    const firstName = (memberId: string): string => (sp.members.find((m) => m.id === memberId)?.name ?? "").split(" ")[0];

    const plan = useCallback(
        (item: InboxItem): BridgePlan | null => {
            const moduleId = owner(item);
            if (!moduleId) return null;
            const name = MODULE_NAME[moduleId] ?? moduleId;
            const slice = slices[moduleId]?.state;
            const recordName = item.recordTitle ?? item.title;

            if (moduleId === "finance") {
                const wish = findBy((slice as FinanceSlice | undefined)?.wishes, item.recordId, item.recordTitle, (w) => w.id, (w) => w.name);
                const price = wish ? ` (${money(wish.priceCents, (slice as FinanceSlice | undefined)?.settings?.currency ?? sp.space.currency)})` : "";
                const verb = item.action?.kind === "decline" ? "Declining" : "Approving";
                return { moduleId, moduleName: name, recordName: wish?.name ?? recordName, summary: `${verb} this records your decision on the request in ${name}${price}. Everything the request needs after that happens there.` };
            }
            if (moduleId === "tasks") {
                const task = findBy((slice as TasksSlice | undefined)?.tasks, item.recordId, item.recordTitle, (t) => t.id, (t) => t.title, openTask);
                const sprouts = task?.sprouts ? ` ${firstName(item.memberId)} gets ${task.sprouts} Sprouts, unless a photo is still owed.` : "";
                return { moduleId, moduleName: name, recordName: task?.title ?? recordName, summary: `This completes the job in ${name}, not just the reminder.${sprouts}` };
            }
            const event = findBy((slice as CalendarSlice | undefined)?.events, item.recordId, item.recordTitle, (e) => e.id, (e) => e.title);
            return { moduleId, moduleName: name, recordName: event?.title ?? recordName, summary: `This answers yes for ${firstName(item.memberId) || "you"} in ${name}, where everyone else can see it.` };
        },
        // `firstName` is derived from sp.members and re-made each render on purpose.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [owner, slices, sp.members, sp.space.currency],
    );

    const run = useCallback(
        async (item: InboxItem): Promise<BridgeDone | null> => {
            const moduleId = owner(item);
            if (!moduleId) return null;
            const slice = slices[moduleId];
            const name = MODULE_NAME[moduleId] ?? moduleId;
            const gone = `That ${moduleId === "finance" ? "request" : moduleId === "tasks" ? "job" : "event"} isn't in ${name} any more, so nothing was changed.`;

            if (moduleId === "finance") {
                const repo = slice.repo as unknown as FinanceWriter;
                const wish = findBy((slice.state as FinanceSlice | undefined)?.wishes, item.recordId, item.recordTitle, (w) => w.id, (w) => w.name);
                if (!wish) throw new Error(gone);
                if (typeof repo.decideWish !== "function") throw new Error(`${name} can't take a decision from here yet.`);
                if (repo.lockState && !repo.lockState().unlocked) throw new Error(`${name} is locked. Open it, prove it's you, then decide.`);
                const decision = item.action?.kind === "decline" ? "decline" : "approve";
                const res = await repo.decideWish(wish.id, decision, "From the notification centre.");
                await reload(moduleId);
                if (decision === "decline") return { outcome: "Declined", note: `Declined in ${name}: ${wish.name}.` };
                const got = res?.approvals ?? 0;
                const need = res?.required ?? 1;
                // The stamp on the row says exactly what Money now says. One yes
                // out of two is not an approval, and the inbox must not claim it.
                if (res?.status === "approved") {
                    return { outcome: "Approved", note: res.buyTaskTitle ? `Approved in ${name} — "${res.buyTaskTitle}" is on the list.` : `Approved in ${name}.` };
                }
                return { outcome: `You said yes — ${got} of ${need}`, note: `Your yes is in. ${name} is still waiting on the other parent.` };
            }

            if (moduleId === "tasks") {
                const repo = slice.repo as unknown as TasksWriter;
                const task = findBy((slice.state as TasksSlice | undefined)?.tasks, item.recordId, item.recordTitle, (t) => t.id, (t) => t.title, openTask);
                if (!task) throw new Error(gone);
                if (!openTask(task)) return { outcome: "Already done", note: `"${task.title}" was already done in ${name}.` };
                if (typeof repo.completeTask !== "function") throw new Error(`${name} can't complete a job from here yet.`);
                const res = await repo.completeTask(task.id, item.memberId);
                await reload(moduleId);
                // Sprouts are the child's, and the shell holds the balance — the
                // same hand-off Tasks makes when a chore is ticked on its own page.
                if (res?.sprouts && res.memberId) {
                    const to = res.memberId;
                    const points = res.sprouts;
                    await sp.mutateCore((c) => c.addPoints(to, points, `Chore: ${task.title}`));
                }
                if (res?.awaitingApproval) return { outcome: "Done — photo waiting on a parent", note: `Done. ${name} is holding the Sprouts until a parent sees the photo.` };
                return { outcome: "Marked done", note: res?.sprouts ? `Done in ${name}, and ${res.sprouts} Sprouts with it.` : `Done in ${name}: ${task.title}.` };
            }

            const repo = slice.repo as unknown as CalendarWriter;
            const event = findBy((slice.state as CalendarSlice | undefined)?.events, item.recordId, item.recordTitle, (e) => e.id, (e) => e.title);
            if (!event) throw new Error(gone);
            if (typeof repo.setRsvp !== "function") throw new Error(`${name} can't take an answer from here yet.`);
            await repo.setRsvp(event.id, "yes", item.memberId, "Answered from the notification centre.");
            await reload(moduleId);
            return { outcome: "Replied yes", note: `Answered yes in ${name}: ${event.title}.` };
        },
        [owner, slices, reload, sp],
    );

    return useMemo(() => ({ plan, run }), [plan, run]);
}
