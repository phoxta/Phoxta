import { useEffect, useRef, useState } from "react";
import { Hand, Mic, MicOff, MoreHorizontal, Send, Sparkles, Video, VideoOff } from "lucide-react";
import { groupChat, peopleLabel, type LiveParticipant, type LiveRoom, type RoomSnapshot } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { time } from "@coir-six/core";
import { Avatar, Button, EmptyState } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";

/**
 * The right-hand rails: who is here, and what they are saying.
 *
 * Both are lists that grow during a class, so both scroll inside a fixed
 * column rather than pushing the stage around — the stage is the thing you are
 * actually watching.
 */

export function ParticipantsRail({
    snap,
    room,
    canHost,
    onAdd,
}: {
    snap: RoomSnapshot;
    room: LiveRoom;
    canHost: boolean;
    onAdd: () => void;
}) {
    const [all, setAll] = useState(false);
    const hands = snap.participants.filter((p) => p.handUp).length;
    const shown = all ? snap.participants : snap.participants.slice(0, 6);

    return (
        <section aria-labelledby="live-people" className="flex min-h-0 flex-col">
            <header className="flex items-baseline justify-between gap-3 pb-1">
                <h2 id="live-people" className="text-[19px] font-semibold">
                    Participants
                </h2>
                {snap.participants.length > 6 && (
                    <button type="button" onClick={() => setAll((v) => !v)} className="text-[13px] font-semibold text-brand hover:underline">
                        {all ? "Show less" : "View all"}
                    </button>
                )}
            </header>
            <p className="pb-2 text-[12px] text-muted">
                {peopleLabel(snap.participants.length)}
                {hands > 0 && ` · ${hands} ${hands === 1 ? "hand" : "hands"} up`}
            </p>

            <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto">
                {shown.map((p) => (
                    <Row key={p.identity} p={p} room={room} canHost={canHost} spotlit={snap.spotlit === p.identity} />
                ))}
            </ul>

            <Button variant="outline" size="md" block className="mt-3" onClick={onAdd}>
                + Add people
            </Button>
        </section>
    );
}

function Row({ p, room, canHost, spotlit }: { p: LiveParticipant; room: LiveRoom; canHost: boolean; spotlit: boolean }) {
    const hostActions = [
        { label: p.canPublish ? "Take off stage" : "Bring on stage", onSelect: () => void room.setStage(p.identity, !p.canPublish) },
        { label: spotlit ? "Clear spotlight" : "Spotlight for everyone", onSelect: () => void room.spotlight(spotlit ? null : p.identity) },
        { label: "Remove from class", onSelect: () => void room.removeParticipant(p.identity), danger: true },
    ];

    return (
        <li className={cn("flex items-center gap-3 rounded-lg px-2 py-2", p.isLocal && "bg-brand-soft/60")}>
            <span className="relative">
                <Avatar name={p.name} hue={p.hue} src={p.photoUrl} size="md" />
                {p.speaking && <span className="absolute inset-0 rounded-full ring-2 ring-brand" aria-hidden="true" />}
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium">{p.name}</span>
                    {p.isLocal && <span className="shrink-0 text-[13px] text-muted">(Me)</span>}
                    {p.handUp && <Hand size={13} className="shrink-0 text-peach" aria-label="Hand up" />}
                </span>
                {p.role !== "learner" && (
                    <span className="block text-[12px] capitalize text-muted">{p.role}</span>
                )}
            </span>

            {/* Camera and microphone, as in the design. A host can act on them. */}
            <span className="flex shrink-0 items-center gap-1">
                <State
                    on={p.camera}
                    label={p.camera ? `${p.name}'s camera is on` : `${p.name}'s camera is off`}
                    on_={<Video size={14} />}
                    off={<VideoOff size={14} />}
                />
                <State
                    on={p.mic}
                    label={p.mic ? `${p.name}'s microphone is on` : `${p.name} is muted`}
                    on_={<Mic size={14} />}
                    off={<MicOff size={14} />}
                    onClick={canHost && !p.isLocal && p.mic ? () => void room.muteParticipant(p.identity) : undefined}
                    action={`Mute ${p.name}`}
                />
                {canHost && !p.isLocal && (
                    <Menu
                        align="end"
                        items={hostActions}
                        trigger={(props) => (
                            <button
                                {...props}
                                type="button"
                                aria-label={`More options for ${p.name}`}
                                className="grid size-7 place-items-center rounded-full text-muted hover:bg-subtle hover:text-ink"
                            >
                                <MoreHorizontal size={15} />
                            </button>
                        )}
                    />
                )}
            </span>
        </li>
    );
}

