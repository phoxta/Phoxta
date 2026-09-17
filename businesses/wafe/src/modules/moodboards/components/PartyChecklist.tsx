import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, ListChecks, Send, Sparkles, Trash2 } from "lucide-react";
import { useAi } from "@/lib/ai";
import { addDays } from "@/lib/format";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberPicker, Notice } from "@/components/shared";
import { Button, EmptyState } from "@/components/ui/primitives";
import { checklistOf, pinsOf } from "../derive";
import { partyChecklistTemplate } from "../library";
import { useTaskWriter } from "../tasks";
import type { Board, ChecklistItem, MoodboardsRepo, MoodboardsState, NewChecklistLine } from "../types";

/**
 * Party checklist → Tasks (AC 6).
 *
 * The companion drafts it from what is actually pinned; when it can't (no
 * backend, allowance used up) the template writes the same list by hand, so
 * the feature never depends on a model being reachable. Nothing is created
 * until a person presses "Send to Tasks", and each line remembers the task it
 * became, so pressing it twice does not make sixteen tasks.
 *
 * The tasks themselves belong to the Tasks module: this screen hands them over
 * through the loaded slice (see `../tasks.ts`) rather than reaching into
 * another module's code.
 */

interface Draft {
    title?: string;
    memberId?: string | null;
    dueInDays?: number;
    note?: string;
}

