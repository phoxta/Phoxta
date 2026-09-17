import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, FileDown, MoreHorizontal, Plus, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Menu } from "@/components/ui/overlay";
import { Button, EmptyState, Field, IconButton, Skeleton, Tag } from "@/components/ui/primitives";
import moodboardsModule from "../module";
import { useCtx } from "../hooks";
import { BASE, boardById, boardStats, boardsICanPinTo, canEditBoard, canPinTo, checklistOf, pinsInSection, pinsOf, sectionsOf, tagsOfBoard } from "../derive";
import { BoardLinks, Masonry, PinCard, VisibilityChip } from "../components/pieces";
import { AddPinDialog, BoardDialog, MovePinDialog } from "../components/dialogs";
import { PaletteCard } from "../components/Palette";
import { PartyChecklist } from "../components/PartyChecklist";
import { PrintSheet } from "../components/PrintSheet";
import { KIND_LABEL } from "../types";
import type { MoodboardsRepo, Pin } from "../types";

/**
 * One board.
 *
 * Sections down the page, a masonry inside each, and every control the person
 * looking is actually allowed to use — nothing more. A reader sees a clean
 * board and a line telling them why they can see it; someone named on it gets
 * the add button, the comments and the ordering; a parent gets the settings,
 * the export and, on a child's board, the "I've seen this" stamp.
 *
 * Ordering is drag-and-drop for a mouse AND a pair of move commands in each
 * pin's menu, because a board that can only be arranged by dragging is a board
 * half the household cannot arrange.
 */

