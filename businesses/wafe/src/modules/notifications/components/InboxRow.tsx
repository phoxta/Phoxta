import { type ComponentType } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, BellRing, BookOpen, CalendarDays, Check, CheckSquare, HeartHandshake, HeartPulse, Mail, MoonStar, PartyPopper, Plane, Smartphone, Sunrise, Target, Users, Wallet } from "lucide-react";
import type { NotificationKind } from "@/data/core";
import { cn } from "@/lib/cn";
import { relative, time } from "@/lib/format";
import { Menu } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { hhmm, KIND_LABEL, type InboxItem } from "../derive";
import type { Channel } from "../types";

/**
 * One line of the inbox.
 *
 * The row carries everything a decision needs and nothing else: what happened,
 * which rule said so, how many times it has asked, and the one action that
 * would finish it. Snooze is a menu rather than a button because "later" is
 * only useful if you can say when.
 */

const ICON: Record<NotificationKind, ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }>> = {
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

const CHANNEL: Record<Channel, { icon: ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }>; label: string }> = {
    "in-app": { icon: BellRing, label: "In-app" },
    email: { icon: Mail, label: "Email" },
    push: { icon: Smartphone, label: "Push" },
};

export interface RowActions {
    onOpen: (item: InboxItem) => void;
    onAct: (item: InboxItem) => void;
    onSnooze: (item: InboxItem, until: string | null) => void;
    onMarkRead: (item: InboxItem) => void;
    onRemove: (item: InboxItem) => void;
}

export function InboxRow({
    item,
    ruleLabel,
    unread,
    snoozeOptions,
    actions,
    readOnly,
    canRemove = true,
}: {
    item: InboxItem;
    ruleLabel: string;
    unread: boolean;
    snoozeOptions: Array<{ label: string; until: string }>;
    actions: RowActions;
    readOnly?: boolean;
    /** The shell's own notifications belong to the bell; the inbox never deletes them. */
    canRemove?: boolean;
}) {
    const Icon = ICON[item.kind] ?? BellRing;
    const ChannelIcon = CHANNEL[item.channel].icon;
    const done = Boolean(item.actedAt);

    const meta: string[] = [ruleLabel];
    if (item.reminderNumber > 1) meta.push(`Reminder ${item.reminderNumber}`);
    if (item.isTest) meta.push("Test");

    return (
        <li className={cn("rounded-lg p-3.5 transition-colors sm:p-4", unread ? "bg-card" : "bg-card/60")}>
            <div className="flex items-start gap-3">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONE[item.kind] ?? "bg-subtle text-muted")}>
                    <Icon size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <h3 className={cn("min-w-0 flex-1 text-base leading-5", unread ? "font-semibold" : "font-medium text-muted")}>{item.title}</h3>
                        {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-terra" aria-label="Unread" />}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted">{item.body}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs text-caption">
                        <span className="inline-flex items-center gap-1">
                            <ChannelIcon size={11} aria-hidden="true" />
                            {CHANNEL[item.channel].label}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{KIND_LABEL[item.kind]}</span>
                        {meta.map((m) => (
                            <span key={m} className="inline-flex items-center gap-2.5">
                                <span aria-hidden="true">·</span>
                                {m}
                            </span>
                        ))}
                        <span aria-hidden="true">·</span>
                        <time dateTime={item.createdAt} title={item.createdAt}>
                            {relative(item.createdAt)}
                        </time>
                    </div>

                    {item.snoozedUntil && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-xs bg-brand-soft px-2 py-1 text-2xs font-medium text-brand-ink">
                            <AlarmClock size={11} aria-hidden="true" /> Back at {hhmm(item.snoozedUntil)}
                        </p>
                    )}
                    {item.deferredUntil && !item.digestFor && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-xs bg-plum-soft px-2 py-1 text-2xs font-medium text-plum">
                            <MoonStar size={11} aria-hidden="true" /> Quiet hours — arrives {time(item.deferredUntil)}
                        </p>
                    )}
                    {done && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-xs bg-mint-soft px-2 py-1 text-2xs font-medium text-mint">
                            <Check size={11} aria-hidden="true" /> {item.actionOutcome ?? "Done"}
                        </p>
                    )}

                    {!readOnly && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {item.action && !done && (
                                <Button size="sm" variant={item.action.kind === "open" ? "outline" : "brand"} onClick={() => (item.action?.kind === "open" ? actions.onOpen(item) : actions.onAct(item))}>
                                    {item.action.label}
                                </Button>
                            )}
                            {item.href && item.action?.kind !== "open" && (
                                <Link to={item.href} className="text-xs font-semibold text-brand underline-offset-4 hover:underline" onClick={() => actions.onMarkRead(item)}>
                                    Open
                                </Link>
                            )}
                            {!item.snoozedUntil ? (
                                <Menu
                                    align="start"
                                    trigger={(p) => (
                                        <Button size="sm" variant="ghost" {...p}>
                                            <AlarmClock size={13} aria-hidden="true" /> Snooze
                                        </Button>
                                    )}
                                    items={snoozeOptions.map((o) => ({ label: o.label, onSelect: () => actions.onSnooze(item, o.until) }))}
                                />
                            ) : (
                                <Button size="sm" variant="ghost" onClick={() => actions.onSnooze(item, null)}>
                                    Wake it now
                                </Button>
                            )}
                            {unread && (
                                <Button size="sm" variant="ghost" onClick={() => actions.onMarkRead(item)}>
                                    Mark read
                                </Button>
                            )}
                            {canRemove && (
                                <Button size="sm" variant="ghost" className="text-danger-ink" onClick={() => actions.onRemove(item)}>
                                    Remove
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}
