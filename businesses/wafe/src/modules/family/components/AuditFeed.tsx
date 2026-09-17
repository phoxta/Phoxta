import { useState, type ReactNode } from "react";
import { History } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { longDate, relative, time } from "@/lib/format";
import { EmptyState } from "@/components/ui/primitives";
import { MemberAvatar } from "@/components/shared";
import { AUDIT_LABEL, type AuditAction, type AuditEntry } from "../types";

/**
 * The audit log: who changed the boundary, when, and from what to what.
 *
 * Every permission, role, band and share change writes a line here at the
 * moment it is applied, so "it took effect and it was recorded" is one act,
 * not two.
 */

const TONE: Partial<Record<AuditAction, string>> = {
    permission: "bg-execute-soft text-execute-ink",
    role: "bg-execute-soft text-execute-ink",
    band: "bg-grow-soft text-grow-ink",
    share: "bg-live-soft text-live-ink",
    childmode: "bg-create-soft text-create-ink",
    export: "bg-brand-soft text-brand-ink",
};

export function AuditFeed({ entries, members, limit = 12, filterMemberId }: { entries: AuditEntry[]; members: Member[]; limit?: number; filterMemberId?: string }) {
    const [action, setAction] = useState<AuditAction | "all">("all");
    const [all, setAll] = useState(false);

    const scoped = entries.filter((e) => (!filterMemberId || e.targetId === filterMemberId) && (action === "all" || e.action === action));
    const shown = all ? scoped : scoped.slice(0, limit);
    const kinds = Array.from(new Set(entries.map((e) => e.action)));

    if (!entries.length) {
        return <EmptyState icon={<History size={20} aria-hidden="true" />} title="Nothing has changed yet" body="Roles, permissions, shares and settings write a line here the moment they change." />;
    }

    return (
        <div className="rounded-xl bg-card p-4">
            {kinds.length > 1 && !filterMemberId && (
                <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
                    <Chip on={action === "all"} onClick={() => setAction("all")}>
                        Everything
                    </Chip>
                    {kinds.map((k) => (
                        <Chip key={k} on={action === k} onClick={() => setAction(k)}>
                            {AUDIT_LABEL[k]}
                        </Chip>
                    ))}
                </div>
            )}
            {shown.length === 0 ? (
                <p className="px-1 py-6 text-center text-md text-muted">Nothing of that kind yet.</p>
            ) : (
                <ol className="divide-y divide-line">
                    {shown.map((e) => {
                        const actor = members.find((m) => m.id === e.actorId);
                        return (
                            <li key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                <MemberAvatar member={actor} size="sm" className="mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-md leading-5">{e.summary}</p>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-caption">
                                        <span className={cn("rounded-xs px-1.5 py-0.5 font-semibold", TONE[e.action] ?? "bg-page text-muted")}>{AUDIT_LABEL[e.action]}</span>
                                        <span>{actor?.name.split(" ")[0] ?? "Someone"}</span>
                                        <span>·</span>
                                        <time dateTime={e.at} title={`${longDate(e.at)} · ${time(e.at)}`}>
                                            {relative(e.at)}
                                        </time>
                                        {e.before && e.after && (
                                            <>
                                                <span>·</span>
                                                <span className="tabular-nums">
                                                    {e.before} → {e.after}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
            {scoped.length > limit && (
                <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                    {all ? "Show less" : `Show all ${scoped.length}`}
                </button>
            )}
        </div>
    );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" aria-pressed={on} onClick={onClick} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
            {children}
        </button>
    );
}
