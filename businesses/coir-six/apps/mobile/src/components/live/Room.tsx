import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FlatList, Pressable, ScrollView, TextInput, View } from "react-native";
import {
    Hand,
    Mic,
    MicOff,
    Pin,
    PinOff,
    Send,
    Smile,
    Video as VideoIcon,
    VideoOff,
    WifiOff,
} from "lucide-react-native";
import {
    EMPTY_SNAPSHOT,
    REACTIONS,
    groupChat,
    peopleLabel,
    time,
    type LiveParticipant,
    type LiveRoom,
    type RoomSnapshot,
} from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { Avatar, Button, Card, EmptyState } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { VideoTrack } from "./VideoTrack";

/**
 * The classroom, on a phone.
 *
 * Same `LiveRoom` from `@coir-six/core` as the web app — the transport, the
 * stage rules and the host actions are shared; only the rendering differs.
 * A phone has room for the stage or the lists, not both, so the participants
 * and the chat live behind two tabs under the filmstrip rather than in a rail.
 */

export function useRoomSnapshot(room: LiveRoom | null): RoomSnapshot {
    const subscribe = useCallback((fn: () => void) => room?.subscribe(fn) ?? (() => {}), [room]);
    const get = useCallback(() => room?.snapshot() ?? EMPTY_SNAPSHOT, [room]);
    return useSyncExternalStore(subscribe, get);
}

// ── tiles ───────────────────────────────────────────────────────────────────

export function Tile({
    p,
    room,
    big,
    pinned,
    canHost,
}: {
    p: LiveParticipant;
    room: LiveRoom;
    big?: boolean;
    pinned?: boolean;
    canHost?: boolean;
}) {
    const { c, r } = useTheme();
    const source = p.screen ? "screen" : "camera";
    const track = (p.screen || p.camera) && room.hasTrack(p.identity, source) ? room.trackOf(p.identity, source) : null;

    return (
        <View
            style={{
                borderRadius: r.xl,
                overflow: "hidden",
                backgroundColor: c.subtle,
                aspectRatio: big ? 16 / 9 : 4 / 3,
                borderWidth: p.speaking ? 2 : 0,
                borderColor: c.brand,
            }}
        >
            {track ? (
                <VideoTrack track={track} mirror={p.isLocal && !p.screen} style={{ flex: 1 }} />
            ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Avatar name={p.name} hue={p.hue} src={p.photoUrl} px={big ? 96 : 44} />
                </View>
            )}

            {p.role === "host" && (
                <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(27,27,35,0.85)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Txt size={10} weight="semibold" color={c.white} style={{ letterSpacing: 0.4 }}>
                        HOST
                    </Txt>
                </View>
            )}

            {/* Pin and microphone, mirroring the two floating circles on the web. */}
            <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 8 }}>
                <Pressable
                    onPress={() => room.pin(p.identity)}
                    accessibilityRole="button"
                    accessibilityLabel={pinned ? `Unpin ${p.name}` : `Pin ${p.name}`}
                    hitSlop={6}
                    style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: pinned ? c.brand : c.card }}
                >
                    {pinned ? <PinOff size={14} color={pinned ? c.white : c.brand} /> : <Pin size={14} color={c.brand} />}
                </Pressable>

                <Pressable
                    disabled={!canHost || p.isLocal || !p.mic}
                    onPress={() => void room.muteParticipant(p.identity)}
                    accessibilityRole={canHost && !p.isLocal && p.mic ? "button" : "image"}
                    accessibilityLabel={p.mic ? `${p.name}'s microphone is on` : `${p.name} is muted`}
                    hitSlop={6}
                    style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: p.mic ? c.brand : c.card }}
                >
                    {p.mic ? <Mic size={14} color={c.white} /> : <MicOff size={14} color={c.muted} />}
                </Pressable>
            </View>

            <View style={{ position: "absolute", bottom: 10, left: 10, maxWidth: "88%", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                {p.handUp && <Hand size={12} color={c.peach} />}
                <Txt size={12} weight="semibold" numberOfLines={1}>
                    {p.name}
                    {p.isLocal ? " (You)" : ""}
                </Txt>
                {p.connection === "poor" && <WifiOff size={11} color={c.danger} />}
            </View>
        </View>
    );
}

// ── the two lists ───────────────────────────────────────────────────────────

