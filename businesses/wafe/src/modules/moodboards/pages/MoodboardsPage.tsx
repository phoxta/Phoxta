import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, LayoutGrid, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { EmptyModule, MemberAvatar, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, EmptyState, SearchBox, Skeleton } from "@/components/ui/primitives";
import moodboardsModule from "../module";
import { useCtx } from "../hooks";
import { BASE, boardStats, boardsICanPinTo, canCreateBoard, liveBoards, pinsWithTag, tagCounts, unreviewedChildBoards } from "../derive";
import { BoardTile, Masonry, PinCard, TagRow } from "../components/pieces";
import { AddPinDialog, BoardDialog } from "../components/dialogs";
import type { Board } from "../types";

/**
 * The shelf.
 *
 * A parent sees every board the family keeps, the tag search that cuts across
 * all of them, and a quiet row of the children's boards with what has and
 * hasn't been looked at. A child sees the boards they may open, in bigger
 * type. A guest sees the one or two boards handed to them by name, and is told
 * plainly that this is all there is — nothing else in this family's space is
 * even fetched.
 */

export default function MoodboardsPage() {
    const { state, mutate, loading, error } = useModule(moodboardsModule);
    const sp = useSpace();
    const { toast } = useToast();
    const [params, setParams] = useSearchParams();
    const [q, setQ] = useState("");
    const [tag, setTag] = useState("");
    const [newOpen, setNewOpen] = useState(false);
    const [pinTo, setPinTo] = useState<Board | null>(null);
    const ctx = useCtx();

    // Quick-add hands us the words somebody typed on Home.
    const quick = params.get("add") ?? "";
    const clearQuick = () => {
        const next = new URLSearchParams(params);
        next.delete("add");
        setParams(next, { replace: true });
    };

    const boards = useMemo(() => {
        if (!state) return [];
        const needle = q.trim().toLowerCase();
        return liveBoards(state)
            .filter((b) => (needle ? `${b.title} ${b.description} ${b.tags.join(" ")}`.toLowerCase().includes(needle) : true))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }, [state, q]);

    if (loading && !state) {
        return (
            <div className="flex flex-col gap-4" aria-busy="true">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
            </div>
        );
    }
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const canPin = boardsICanPinTo(state, ctx);
    const tags = tagCounts(state).slice(0, 16);
    const tagged = tag ? pinsWithTag(state, tag) : [];
    const guest = sp.role === "guest";
    const child = sp.role === "child";

    const quickBar = quick && canPin.length > 0 && (
        <div className="mb-6 rounded-xl bg-create-soft p-4">
            <p className="text-md font-semibold text-create-ink">Pinning "{quick}"</p>
            <p className="mt-0.5 text-sm text-muted">Which board does it belong on?</p>
            <div className="mt-3 flex flex-wrap gap-2">
                {canPin.map((b) => (
                    <button key={b.id} type="button" onClick={() => setPinTo(b)} className="h-9 rounded-full border border-line-strong bg-card px-3.5 text-sm font-semibold hover:border-ink">
                        {b.title}
                    </button>
                ))}
                <button type="button" onClick={clearQuick} className="h-9 rounded-full px-3 text-sm font-semibold text-muted underline-offset-4 hover:underline">
                    Not now
                </button>
            </div>
        </div>
    );

    // ---- Guest: named boards only (AC 7) -----------------------------------
    if (guest) {
        return (
            <div>
                <PageTitle
                    title="Shared with you"
                    sub="The boards this family has named you on. Nothing else of theirs is here — not their other boards, not their tags, not their pictures."
                    area="create"
                />
                {boards.length ? (
                    <>
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {boards.map((b) => (
                                <BoardTile key={b.id} board={b} state={state} />
                            ))}
                        </ul>
                        <Notice tone="info" className="mt-6">
                            You can add pins and comments on a board you've been named on. Everything else here is read-only, by design.
                        </Notice>
                    </>
                ) : (
                    <EmptyState
                        icon={<LayoutGrid size={20} aria-hidden="true" />}
                        title="Nothing has been shared with you yet"
                        body="When the family names you on a board, it will appear here — and only that board."
                    />
                )}
                {pinTo && (
                    <AddPinDialog
                        open
                        onClose={() => {
                            setPinTo(null);
                            clearQuick();
                        }}
                        board={pinTo}
                        sections={[]}
                        defaultTitle={quick}
                        state={state}
                        onSave={async (input) => {
                            await mutate((r) => r.addPin(input));
                            toast("Pinned", "success");
                        }}
                    />
                )}
            </div>
        );
    }

    // ---- Child --------------------------------------------------------------
    if (child) {
        return (
            <div>
                <PageTitle
                    title="Boards"
                    sub="Pictures of the things we're planning. Some are yours, some are the family's."
                    area="create"
                    actions={canCreateBoard(ctx) ? <Button onClick={() => setNewOpen(true)}><Plus size={16} aria-hidden="true" /> New board</Button> : undefined}
                />
                {quickBar}
                {boards.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                        {boards.map((b) => (
                            <BoardTile key={b.id} board={b} state={state} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule title="No boards for you yet" body="When a parent shares one, or starts one with you on it, you'll find it here." />
                )}
                <BoardDialog open={newOpen} onClose={() => setNewOpen(false)} onSave={async (input) => void (await mutate((r) => r.createBoard(input)))} />
                {pinTo && (
                    <AddPinDialog
                        open
                        onClose={() => {
                            setPinTo(null);
                            clearQuick();
                        }}
                        board={pinTo}
                        sections={[]}
                        defaultTitle={quick}
                        state={state}
                        onSave={async (input) => {
                            await mutate((r) => r.addPin(input));
                            toast("Pinned", "success");
                        }}
                    />
                )}
            </div>
        );
    }

    // ---- Parent -------------------------------------------------------------
    const waiting = unreviewedChildBoards(state, ctx);
    const childBoards = state.boards.filter((b) => sp.members.some((m) => m.id === b.ownerMemberId && m.role === "child"));
    const totalPins = state.pins.length;

    return (
        <div>
            <PageTitle
                title="Moodboards & inspiration"
                sub="Pictures of the life we're building — the kitchen, the party, the trip — with the notes, the prices and the people who care about them."
                area="create"
                actions={
                    <Button onClick={() => setNewOpen(true)}>
                        <Plus size={16} aria-hidden="true" /> New board
                    </Button>
                }
            />

            {quickBar}

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Boards" value={boards.length} sub={`${state.sections.length} sections`} tone="create" />
                <Stat label="Pins" value={totalPins} sub={`${state.pins.filter((p) => p.source === "url").length} from the web`} />
                <Stat label="Said out loud" value={state.comments.length} sub="comments and reactions" />
                <Stat label="To look at" value={waiting.length} sub="boards from the children" tone={waiting.length ? "warn" : "neutral"} />
            </div>

            <div className="mb-5">
                <SearchBox value={q} onChange={setQ} placeholder="Search boards…" className="max-w-md" />
            </div>

            {tags.length > 0 && (
                <Section title="Find a pin by tag" action={tag ? <button type="button" onClick={() => setTag("")} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">Clear</button> : undefined}>
                    <TagRow tags={tags} active={tag} onPick={setTag} />
                    {tag && (
                        <div className="mt-4">
                            <p className="mb-3 text-sm text-muted">
                                {tagged.length} pin{tagged.length === 1 ? "" : "s"} tagged "{tag}", across every board you can see.
                            </p>
                            {tagged.length ? (
                                <Masonry>
                                    {tagged.map((p) => (
                                        <PinCard key={p.id} pin={p} state={state} boardId={p.boardId} />
                                    ))}
                                </Masonry>
                            ) : (
                                <EmptyState title="Nothing with that tag" body="Tags are lower-cased when you save them, so try another spelling." />
                            )}
                        </div>
                    )}
                </Section>
            )}

            <Section title="Boards">
                {boards.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {boards.map((b) => (
                            <BoardTile key={b.id} board={b} state={state} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule
                        title={state.boards.length ? "Nothing matches that" : "No boards yet"}
                        body={state.boards.length ? "Try another word, or clear the search." : "A board is anywhere you'd otherwise keep twelve screenshots: a kitchen, a party, a trip, an outfit."}
                        action={<Button onClick={() => setNewOpen(true)}>Start a board</Button>}
                    />
                )}
            </Section>

            {childBoards.length > 0 && (
                <Section title="The children's boards" action={<span className="text-xs text-caption">Child-safe by construction</span>}>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {childBoards.map((b) => {
                            const stats = boardStats(state, b.id);
                            return (
                                <li key={b.id} className={cn("flex items-start gap-3 rounded-xl bg-card p-4", !b.reviewedAt && "ring-1 ring-peach/40")}>
                                    <MemberAvatar memberId={b.ownerMemberId} size="md" />
                                    <div className="min-w-0 flex-1">
                                        <Link to={`${BASE}/${b.id}`} className="block text-base font-semibold hover:underline">
                                            {b.title}
                                        </Link>
                                        <p className="mt-0.5 text-xs text-caption">
                                            {stats.pins} pin{stats.pins === 1 ? "" : "s"} ·{" "}
                                            {b.reviewedAt ? (
                                                <span className="inline-flex items-center gap-1 text-mint">
                                                    <ShieldCheck size={12} aria-hidden="true" /> you've looked at this
                                                </span>
                                            ) : (
                                                <span className="text-peach">not looked at yet</span>
                                            )}
                                        </p>
                                    </div>
                                    {!b.reviewedAt && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                await mutate((r) => r.reviewBoard(b.id));
                                                toast("Marked as seen", "success");
                                            }}
                                        >
                                            <Eye size={13} aria-hidden="true" /> Mark seen
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            <BoardDialog open={newOpen} onClose={() => setNewOpen(false)} onSave={async (input) => void (await mutate((r) => r.createBoard(input)))} />
            {pinTo && (
                <AddPinDialog
                    open
                    onClose={() => {
                        setPinTo(null);
                        clearQuick();
                    }}
                    board={pinTo}
                    sections={state.sections.filter((s) => s.boardId === pinTo.id)}
                    defaultTitle={quick}
                    state={state}
                    onSave={async (input) => {
                        await mutate((r) => r.addPin(input));
                        toast("Pinned", "success");
                    }}
                />
            )}
        </div>
    );
}
