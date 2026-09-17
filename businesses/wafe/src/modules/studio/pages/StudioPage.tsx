import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Image as ImageIcon, MessageSquarePlus, Music, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { relative } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, Tag } from "@/components/ui/primitives";
import studioModule from "../module";
import { useCompanion, drawerThread } from "../useCompanion";
import { BASE, conversations, gallery, lastMessage, pendingProposals } from "../derive";
import { Composer, ContextPanel, ProposalCard, Thinking, Turn } from "../components/companion";
import { GalleryCard, UsageMeter } from "../components/studio";
import type { PlanTier, StudioItem } from "../types";

/**
 * The studio's front door — the companion as a full page, and the four doors
 * into what it can make.
 *
 * The chat here is the same flow as the side panel, with the room to show what
 * the panel cannot: the sources under every answer, the proposal cards waiting
 * on a yes, the pack the answer was built from, and — for a parent — what the
 * children have been asking. A child sees the same companion in their own
 * words, with a picker instead of a keyboard under eleven. A guest sees the
 * things the family shared and no companion at all: they were granted named
 * objects, not a module.
 */

const GENERATORS: Array<{ to: string; title: string; body: string; icon: typeof Music; child: string }> = [
    { to: `${BASE}/songs`, title: "Write a song", body: "Lyrics, a chord chart and a key — a real lead sheet you can sing from tonight.", icon: Music, child: "Make a song we can sing" },
    { to: `${BASE}/stories`, title: "Make a storyboard", body: "Six scenes with pictures and narration, and a Present mode for after dinner.", icon: Sparkles, child: "Make a story" },
    { to: `${BASE}/images`, title: "Make a picture", body: "A picture from a description — or, when the plan has no image model, your words set properly.", icon: ImageIcon, child: "Make a picture" },
    { to: `${BASE}/gallery`, title: "The gallery", body: "Everything the family has made, newest first — share it, rename it, keep it.", icon: Wand2, child: "See everything we made" },
];

