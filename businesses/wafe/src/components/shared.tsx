import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import { AREA_LABEL, type Area, type Capability, type Member, type Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { longDate, money, shortDate, time } from "@/lib/format";
import { useSpace } from "@/state/space";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Button, EmptyState, Tag } from "@/components/ui/primitives";
import { Reveal, SplitLines } from "@/components/ui/motion";
import type { IllustrationName } from "@/components/ui/Illustration";

/**
 * Shared pieces every module uses, so the product reads as one product:
 * page titles, area tags, members as avatars/pickers/chips, money and dates
 * in the family's own terms, the visibility picker, and a confirm dialog.
 *
 * The page header, the metric card and the alert are Untitled UI's; the rule
 * under the title and the density are Primer's.
 */

export function PageTitle({ title, sub, area, actions, className }: { title: string; sub?: string; area?: Area; actions?: ReactNode; className?: string }) {
    return (
        <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-3 pb-5", className)}>
            <div className="min-w-0">
                {area && <AreaTag area={area} className="mb-2" />}
                <SplitLines as="h1" className="font-display text-5xl font-semibold leading-8 md:text-7xl md:leading-10" text={title} />
                {sub && <p className="mt-1.5 max-w-2xl text-base leading-6 text-muted">{sub}</p>}
            </div>
            {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function AreaTag({ area, className }: { area: Area; className?: string }) {
    return (
        <Tag tone={area} dot className={className}>
            {AREA_LABEL[area]}
        </Tag>
    );
}

/**
 * A section heading with an optional action on the right.
 *
 * It also carries the app's entrance: the section settles into place as it is
 * reached, and any progress bar inside it draws itself at the same moment.
 * Doing that here rather than at two hundred call sites is the whole point of
 * having this helper.
 */
export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <Reveal as="section" className={cn("mb-8", className)}>
            <div className="mb-3.5 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold leading-[26px] max-md:text-xl">{title}</h2>
                {action}
            </div>
            {children}
        </Reveal>
    );
}

/** Untitled UI's metric card: the label first, the number in the display face. */
const STAT_TONE: Record<string, string> = {
    neutral: "border-line bg-card",
    ok: "border-mint/20 bg-mint-soft",
    warn: "border-peach/20 bg-peach-soft",
    danger: "border-danger/20 bg-danger-soft",
    home: "border-home/20 bg-home-soft",
    family: "border-family/20 bg-family-soft",
    grow: "border-grow/20 bg-grow-soft",
    execute: "border-execute/20 bg-execute-soft",
    live: "border-live/20 bg-live-soft",
    create: "border-create/20 bg-create-soft",
};

export function Stat({ label, value, sub, tone = "neutral", className }: { label: string; value: ReactNode; sub?: string; tone?: "neutral" | "ok" | "warn" | "danger" | Area; className?: string }) {
    return (
        <div className={cn("rounded-xl border p-4 shadow-xs", STAT_TONE[tone] ?? STAT_TONE.neutral, className)}>
            <div className="text-sm font-medium text-muted">{label}</div>
            <div className="mt-1.5 font-display text-6xl font-semibold leading-9 tracking-[-0.02em]">{value}</div>
            {sub && <div className="mt-0.5 text-sm text-caption">{sub}</div>}
        </div>
    );
}

export function useMember(id: string | null | undefined): Member | undefined {
    const { members } = useSpace();
    return id ? members.find((m) => m.id === id) : undefined;
}

export function MemberAvatar({ member, memberId, size = "sm", showName, className }: { member?: Member; memberId?: string | null; size?: "xs" | "sm" | "md" | "lg" | "xl"; showName?: boolean; className?: string }) {
    const found = useMember(memberId);
    const m = member ?? found;
    if (!m) return <span className={cn("text-sm text-caption", className)}>Everyone</span>;
    return (
        <span className={cn("inline-flex items-center gap-2", className)} title={m.name}>
            <Avatar name={m.name} hue={m.hue} src={m.avatarUrl} size={size} />
            {showName && <span className="text-sm font-medium">{m.name.split(" ")[0]}</span>}
        </span>
    );
}

/** A row of small avatars ("who this is for"). */
export function MemberChips({ memberIds, max = 4, className }: { memberIds: string[]; max?: number; className?: string }) {
    const { members } = useSpace();
    const list = memberIds.map((id) => members.find((m) => m.id === id)).filter(Boolean) as Member[];
    if (!list.length) return <span className={cn("text-sm text-caption", className)}>Everyone</span>;
    return (
        <span className={cn("inline-flex items-center", className)}>
            {list.slice(0, max).map((m, i) => (
                <span key={m.id} className={cn(i > 0 && "-ml-1.5")} title={m.name}>
                    <Avatar name={m.name} hue={m.hue} src={m.avatarUrl} size="xs" className="ring-2 ring-card" />
                </span>
            ))}
            {list.length > max && <span className="ml-1.5 text-xs font-medium text-caption">+{list.length - max}</span>}
        </span>
    );
}

/** The one select style, shared by both pickers. */
const SELECT = "h-10 w-full rounded-md border border-line-strong bg-card px-3 text-md shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand-glow";

/** Select one member (or the whole family when `allowFamily`). */
export function MemberPicker({ value, onChange, allowFamily, roles, label = "For", className }: { value: string | null; onChange: (id: string | null) => void; allowFamily?: boolean; roles?: Member["role"][]; label?: string; className?: string }) {
    const { members } = useSpace();
    const list = roles ? members.filter((m) => roles.includes(m.role)) : members;
    return (
        <label className={cn("block", className)}>
            <span className="mb-1.5 block text-md font-medium text-muted">{label}</span>
            <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={SELECT}>
                {allowFamily && <option value="">The whole family</option>}
                {list.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.name} · {m.relation}
                    </option>
                ))}
            </select>
        </label>
    );
}

