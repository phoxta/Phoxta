import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { ArrowUp, Sparkles, Trash2 } from "lucide-react";
import type { Role } from "@/data/core";
import { cn } from "@/lib/cn";
import { uid } from "@/lib/format";
import { useAi, type AiAction } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Sprig } from "@/components/brand";
import { Notice } from "@/components/shared";
import { Button } from "@/components/ui/primitives";
import { Drawer } from "@/components/shell/Drawer";

/**
 * "Ask Wàfè" — the companion that lives beside every screen.
 *
 * It is a side panel, not a page, because the point is to ask about what you
 * are looking at without leaving it. The thread is kept per member in this
 * browser (a child's chat is not a parent's chat), the grounding is the
 * role-safe summary every module contributes, and nothing here ever blocks
 * the page: loading, errors and "not available on this plan" all render
 * inline in the panel.
 *
 * The thread itself lives in one small store below, shared by every surface
 * that shows it — this drawer and Home's chat sheet — so a message sent from
 * either appears in both and neither can overwrite the other's. The hook
 * `useCompanionThread` is the store plus the send/compose behaviour.
 */

const KEY = "wafe:companion:v1";
const MAX_KEPT = 40;

export type Msg = { id: string; from: "me" | "wafe"; text: string; at: string };
export type Chip = { label: string; action: AiAction; prompt?: string; payload?: Record<string, unknown> };

// ---- the store: one thread per member, one copy in memory -------------------

type Threads = Record<string, Msg[]>;

let threads: Threads | null = null;
const listeners = new Set<() => void>();
const NONE: Msg[] = [];

function load(): Threads {
    if (threads) return threads;
    try {
        const raw = localStorage.getItem(KEY);
        threads = raw ? (JSON.parse(raw) as Threads) : {};
    } catch {
        threads = {};
    }
    return threads;
}

function persist(): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(load()));
    } catch {
        /* private mode: the thread lives for the session only */
    }
}

const subscribe = (l: () => void): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
};

/** The member's thread — a stable reference until it changes. */
const threadOf = (memberId: string): Msg[] => load()[memberId] ?? NONE;

/** Has this member ever had a thread here (even an emptied one)? */
const hasThread = (memberId: string): boolean => memberId in load();

function setThread(memberId: string, msgs: Msg[]): void {
    load()[memberId] = msgs.slice(-MAX_KEPT);
    persist();
    for (const l of listeners) l();
}

function append(memberId: string, m: Omit<Msg, "id" | "at">): void {
    setThread(memberId, [...threadOf(memberId), { ...m, id: uid("m"), at: new Date().toISOString() }]);
}

/**
 * The demo's opening exchange, for a parent who has never spoken to the
 * companion. It is written from the seeded week — booking the Lagos flights
 * is one of the three priorities on the planning record — so it never claims
 * anything the screen cannot back up. Live families start with silence, and a
 * cleared demo thread stays cleared (the key exists, as an empty list).
 */
function demoSeed(): Msg[] {
    const at = new Date().toISOString();
    return [
        { id: uid("m"), from: "me", text: "We're planning Christmas in Lagos this year — what should we sort out first?", at },
        {
            id: uid("m"),
            from: "wafe",
            text: "Flights first: booking the Lagos flights is already one of this week's three priorities, and fares climb the longer it waits. Once the dates are in the diary I can draft a packing list for everyone and start a countdown for the children. Want me to pull together a shortlist of dates?",
            at,
        },
    ];
}

