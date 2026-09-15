import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Circle, Users } from "lucide-react-native";
import {
    filmstripOf,
    longDate,
    peopleLabel,
    stageOf,
    time,
    type JoinOptions,
    type LiveRoom,
} from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Avatar, Button, Card } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { Captions, Controls, Filmstrip, Panel, QuizCard, Tile, useRoomSnapshot } from "@/components/live/Room";
import { registerWebrtcGlobals } from "@/components/live/VideoTrack";

/**
 * A live class.
 *
 * The same room the web app opens — `repo.openLiveRoom` picks the transport and
 * `@coir-six/core` owns the stage rules, the host actions and the chat, so this
 * file is only the phone's way of drawing them.
 *
 * No pre-join camera preview here: `LocalMedia` is a browser thing, and on a
 * phone the real room's own capture starts at join. The lobby still chooses
 * whether to arrive with the microphone and camera on.
 */
export default function RoomScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { c, r } = useTheme();
    const { catalogue, repo } = useData();

    const lesson = useMemo(() => catalogue.liveLessons.find((l) => l.id === id) ?? null, [catalogue.liveLessons, id]);
    const mentor = useMemo(
        () => (lesson ? catalogue.mentors.find((m) => m.id === lesson.mentorId) ?? null : null),
        [catalogue.mentors, lesson],
    );

    const [room, setRoom] = useState<LiveRoom | null>(null);
    const [phase, setPhase] = useState<"lobby" | "joining" | "in">("lobby");
    const [error, setError] = useState<string | null>(null);
    const snap = useRoomSnapshot(room);
    const current = useRef<LiveRoom | null>(null);
    const joinedAt = useRef<number | null>(null);
    const canHost = snap.me?.role === "host";

    const leave = useCallback(async () => {
        const live = current.current;
        if (!live) return;
        current.current = null;
        await live.disconnect().catch(() => {});
        if (lesson && joinedAt.current) {
            const seconds = (Date.now() - joinedAt.current) / 1000;
            joinedAt.current = null;
            await repo.leaveLive(lesson.id, seconds).catch(() => {});
        }
        router.back();
    }, [lesson, repo, router]);

    const join = useCallback(
        async (opts: JoinOptions) => {
            if (!lesson || current.current) return;
            setPhase("joining");
            setError(null);
            // The WebRTC shims must be on globalThis before the SDK connects.
            registerWebrtcGlobals();
            try {
                const live = await repo.openLiveRoom({ lesson, mentor });
                current.current = live;
                setRoom(live);
                await live.connect(opts);
                joinedAt.current = Date.now();
                setPhase("in");
            } catch (e) {
                current.current = null;
                setRoom(null);
                setPhase("lobby");
                setError(e instanceof Error ? e.message : "We couldn't get you into the class.");
            }
        },
        [lesson, mentor, repo],
    );

    // The host ended it, or the connection is gone for good.
    useEffect(() => {
        if (phase === "in" && snap.status === "ended") void leave();
    }, [leave, phase, snap.status]);

    // Backgrounding the app or navigating away must still close the register.
    useEffect(
        () => () => {
            void current.current?.disconnect();
            current.current = null;
        },
        [],
    );

    if (!lesson) {
        return (
            <View style={{ flex: 1, backgroundColor: c.page, alignItems: "center", justifyContent: "center", padding: 24 }}>
                <Txt role="h2">That class isn't here</Txt>
                <Txt role="small" align="center" style={{ marginTop: 8 }}>
                    It may have finished, or the link is out of date.
                </Txt>
                <Button style={{ marginTop: 20 }} onPress={() => router.back()}>
                    Back to lessons
                </Button>
            </View>
        );
    }

    if (phase !== "in" || !room) {
        return (
            <Lobby
                title={lesson.title}
                sub={`${longDate(lesson.startsAt)} · ${time(lesson.startsAt)} · ${lesson.durationMin} min`}
                description={lesson.description}
                mentorName={mentor?.name}
                mentorRole={mentor?.role}
                mentorHue={mentor?.hue}
                mentorPhoto={mentor?.photoUrl}
                joining={phase === "joining"}
                error={error}
                onJoin={join}
                onBack={() => router.back()}
            />
        );
    }

    const stage = stageOf(snap);
    const strip = filmstripOf(snap);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: c.page, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, paddingHorizontal: 16 }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable onPress={() => void leave()} accessibilityLabel="Leave the class" hitSlop={8}>
                    <ChevronLeft size={24} color={c.ink} />
                </Pressable>
                <Txt role="h2" numberOfLines={1} style={{ flex: 1 }}>
                    {lesson.title}
                </Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Users size={13} color={c.ink} />
                    <Txt size={12} weight="medium">
                        {snap.participants.length}
                    </Txt>
                </View>
                {snap.recording && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.dangerSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Circle size={11} color={c.danger} fill={c.danger} />
                        <Txt size={12} weight="medium" color={c.dangerInk}>
                            Rec
                        </Txt>
                    </View>
                )}
            </View>

            <View style={{ marginTop: 12, gap: 10 }}>
                {snap.media && stage ? (
                    <View>
                        <Tile p={stage} room={room} big pinned={snap.pinned === stage.identity} canHost={canHost} />
                        <Captions snap={snap} />
                    </View>
                ) : (
                    <Card style={{ aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", borderRadius: r.xl }}>
                        <Txt role="h3" align="center">
                            The class is on the mentor&apos;s stream
                        </Txt>
                        <Txt role="small" align="center" style={{ marginTop: 6 }}>
                            Everything else is here — the chat, the people, your hand.
                        </Txt>
                    </Card>
                )}
                {snap.media && strip.length > 0 && <Filmstrip people={strip} room={room} snap={snap} canHost={canHost} />}
                <QuizCard snap={snap} room={room} canHost={canHost} />
            </View>

            <View style={{ flex: 1, marginTop: 12 }}>
                <Panel snap={snap} room={room} canHost={canHost} />
            </View>

            <View style={{ marginTop: 10 }}>
                <Controls snap={snap} room={room} onLeave={() => void leave()} />
            </View>

            <Txt
                accessibilityLiveRegion="polite"
                style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
            >
                {peopleLabel(snap.participants.length)} in this class.
            </Txt>
        </KeyboardAvoidingView>
    );
}

