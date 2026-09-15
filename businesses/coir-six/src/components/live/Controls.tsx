import { useEffect, useState } from "react";
import {
    Captions,
    CaptionsOff,
    Hand,
    HelpCircle,
    LogOut,
    Mic,
    MicOff,
    MonitorUp,
    PhoneOff,
    Smile,
    Sparkles,
    Video,
    VideoOff,
} from "lucide-react";
import { REACTIONS, type LiveRoom, type RoomSnapshot } from "@coir-six/core";
import { cn } from "@/lib/cn";

/**
 * The bar along the bottom of the class.
 *
 * Only the controls that can do something appear: a room with no media
 * (`snap.media === false`) drops the camera and microphone rather than showing
 * buttons that would lie, and screen share is for people who are on stage.
 *
 * Keyboard: M mutes, V is the camera, H is your hand — the three you reach for
 * mid-sentence. They are ignored while you are typing in the chat.
 */

export function Controls({
    snap,
    room,
    onLeave,
    canHost,
    onEnd,
    onAsk,
    blurAvailable,
    captionsAvailable,
}: {
    snap: RoomSnapshot;
    room: LiveRoom;
    onLeave: () => void;
    canHost: boolean;
    onEnd: () => void;
    onAsk: () => void;
    blurAvailable: boolean;
    captionsAvailable: boolean;
}) {
    const me = snap.me;
    const [emoji, setEmoji] = useState(false);
    const onStage = me?.canPublish ?? false;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
            const k = e.key.toLowerCase();
            if (k === "m" && snap.media) void room.setMic(!me?.mic);
            else if (k === "v" && snap.media && onStage) void room.setCamera(!me?.camera);
            else if (k === "h") void room.raiseHand(!me?.handUp);
            else return;
            e.preventDefault();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [me?.camera, me?.handUp, me?.mic, onStage, room, snap.media]);

    return (
        <>
        {/* Why the camera button is greyed out. Saying nothing here reads as a
            broken button rather than a classroom with a front and a back. */}
        {snap.media && !onStage && (
            <p className="mb-2 text-center text-[12px] text-muted">
                {me?.handUp ? "Hand up — the mentor will bring you on when there's a gap." : "Raise your hand to come on stage and turn your camera on."}
            </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-card p-2 shadow-hover">
            {snap.media && (
                <>
                    <Control
                        on={me?.mic ?? false}
                        label={me?.mic ? "Mute (M)" : "Unmute (M)"}
                        onClick={() => void room.setMic(!me?.mic)}
                        icon={me?.mic ? <Mic size={18} /> : <MicOff size={18} />}
                        danger={!me?.mic}
                    />
                    <Control
                        on={me?.camera ?? false}
                        label={!onStage ? "Raise your hand to join the stage first" : me?.camera ? "Turn the camera off (V)" : "Turn the camera on (V)"}
                        onClick={() => void room.setCamera(!me?.camera)}
                        icon={me?.camera ? <Video size={18} /> : <VideoOff size={18} />}
                        danger={!me?.camera}
                        disabled={!onStage}
                    />
                    {onStage && (
                        <Control
                            on={me?.screen ?? false}
                            label={me?.screen ? "Stop sharing" : "Share your screen"}
                            onClick={() => void room.setScreenShare(!me?.screen)}
                            icon={<MonitorUp size={18} />}
                        />
                    )}
                    {/* Blur only means anything while a camera is actually on. */}
                    {onStage && blurAvailable && me?.camera && (
                        <Control
                            on={snap.blurOn}
                            label={snap.blurOn ? "Show your background" : "Blur your background"}
                            onClick={() => void room.setBlur(!snap.blurOn)}
                            icon={<Sparkles size={18} />}
                        />
                    )}
                </>
            )}

            {/* Captions are the host's: one transcription stream per class, not
                one per person. See the caption op in coir-live for why. */}
            {canHost && captionsAvailable && (
                <Control
                    on={snap.captionsOn}
                    label={snap.captionsOn ? "Stop captions" : "Turn captions on for the class"}
                    onClick={() => void room.setCaptions(!snap.captionsOn)}
                    icon={snap.captionsOn ? <Captions size={18} /> : <CaptionsOff size={18} />}
                />
            )}

            {canHost && (
                <Control on={Boolean(snap.question) && !snap.question?.closed} label="Ask the class a question" onClick={onAsk} icon={<HelpCircle size={18} />} />
            )}

            <Control
                on={me?.handUp ?? false}
                label={me?.handUp ? "Lower your hand (H)" : "Raise your hand (H)"}
                onClick={() => void room.raiseHand(!me?.handUp)}
                icon={<Hand size={18} />}
            />

            <div className="relative">
                <Control on={emoji} label="Send a reaction" onClick={() => setEmoji((v) => !v)} icon={<Smile size={18} />} expanded={emoji} />
                {emoji && (
                    <div
                        role="menu"
                        aria-label="Reactions"
                        className="absolute bottom-[calc(100%+8px)] left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-card p-1.5 shadow-app"
                    >
                        {REACTIONS.map((e) => (
                            <button
                                key={e}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    void room.react(e);
                                    setEmoji(false);
                                }}
                                className="grid size-9 place-items-center rounded-full text-[19px] transition-transform hover:scale-110 hover:bg-subtle"
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />

            {canHost ? (
                <button
                    type="button"
                    onClick={onEnd}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-danger px-5 text-[13px] font-semibold text-white transition-colors hover:brightness-95"
                >
                    <PhoneOff size={16} /> End class
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onLeave}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-danger-soft px-5 text-[13px] font-semibold text-danger-ink transition-colors hover:bg-[#f9dcd2]"
                >
                    <LogOut size={16} /> Leave
                </button>
            )}
        </div>
        </>
    );
}

function Control({
    on,
    label,
    onClick,
    icon,
    danger,
    disabled,
    expanded,
}: {
    on: boolean;
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    expanded?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={expanded === undefined ? on : undefined}
            aria-expanded={expanded}
            aria-label={label}
            title={label}
            className={cn(
                "grid size-11 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                on ? "bg-brand text-white hover:bg-brand-hover" : danger ? "bg-danger-soft text-danger-ink hover:bg-[#f9dcd2]" : "bg-page text-ink hover:bg-subtle",
            )}
        >
            {icon}
        </button>
    );
}

/** Thrown emoji, drifting up the middle of the stage and fading out. */
export function Reactions({ snap }: { snap: RoomSnapshot }) {
    if (!snap.reactions.length) return null;
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 overflow-hidden" aria-hidden="true">
            {snap.reactions.map((r, i) => (
                <span
                    key={r.id}
                    className="absolute bottom-2 animate-[cs-float_6s_ease-out_forwards] text-[28px]"
                    style={{ left: `${12 + ((i * 17) % 70)}%` }}
                >
                    {r.emoji}
                </span>
            ))}
        </div>
    );
}
