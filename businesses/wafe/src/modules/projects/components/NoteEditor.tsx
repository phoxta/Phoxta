import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Heading, List, Quote, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/cn";
import { uid } from "@/lib/format";
import { Button } from "@/components/ui/primitives";
import type { NoteBlock, NoteBlockType } from "../types";

/**
 * The notes canvas: a small block editor that behaves the way people expect.
 *
 * Enter makes the next block, Backspace on an empty one removes it and lands
 * the cursor at the end of the block above, and the usual prefixes convert as
 * you type — `# ` a heading, `- ` a bullet, `[] ` a checkbox, `> ` a quote.
 * The draft lives in the component while you type (a text editor cannot round-
 * trip every keystroke through storage) and is saved on blur, on Save, and
 * whenever a block is added or removed.
 */

const TYPES: Array<{ t: NoteBlockType; label: string; icon: typeof Type }> = [
    { t: "p", label: "Text", icon: Type },
    { t: "h", label: "Heading", icon: Heading },
    { t: "ul", label: "Bullet", icon: List },
    { t: "todo", label: "Checkbox", icon: Check },
    { t: "quote", label: "Quote", icon: Quote },
];

const PREFIX: Array<[string, NoteBlockType]> = [
    ["# ", "h"],
    ["- ", "ul"],
    ["[] ", "todo"],
    ["> ", "quote"],
];

const rowsFor = (text: string): number => Math.max(1, text.split("\n").length);