/** Toggle several members. */
export function MemberMultiPicker({ value, onChange, roles, label = "Who", className }: { value: string[]; onChange: (ids: string[]) => void; roles?: Member["role"][]; label?: string; className?: string }) {
    const { members } = useSpace();
    const list = roles ? members.filter((m) => roles.includes(m.role)) : members;
    return (
        <div className={className}>
            <span className="mb-1.5 block text-md font-medium text-muted">{label}</span>
            <div className="flex flex-wrap gap-2">
                {list.map((m) => {
                    const on = value.includes(m.id);
                    return (
                        <button key={m.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id])} className={cn("inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-medium transition-colors", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-card text-muted shadow-xs hover:bg-page hover:text-ink")}>
                            <Avatar name={m.name} hue={m.hue} src={m.avatarUrl} size="xs" />
                            {m.name.split(" ")[0]}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function Money({ cents, currency, className }: { cents: number; currency?: string; className?: string }) {
    const { space } = useSpace();
    return <span className={cn("tabular-nums", className)}>{money(cents, currency ?? space.currency)}</span>;
}

export function DateText({ iso, withTime, long, className }: { iso: string; withTime?: boolean; long?: boolean; className?: string }) {
    return (
        <time dateTime={iso} className={className}>
            {long ? longDate(iso) : shortDate(iso)}
            {withTime ? ` · ${time(iso)}` : ""}
        </time>
    );
}

const VIS: Array<{ v: Visibility; label: string; note: string }> = [
    { v: "private", label: "Private", note: "Just me" },
    { v: "shared", label: "Shared", note: "People I choose" },
    { v: "family", label: "Family", note: "Parents and guests" },
    { v: "child", label: "Everyone", note: "Including the children" },
];

/** private / shared / family / everyone — with a member picker when shared. */
export function VisibilityPicker({ value, onChange, sharedWith = [], onSharedWith, className }: { value: Visibility; onChange: (v: Visibility) => void; sharedWith?: string[]; onSharedWith?: (ids: string[]) => void; className?: string }) {
    return (
        <div className={className}>
            <span className="mb-1.5 block text-md font-medium text-muted">Who can see this</span>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="radiogroup">
                {VIS.map((o) => (
                    <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={cn("rounded-md border px-3 py-2 text-left transition-colors", value === o.v ? "border-brand bg-brand-soft ring-4 ring-brand-glow" : "border-line-strong bg-card shadow-xs hover:bg-page")}>
                        <div className="text-md font-semibold">{o.label}</div>
                        <div className="text-xs text-caption">{o.note}</div>
                    </button>
                ))}
            </div>
            {value === "shared" && onSharedWith && <MemberMultiPicker value={sharedWith} onChange={onSharedWith} label="Share with" className="mt-3" />}
        </div>
    );
}

/** Renders children only when the member may `cap`. */
export function RoleGate({ cap, children, fallback = null }: { cap: Capability | Capability[]; children: ReactNode; fallback?: ReactNode }) {
    const { can } = useSpace();
    const caps = Array.isArray(cap) ? cap : [cap];
    return <>{caps.some((c) => can(c)) ? children : fallback}</>;
}

export function Confirm({ open, title, body, confirmLabel = "Confirm", danger, onConfirm, onClose }: { open: boolean; title: string; body?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> | void; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={open} onClose={onClose} title={title}>
            {body && <p className="text-md leading-6 text-muted">{body}</p>}
            <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant={danger ? "danger" : "primary"}
                    loading={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onConfirm();
                            onClose();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Dialog>
    );
}

/**
 * The drawing an empty screen shows, by area. One mapping here gives every
 * empty state in the app a picture without touching a single module.
 */
const AREA_ART: Record<Area, IllustrationName> = {
    home: "gather",
    family: "gather",
    grow: "learn",
    execute: "plan",
    live: "home",
    create: "create",
};

export function EmptyModule({ title, body, action, area }: { title: string; body?: string; action?: ReactNode; area?: Area }) {
    return <EmptyState title={title} body={body} action={action} art={area ? AREA_ART[area] : "gather"} />;
}

/** Chore/learning points, for the children's screens. */
export function Points({ n, className }: { n: number; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full bg-live-soft px-2.5 py-1 text-xs font-semibold text-live-ink ring-1 ring-inset ring-live/25", className)}>
            <Sparkles size={12} /> {n} pts
        </span>
    );
}

/** Untitled UI's alert: a hairline box, the tint behind it, the icon in tone. */
const NOTICE: Record<string, { box: string; icon: typeof Info }> = {
    warn: { box: "border-peach/25 bg-peach-soft text-peach", icon: AlertTriangle },
    danger: { box: "border-danger/25 bg-danger-soft text-danger-ink", icon: AlertCircle },
    info: { box: "border-brand/20 bg-brand-soft text-brand-ink", icon: Info },
    ok: { box: "border-mint/25 bg-mint-soft text-mint", icon: CheckCircle2 },
};

export function Notice({ tone = "warn", children, className }: { tone?: "warn" | "danger" | "info" | "ok"; children: ReactNode; className?: string }) {
    const { box, icon: Icon } = NOTICE[tone];
    return (
        <div className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-md leading-5", box, className)} role="status">
            <Icon size={16} className="mt-px shrink-0" aria-hidden="true" />
            <div>{children}</div>
        </div>
    );
}

/** A "see all" link in the section header style. */
export function MoreLink({ to, children = "See all" }: { to: string; children?: ReactNode }) {
    return (
        <Link to={to} className="text-md font-semibold text-brand underline-offset-4 hover:underline">
            {children}
        </Link>
    );
}