export default function StudioPage() {
    const { state, mutate, loading, error } = useModule(studioModule);
    const { me, role, members, space } = useSpace();
    const companion = useCompanion("studio");
    const endRef = useRef<HTMLDivElement>(null);
    const [showHistory, setShowHistory] = useState(false);

    const child = role === "child";
    const guest = role === "guest";

    useEffect(() => {
        if (companion.thread.length) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, [companion.thread.length, companion.busy]);

    const proposals = useMemo(() => (state ? pendingProposals(state) : []), [state]);
    const made = useMemo(() => (state ? gallery(state) : []), [state]);
    const kidChats = useMemo(() => {
        if (!state || role !== "parent") return [];
        const kids = new Set(members.filter((m) => m.role === "child").map((m) => m.id));
        return conversations(state).filter((c) => kids.has(c.memberId));
    }, [state, members, role]);
    const panel = useMemo(() => (guest ? [] : drawerThread(me.id).slice(-4)), [guest, me.id]);

    if (loading && !state) return <p className="text-md text-muted">Opening the studio…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    // ---- Guest ------------------------------------------------------------
    if (guest) {
        return (
            <div>
                <PageTitle
                    title="What the family has made"
                    sub={`${space.name} shared these with you. The companion, the gallery and everybody's conversations stay with them.`}
                    area="create"
                />
                {made.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {made.map((item) => (
                            <GalleryCard key={item.id} item={item} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule title="Nothing has been shared with you yet" body="When the family shares a song or a story, it appears here — and you can read, sing and watch it." />
                )}
            </div>
        );
    }

    // ---- Parent and child --------------------------------------------------
    const greeting = child ? `Hi ${me.name.split(" ")[0]}! What shall we make?` : `Ask me about ${space.name.replace(/^The\s+/i, "")}`;

    return (
        <div>
            <PageTitle
                title={child ? "Your companion" : "The companion & the studio"}
                sub={
                    child
                        ? "Ask me about your day, your jobs and your verse — then make a song, a story or a picture."
                        : "One companion, grounded in this family's own data: it answers with the sources it read, it says when it cannot see something, and it never writes a thing without asking you first."
                }
                area="create"
                actions={
                    companion.thread.length > 0 ? (
                        <Button variant="outline" size="md" onClick={companion.fresh}>
                            <MessageSquarePlus size={15} aria-hidden="true" /> New conversation
                        </Button>
                    ) : undefined
                }
            />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                {/* ---- the conversation ---- */}
                <div className="min-w-0">
                    <Card className="flex min-h-[420px] flex-col p-5">
                        {companion.thread.length === 0 ? (
                            <div className="mb-4">
                                <h2 className={cn("font-display leading-8", child ? "text-5xl" : "text-4xl")}>{greeting}</h2>
                                <p className="mt-1.5 text-md leading-6 text-muted">
                                    {child
                                        ? "I only know what Wàfè holds for you — your lessons, your jobs, your verse. If I do not know, I will say so."
                                        : "I read only what you can read. Every answer comes with the parts of the app it came from, and anything I suggest waits for your yes."}
                                </p>
                                {child && (
                                    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-ink">
                                        <ShieldCheck size={13} aria-hidden="true" /> Mum and Dad can see what we talk about
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="mb-4 flex-1 space-y-4">
                                {companion.thread.map((m) => (
                                    <Turn key={m.id} message={m} big={child} onDecide={companion.decide} />
                                ))}
                                {companion.busy && <Thinking />}
                                <div ref={endRef} />
                            </div>
                        )}

                        {companion.error && <Notice tone="danger" className="mb-3">{companion.error}</Notice>}
                        {companion.cap.blocked && (
                            <Notice tone="danger" className="mb-3">
                                {companion.cap.message}
                            </Notice>
                        )}
                        {!companion.cap.blocked && companion.cap.warn && (
                            <Notice tone="warn" className="mb-3">
                                {companion.cap.message}
                            </Notice>
                        )}

                        <div className="mt-auto">
                            <Composer chips={companion.chips} canFreeType={companion.canFreeType} busy={companion.busy} onAsk={(q) => void companion.ask(q)} placeholder={child ? "Ask me anything…" : undefined} />
                            {companion.canFreeType && <p className="mt-1.5 px-1 text-2xs text-caption">Enter to send · Shift+Enter for a new line. Wàfè only sees what {me.name.split(" ")[0]} can see.</p>}
                        </div>
                    </Card>

                    {panel.length > 0 && (
                        <Card className="mt-4">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted">Recently in the side panel</h2>
                            <ul className="mt-2 space-y-1.5">
                                {panel.map((m) => (
                                    <li key={m.id} className="text-sm leading-5">
                                        <span className="font-semibold">{m.from === "me" ? me.name.split(" ")[0] : "Wàfè"}</span>
                                        <span className="text-muted"> — {m.text.slice(0, 120)}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-2 text-xs text-caption">Asked from the &ldquo;Ask Wàfè&rdquo; panel. Ask it again here and it is saved as a conversation with its sources.</p>
                        </Card>
                    )}

                    {companion.history.length > 0 && (
                        <Section title={child ? "Things you asked before" : "Your conversations"} className="mt-8" action={<span className="text-xs text-caption">{companion.history.length} saved</span>}>
                            <ul className="rounded-xl bg-card p-1.5">
                                {companion.history.slice(0, showHistory ? undefined : 6).map((c) => {
                                    const last = lastMessage(c);
                                    return (
                                        <li key={c.id}>
                                            <button type="button" onClick={() => companion.open(c)} className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-page">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-md font-medium">{c.title}</span>
                                                    <span className="clamp-2 block text-xs leading-5 text-caption">{last?.text.replace(/\n+/g, " ").slice(0, 120) ?? "Nothing said yet"}</span>
                                                </span>
                                                <span className="shrink-0 text-xs text-caption">{relative(c.createdAt)}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            {companion.history.length > 6 && (
                                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowHistory((v) => !v)}>
                                    {showHistory ? "Show fewer" : `Show all ${companion.history.length}`}
                                </Button>
                            )}
                        </Section>
                    )}
                </div>

                {/* ---- the studio, the meter and the gate ---- */}
                <div className="min-w-0 space-y-6">
                    <Section title={child ? "Make something" : "The studio"} className="mb-0">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            {GENERATORS.map((g) => {
                                const Icon = g.icon;
                                return (
                                    <li key={g.to}>
                                        <Link to={g.to} className="flex h-full items-start gap-3.5 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-create text-white">
                                                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-base font-semibold">{child ? g.child : g.title}</span>
                                                {!child && <span className="mt-0.5 block text-sm leading-5 text-muted">{g.body}</span>}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </Section>

                    {proposals.length > 0 && (
                        <Section title="Waiting on you" className="mb-0">
                            <div className="space-y-3">
                                {proposals.map(({ conversationId, proposal }) => (
                                    <ProposalCard key={proposal.id} proposal={proposal} onDecide={(status) => mutate((r) => r.decideProposal(conversationId, proposal.id, status))} className="mt-0" />
                                ))}
                            </div>
                        </Section>
                    )}

                    {!child && <UsageMeter state={state} onPlan={role === "parent" ? (plan: PlanTier) => mutate((r) => r.setPlan(plan)) : undefined} />}

                    {!child && <ContextPanel pack={companion.pack} />}

                    {kidChats.length > 0 && (
                        <Section title="What the children asked" className="mb-0">
                            <p className="mb-3 text-sm leading-5 text-muted">A child&apos;s conversations are open to their parents by default, and they are told so before they type. Nobody else in the family can read them.</p>
                            <ul className="rounded-xl bg-card p-1.5">
                                {kidChats.slice(0, 8).map((c) => (
                                    <ChildChatRow key={c.id} chat={c} />
                                ))}
                            </ul>
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChildChatRow({ chat }: { chat: Extract<StudioItem, { kind: "chat" }> }) {
    const last = lastMessage(chat);
    const flagged = chat.data.messages.some((m) => m.blocked === "safety");
    return (
        <li>
            <Link to={`${BASE}/gallery/${chat.id}`} className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-page">
                <MemberAvatar memberId={chat.memberId} size="xs" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-md font-medium">{chat.title}</span>
                    <span className="clamp-2 block text-xs leading-5 text-caption">{last?.text.replace(/\n+/g, " ").slice(0, 110) ?? ""}</span>
                </span>
                {flagged ? (
                    <Tag tone="warn">Needs you</Tag>
                ) : (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-caption">
                        <Eye size={12} aria-hidden="true" /> {relative(chat.createdAt)}
                    </span>
                )}
            </Link>
        </li>
    );
}