export default function BoardPage() {
    const { id = "" } = useParams();
    const { state, mutate, loading, error } = useModule(moodboardsModule);
    const sp = useSpace();
    const ctx = useCtx();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [movingPin, setMovingPin] = useState<Pin | null>(null);
    const [removingPin, setRemovingPin] = useState<Pin | null>(null);
    const [newSection, setNewSection] = useState("");
    const [organise, setOrganise] = useState(false);
    const [tag, setTag] = useState("");
    const [dragId, setDragId] = useState<string | null>(null);

    const board = state ? boardById(state, id) : undefined;
    const tags = useMemo(() => (state && board ? tagsOfBoard(state, board.id) : []), [state, board]);

    if (loading && !state) {
        return (
            <div className="flex flex-col gap-4" aria-busy="true">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-64" />
            </div>
        );
    }
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (!board) {
        return (
            <div>
                <PageTitle title="That board isn't here" sub="It may have been deleted, or it was never shared with you." area="create" />
                <EmptyState title="Nothing to show" body="Boards are shared by name, so a link alone isn't enough." action={<Button onClick={() => navigate(BASE)}>Back to the shelf</Button>} />
            </div>
        );
    }

    const mayPin = canPinTo(board, ctx);
    const mayEdit = canEditBoard(board, ctx);
    const sections = sectionsOf(state, board.id);
    const stats = boardStats(state, board.id);
    const all = pinsOf(state, board.id);
    const filtered = tag ? all.filter((p) => p.tags.includes(tag)) : all;
    const ownerIsChild = sp.members.some((m) => m.id === board.ownerMemberId && m.role === "child");
    const checklist = checklistOf(state, board.id);
    const showChecklist = board.kind === "party" && (sp.role === "parent" || board.ownerMemberId === sp.me.id) && (mayEdit || checklist.length > 0);

    const move = async (pin: Pin, delta: number) => {
        const within = pinsInSection(state, board.id, pin.sectionId ?? null);
        const i = within.findIndex((p) => p.id === pin.id);
        const to = i + delta;
        if (to < 0 || to >= within.length) return;
        await mutate((r) => r.reorderPin(pin.id, pin.sectionId ?? null, to));
    };

    const drop = async (target: Pin) => {
        if (!dragId || dragId === target.id) return setDragId(null);
        const dragged = all.find((p) => p.id === dragId);
        setDragId(null);
        if (!dragged) return;
        const within = pinsInSection(state, board.id, target.sectionId ?? null);
        const to = within.findIndex((p) => p.id === target.id);
        await mutate((r) => r.reorderPin(dragged.id, target.sectionId ?? null, Math.max(0, to)));
    };

    const pinActions = (pin: Pin) => {
        if (!mayPin) return undefined;
        const items = [
            { label: "Move earlier", onSelect: () => void move(pin, -1) },
            { label: "Move later", onSelect: () => void move(pin, 1) },
            ...sections
                .filter((s) => s.id !== pin.sectionId)
                .map((s) => ({ label: `Put in "${s.title}"`, onSelect: () => void mutate((r: MoodboardsRepo) => r.updatePin(pin.id, { sectionId: s.id })) })),
            ...(pin.sectionId ? [{ label: "Take out of its section", onSelect: () => void mutate((r: MoodboardsRepo) => r.updatePin(pin.id, { sectionId: null })) }] : []),
            { label: "Move or copy to another board", onSelect: () => setMovingPin(pin) },
            ...(mayEdit ? [{ label: "Make this the cover", onSelect: () => void mutate((r: MoodboardsRepo) => r.updateBoard(board.id, { coverPinId: pin.id })) }] : []),
            { label: "Remove this pin", onSelect: () => setRemovingPin(pin), danger: true },
        ];
        return (
            <Menu
                trigger={(props) => (
                    <button {...props} type="button" aria-label={`Actions for ${pin.title || "this pin"}`} className="shrink-0 rounded-full p-1 text-caption hover:bg-page hover:text-ink">
                        <MoreHorizontal size={15} aria-hidden="true" />
                    </button>
                )}
                items={items}
            />
        );
    };

    const grid = (pins: Pin[]) => (
        <Masonry>
            {pins.map((p) => (
                <div
                    key={p.id}
                    draggable={mayPin && !tag}
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => {
                        if (dragId) e.preventDefault();
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        void drop(p);
                    }}
                    className={cn("break-inside-avoid", dragId === p.id && "opacity-50")}
                >
                    <PinCard pin={p} state={state} boardId={board.id} actions={pinActions(p)} />
                </div>
            ))}
        </Masonry>
    );

    return (
        <div>
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> All boards
            </Link>

            <PageTitle
                title={board.title}
                sub={board.description || undefined}
                area="create"
                actions={
                    <>
                        {mayPin && (
                            <Button onClick={() => setAdding(true)}>
                                <Plus size={16} aria-hidden="true" /> Add a pin
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setPrinting(true)}>
                            <FileDown size={15} aria-hidden="true" /> Export PDF
                        </Button>
                        {mayEdit && (
                            <IconButton label="Board settings" onClick={() => setEditing(true)}>
                                <Settings2 size={16} />
                            </IconButton>
                        )}
                    </>
                }
            />

            <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Tag tone="create">{KIND_LABEL[board.kind]}</Tag>
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                    <MemberAvatar memberId={board.ownerMemberId} size="xs" showName /> keeps this board
                </span>
                <VisibilityChip board={board} />
                <span className="text-xs text-caption">
                    {stats.pins} pin{stats.pins === 1 ? "" : "s"}
                    {stats.priced ? ` · ${money(stats.totalCents, sp.space.currency)} priced` : ""}
                </span>
                {board.collaboratorIds.length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-caption">
                        with
                        {board.collaboratorIds.slice(0, 4).map((mid) => (
                            <MemberAvatar key={mid} memberId={mid} size="xs" />
                        ))}
                    </span>
                )}
            </div>

            <BoardLinks board={board} className="mb-6" />

            {!mayPin && (
                <Notice tone="info" className="mb-6">
                    {sp.role === "guest"
                        ? "You're reading this board because the family named you on it. To add pins or comments here, a parent switches on \"Pin to moodboards\" for you in their settings."
                        : "You can look at this board. Pinning and commenting are for the people named on it."}
                </Notice>
            )}

            {ownerIsChild && sp.role === "parent" && (
                <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4", board.reviewedAt ? "bg-mint-soft" : "bg-peach-soft")}>
                    <p className="text-sm leading-5">
                        {board.reviewedAt ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-mint">
                                <ShieldCheck size={14} aria-hidden="true" /> You've looked at this board.
                            </span>
                        ) : (
                            <span className="font-semibold text-peach">This is one of the children's boards, and nobody has looked at it yet.</span>
                        )}{" "}
                        A child's board is always marked safe for the family and never hidden from a parent.
                    </p>
                    {!board.reviewedAt && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                                await mutate((r) => r.reviewBoard(board.id));
                                toast("Marked as seen", "success");
                            }}
                        >
                            <Eye size={13} aria-hidden="true" /> Mark seen
                        </Button>
                    )}
                </div>
            )}

            {tags.length > 1 && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    {tags.map((t) => (
                        <button
                            key={t}
                            type="button"
                            aria-pressed={t === tag}
                            onClick={() => setTag(t === tag ? "" : t)}
                            className={cn("h-8 rounded-full border px-3 text-xs font-semibold", t === tag ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                        >
                            {t}
                        </button>
                    ))}
                    {tag && (
                        <button type="button" onClick={() => setTag("")} className="text-xs font-semibold text-brand underline-offset-4 hover:underline">
                            Clear
                        </button>
                    )}
                </div>
            )}

            {stats.placeholders > 0 && mayPin && (
                <Notice tone="warn" className="mb-6">
                    {stats.placeholders} pin{stats.placeholders === 1 ? " is" : "s are"} showing a card instead of a picture — the site wouldn't let us keep the image. Open the pin and press "Try again" to fetch it.
                </Notice>
            )}

            {!all.length ? (
                <EmptyState
                    title="Nothing pinned yet"
                    body={mayPin ? "Start with one picture. A board with three pins is already more useful than a folder of screenshots." : "When someone pins something, it will show up here."}
                    action={mayPin ? <Button onClick={() => setAdding(true)}>Add the first pin</Button> : undefined}
                />
            ) : tag ? (
                <Section title={`Tagged "${tag}"`} action={<span className="text-xs text-caption">{filtered.length} on this board</span>}>
                    {grid(filtered)}
                </Section>
            ) : (
                <>
                    {pinsInSection(state, board.id, null).length > 0 && <Section title={sections.length ? "Everything else" : "Pins"}>{grid(pinsInSection(state, board.id, null))}</Section>}
                    {sections.map((s) => {
                        const inSection = pinsInSection(state, board.id, s.id);
                        return (
                            <Section
                                key={s.id}
                                title={s.title}
                                action={
                                    <span className="flex items-center gap-2">
                                        <span className="text-xs text-caption">{inSection.length}</span>
                                        {mayEdit && organise && (
                                            <>
                                                <IconButton label={`Move "${s.title}" up`} size="sm" onClick={() => void mutate((r) => r.moveSection(s.id, -1))}>
                                                    <ChevronUp size={14} />
                                                </IconButton>
                                                <IconButton label={`Move "${s.title}" down`} size="sm" onClick={() => void mutate((r) => r.moveSection(s.id, 1))}>
                                                    <ChevronDown size={14} />
                                                </IconButton>
                                                <IconButton label={`Remove "${s.title}"`} size="sm" onClick={() => void mutate((r) => r.removeSection(s.id))}>
                                                    <Trash2 size={14} />
                                                </IconButton>
                                            </>
                                        )}
                                    </span>
                                }
                            >
                                {inSection.length ? (
                                    grid(inSection)
                                ) : (
                                    <p className="rounded-lg bg-card px-4 py-6 text-center text-sm text-muted">Nothing in this section yet.</p>
                                )}
                            </Section>
                        );
                    })}
                </>
            )}

            {mayEdit && (
                <Section title="Sections" action={<button type="button" onClick={() => setOrganise((v) => !v)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">{organise ? "Done" : "Organise"}</button>}>
                    <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const title = newSection.trim();
                            if (!title) return;
                            setNewSection("");
                            await mutate((r) => r.addSection(board.id, title));
                        }}
                    >
                        <Field label="New section" value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="Lighting" className="min-w-[220px] flex-1" />
                        <Button type="submit" variant="outline" disabled={!newSection.trim()}>
                            Add section
                        </Button>
                    </form>
                </Section>
            )}

            <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                <PaletteCard board={board} state={state} />
                {showChecklist && <PartyChecklist board={board} state={state} canEdit={mayEdit} mutate={mutate} />}
            </div>

            {mayEdit && (
                <div className="mt-10 border-t border-line pt-5">
                    <button type="button" onClick={() => setDeleting(true)} className="text-sm font-semibold text-danger-ink underline-offset-4 hover:underline">
                        Delete this board
                    </button>
                </div>
            )}

            <AddPinDialog
                open={adding}
                onClose={() => setAdding(false)}
                board={board}
                sections={sections}
                state={state}
                onSave={async (input) => {
                    await mutate((r) => r.addPin(input));
                    toast("Pinned", "success");
                }}
            />
            <BoardDialog open={editing} onClose={() => setEditing(false)} board={board} onSave={async (input) => void (await mutate((r) => r.updateBoard(board.id, input)))} />
            {movingPin && (
                <MovePinDialog
                    open
                    onClose={() => setMovingPin(null)}
                    boards={boardsICanPinTo(state, ctx)}
                    currentBoardId={board.id}
                    onMove={async (to) => {
                        await mutate((r) => r.movePin(movingPin.id, to));
                        toast("Moved", "success");
                    }}
                    onCopy={async (to) => {
                        await mutate((r) => r.copyPin(movingPin.id, to));
                        toast("Copied", "success");
                    }}
                />
            )}
            <Confirm
                open={Boolean(removingPin)}
                title="Remove this pin?"
                body={removingPin ? `"${removingPin.title || "Untitled"}" and its comments will go.` : undefined}
                confirmLabel="Remove"
                danger
                onClose={() => setRemovingPin(null)}
                onConfirm={async () => {
                    if (removingPin) await mutate((r) => r.removePin(removingPin.id));
                }}
            />
            <Confirm
                open={deleting}
                title={`Delete "${board.title}"?`}
                body="Every pin, comment and section on it goes too. This can't be undone."
                confirmLabel="Delete the board"
                danger
                onClose={() => setDeleting(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeBoard(board.id));
                    navigate(BASE);
                }}
            />
            {printing && <PrintSheet board={board} state={state} onClose={() => setPrinting(false)} />}
        </div>
    );
}