/** What to offer before anyone types: by role, and by the time of day. */
export function chipsFor(role: Role, hour: number): Chip[] {
    const morning = hour < 12;
    const evening = hour >= 17;
    if (role === "child") {
        return [
            { label: "What do I need to do today?", action: "ask", prompt: "What do I need to do today? Keep it short and friendly." },
            { label: "Tell me a story about courage", action: "ask", prompt: "Tell me a short story about courage, for someone my age." },
            { label: "Help me with my memory verse", action: "ask", prompt: "Help me practise my memory verse for this week." },
            { label: evening ? "How did I do today?" : "What am I learning this week?", action: "ask", prompt: evening ? "How did I do today? Be encouraging." : "What am I learning this week?" },
        ];
    }
    if (role === "guest") {
        return [
            { label: "What's on this week?", action: "ask", prompt: "What's on for the family this week?" },
            { label: "What can I pray for?", action: "ask", prompt: "What is on the family's prayer wall that I can pray for?" },
            { label: "When is the next family event?", action: "ask", prompt: "When is the next family event I am part of?" },
        ];
    }
    const chips: Chip[] = [];
    if (morning) chips.push({ label: "Prepare my morning briefing", action: "briefing", payload: { when: "morning" } });
    else if (evening) chips.push({ label: "Prepare my evening briefing", action: "briefing", payload: { when: "evening" } });
    else chips.push({ label: "Where are we at today?", action: "briefing", payload: { when: "midday" } });
    chips.push(
        { label: "What's on this week?", action: "ask", prompt: "What's on for the family this week?" },
        { label: "What needs my attention?", action: "ask", prompt: "What needs my attention right now? Prioritise, and say why." },
    );
    if (evening) chips.push({ label: "Help me reflect on today", action: "reflect" });
    else chips.push({ label: "How are the children doing?", action: "ask", prompt: "How are the children doing this week — learning, chores, anything slipping?" });
    return chips;
}

// ---- markdown-lite ----------------------------------------------------------

/** **bold** only; the model is asked for plain text with light structure. */
function inline(s: string): ReactNode[] {
    return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
}

