import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { longDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, PageTitle } from "@/components/shared";
import { Button, EmptyState, Tag } from "@/components/ui/primitives";
import homeModule from "../module";
import { EMPTY_HOME, checkInsFor, moodEmoji, moodLabel, streakFor } from "../derive";
import { MoodHearts } from "../components/bits";

/**
 * Every evening, kept.
 *
 * A check-in is worth writing because it is worth re-reading: a month of them
 * is the honest record of how a season actually felt. Parents can open any
 * member's; everyone else only their own, which is enforced in the repo, not
 * in this component.
 */
export default function ReflectionsPage() {
    const { memberId = "" } = useParams();
    const sp = useSpace();
    const { state: loaded, mutate } = useModule(homeModule);
    const state = loaded ?? EMPTY_HOME;
    const { toast } = useToast();
    const [pending, setPending] = useState<string | null>(null);

    const member = sp.members.find((m) => m.id === memberId);
    const allowed = sp.role === "parent" || memberId === sp.me.id;
    const rows = allowed ? checkInsFor(state, memberId) : [];
    const first = member?.name.split(" ")[0] ?? "This member";

    if (!member || !allowed) {
        return (
            <div>
                <PageTitle title="Check-ins" area="home" />
                <EmptyState
                    title={member ? "These are private" : "We couldn't find that member"}
                    body={member ? `Only ${first} and a parent can read ${first}'s check-ins.` : "The link may be from an older version of the family."}
                    action={
                        <Link to="/" className="text-sm font-semibold text-brand underline underline-offset-4">
                            Back to Home
                        </Link>
                    }
                />
            </div>
        );
    }

    const streak = streakFor(state, memberId, sp.today);

    return (
        <div>
            <PageTitle
                title={memberId === sp.me.id ? "Your check-ins" : `${first}'s check-ins`}
                sub={rows.length ? `${rows.length} evening${rows.length === 1 ? "" : "s"} kept${streak > 1 ? ` · ${streak} in a row right now` : ""}` : undefined}
                area="home"
                actions={<MemberAvatar member={member} size="md" showName />}
            />

            {rows.length === 0 ? (
                <EmptyState
                    title="No check-ins yet"
                    body={memberId === sp.me.id ? "The evening check-in takes about a minute: mood, one thing you're grateful for, and what's left over." : `${first} hasn't checked in yet.`}
                    action={
                        <Link to="/" className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white">
                            Go to Home
                        </Link>
                    }
                />
            ) : (
                <ul className="space-y-3">
                    {rows.map((c) => (
                        <li key={c.id} className="rounded-xl bg-card p-4 md:p-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-3xl leading-none" aria-hidden="true">
                                    {moodEmoji(c.mood)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-base font-semibold">{longDate(`${c.date}T12:00:00`)}</h2>
                                    <p className="text-xs text-caption">{moodLabel(c.mood)}</p>
                                </div>
                                <MoodHearts value={c.mood} size="sm" />
                                {(sp.role === "parent" || c.memberId === sp.me.id) && (
                                    <Button variant="ghost" size="sm" onClick={() => setPending(c.id)} aria-label={`Delete the check-in for ${longDate(`${c.date}T12:00:00`)}`}>
                                        <Trash2 size={14} aria-hidden="true" />
                                    </Button>
                                )}
                            </div>

                            {c.gratitude && <p className="mt-3 text-base leading-7">Grateful for {c.gratitude}.</p>}
                            {c.prayer && <p className="mt-1.5 text-md leading-6 text-muted">Praying: {c.prayer}</p>}

                            {c.decisions.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-1.5">
                                    {c.decisions.map((d) => (
                                        <li key={d.taskId}>
                                            <Tag tone={d.action === "drop" ? "danger" : d.action === "delegate" ? "brand" : "warn"}>
                                                {d.title} — {d.note}
                                            </Tag>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {c.summary && <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-muted">{c.summary}</p>}
                        </li>
                    ))}
                </ul>
            )}

            <Confirm
                open={Boolean(pending)}
                title="Delete this check-in?"
                body="The evening it recorded goes with it. This can't be undone."
                confirmLabel="Delete"
                danger
                onClose={() => setPending(null)}
                onConfirm={async () => {
                    if (!pending) return;
                    await mutate((r) => r.deleteCheckIn(pending));
                    toast("Check-in deleted");
                }}
            />
        </div>
    );
}