export function People({ snap, room, canHost }: { snap: RoomSnapshot; room: LiveRoom; canHost: boolean }) {
    const { c } = useTheme();
    return (
        <View>
            {snap.participants.map((p) => (
                <View key={p.identity} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
                    <Avatar name={p.name} hue={p.hue} src={p.photoUrl} size="md" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Txt size={14} weight="medium" numberOfLines={1}>
                                {p.name}
                            </Txt>
                            {p.isLocal && <Txt role="caption">(Me)</Txt>}
                            {p.handUp && <Hand size={12} color={c.peach} />}
                        </View>
                        {p.role !== "learner" && (
                            <Txt role="caption" style={{ textTransform: "capitalize" }}>
                                {p.role}
                            </Txt>
                        )}
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {p.camera ? <VideoIcon size={14} color={c.brand} /> : <VideoOff size={14} color={c.muted} />}
                        <Pressable
                            disabled={!canHost || p.isLocal || !p.mic}
                            onPress={() => void room.muteParticipant(p.identity)}
                            accessibilityLabel={p.mic ? `Mute ${p.name}` : `${p.name} is muted`}
                            hitSlop={8}
                        >
                            {p.mic ? <Mic size={14} color={c.brand} /> : <MicOff size={14} color={c.muted} />}
                        </Pressable>
                        {canHost && !p.isLocal && (
                            <Pressable onPress={() => void room.setStage(p.identity, !p.canPublish)} hitSlop={8} accessibilityLabel={p.canPublish ? `Take ${p.name} off stage` : `Bring ${p.name} on stage`}>
                                <Txt size={12} weight="semibold" color={c.brand}>
                                    {p.canPublish ? "Off stage" : "On stage"}
                                </Txt>
                            </Pressable>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
}

export function Chat({ snap, room }: { snap: RoomSnapshot; room: LiveRoom }) {
    const { c, r } = useTheme();
    const [draft, setDraft] = useState("");
    const feed = useRef<ScrollView>(null);
    const groups = groupChat(snap.chat);

    useEffect(() => {
        feed.current?.scrollToEnd({ animated: true });
    }, [snap.chat]);

    const send = () => {
        const body = draft.trim();
        if (!body) return;
        setDraft("");
        void room.sendChat(body);
    };

    return (
        <View style={{ flex: 1, minHeight: 240 }}>
            <ScrollView ref={feed} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                {groups.length === 0 ? (
                    <EmptyState title="No messages yet" body="Say hello — the class can see it." />
                ) : (
                    <View style={{ gap: 12 }}>
                        {groups.map((run) => (
                            <View key={run[0].id} style={{ flexDirection: "row", gap: 10 }}>
                                <Avatar name={run[0].name} hue={run[0].hue} src={run[0].photoUrl} size="xs" style={{ marginTop: 16 }} />
                                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                                    <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}>
                                        <Txt size={11} weight="semibold" color={c.caption} numberOfLines={1}>
                                            {run[0].mine ? "You" : run[0].name}
                                        </Txt>
                                        <Txt size={11} color={c.muted}>
                                            {time(run[0].createdAt)}
                                        </Txt>
                                    </View>
                                    {run.map((m) => (
                                        <View
                                            key={m.id}
                                            style={{ alignSelf: "flex-start", maxWidth: "100%", borderRadius: r.lg, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: m.mine ? c.brand : c.page }}
                                        >
                                            <Txt size={13} lineHeight={18} color={m.mine ? c.white : c.ink}>
                                                {m.body}
                                            </Txt>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    onSubmitEditing={send}
                    returnKeyType="send"
                    placeholder="Message the class…"
                    placeholderTextColor={c.muted}
                    maxLength={500}
                    accessibilityLabel="Message the class"
                    style={{ flex: 1, height: 42, borderRadius: 21, backgroundColor: c.page, paddingHorizontal: 16, fontSize: 13, color: c.ink }}
                />
                <Pressable
                    onPress={send}
                    disabled={!draft.trim()}
                    accessibilityLabel="Send message"
                    style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: c.brand, opacity: draft.trim() ? 1 : 0.4 }}
                >
                    <Send size={16} color={c.white} />
                </Pressable>
            </View>
        </View>
    );
}

// ── controls ────────────────────────────────────────────────────────────────

export function Controls({ snap, room, onLeave }: { snap: RoomSnapshot; room: LiveRoom; onLeave: () => void }) {
    const { c, r } = useTheme();
    const me = snap.me;
    const onStage = me?.canPublish ?? false;
    const [emoji, setEmoji] = useState(false);
    const canHost = me?.role === "host";

    const Btn = ({ on, label, onPress, children, disabled }: { on: boolean; label: string; onPress: () => void; children: React.ReactNode; disabled?: boolean }) => (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: on, disabled }}
            style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.brand : c.page, opacity: disabled ? 0.4 : 1 }}
        >
            {children}
        </Pressable>
    );

    return (
        <View style={{ gap: 8 }}>
            {snap.media && !onStage && (
                <Txt role="caption" align="center">
                    {me?.handUp ? "Hand up — the mentor will bring you on when there's a gap." : "Raise your hand to come on stage."}
                </Txt>
            )}

            {emoji && (
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, backgroundColor: c.card, borderRadius: r.xl, padding: 6 }}>
                    {REACTIONS.map((e) => (
                        <Pressable
                            key={e}
                            accessibilityLabel={`React ${e}`}
                            onPress={() => {
                                void room.react(e);
                                setEmoji(false);
                            }}
                            style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                        >
                            <Txt size={22}>{e}</Txt>
                        </Pressable>
                    ))}
                </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.card, borderRadius: r["2xl"], padding: 8 }}>
                {snap.media && (
                    <>
                        <Btn on={me?.mic ?? false} label={me?.mic ? "Mute" : "Unmute"} onPress={() => void room.setMic(!me?.mic)}>
                            {me?.mic ? <Mic size={18} color={c.white} /> : <MicOff size={18} color={c.dangerInk} />}
                        </Btn>
                        <Btn
                            on={me?.camera ?? false}
                            disabled={!onStage}
                            label={me?.camera ? "Turn the camera off" : "Turn the camera on"}
                            onPress={() => void room.setCamera(!me?.camera)}
                        >
                            {me?.camera ? <VideoIcon size={18} color={c.white} /> : <VideoOff size={18} color={c.dangerInk} />}
                        </Btn>
                    </>
                )}
                <Btn on={me?.handUp ?? false} label={me?.handUp ? "Lower your hand" : "Raise your hand"} onPress={() => void room.raiseHand(!me?.handUp)}>
                    <Hand size={18} color={me?.handUp ? c.white : c.ink} />
                </Btn>
                <Btn on={emoji} label="Send a reaction" onPress={() => setEmoji((v) => !v)}>
                    <Smile size={18} color={emoji ? c.white : c.ink} />
                </Btn>

                <Button
                    variant="danger"
                    size="md"
                    onPress={() => (canHost ? void room.endClass() : onLeave())}
                    style={{ marginLeft: 4 }}
                >
                    {canHost ? "End class" : "Leave"}
                </Button>
            </View>
        </View>
    );
}

// ── the tabbed panel under the stage ────────────────────────────────────────

export function Panel({ snap, room, canHost }: { snap: RoomSnapshot; room: LiveRoom; canHost: boolean }) {
    const { c, r } = useTheme();
    const [tab, setTab] = useState<"people" | "chat">("chat");

    return (
        <Card style={{ flex: 1, gap: 12 }}>
            <View style={{ flexDirection: "row", backgroundColor: c.page, borderRadius: r.lg, padding: 4 }}>
                {(["chat", "people"] as const).map((t) => (
                    <Pressable
                        key={t}
                        onPress={() => setTab(t)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: tab === t }}
                        style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: r.sm, backgroundColor: tab === t ? c.card : "transparent" }}
                    >
                        <Txt size={13} weight="semibold" color={tab === t ? c.ink : c.muted}>
                            {t === "chat" ? `Chats${snap.chat.length ? ` (${snap.chat.length})` : ""}` : peopleLabel(snap.participants.length)}
                        </Txt>
                    </Pressable>
                ))}
            </View>

            {tab === "chat" ? <Chat snap={snap} room={room} /> : <People snap={snap} room={room} canHost={canHost} />}
        </Card>
    );
}

/** The filmstrip: one horizontal row, as on the web. */
export function Filmstrip({ people, room, snap, canHost }: { people: LiveParticipant[]; room: LiveRoom; snap: RoomSnapshot; canHost: boolean }) {
    return (
        <FlatList
            horizontal
            data={people}
            keyExtractor={(p) => p.identity}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
                <View style={{ width: 150 }}>
                    <Tile p={item} room={room} pinned={snap.pinned === item.identity} canHost={canHost} />
                </View>
            )}
        />
    );
}
