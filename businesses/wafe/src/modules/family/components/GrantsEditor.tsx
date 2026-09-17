import { useState, type ReactNode } from "react";
import { Check, Minus, X } from "lucide-react";
import { AGE_BAND, type Capability, type Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { GRANTABLE } from "@/lib/perms";
import { grantSource } from "../derive";
import { BAND_DEFAULTS } from "../types";

/**
 * One member's permissions, as three states rather than a checkbox.
 *
 *   Default — whatever their age band says today, and whatever it says after
 *             their next birthday. The band moves; this follows.
 *   Allow   — a parent said yes. A band change never takes it away.
 *   Block   — a parent said no. A band change never gives it back.
 *
 * That third column is the whole of acceptance criterion 2: defaults are
 * re-applied on a band change, explicit decisions are not touched.
 */
export function GrantsEditor({ member, overrides, onSet, busy }: { member: Member; overrides: Partial<Record<Capability, boolean>> | undefined; onSet: (cap: Capability, value: boolean | null) => Promise<void>; busy?: boolean }) {
    const [pending, setPending] = useState<Capability | null>(null);
    const rows = GRANTABLE.filter((g) => g.roles.includes(member.role));

    if (member.role === "parent") {
        return <p className="rounded-lg bg-page px-4 py-3 text-sm leading-5 text-muted">Parents hold every permission there is — money, health, documents, settings. There is nothing here to widen, and nothing here can narrow them.</p>;
    }
    if (!rows.length) return <p className="text-sm text-muted">Nothing extra can be granted to this role.</p>;

    const set = async (cap: Capability, value: boolean | null) => {
        setPending(cap);
        try {
            await onSet(cap, value);
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="overflow-hidden rounded-xl bg-card">
            <ul className="divide-y divide-line">
                {rows.map((g) => {
                    const src = grantSource(member.ageBand, overrides, g.cap);
                    const bandGives = BAND_DEFAULTS[member.ageBand].includes(g.cap);
                    return (
                        <li key={g.cap} className="flex flex-wrap items-start gap-3 p-4">
                            <div className="min-w-[200px] flex-1">
                                <p className="text-md font-semibold">{g.label}</p>
                                <p className="mt-0.5 text-xs leading-5 text-caption">{g.note}</p>
                                <p className="mt-1 text-2xs uppercase tracking-[0.06em] text-caption">
                                    {bandGives ? `${AGE_BAND[member.ageBand].label} band gives this by default` : "Not in this band by default"}
                                    {src === "explicit-on" && " · you allowed it"}
                                    {src === "explicit-off" && " · you blocked it"}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1 rounded-full bg-page p-1" role="radiogroup" aria-label={g.label}>
                                <Seg on={src === "band" || src === "none"} disabled={busy || pending === g.cap} onClick={() => set(g.cap, null)} label="Default">
                                    <Minus size={13} aria-hidden="true" />
                                </Seg>
                                <Seg on={src === "explicit-on"} disabled={busy || pending === g.cap} onClick={() => set(g.cap, true)} label="Allow" tone="ok">
                                    <Check size={13} aria-hidden="true" />
                                </Seg>
                                <Seg on={src === "explicit-off"} disabled={busy || pending === g.cap} onClick={() => set(g.cap, false)} label="Block" tone="danger">
                                    <X size={13} aria-hidden="true" />
                                </Seg>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function Seg({ on, onClick, label, children, disabled, tone = "neutral" }: { on: boolean; onClick: () => void; label: string; children: ReactNode; disabled?: boolean; tone?: "neutral" | "ok" | "danger" }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-50",
                on ? (tone === "ok" ? "bg-mint text-white" : tone === "danger" ? "bg-danger text-white" : "bg-ink text-white") : "text-muted hover:text-ink",
            )}
        >
            {children}
            {label}
        </button>
    );
}
