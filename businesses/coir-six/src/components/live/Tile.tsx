import { useEffect, useRef } from "react";
import { Hand, Mic, MicOff, Pin, PinOff, ScreenShare, Wifi, WifiOff } from "lucide-react";
import type { LiveParticipant, LiveRoom } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/primitives";

/**
 * One person's tile.
 *
 * The design puts the name on a white pill in the bottom-left and floats two
 * circular controls in the top-right — pin, and the microphone. Everything
 * else (hand, screen share, a failing connection) is a small badge, because a
 * tile that shouts about its own state stops being a picture of a person.
 *
 * When there is no video — camera off, or a room that carries no media at all —
 * the tile falls back to the avatar on its tint, which is what most of a
 * 24-person class looks like most of the time.
 */

export function Tile({
    p,
    room,
    big,
    pinned,
    canHost,
    onMute,
    className,
}: {
    p: LiveParticipant;
    room: LiveRoom;
    big?: boolean;
    pinned?: boolean;
    canHost?: boolean;
    onMute?: () => void;
    className?: string;
}) {
    const source = p.screen ? "screen" : "camera";
    // Both must be true: they turned it on, *and* the track has arrived.
    const showVideo = (p.screen || p.camera) && room.hasTrack(p.identity, source);

    return (
        <div
            className={cn(
                "group relative isolate overflow-hidden rounded-xl bg-backdrop",
                // The speaking ring is the only thing that moves on the grid.
                p.speaking && "ring-2 ring-brand ring-offset-2 ring-offset-page",
                big ? "aspect-video" : "aspect-[4/3]",
                className,
            )}
        >
            {showVideo ? (
                <Video room={room} identity={p.identity} source={source} mirrored={p.isLocal && !p.screen} />
            ) : (
                <div className="grid size-full place-items-center bg-subtle">
                    <Avatar name={p.name} hue={p.hue} src={p.photoUrl} size={big ? "xl" : "lg"} />
                </div>
            )}

            {/* Name pill, bottom-left, exactly as the design places it. */}
            <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-card/95 py-1.5 pl-2 pr-3 shadow-hover backdrop-blur-sm">
                {p.handUp && <Hand size={13} className="shrink-0 text-peach" aria-hidden="true" />}
                {p.screen && <ScreenShare size={13} className="shrink-0 text-brand" aria-hidden="true" />}
                <span className="truncate text-[13px] font-semibold">
                    {p.name}
                    {p.isLocal && <span className="font-normal text-muted"> (You)</span>}
                </span>
                {p.connection === "poor" && <WifiOff size={12} className="shrink-0 text-danger" aria-label="Weak connection" />}
            </div>

            {p.role === "host" && (
                <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.02em] text-white">
                    Host
                </span>
            )}

            {/* The two floating circles from the reference. */}
            {/* On the big tile they stay put, as in the design; on a thumbnail
                they appear on hover so the face isn't covered. */}
            <div
                className={cn(
                    "absolute right-3 top-3 flex items-center gap-2 transition-opacity",
                    big ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100",
                )}
            >
                <button
                    type="button"
                    onClick={() => room.pin(p.identity)}
                    aria-pressed={pinned}
                    aria-label={pinned ? `Unpin ${p.name}` : `Pin ${p.name}`}
                    title={pinned ? "Unpin" : "Pin to the big tile"}
                    className={cn(
                        "grid size-9 place-items-center rounded-full shadow-hover transition-colors",
                        pinned ? "bg-brand text-white" : "bg-card text-brand hover:bg-brand-soft",
                    )}
                >
                    {pinned ? <PinOff size={15} /> : <Pin size={15} />}
                </button>
                <MicBadge p={p} canHost={canHost} onMute={onMute} />
            </div>
        </div>
    );
}

/**
 * The microphone circle. A host can click it to mute someone; for everyone else
 * it is a status light, so it renders as a `<span>` rather than a dead button.
 */
function MicBadge({ p, canHost, onMute }: { p: LiveParticipant; canHost?: boolean; onMute?: () => void }) {
    const on = p.mic;
    const look = on ? "bg-brand text-white" : "bg-card text-muted";
    const icon = on ? <Mic size={15} /> : <MicOff size={15} />;

    if (canHost && !p.isLocal && on) {
        return (
            <button
                type="button"
                onClick={onMute}
                aria-label={`Mute ${p.name}`}
                title={`Mute ${p.name}`}
                className={cn("grid size-9 place-items-center rounded-full shadow-hover transition-colors", look, "hover:bg-danger hover:text-white")}
            >
                {icon}
            </button>
        );
    }
    return (
        <span className={cn("grid size-9 place-items-center rounded-full shadow-hover", look)} title={on ? "Microphone on" : "Muted"}>
            {icon}
            <span className="sr-only">{on ? `${p.name}'s microphone is on` : `${p.name} is muted`}</span>
        </span>
    );
}

/**
 * A `<video>` bound to whatever the room has for this person.
 *
 * The room owns the track; this only lends it an element and takes it back on
 * cleanup. Re-running when `source` or the track flags change is what makes a
 * camera toggle or a screen share land without remounting the tile.
 */
function Video({
    room,
    identity,
    source,
    mirrored,
}: {
    room: LiveRoom;
    identity: string;
    source: "camera" | "screen";
    mirrored?: boolean;
}) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return room.attach(identity, source, el);
    }, [room, identity, source]);

    return (
        <video
            ref={ref}
            autoPlay
            playsInline
            // Never play a tile's own audio through its element: the room mixes
            // remote audio separately, and a local one would be feedback.
            muted
            className={cn("size-full bg-backdrop", source === "screen" ? "object-contain" : "object-cover", mirrored && "-scale-x-100")}
        />
    );
}

/** Remote audio, attached off-screen — the sound of the class, with no tile. */
export function RoomAudio({ room, people }: { room: LiveRoom; people: LiveParticipant[] }) {
    return (
        <div aria-hidden="true" className="sr-only">
            {people
                .filter((p) => !p.isLocal && p.mic)
                .map((p) => (
                    <Audio key={p.identity} room={room} identity={p.identity} />
                ))}
        </div>
    );
}

function Audio({ room, identity }: { room: LiveRoom; identity: string }) {
    const ref = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return room.attach(identity, "audio", el);
    }, [room, identity]);
    // A live WebRTC stream has no caption file to point a <track> at; captions
    // for a class are a transcription feature, not a markup one.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio ref={ref} autoPlay />;
}

export function Wired({ ok }: { ok: boolean }) {
    return ok ? <Wifi size={12} className="text-mint" /> : <WifiOff size={12} className="text-danger" />;
}