/** Paragraphs, "- " bullets (also "* ", "• ", "1. ") and "## " headings. */
export function Lite({ text, className }: { text: string; className?: string }) {
    const blocks: ReactNode[] = [];
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => {
        if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
        para = [];
    };
    const flushList = () => {
        if (list.length)
            blocks.push(
                <ul key={blocks.length} className="list-disc space-y-1 pl-5">
                    {list.map((l, i) => (
                        <li key={i}>{inline(l)}</li>
                    ))}
                </ul>,
            );
        list = [];
    };
    for (const raw of text.replace(/\r/g, "").split("\n")) {
        const line = raw.trim();
        if (!line) {
            flushPara();
            flushList();
            continue;
        }
        const li = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (li) {
            flushPara();
            list.push(li[1]);
            continue;
        }
        const h = line.match(/^#{1,4}\s+(.*)$/);
        if (h) {
            flushPara();
            flushList();
            blocks.push(
                <p key={blocks.length} className="font-semibold text-ink">
                    {inline(h[1])}
                </p>,
            );
            continue;
        }
        flushList();
        para.push(line);
    }
    flushPara();
    flushList();
    return <div className={cn("space-y-2.5 text-md leading-6", className)}>{blocks}</div>;
}

// ---- the thread -------------------------------------------------------------

export interface CompanionThreadApi {
    thread: Msg[];
    draft: string;
    setDraft: (v: string) => void;
    busy: boolean;
    available: boolean;
    unavailable: string | null;
    error: string | null;
    dismissError: () => void;
    chips: Chip[];
    /** Ask the companion: the chip's prompt goes in as "me", the answer as "wafe". */
    send: (chip: Chip) => Promise<void>;
    /** Add a line without asking — the verse read aloud, a note from the screen. */
    push: (m: Omit<Msg, "id" | "at">) => void;
    submit: (e: FormEvent) => void;
    onKey: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    clear: () => void;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    endRef: RefObject<HTMLDivElement | null>;
    first: string;
    role: Role;
    spaceName: string;
}

/** The nearest ancestor that scrolls — the panel, never the page. */
function scrollBox(el: HTMLElement | null): HTMLElement | null {
    let box = el?.parentElement ?? null;
    while (box && box !== document.body) {
        const o = getComputedStyle(box).overflowY;
        if (o === "auto" || o === "scroll") return box;
        box = box.parentElement;
    }
    return null;
}

/**
 * One conversation per member, shared by every surface that shows it.
 *
 * `active` gates the autoscroll: a closed drawer must not move anything.
 */
export function useCompanionThread(active = true): CompanionThreadApi {
    const { me, role, space, kind } = useSpace();
    const { ask, busy, error, available } = useAi();
    const thread = useSyncExternalStore(subscribe, () => threadOf(me.id));
    const [draft, setDraft] = useState("");
    const [unavailable, setUnavailable] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const first = me.name.split(" ")[0];
    const chips = useMemo(() => chipsFor(role, new Date().getHours()), [role]);

    // A member arriving for the first time: the demo parent is handed the
    // opening exchange; everyone else, silence. Switching "view as" in the
    // demo lands here too, and clears the transient notices.
    useEffect(() => {
        if (!hasThread(me.id) && kind === "demo" && role === "parent") setThread(me.id, demoSeed());
        setUnavailable(null);
        setLocalError(null);
    }, [me.id, kind, role]);

    // Keep the newest line in view — inside the panel's own scroll box only.
    useEffect(() => {
        if (!active) return;
        const box = scrollBox(endRef.current);
        if (box) box.scrollTop = box.scrollHeight;
    }, [active, thread.length, busy]);

    const push = useCallback((m: Omit<Msg, "id" | "at">) => append(me.id, m), [me.id]);

    const send = useCallback(
        async (chip: Chip) => {
            if (busy) return;
            // The answer belongs to whoever asked, even if "view as" changes
            // while the companion is still thinking.
            const who = me.id;
            setLocalError(null);
            setUnavailable(null);
            append(who, { from: "me", text: chip.prompt ?? chip.label });
            try {
                const r = await ask({ action: chip.action, prompt: chip.prompt ?? chip.label, payload: chip.payload });
                if (r.unavailable) {
                    setUnavailable(r.unavailable);
                    return;
                }
                append(who, { from: "wafe", text: r.text.trim() || "I don't have anything to add on that yet." });
            } catch (e) {
                // useAi already exposes the message; keep a local copy so it
                // survives the next successful call's reset of `error`.
                setLocalError(e instanceof Error ? e.message : "The companion couldn't answer.");
            }
        },
        [ask, busy, me.id],
    );

    // Enter while the companion is still answering keeps the draft where it
    // is, rather than clearing it for a message that never goes.
    const submit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text || busy) return;
            setDraft("");
            void send({ label: text, action: "ask", prompt: text });
        },
        [draft, busy, send],
    );
    const onKey = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
        }
    }, []);
    const clear = useCallback(() => {
        setThread(me.id, []);
        setUnavailable(null);
        setLocalError(null);
        inputRef.current?.focus();
    }, [me.id]);
    const dismissError = useCallback(() => setLocalError(null), []);

    return {
        thread,
        draft,
        setDraft,
        busy,
        available,
        unavailable,
        error: localError ?? error,
        dismissError,
        chips,
        send,
        push,
        submit,
        onKey,
        clear,
        inputRef,
        endRef,
        first,
        role,
        spaceName: space.name,
    };
}

// ---- the panel --------------------------------------------------------------