export function NoteEditor({ blocks, readOnly, onSave }: { blocks: NoteBlock[]; readOnly: boolean; onSave: (blocks: NoteBlock[]) => Promise<void> }) {
    const [draft, setDraft] = useState<NoteBlock[]>(blocks.length ? blocks : [{ id: uid("blk"), type: "p", text: "", done: false }]);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
    const focusNext = useRef<string | null>(null);

    // Someone else's edit (or a reload) wins while we are not mid-edit.
    useEffect(() => {
        if (!dirty) setDraft(blocks.length ? blocks : [{ id: uid("blk"), type: "p", text: "", done: false }]);
    }, [blocks, dirty]);

    useEffect(() => {
        const id = focusNext.current;
        if (!id) return;
        focusNext.current = null;
        const el = refs.current[id];
        if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        }
    }, [draft]);

    const save = useCallback(
        async (next: NoteBlock[]) => {
            setSaving(true);
            try {
                await onSave(next);
                setDirty(false);
                setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
            } finally {
                setSaving(false);
            }
        },
        [onSave],
    );

    const set = (id: string, patch: Partial<NoteBlock>, andSave = false): void => {
        const next = draft.map((b) => (b.id === id ? { ...b, ...patch } : b));
        setDraft(next);
        setDirty(true);
        if (andSave) void save(next);
    };

    const onType = (b: NoteBlock, value: string): void => {
        for (const [prefix, type] of PREFIX) {
            if (b.type !== type && value.startsWith(prefix)) {
                set(b.id, { type, text: value.slice(prefix.length) });
                return;
            }
        }
        set(b.id, { text: value });
    };

    const addAfter = (id: string, type: NoteBlockType = "p"): void => {
        const at = draft.findIndex((b) => b.id === id);
        const fresh: NoteBlock = { id: uid("blk"), type, text: "", done: false };
        const next = [...draft.slice(0, at + 1), fresh, ...draft.slice(at + 1)];
        focusNext.current = fresh.id;
        setDraft(next);
        setDirty(true);
        void save(next);
    };

    const removeBlock = (id: string): void => {
        if (draft.length === 1) return;
        const at = draft.findIndex((b) => b.id === id);
        const next = draft.filter((b) => b.id !== id);
        focusNext.current = next[Math.max(0, at - 1)]?.id ?? null;
        setDraft(next);
        setDirty(true);
        void save(next);
    };

    const onKey = (e: KeyboardEvent<HTMLTextAreaElement>, b: NoteBlock): void => {
        if (e.key === "Enter" && !e.shiftKey && b.type !== "quote") {
            e.preventDefault();
            addAfter(b.id, b.type === "ul" || b.type === "todo" ? b.type : "p");
        } else if (e.key === "Backspace" && b.text === "" && draft.length > 1) {
            e.preventDefault();
            removeBlock(b.id);
        }
    };

    if (readOnly) {
        return (
            <div className="flex flex-col gap-2.5">
                {draft.map((b) => (
                    <ReadBlock key={b.id} block={b} />
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col gap-1">
                {draft.map((b) => (
                    <div key={b.id} className="group flex items-start gap-2">
                        <span className="flex w-6 shrink-0 justify-center pt-2.5">
                            {b.type === "todo" ? (
                                <input type="checkbox" checked={b.done} onChange={(e) => set(b.id, { done: e.target.checked }, true)} aria-label={`Done: ${b.text || "checkbox"}`} className="size-4 accent-[var(--color-brand)]" />
                            ) : b.type === "ul" ? (
                                <span className="mt-2 size-1.5 rounded-full bg-caption" aria-hidden="true" />
                            ) : null}
                        </span>
                        <textarea
                            ref={(el) => {
                                refs.current[b.id] = el;
                            }}
                            value={b.text}
                            rows={rowsFor(b.text)}
                            onChange={(e) => onType(b, e.target.value)}
                            onKeyDown={(e) => onKey(e, b)}
                            onBlur={() => dirty && void save(draft)}
                            aria-label={`${TYPES.find((t) => t.t === b.type)?.label ?? "Text"} block`}
                            placeholder={b.type === "h" ? "Heading" : "Write something…"}
                            className={cn(
                                "min-w-0 flex-1 resize-none rounded-sm border border-transparent bg-transparent px-2 py-2 outline-none focus:border-line-strong focus:bg-card",
                                b.type === "h" && "font-display text-[19px] leading-7",
                                b.type === "quote" && "border-l-2 border-l-line-strong pl-3 italic text-muted",
                                b.type === "todo" && b.done && "text-caption line-through",
                                b.type !== "h" && "text-md leading-6",
                            )}
                        />
                        <span className="flex shrink-0 items-center gap-0.5 pt-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <label className="sr-only" htmlFor={`type-${b.id}`}>
                                Block type
                            </label>
                            <select id={`type-${b.id}`} value={b.type} onChange={(e) => set(b.id, { type: e.target.value as NoteBlockType }, true)} className="h-8 rounded-sm border border-line-strong bg-card px-1.5 text-2xs">
                                {TYPES.map((t) => (
                                    <option key={t.t} value={t.t}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                            <button type="button" onClick={() => removeBlock(b.id)} aria-label="Delete this block" className="grid size-8 place-items-center rounded-full text-caption hover:text-danger-ink">
                                <Trash2 size={14} aria-hidden="true" />
                            </button>
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => addAfter(draft[draft.length - 1].id)}>
                    Add a block
                </Button>
                <Button size="sm" loading={saving} disabled={!dirty} onClick={() => void save(draft)}>
                    Save
                </Button>
                <span className="text-xs text-caption" aria-live="polite">
                    {dirty ? "Unsaved changes" : savedAt ? `Saved at ${savedAt}` : "Saved"}
                </span>
            </div>
            <p className="mt-2 text-2xs text-caption">
                Enter makes the next block · <code>#</code> heading · <code>-</code> bullet · <code>[]</code> checkbox · <code>&gt;</code> quote
            </p>
        </div>
    );
}

function ReadBlock({ block }: { block: NoteBlock }) {
    if (block.type === "h") return <h3 className="mt-2 font-display text-[19px] leading-7">{block.text}</h3>;
    if (block.type === "quote") return <blockquote className="border-l-2 border-line-strong pl-3 text-md italic leading-6 text-muted">{block.text}</blockquote>;
    if (block.type === "ul")
        return (
            <p className="flex gap-2.5 text-md leading-6">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-caption" aria-hidden="true" />
                {block.text}
            </p>
        );
    if (block.type === "todo")
        return (
            <p className={cn("flex items-start gap-2.5 text-md leading-6", block.done && "text-caption line-through")}>
                <span className={cn("mt-1 grid size-4 shrink-0 place-items-center rounded-[4px] border", block.done ? "border-brand bg-brand text-white" : "border-line-strong")} aria-hidden="true">
                    {block.done && <Check size={11} strokeWidth={3} />}
                </span>
                {block.text}
            </p>
        );
    return <p className="text-md leading-6">{block.text}</p>;
}
