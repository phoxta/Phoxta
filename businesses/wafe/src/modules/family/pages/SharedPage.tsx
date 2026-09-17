import { Link } from "react-router-dom";
import { ArrowRight, Share2 } from "lucide-react";
import { longDate, relative, shortDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { MemberAvatar, PageTitle, Section } from "@/components/shared";
import { Card, EmptyState, Tag } from "@/components/ui/primitives";
import { FamilyNav } from "../components/FamilyNav";
import { sharesFor } from "../derive";
import { useFamily } from "../hooks";
import { SHARE_TYPE } from "../types";

/**
 * What has been shared WITH me.
 *
 * For a guest this is not a settings page, it is the product: Mama Fọláké in
 * Ibadan holds the prayer wall, the Lagos trip, two albums and one birthday,
 * and nothing else in this family exists for her. The same list answers a
 * child who has been given one named thing, and tells a parent — who can see
 * everything anyway — where the whole picture lives.
 */
export default function SharedPage() {
    const sp = useSpace();
    const { state } = useFamily();

    if (!state) return null;
    const mine = sharesFor(state, sp.me.id, sp.today);
    const parent = sp.can("family.manage");

    return (
        <div>
            <PageTitle
                title="Shared with you"
                area="family"
                sub={
                    parent
                        ? "The named things other people in the family have given you. What you have shared with your guests is on Permissions & sharing."
                        : `The named things ${sp.space.name} has given you. Nothing else in this family is visible to you, and nothing else is asked of you.`
                }
                actions={
                    parent ? (
                        <Link to="/family/permissions" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold text-ink transition-colors hover:border-ink">
                            Everything shared <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    ) : undefined
                }
            />
            <FamilyNav />

            {!parent && (
                <Card className="mb-8 bg-family-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-caption">Welcome, {sp.me.name.split(" ")[0]}</p>
                    <p className="mt-2 font-display text-2xl leading-7">{sp.space.name}</p>
                    <p className="mt-1.5 max-w-2xl text-md leading-6 text-muted">{sp.space.mission}</p>
                    <p className="mt-2 text-sm text-caption">{longDate(sp.today)}</p>
                </Card>
            )}

            <Section title={mine.length ? `${mine.length} thing${mine.length === 1 ? "" : "s"} you hold` : "Nothing yet"}>
                {mine.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {mine.map((s) => (
                            <Card as="li" key={s.id} className="flex flex-wrap items-center gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-page text-xl" aria-hidden="true">
                                    {SHARE_TYPE[s.objectType].emoji}
                                </span>
                                <div className="min-w-[160px] flex-1">
                                    <p className="text-base font-semibold">{s.label}</p>
                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-caption">
                                        <span>{SHARE_TYPE[s.objectType].label}</span>
                                        <span>· shared {relative(s.grantedAt)}</span>
                                        {s.expiresAt && <span>· until {shortDate(s.expiresAt)}</span>}
                                    </p>
                                    <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                                        <MemberAvatar memberId={s.grantedBy} size="xs" showName /> shared this with you
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Tag tone={s.level === "contribute" ? "brand" : "neutral"}>{s.level === "contribute" ? "Can join in" : "View only"}</Tag>
                                    {s.href && (
                                        <Link to={s.href} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
                                            Open <ArrowRight size={14} aria-hidden="true" />
                                        </Link>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        icon={<Share2 size={20} aria-hidden="true" />}
                        title={parent ? "Nobody has shared anything with you" : "Nothing has been shared with you yet"}
                        body={
                            parent
                                ? "You can already see the whole family. This page is what a guest sees: the named things they have been given."
                                : "A guest is given named things — a trip, an album, a board, the prayer wall — never a whole module. When the family shares one, it appears here."
                        }
                        action={
                            parent ? (
                                <Link to="/family/permissions" className="text-md font-semibold text-brand underline underline-offset-4">
                                    Share something with a guest
                                </Link>
                            ) : undefined
                        }
                    />
                )}
            </Section>

            {!parent && mine.length > 0 && (
                <p className="text-sm leading-6 text-caption">
                    This is everything. Anything else in {sp.space.name} — money, health, the children's lessons, private prayers — is not loaded for you at all, so it cannot be seen by accident. Ask a parent if you think something is missing.
                </p>
            )}
        </div>
    );
}
