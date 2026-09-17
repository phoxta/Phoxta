import { useMemo, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { AGE_BAND, type Capability, type Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { ageOf } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Button } from "@/components/ui/primitives";
import { profileMatches, recommendedProfile } from "../derive";
import { useFamily } from "../hooks";

/**
 * "What should a nine-year-old be allowed to do?"
 *
 * The companion answers by proposing, never by writing: it explains the band
 * in the family's own context, and the proposals underneath are the standard
 * profile for that band, one row at a time, each with the reason and an
 * Apply button. Every applied row goes through the same `setOverride` a
 * parent's own click uses, so it is audited like any other decision.
 *
 * The rows are computed locally (`recommendedProfile`), so they are there
 * whether the companion answered, was unavailable, or the allowance is spent
 * — the template fallback the brief asks for.
 */
export function ProfileSuggester({ member, overrides, onSet, busy }: { member: Member; overrides: Partial<Record<Capability, boolean>> | undefined; onSet: (cap: Capability, value: boolean | null) => Promise<void>; busy?: boolean }) {
    const sp = useSpace();
    const { mutate } = useFamily();
    const ai = useAi();
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [applying, setApplying] = useState<Capability | "all" | null>(null);

    const band = member.ageBand;
    const age = member.birthday ? ageOf(member.birthday, new Date(`${sp.today}T12:00:00`)) : null;
    const rows = useMemo(() => recommendedProfile(band), [band]);
    const different = rows.filter((r) => !profileMatches(band, overrides, r));

    if (member.role !== "child") return null;

    const suggest = async () => {
        setOpen(true);
        setNote(null);
        const first = member.name.split(" ")[0];
        try {
            const res = await ai.ask({
                action: "ask",
                prompt: `In no more than three sentences, and speaking to a parent, say what ${first} (${age ?? "a child"}, ${AGE_BAND[band].label} band) should and should not be able to reach in our family app, and why. Do not list settings; give the reasoning. Then stop.`,
                payload: {
                    member: { name: first, band, years: AGE_BAND[band].years, age },
                    proposals: rows.map((r) => ({ permission: r.label, recommend: r.allow ? "allow" : "block" })),
                    alreadySetByHand: Object.keys(overrides ?? {}),
                },
            });
            await mutate((r) => r.noteAiCall("call"));
            setNote(res.unavailable ? `${res.unavailable} The standard ${AGE_BAND[band].label} profile is below.` : res.text || `The standard ${AGE_BAND[band].label} profile is below.`);
        } catch {
            setNote(`The companion couldn't answer just now — the standard ${AGE_BAND[band].label} profile is below, and it is the same one it would have started from.`);
        }
    };

    const apply = async (cap: Capability, allow: boolean) => {
        setApplying(cap);
        try {
            await onSet(cap, allow);
        } finally {
            setApplying(null);
        }
    };

    const applyAll = async () => {
        setApplying("all");
        try {
            for (const r of different) await onSet(r.cap, r.allow);
        } finally {
            setApplying(null);
        }
    };

    return (
        <div className="mb-3 rounded-xl bg-brand-soft p-4">
            <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true">
                    <Sparkles size={16} />
                </span>
                <div className="min-w-[200px] flex-1">
                    <p className="text-md font-semibold text-brand-ink">A profile for the {AGE_BAND[band].label} band</p>
                    <p className="mt-0.5 text-xs leading-5 text-brand-ink/80">
                        {different.length ? `${different.length} thing${different.length === 1 ? "" : "s"} differ${different.length === 1 ? "s" : ""} from the usual ${AGE_BAND[band].label} profile.` : `${member.name.split(" ")[0]} already matches the usual ${AGE_BAND[band].label} profile.`}
                    </p>
                </div>
                <Button size="md" variant="outline" loading={ai.busy} onClick={() => void suggest()}>
                    {open ? "Ask again" : "Recommend a profile"}
                </Button>
            </div>

            {open && (
                <div className="mt-3.5 border-t border-brand/20 pt-3.5">
                    {note && <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink">{note}</p>}
                    <p className="mb-3 text-2xs uppercase tracking-[0.06em] text-brand-ink/70">
                        I used: {member.name.split(" ")[0]}'s age band{age !== null ? ` and birthday (${age})` : ""}, and the {Object.keys(overrides ?? {}).length} permission{Object.keys(overrides ?? {}).length === 1 ? "" : "s"} you have already set by hand. Nothing has changed — these are proposals.
                    </p>
                    <ul className="grid gap-2">
                        {rows.map((r) => {
                            const matches = profileMatches(band, overrides, r);
                            return (
                                <li key={r.cap} className={cn("flex flex-wrap items-start gap-3 rounded-lg bg-card p-3", matches && "opacity-70")}>
                                    <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", r.allow ? "bg-mint-soft text-mint" : "bg-danger-soft text-danger-ink")} aria-hidden="true">
                                        {r.allow ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                                    </span>
                                    <span className="min-w-[180px] flex-1">
                                        <span className="block text-sm font-semibold">
                                            {r.allow ? "Allow" : "Block"} · {r.label}
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-5 text-caption">{r.why}</span>
                                    </span>
                                    {matches ? (
                                        <span className="shrink-0 text-xs font-semibold text-caption">Already so</span>
                                    ) : (
                                        <Button size="sm" variant="outline" disabled={busy || applying !== null} loading={applying === r.cap} onClick={() => void apply(r.cap, r.allow)}>
                                            Apply
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {different.length > 1 && (
                        <Button size="md" variant="brand" className="mt-3" disabled={busy} loading={applying === "all"} onClick={() => void applyAll()}>
                            Apply all {different.length}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
