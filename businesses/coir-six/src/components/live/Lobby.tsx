import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Link } from "react-router-dom";
import { longDate, time, type JoinOptions, type LiveLesson, type Mentor, type MediaDeviceOption } from "@coir-six/core";
import { canUseMedia, browserMedia } from "@/lib/media";
import { cn } from "@/lib/cn";
import { Avatar, Button } from "@/components/ui/primitives";

/**
 * The room before the room.
 *
 * Nobody should discover that their camera is pointing at the ceiling in front
 * of a class. This checks the picture, shows the microphone actually picking
 * sound up, and lets the two devices be chosen — then hands those choices to
 * the room so joining does not renegotiate anything.
 *
 * It runs on `browserMedia` directly rather than through the room, because at
 * this point there is no room yet.
 */
export function Lobby({
    lesson,
    mentor,
    media,
    joining,
    error,
    onJoin,
    demo,
    asHost,
    onAsHost,
}: {
    lesson: LiveLesson;
    mentor: Mentor | null;
    media: ReturnType<typeof browserMedia>;
    joining: boolean;
    error: string | null;
    onJoin: (opts: JoinOptions) => void;
    demo: boolean;
    asHost: boolean;
    onAsHost: (on: boolean) => void;
}) {
    const [cam, setCam] = useState(false);
    const [mic, setMic] = useState(true);
    const [devices, setDevices] = useState<MediaDeviceOption[]>([]);
    const [audioInput, setAudioInput] = useState<string>();
    const [videoInput, setVideoInput] = useState<string>();
    const [level, setLevel] = useState(0);
    const [denied, setDenied] = useState(false);
    const preview = useRef<HTMLVideoElement>(null);
    const supported = canUseMedia();

    // Turning the preview on is also how we earn device labels: before
    // permission, `enumerateDevices` returns blank names.
    useEffect(() => {
        let stop: (() => void) | undefined;
        let cancelled = false;
        (async () => {
            if (!cam || !supported) return;
            try {
                await media.enable("camera", videoInput);
                if (cancelled) return;
                setDenied(false);
                stop = media.attach("camera", preview.current);
                setDevices(await media.devices());
            } catch {
                if (!cancelled) {
                    setDenied(true);
                    setCam(false);
                }
            }
        })();
        return () => {
            cancelled = true;
            stop?.();
            if (!cam) media.disable("camera");
        };
    }, [cam, media, supported, videoInput]);

    useEffect(() => {
        if (!cam) return setLevel(0);
        const t = setInterval(() => setLevel(media.level()), 120);
        return () => clearInterval(t);
    }, [cam, media]);

    const cams = devices.filter((d) => d.kind === "videoinput");
    const mics = devices.filter((d) => d.kind === "audioinput");

    return (
        <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
            <div>
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-backdrop">
                    {cam ? (
                        <video ref={preview} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
                    ) : (
                        <div className="grid size-full place-items-center bg-subtle text-center">
                            <div>
                                <VideoOff size={26} className="mx-auto mb-2 text-muted" aria-hidden="true" />
                                <p className="text-[13px] text-muted">{denied ? "Your browser blocked the camera" : "Your camera is off"}</p>
                            </div>
                        </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-3">
                        <Toggle on={mic} onClick={() => setMic((v) => !v)} label={mic ? "Join muted" : "Join with your microphone on"} on_={<Mic size={17} />} off={<MicOff size={17} />} />
                        <Toggle on={cam} onClick={() => setCam((v) => !v)} label={cam ? "Turn the camera off" : "Turn the camera on"} on_={<Video size={17} />} off={<VideoOff size={17} />} />
                    </div>
                </div>

                {/* The level meter: proof the microphone is picking you up. */}
                {cam && (
                    <div className="mt-3 flex items-center gap-2" aria-hidden="true">
                        <Mic size={13} className="text-muted" />
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                            <span className="block h-full rounded-full bg-brand transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
                        </span>
                    </div>
                )}

                {(cams.length > 1 || mics.length > 1) && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {mics.length > 1 && <Picker label="Microphone" options={mics} value={audioInput} onChange={setAudioInput} />}
                        {cams.length > 1 && <Picker label="Camera" options={cams} value={videoInput} onChange={setVideoInput} />}
                    </div>
                )}
            </div>

            <div>
                <Link to="/lessons" className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
                    <ChevronLeft size={15} /> Lessons
                </Link>
                <h1 className="text-[26px] font-semibold leading-tight">{lesson.title}</h1>
                <p className="mt-1 text-[13px] text-muted">
                    {longDate(lesson.startsAt)} · {time(lesson.startsAt)} · {lesson.durationMin} min
                </p>

                {mentor && (
                    <div className="mt-4 flex items-center gap-3">
                        <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="md" />
                        <div>
                            <div className="text-[14px] font-medium">{mentor.name}</div>
                            <div className="text-[12px] text-muted">{mentor.role}</div>
                        </div>
                    </div>
                )}

                <p className="mt-4 text-[13px] leading-5 text-muted">{lesson.description}</p>

                {!supported && (
                    <p className="mt-4 rounded-lg bg-danger-soft p-3 text-[13px] text-danger-ink">
                        This browser can't reach a camera or microphone. You can still join to watch and use the chat.
                    </p>
                )}
                {error && <p className="mt-4 rounded-lg bg-danger-soft p-3 text-[13px] text-danger-ink">{error}</p>}

                <Button
                    size="lg"
                    block
                    className="mt-5"
                    loading={joining}
                    onClick={() => onJoin({ camera: cam, mic, audioInput, videoInput })}
                >
                    {joining ? "Joining…" : "Join the class"}
                </Button>

                {demo && (
                    <div className="mt-4 rounded-lg bg-page p-3">
                        <label htmlFor="join-as-host" className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold">
                            <input
                                id="join-as-host"
                                type="checkbox"
                                checked={asHost}
                                onChange={(e) => onAsHost(e.target.checked)}
                                aria-describedby="join-as-host-hint"
                                className="size-4 accent-[var(--color-brand)]"
                            />
                            Join as the mentor
                        </label>
                        <p id="join-as-host-hint" className="mt-1 pl-[26px] text-[12px] text-muted">
                            See the host's controls — mute, spotlight, recorder.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Toggle({ on, onClick, label, on_, off }: { on: boolean; onClick: () => void; label: string; on_: React.ReactNode; off: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={on}
            aria-label={label}
            title={label}
            className={cn("grid size-11 place-items-center rounded-full shadow-hover transition-colors", on ? "bg-card text-ink hover:bg-subtle" : "bg-danger text-white hover:brightness-95")}
        >
            {on ? on_ : off}
        </button>
    );
}

function Picker({ label, options, value, onChange }: { label: string; options: MediaDeviceOption[]; value?: string; onChange: (v: string) => void }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-caption">{label}</span>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full rounded-sm bg-page px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
                <option value="">Default</option>
                {options.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
