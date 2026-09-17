import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Cake, Check, Copy, Heart, MapPin, PhoneCall, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials, shortDate } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Money } from "@/components/shared";
import { Button, Card, ProgressBar, Spinner, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import { cadenceStatus, draftMessage, nextOccurrence, type CadenceStatus, type Occasion } from "../derive";
import { CADENCE, COMMUNITY_TYPE, MENTOR_AREA, PERSON_KIND, type Community, type Mentor, type Person } from "../types";

/**
 * The pieces the four People screens share: a face, a card, the occasion rail,
 * the drafted-message dialog and the little companion box. Kept module-private
 * on purpose — nothing here belongs to the design system.
 */

const HUE = ["bg-lilac-soft text-lilac", "bg-sky-soft text-sky", "bg-rose-soft text-rose", "bg-mint-soft text-mint", "bg-peach-soft text-peach", "bg-plum-soft text-plum"];

function tint(name: string): string {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return HUE[h % HUE.length];
}

const SIZE = { sm: "size-10 text-sm", md: "size-14 text-lg", lg: "size-20 text-3xl", xl: "size-28 text-7xl" } as const;
const PX = { sm: 40, md: 56, lg: 80, xl: 112 } as const;

export function PersonPhoto({ person, size = "md", className }: { person: Pick<Person, "name" | "photoUrl">; size?: keyof typeof SIZE; className?: string }) {
    return (
        <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold", SIZE[size], !person.photoUrl && tint(person.name), className)}>
            {person.photoUrl ? <img src={person.photoUrl} alt={person.name} width={PX[size]} height={PX[size]} loading="lazy" className="size-full object-cover" /> : initials(person.name)}
        </span>
    );
}

export function CadenceChip({ status }: { status: CadenceStatus }) {
    if (status.cadence === "none") return null;
    if (status.overdue) {
        return (
            <Tag tone="warn">
                {status.daysSince === null ? "Never called" : `${status.daysSince} days since`}
            </Tag>
        );
    }
    return <Tag tone="neutral">{CADENCE[status.cadence].label}</Tag>;
}

export function PersonCard({ person, today, occasion }: { person: Person; today: string; occasion?: Occasion }) {
    const status = cadenceStatus(person, today);
    return (
        <li>
            <Link to={`/family/people/relatives/${person.id}`} className="flex h-full items-start gap-3.5 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                <PersonPhoto person={person} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">{person.name}</span>
                    <span className="mt-0.5 block text-sm leading-5 text-muted clamp-2">{person.relationship || PERSON_KIND[person.kind]}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        {occasion && (
                            <Tag tone={occasion.inDays === 0 ? "ok" : "brand"} icon={<Cake size={11} aria-hidden="true" />}>
                                {occasion.inDays === 0 ? "Today" : occasion.inDays === 1 ? "Tomorrow" : `${shortDate(occasion.date)}`}
                            </Tag>
                        )}
                        {!person.redacted && <CadenceChip status={status} />}
                        {person.inviteCode && <Tag tone="family">Guest</Tag>}
                    </span>
                </span>
            </Link>
        </li>
    );
}

export function CommunityCard({ community }: { community: Community }) {
    return (
        <li>
            <Link to={`/family/people/communities/${community.id}`} className="block h-full overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-hover">
                {community.photoUrl ? (
                    <img src={community.photoUrl} alt={community.name} width={480} height={200} loading="lazy" className="h-28 w-full object-cover" />
                ) : (
                    <span className="grid h-28 w-full place-items-center bg-family-soft text-family-ink">
                        <Users size={26} aria-hidden="true" />
                    </span>
                )}
                <span className="block p-4">
                    <span className="flex items-center gap-2">
                        <Tag tone="family">{COMMUNITY_TYPE[community.type]}</Tag>
                        {community.sharedWithGuests && <Tag tone="neutral">Shared with guests</Tag>}
                    </span>
                    <span className="mt-2 block text-base font-semibold">{community.name}</span>
                    <span className="mt-0.5 block text-sm text-muted">{community.meetingRhythm}</span>
                    {community.meetsWhere && (
                        <span className="mt-1.5 flex items-start gap-1.5 text-xs text-caption">
                            <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                            {community.meetsWhere}
                        </span>
                    )}
                </span>
            </Link>
        </li>
    );
}

export function MentorCard({ mentor, person, next }: { mentor: Mentor; person?: Person; next: string | null }) {
    const { members } = useSpace();
    const mentees = mentor.menteeMemberIds.map((id) => members.find((m) => m.id === id)?.name.split(" ")[0]).filter(Boolean);
    return (
        <li>
            <Link to={`/family/people/mentors/${mentor.id}`} className="flex h-full items-start gap-3.5 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                <PersonPhoto person={person ?? { name: "?", photoUrl: null }} />
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{person?.name ?? "A mentor"}</span>
                        <Tag tone="grow">{MENTOR_AREA[mentor.area]}</Tag>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{mentor.title}</span>
                    {mentees.length > 0 && <span className="mt-1 block text-xs text-caption">Mentors {mentees.join(" and ")}</span>}
                    {next && <span className="mt-2 block text-xs font-semibold text-brand">Next: {shortDate(next)}</span>}
                </span>
            </Link>
        </li>
    );
}

/** The "coming up" rail: birthdays and anniversaries with a message ready. */
export function OccasionRail({ occasions, onDraft }: { occasions: Occasion[]; onDraft?: (o: Occasion) => void }) {
    if (!occasions.length) return null;
    return (
        <ul className="grid-cols-[minmax(0,1fr)] rail md:m-0 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible md:p-0 lg:grid-cols-3">
            {occasions.map((o) => (
                <li key={o.key} className="w-[260px] md:w-auto">
                    <div className={cn("flex h-full flex-col gap-3 rounded-xl p-4", o.inDays === 0 ? "bg-live-soft" : "bg-card")}>
                        <div className="flex items-start gap-3">
                            <PersonPhoto person={{ name: o.personName, photoUrl: o.photoUrl }} size="sm" />
                            <div className="min-w-0 flex-1">
                                <Link to={`/family/people/relatives/${o.personId}`} className="block truncate text-md font-semibold hover:underline">
                                    {o.personName}
                                </Link>
                                <p className="text-xs text-muted">
                                    {o.kind === "birthday" ? <Cake size={11} className="mr-1 inline" aria-hidden="true" /> : <Heart size={11} className="mr-1 inline" aria-hidden="true" />}
                                    {o.inDays === 0 ? "Today" : o.inDays === 1 ? "Tomorrow" : `In ${o.inDays} days`} · {shortDate(o.date)}
                                    {o.years ? ` · ${o.kind === "birthday" ? `turns ${o.years}` : `${o.years} years`}` : ""}
                                </p>
                            </div>
                        </div>
                        {onDraft && (
                            <Button size="sm" variant="outline" className="mt-auto self-start" onClick={() => onDraft(o)}>
                                Draft a message
                            </Button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

/**
 * The drafted message.
 *
 * The template is written before anything is asked, so the box is never
 * empty — the companion is an improvement on a good draft, not the only way
 * to get one. Nothing is sent from here: the family copies it into whatever
 * they actually use.
 */
export function DraftMessageDialog({ person, occasion, open, onClose }: { person: Person; occasion: { kind: "birthday" | "anniversary"; years?: number }; open: boolean; onClose: () => void }) {
    const { space } = useSpace();
    const { ask, busy, available } = useAi();
    const fallback = useMemo(() => draftMessage(person, occasion.kind, space, occasion.years), [person, occasion.kind, occasion.years, space]);
    const [text, setText] = useState(fallback);
    const [note, setNote] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setText(fallback);
        setNote(null);
        setCopied(false);
    }, [fallback, open]);

    const rewrite = async () => {
        setNote(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Write a short, warm ${occasion.kind} message from our family to ${person.name}. Two or three sentences, British English, natural — not greetings-card language. Mention something true from what you know of them. Sign off from the family.`,
                payload: { name: person.name, relationship: person.relationship, occasion: occasion.kind, years: occasion.years ?? null },
                extraContext: [person.relationship && `How we know them: ${person.relationship}.`, person.notes && `Notes: ${person.notes}`, person.prayerNeeds && `Prayer needs: ${person.prayerNeeds}`].filter(Boolean).join(" "),
            });
            if (r.unavailable) setNote(r.unavailable);
            else if (r.text.trim()) setText(r.text.trim());
            else setNote("The companion had nothing to add — the draft below is yours.");
        } catch {
            setNote("The companion couldn't answer. The draft below still works.");
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        } catch {
            setNote("Your browser wouldn't let us copy — select the text instead.");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={`Message for ${person.name}`} wide>
            <p className="text-sm text-muted">
                {occasion.kind === "birthday" ? "Birthday" : "Anniversary"} on {person.birthday || person.anniversary ? shortDate(nextOccurrence((occasion.kind === "birthday" ? person.birthday : person.anniversary) ?? "", new Date().toISOString().slice(0, 10))) : "—"}. Written for you already — change
                anything you like.
            </p>
            <label className="mt-3 block">
                <span className="sr-only">Message</span>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="w-full rounded-md border border-line-strong bg-card p-3 text-md leading-6 outline-none focus:border-brand" />
            </label>
            {note && <p className="mt-2 text-xs text-peach">{note}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={copy} variant={copied ? "tonal" : "brand"} size="md">
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied ? "Copied" : "Copy the message"}
                </Button>
                <Button variant="outline" size="md" onClick={rewrite} loading={busy} disabled={!available}>
                    <Sparkles size={14} aria-hidden="true" /> Ask Wàfè to rewrite it
                </Button>
                {!available && <span className="text-xs text-caption">The companion needs the backend; the draft above is the template.</span>}
            </div>
        </Dialog>
    );
}

/** The little companion box that sits at the foot of a People screen. */
export function AskPanel({ title, prompts, extraContext }: { title: string; prompts: string[]; extraContext?: string }) {
    const { ask, busy, available } = useAi();
    const [answer, setAnswer] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [asked, setAsked] = useState<string | null>(null);

    const run = async (prompt: string) => {
        setAsked(prompt);
        setAnswer(null);
        setNote(null);
        try {
            const r = await ask({ action: "ask", prompt, extraContext });
            if (r.unavailable) setNote(r.unavailable);
            else setAnswer(r.text.trim() || "Nothing to add on that one.");
        } catch {
            setNote("The companion couldn't answer just now.");
        }
    };

    return (
        <Card className="bg-brand-soft">
            <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand" aria-hidden="true" />
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            {/* A prompt is a whole sentence and Button never wraps, so on a phone
                these ride a scrolling rail rather than widening the page. */}
            <ul className="no-scrollbar relative -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
                {prompts.map((p) => (
                    <li key={p} className="shrink-0">
                        <Button size="sm" variant="outline" onClick={() => run(p)} disabled={busy || !available}>
                            {p}
                        </Button>
                    </li>
                ))}
            </ul>
            {busy && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                    <Spinner /> Thinking about {asked?.toLowerCase()}
                </p>
            )}
            {note && <p className="mt-3 text-sm text-peach">{note}</p>}
            {answer && (
                <div className="mt-3 rounded-lg bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-caption">{asked}</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-md leading-6">{answer}</p>
                    <p className="mt-2 text-2xs text-caption">Grounded in your directory, communities and mentors — nothing outside Wàfè.</p>
                </div>
            )}
            {!available && <p className="mt-3 text-xs text-caption">The companion needs the backend configured for this build.</p>}
        </Card>
    );
}

/** A labelled row on a detail page: "Phone · +44…". */
export function Detail({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-2.5">
            {icon && <span className="mt-0.5 shrink-0 text-caption">{icon}</span>}
            <div className="min-w-0">
                <div className="text-2xs font-medium uppercase tracking-[0.06em] text-caption">{label}</div>
                <div className="mt-0.5 break-words text-md leading-6">{children}</div>
            </div>
        </div>
    );
}

/** "Kept in touch with 9 of 11" — the ring the dashboard also shows. */
export function InTouchBar({ pct, kept, total }: { pct: number; kept: number; total: number }) {
    return (
        <Card>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Staying in touch</h2>
                    <p className="text-sm text-muted">
                        {kept} of {total} people are current
                    </p>
                </div>
                <span className="font-display text-5xl tabular-nums">{pct}%</span>
            </div>
            <ProgressBar value={pct} className="mt-3" label="People we are current with" />
        </Card>
    );
}

export function GiftMoney({ cents }: { cents: number }) {
    if (!cents) return <span className="text-caption">—</span>;
    return <Money cents={cents} />;
}

export function CallIcon() {
    return <PhoneCall size={14} aria-hidden="true" />;
}
