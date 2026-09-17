import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BookOpen, CalendarDays, CheckSquare, HeartHandshake, HeartPulse, PartyPopper, Plane, Sunrise, Target, Users, Wallet } from "lucide-react";
import type { Notification, NotificationKind } from "@/data/core";
import { cn } from "@/lib/cn";
import { relative } from "@/lib/format";
import { useSpace } from "@/state/space";
import { EmptyState } from "@/components/ui/primitives";
import { Drawer } from "@/components/shell/Drawer";

/**
 * The bell's panel. Opening it marks everything read (the count is a promise
 * that something is new; once you have looked, it is not) — but the rows that
 * WERE new keep their marker until the panel closes, so a glance still tells
 * you what just happened.
 */

const ICON: Record<NotificationKind, ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" }>> = {
    task: CheckSquare,
    goal: Target,
    event: CalendarDays,
    learning: BookOpen,
    prayer: HeartHandshake,
    finance: Wallet,
    travel: Plane,
    wellness: HeartPulse,
    family: Users,
    celebrate: PartyPopper,
    briefing: Sunrise,
};

const TONE: Record<NotificationKind, string> = {
    task: "bg-execute-soft text-execute-ink",
    goal: "bg-execute-soft text-execute-ink",
    event: "bg-live-soft text-live-ink",
    learning: "bg-grow-soft text-grow-ink",
    prayer: "bg-grow-soft text-grow-ink",
    finance: "bg-live-soft text-live-ink",
    travel: "bg-live-soft text-live-ink",
    wellness: "bg-mint-soft text-mint",
    family: "bg-family-soft text-family-ink",
    celebrate: "bg-peach-soft text-peach",
    briefing: "bg-brand-soft text-brand-ink",
};

/** Newest first; the repo promises that order but a sort costs nothing. */
function newestFirst(a: Notification, b: Notification): number {
    return b.createdAt.localeCompare(a.createdAt);
}

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { coreState, me, mutateCore } = useSpace();
    const navigate = useNavigate();
    const mine = useMemo(() => coreState.notifications.filter((n) => n.memberId === me.id).sort(newestFirst), [coreState.notifications, me.id]);
    const [fresh, setFresh] = useState<Set<string>>(() => new Set());

    // Snapshot what is unread the moment the panel opens, then mark it read.
    useEffect(() => {
        if (!open) return;
        const unread = mine.filter((n) => !n.readAt).map((n) => n.id);
        setFresh(new Set(unread));
        if (unread.length) mutateCore((r) => r.markRead(unread)).catch((e) => console.error("[wafe] markRead", e));
        // Only on open: re-running on every core refresh would wipe the "new" markers.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const go = (n: Notification) => {
        onClose();
        if (n.href) navigate(n.href);
    };

    return (
        <Drawer open={open} onClose={onClose} title="Notifications" sub={mine.length ? `${mine.length} for ${me.name.split(" ")[0]}` : undefined} icon={<Bell size={16} aria-hidden="true" />}>
            {mine.length === 0 ? (
                <div className="p-5">
                    <EmptyState icon={<Bell size={20} aria-hidden="true" />} title="You're all caught up" body="Follow-ups, celebrations and briefings for you will land here." />
                </div>
            ) : (
                <ul className="divide-y divide-line">
                    {mine.map((n) => {
                        const Icon = ICON[n.kind] ?? Bell;
                        const isNew = fresh.has(n.id);
                        const inner = (
                            <>
                                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONE[n.kind] ?? "bg-subtle text-muted")}>
                                    <Icon size={16} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-start gap-2">
                                        <span className={cn("flex-1 text-md leading-5", isNew ? "font-semibold text-ink" : "font-medium text-ink")}>{n.title}</span>
                                        {isNew && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-terra" aria-label="New" />}
                                    </span>
                                    <span className="mt-0.5 block text-sm leading-5 text-muted">{n.body}</span>
                                    <span className="mt-1 block text-2xs text-caption">{relative(n.createdAt)}</span>
                                </span>
                            </>
                        );
                        return (
                            <li key={n.id}>
                                {n.href ? (
                                    <button type="button" onClick={() => go(n)} className={cn("flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-card", isNew && "bg-card/60")}>
                                        {inner}
                                    </button>
                                ) : (
                                    <div className={cn("flex items-start gap-3 px-5 py-3.5", isNew && "bg-card/60")}>{inner}</div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Drawer>
    );
}
