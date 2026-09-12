import { Link } from "react-router-dom";
import { Award, Bell, BookOpen, CheckSquare, Flame, MessageSquare, Users, Video } from "lucide-react";
import type { NotificationKind } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { relative } from "@coir-six/core";
import { unreadNotifications } from "@coir-six/core";
import { useData } from "@/state/data";
import { PageTitle } from "@/components/shell/AppShell";
import { Button, EmptyState } from "@/components/ui/primitives";

const ICON: Record<NotificationKind, { icon: React.ReactNode; tone: string }> = {
    lesson: { icon: <BookOpen size={16} />, tone: "bg-brand-soft text-brand" },
    task: { icon: <CheckSquare size={16} />, tone: "bg-peach-soft text-peach" },
    message: { icon: <MessageSquare size={16} />, tone: "bg-fe-soft text-fe" },
    streak: { icon: <Flame size={16} />, tone: "bg-peach-soft text-peach" },
    certificate: { icon: <Award size={16} />, tone: "bg-mint-soft text-mint" },
    group: { icon: <Users size={16} />, tone: "bg-br-soft text-br" },
    live: { icon: <Video size={16} />, tone: "bg-brand-soft text-brand" },
};

export default function NotificationsPage() {
    const { user, mutate } = useData();
    const unread = unreadNotifications(user);
    return (
        <>
            <PageTitle title="Notifications" sub={unread ? `${unread} unread` : "You're up to date."} action={unread > 0 && <Button variant="outline" size="md" onClick={() => void mutate((r) => r.markNotificationsRead())}>Mark all read</Button>} />
            {user.notifications.length === 0 ? (
                <EmptyState icon={<Bell size={22} />} title="Nothing yet" body="Replies, reminders and streak milestones land here." />
            ) : (
                <ul className="overflow-hidden rounded-xl bg-card">
                    {user.notifications.map((n) => {
                        const meta = ICON[n.kind] ?? ICON.lesson;
                        const inner = (
                            <>
                                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", meta.tone)} aria-hidden="true">{meta.icon}</span>
                                <div className="min-w-0 flex-1">
                                    <div className={cn("text-[14px]", n.readAt ? "font-medium" : "font-semibold")}>{n.title}</div>
                                    <div className="truncate text-[13px] text-muted">{n.body}</div>
                                </div>
                                <span className="shrink-0 text-[11px] text-caption">{relative(n.createdAt)}</span>
                                {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                            </>
                        );
                        const cls = cn("flex items-center gap-3 px-4 py-3 hover:bg-page", !n.readAt && "bg-brand-soft/40");
                        return (
                            <li key={n.id} className="border-b border-line last:border-b-0">
                                {n.href ? (
                                    <Link to={n.href} className={cls} onClick={() => !n.readAt && void mutate((r) => r.markNotificationsRead([n.id]))}>{inner}</Link>
                                ) : (
                                    <button type="button" className={cn(cls, "w-full text-left")} onClick={() => !n.readAt && void mutate((r) => r.markNotificationsRead([n.id]))}>{inner}</button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}