function Lobby({
    title,
    sub,
    description,
    mentorName,
    mentorRole,
    mentorHue,
    mentorPhoto,
    joining,
    error,
    onJoin,
    onBack,
}: {
    title: string;
    sub: string;
    description: string;
    mentorName?: string;
    mentorRole?: string;
    mentorHue?: Parameters<typeof Avatar>[0]["hue"];
    mentorPhoto?: string;
    joining: boolean;
    error: string | null;
    onJoin: (opts: JoinOptions) => void;
    onBack: () => void;
}) {
    const { c, r } = useTheme();
    const insets = useSafeAreaInsets();
    const [mic, setMic] = useState(true);
    const [cam, setCam] = useState(false);

    const Toggle = ({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) => (
        <Pressable
            onPress={onPress}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            accessibilityLabel={label}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.page, borderRadius: r.lg, paddingHorizontal: 14, paddingVertical: 12 }}
        >
            <Txt size={13} weight="medium">
                {label}
            </Txt>
            <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: on ? c.brand : c.lineStrong, justifyContent: "center", paddingHorizontal: 3 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.white, alignSelf: on ? "flex-end" : "flex-start" }} />
            </View>
        </Pressable>
    );

    return (
        <View style={{ flex: 1, backgroundColor: c.page, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
            <Pressable onPress={onBack} accessibilityLabel="Back to lessons" hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 }}>
                <ChevronLeft size={18} color={c.muted} />
                <Txt size={13} weight="semibold" color={c.muted}>
                    Lessons
                </Txt>
            </Pressable>

            <Txt role="title">{title}</Txt>
            <Txt role="caption" style={{ marginTop: 4 }}>
                {sub}
            </Txt>

            {mentorName && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 }}>
                    <Avatar name={mentorName} hue={mentorHue ?? "lilac"} src={mentorPhoto} size="md" />
                    <View>
                        <Txt size={14} weight="medium">
                            {mentorName}
                        </Txt>
                        <Txt role="caption">{mentorRole}</Txt>
                    </View>
                </View>
            )}

            <Txt role="small" style={{ marginTop: 16 }}>
                {description}
            </Txt>

            <View style={{ gap: 10, marginTop: 24 }}>
                <Toggle on={mic} onPress={() => setMic((v) => !v)} label="Join with your microphone on" />
                <Toggle on={cam} onPress={() => setCam((v) => !v)} label="Join with your camera on" />
            </View>

            {error && (
                <View style={{ marginTop: 16, backgroundColor: c.dangerSoft, borderRadius: r.lg, padding: 12 }}>
                    <Txt size={13} color={c.dangerInk}>
                        {error}
                    </Txt>
                </View>
            )}

            <Button block size="lg" style={{ marginTop: 24 }} loading={joining} onPress={() => onJoin({ mic, camera: cam })}>
                {joining ? "Joining…" : "Join the class"}
            </Button>
        </View>
    );
}