export function CompanionDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useCompanionThread(open);
    const { thread, draft, setDraft, busy, available, unavailable, error, dismissError, chips, send, submit, onKey, clear, inputRef, endRef, first, role, spaceName } = t;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Ask Wàfè"
            sub={`${spaceName} · with ${first}`}
            icon={<Sprig className="w-4" />}
            backdrop="mobile"
            headerExtra={
                thread.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={clear} aria-label="Clear this conversation">
                        <Trash2 size={14} aria-hidden="true" /> Clear
                    </Button>
                ) : undefined
            }
            footer={
                <form onSubmit={submit} className="p-3">
                    {/* Chips stay reachable above the composer; on a phone they scroll sideways. */}
                    <div className="no-scrollbar -mx-3 mb-2.5 flex gap-2 overflow-x-auto px-3">
                        {chips.map((c) => (
                            <button
                                key={c.label}
                                type="button"
                                onClick={() => void send(c)}
                                disabled={busy}
                                className={cn(
                                    "shrink-0 rounded-full border border-line-strong bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50",
                                    c.action === "briefing" && "border-brand/40 bg-brand-soft text-brand-ink",
                                    role === "child" && "py-2 text-sm",
                                )}
                            >
                                {c.action === "briefing" && <Sparkles size={12} className="mr-1 inline-block align-[-2px]" aria-hidden="true" />}
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-end gap-2 rounded-lg border border-line-strong bg-card px-3 py-2 focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]">
                        <label htmlFor="companion-input" className="sr-only">
                            Ask Wàfè
                        </label>
                        <textarea
                            id="companion-input"
                            ref={inputRef}
                            data-autofocus
                            rows={1}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={onKey}
                            placeholder={role === "child" ? "Ask me anything…" : "Ask about the week, the budget, a lesson…"}
                            className={cn("max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-md leading-6 outline-none placeholder:text-caption", role === "child" && "text-base")}
                        />
                        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40">
                            <ArrowUp size={16} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                    </div>
                    <p className="mt-1.5 px-1 text-2xs text-caption">Enter to send · Shift+Enter for a new line. Wàfè only sees what {first} can see.</p>
                </form>
            }
        >
            <div className="flex min-h-full flex-col gap-3 p-4">
                {!available && (
                    <Notice tone="info">
                        The companion needs the backend to be configured for this build. Everything else in {spaceName.startsWith("The") ? spaceName.toLowerCase() : spaceName} still works.
                    </Notice>
                )}
                {thread.length === 0 && (
                    <div className="rounded-xl bg-card p-5">
                        <div className="mb-3 grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
                            <Sprig className="w-5" />
                        </div>
                        <p className={cn("font-display leading-7 text-ink", role === "child" ? "text-3xl" : "text-2xl")}>
                            {role === "child" ? `Hi ${first}! What shall we do?` : `Hi ${first}. What would help right now?`}
                        </p>
                        <p className="mt-1.5 text-sm leading-5 text-muted">
                            {role === "child"
                                ? "I know your lessons, your chores and your verse for the week. Ask me anything."
                                : "I know the family's week, goals, plans and what's slipping. Ask a question or start with one of the suggestions below."}
                        </p>
                    </div>
                )}
                {thread.map((m) => (
                    <div key={m.id} className={cn("flex gap-2.5", m.from === "me" ? "justify-end" : "justify-start")}>
                        {m.from === "wafe" && (
                            <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true">
                                <Sprig className="w-3.5" />
                            </span>
                        )}
                        <div className={cn("max-w-[86%] rounded-2xl px-4 py-2.5", m.from === "me" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-card text-ink")}>
                            {m.from === "me" ? <p className="whitespace-pre-wrap text-md leading-6">{m.text}</p> : <Lite text={m.text} className={role === "child" ? "text-base leading-7" : undefined} />}
                        </div>
                    </div>
                ))}
                {busy && (
                    <div className="flex gap-2.5" role="status" aria-label="Wàfè is thinking">
                        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true">
                            <Sprig className="w-3.5" />
                        </span>
                        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-card px-4 py-3">
                            <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-brand" />
                        </div>
                    </div>
                )}
                {unavailable && <Notice tone="info">{unavailable}</Notice>}
                {error && !busy && (
                    <Notice tone="danger">
                        {error}{" "}
                        <button type="button" onClick={dismissError} className="font-semibold underline underline-offset-4">
                            Dismiss
                        </button>
                    </Notice>
                )}
                <div ref={endRef} />
            </div>
        </Drawer>
    );
}