export function PartyChecklist({
    board,
    state,
    canEdit,
    mutate,
}: {
    board: Board;
    state: MoodboardsState;
    canEdit: boolean;
    mutate: (fn: (repo: MoodboardsRepo) => Promise<unknown>) => Promise<void>;
}) {
    const { ask, busy } = useAi();
    const { members, today } = useSpace();
    const { toast } = useToast();
    const writeTasks = useTaskWriter();
    const [note, setNote] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [clearing, setClearing] = useState(false);

    const lines = checklistOf(state, board.id);
    const unsent = lines.filter((l) => !l.taskId);
    const pins = pinsOf(state, board.id);

    const save = async (drafts: NewChecklistLine[]) => {
        await mutate((r) => r.setChecklist(board.id, drafts));
    };

    const draftIt = async () => {
        setNote(null);
        const fallback = () => partyChecklistTemplate(board.title);
        try {
            const res = await ask<{ tasks?: Draft[] }>({
                action: "suggest-tasks",
                prompt: `Write the checklist for "${board.title}" — everything that has to happen before the day, in the order it has to happen.`,
                payload: {
                    board: board.title,
                    kind: board.kind,
                    members: members.filter((m) => m.role === "parent").map((m) => ({ id: m.id, name: m.name })),
                },
                extraContext: `Pinned so far: ${pins
                    .slice(0, 20)
                    .map((p) => `${p.title}${p.note ? ` — ${p.note}` : ""}`)
                    .join("; ")}`,
            });
            const tasks = res.data?.tasks ?? [];
            if (res.unavailable || !tasks.length) {
                setNote(res.unavailable ?? "The companion had nothing to add, so this is the standard party list.");
                await save(fallback());
                return;
            }
            await save(
                tasks.slice(0, 12).map((t) => ({
                    text: String(t.title ?? "").trim() || "Something to do",
                    note: String(t.note ?? ""),
                    dueInDays: Math.max(0, Math.round(Number(t.dueInDays ?? 0))),
                    assigneeMemberId: members.some((m) => m.id === t.memberId) ? (t.memberId as string) : null,
                    origin: "companion",
                })),
            );
        } catch {
            setNote("The companion couldn't answer, so this is the standard party list. You can edit every line.");
            await save(fallback());
        }
    };

    const sendToTasks = async () => {
        if (!unsent.length) return;
        if (!writeTasks) {
            setNote("Tasks isn't available in this build, so the checklist stays here for now.");
            return;
        }
        setSending(true);
        setNote(null);
        try {
            const drafts = unsent.map((l: ChecklistItem) => ({
                title: l.text,
                notes: [l.note, `From the moodboard "${board.title}".`].filter(Boolean).join(" "),
                assigneeMemberIds: l.assigneeMemberId ? [l.assigneeMemberId] : [],
                dueAt: addDays(`${today}T09:00:00`, l.dueInDays),
                sourceType: "ai",
                sourceId: board.id,
                childSafe: true,
            }));
            const ids = await writeTasks(drafts);
            const map: Record<string, string> = {};
            unsent.forEach((l, i) => {
                const id = ids[i];
                if (id) map[l.id] = id;
            });
            await mutate((r) => r.markChecklistSent(unsent.map((l) => l.id), map));
            toast(`${drafts.length} task${drafts.length === 1 ? "" : "s"} added`, "success");
        } catch (e) {
            setNote(e instanceof Error ? e.message : "Those tasks didn't save.");
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="rounded-xl bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl">
                    <ListChecks size={17} aria-hidden="true" /> Party checklist
                </h2>
                {canEdit && (
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" loading={busy} onClick={() => void draftIt()}>
                            <Sparkles size={13} aria-hidden="true" /> {lines.length ? "Draft it again" : "Draft a checklist"}
                        </Button>
                        {unsent.length > 0 && (
                            <Button size="sm" variant="brand" loading={sending} onClick={() => void sendToTasks()}>
                                <Send size={13} aria-hidden="true" /> Send {unsent.length} to Tasks
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {lines.length ? (
                <ul className="flex flex-col gap-2">
                    {lines.map((l) => (
                        <li key={l.id} className="rounded-md bg-page p-3">
                            <div className="flex items-start gap-2.5">
                                <CheckSquare size={16} className={l.taskId ? "mt-0.5 shrink-0 text-mint" : "mt-0.5 shrink-0 text-caption"} aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-md font-medium leading-5">{l.text}</p>
                                    {l.note && <p className="mt-0.5 text-xs leading-[18px] text-muted">{l.note}</p>}
                                    <p className="mt-1 text-2xs text-caption">
                                        {l.dueInDays === 0 ? "Today" : `In ${l.dueInDays} day${l.dueInDays === 1 ? "" : "s"}`}
                                        {l.taskId ? " · already a task" : ""}
                                        {l.origin === "template" ? " · from the standard list" : ""}
                                    </p>
                                </div>
                                {canEdit && !l.taskId && (
                                    <button
                                        type="button"
                                        onClick={() => void mutate((r) => r.removeChecklistLine(l.id))}
                                        aria-label={`Remove "${l.text}"`}
                                        className="shrink-0 rounded-full p-1.5 text-caption hover:bg-subtle hover:text-danger-ink"
                                    >
                                        <Trash2 size={14} aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            {canEdit && !l.taskId && (
                                <MemberPicker
                                    value={l.assigneeMemberId}
                                    onChange={(id) => void mutate((r) => r.toggleChecklistLine(l.id, id))}
                                    allowFamily
                                    roles={["parent", "child"]}
                                    label="Who does it"
                                    className="mt-2 max-w-xs"
                                />
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    icon={<ListChecks size={20} aria-hidden="true" />}
                    title="No checklist yet"
                    body="A party board can write its own list — cake, invitations, games, bags — and then hand every line to Tasks."
                    action={canEdit ? <Button onClick={() => void draftIt()} loading={busy}>Draft a checklist</Button> : undefined}
                />
            )}

            {lines.some((l) => l.taskId) && (
                <p className="mt-3 text-xs text-caption">
                    Sent lines live in{" "}
                    <Link to="/execute/tasks" className="font-semibold text-brand underline-offset-4 hover:underline">
                        Tasks
                    </Link>
                    . Editing them there won't change this board.
                </p>
            )}

            {note && (
                <Notice tone="info" className="mt-3">
                    {note}
                </Notice>
            )}

            {canEdit && lines.length > 0 && (
                <div className="mt-3">
                    <button type="button" onClick={() => setClearing(true)} className="text-xs font-semibold text-danger-ink underline-offset-4 hover:underline">
                        Clear the lines that haven't been sent
                    </button>
                </div>
            )}
            <Confirm
                open={clearing}
                title="Clear the checklist?"
                body="Lines that already became tasks are kept — we never orphan a real task."
                confirmLabel="Clear"
                danger
                onClose={() => setClearing(false)}
                onConfirm={() => mutate((r) => r.setChecklist(board.id, []))}
            />
        </section>
    );
}