/** A status light that becomes a button only when it can actually do something. */
function State({
    on,
    label,
    on_,
    off,
    onClick,
    action,
}: {
    on: boolean;
    label: string;
    on_: React.ReactNode;
    off: React.ReactNode;
    onClick?: () => void;
    action?: string;
}) {
    const look = on ? "text-brand" : "text-muted/70";
    if (onClick) {
        return (
            <button type="button" onClick={onClick} aria-label={action} title={action} className={cn("grid size-7 place-items-center rounded-full hover:bg-danger-soft hover:text-danger-ink", look)}>
                {on ? on_ : off}
            </button>
        );
    }
    return (
        <span className={cn("grid size-7 place-items-center", look)} title={label}>
            {on ? on_ : off}
            <span className="sr-only">{label}</span>
        </span>
    );
}

// ---------------------------------------------------------------------------

export function ChatRail({ snap, room }: { snap: RoomSnapshot; room: LiveRoom }) {
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const feed = useRef<HTMLDivElement>(null);
    const groups = groupChat(snap.chat);

    // Follow the conversation, but only if the reader is already at the bottom —
    // yanking someone away from a message they are reading is worse than a
    // missed scroll.
    useEffect(() => {
        const el = feed.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (atBottom) el.scrollTop = el.scrollHeight;
    }, [snap.chat]);

    const send = async () => {
        const body = draft.trim();
        if (!body || sending) return;
        setSending(true);
        setDraft("");
        try {
            await room.sendChat(body);
        } finally {
            setSending(false);
        }
    };

    return (
        <section aria-labelledby="live-chat" className="flex min-h-0 flex-1 flex-col">
            <h2 id="live-chat" className="pb-2 text-[19px] font-semibold">
                Chats
            </h2>

            <div ref={feed} className="min-h-0 flex-1 overflow-y-auto pr-1" role="log" aria-live="polite" aria-relevant="additions">
                {groups.length === 0 ? (
                    <EmptyState icon={<Sparkles size={18} />} title="No messages yet" body="Say hello — the class can see it." />
                ) : (
                    <ul className="flex flex-col gap-3">
                        {groups.map((run) => (
                            <li key={run[0].id} className="flex gap-2.5">
                                <Avatar name={run[0].name} hue={run[0].hue} src={run[0].photoUrl} size="xs" className="mt-4" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="truncate text-[11px] font-semibold text-caption">{run[0].mine ? "You" : run[0].name}</span>
                                        <span className="shrink-0 text-[11px] text-muted">{time(run[0].createdAt)}</span>
                                    </div>
                                    <div className="mt-1 flex flex-col items-start gap-1">
                                        {run.map((m) => (
                                            <p
                                                key={m.id}
                                                className={cn(
                                                    "max-w-full break-words rounded-lg px-3 py-2 text-[13px] leading-5",
                                                    m.mine ? "bg-brand text-white" : "bg-page text-ink",
                                                )}
                                            >
                                                {m.body}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <form
                className="mt-3 flex items-center gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                }}
            >
                <label htmlFor="live-chat-input" className="sr-only">
                    Message the class
                </label>
                <input
                    id="live-chat-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message the class…"
                    maxLength={500}
                    autoComplete="off"
                    className="h-10 min-w-0 flex-1 rounded-full bg-page px-4 text-[13px] outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand"
                />
                <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="Send message"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
                >
                    <Send size={16} />
                </button>
            </form>
        </section>
    );
}
