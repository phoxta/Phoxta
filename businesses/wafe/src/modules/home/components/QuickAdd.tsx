import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, CheckSquare, HandHeart, Image, Receipt } from "lucide-react";
import type { Capability } from "@/data/core";
import { cn } from "@/lib/cn";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Kbd } from "@/components/ui/primitives";

/**
 * Quick-add — the "Q" key.
 *
 * Home is where you are when something occurs to you, and the point is that
 * you do not lose it while you look for the right screen. Each kind belongs to
 * the module that owns it, so Quick-add carries the words you typed to that
 * module's own add flow rather than writing into someone else's tables.
 */

const KINDS: Array<{ id: string; label: string; to: string; cap: Capability; icon: typeof CheckSquare; placeholder: string }> = [
    { id: "task", label: "Task", to: "/execute/tasks", cap: "tasks.manage", icon: CheckSquare, placeholder: "Buy Tobi's PE kit" },
    { id: "event", label: "Event", to: "/execute/calendar", cap: "calendar.manage", icon: CalendarPlus, placeholder: "Bible study, Wednesday 19:30" },
    { id: "prayer", label: "Prayer", to: "/grow/bible", cap: "bible.prayerwall", icon: HandHeart, placeholder: "For Oluwafemi's Monday review" },
    { id: "expense", label: "Expense", to: "/live/finance", cap: "finance.manage", icon: Receipt, placeholder: "Sainsbury's — 42.60" },
    { id: "pin", label: "Pin", to: "/create/moodboards", cap: "moodboards.manage", icon: Image, placeholder: "Kitchen splashback idea" },
];

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { can } = useSpace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const kinds = KINDS.filter((k) => can(k.cap));
    const [kind, setKind] = useState(kinds[0]?.id ?? "task");
    const [text, setText] = useState("");

    useEffect(() => {
        if (open) setText("");
    }, [open]);

    if (!kinds.length) return null;
    const active = kinds.find((k) => k.id === kind) ?? kinds[0];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;
        onClose();
        toast(`Opening ${active.label.toLowerCase()} with "${value}"`);
        navigate(`${active.to}?add=${encodeURIComponent(value)}`);
    };

    return (
        <Dialog open={open} onClose={onClose} title="Quick add">
            <form onSubmit={submit}>
                <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="What are you adding?">
                    {kinds.map((k) => {
                        const Icon = k.icon;
                        const on = k.id === active.id;
                        return (
                            <button
                                key={k.id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => setKind(k.id)}
                                className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                            >
                                <Icon size={14} aria-hidden="true" />
                                {k.label}
                            </button>
                        );
                    })}
                </div>
                <Field label={active.label} value={text} onChange={(e) => setText(e.target.value)} placeholder={active.placeholder} hint="We'll take you to the right place with this already typed." />
                <div className="mt-5 flex items-center justify-between gap-2">
                    <span className="text-xs text-caption">
                        Tip: press <Kbd>Q</Kbd> anywhere on Home
                    </span>
                    <Button type="submit" variant="brand" disabled={!text.trim()}>
                        Continue
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
