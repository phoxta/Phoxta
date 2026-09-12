import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { clock, relative, type Note } from "@coir-six/core";
import { font, useTheme } from "@/lib/theme";
import { Button, Inset } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";

/** Notes for the lesson on screen. A note taken during a video remembers the timestamp. */
export function NotesPanel({ notes, currentSec, onAdd, onDelete }: { notes: Note[]; currentSec: number | null; onAdd: (body: string, atSec: number | null) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
    const { c, r } = useTheme();
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        const body = draft.trim();
        if (!body) return;
        setBusy(true);
        await onAdd(body, currentSec == null ? null : Math.floor(currentSec));
        setDraft("");
        setBusy(false);
    };
    return (
        <View style={{ gap: 12 }}>
            <View style={{ gap: 8 }}>
                <Txt role="overline" color={c.muted}>
                    New note{currentSec != null ? ` · at ${clock(currentSec)}` : ""}
                </Txt>
                <TextInput accessibilityLabel="New note" value={draft} onChangeText={setDraft} multiline placeholder="What's worth remembering?" placeholderTextColor={c.caption} style={{ minHeight: 84, textAlignVertical: "top", borderWidth: 1, borderColor: c.lineStrong, borderRadius: r.md, backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: 10, fontFamily: font.regular, fontSize: 14, color: c.ink }} />
                <Button size="md" loading={busy} disabled={!draft.trim()} onPress={() => void submit()}>
                    Save note
                </Button>
            </View>
            {notes.length === 0 ? (
                <Inset style={{ alignItems: "center", paddingVertical: 24 }}>
                    <Txt role="small">No notes on this lesson yet.</Txt>
                </Inset>
            ) : (
                <View style={{ gap: 8 }}>
                    {notes.map((n) => (
                        <Inset key={n.id} style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                {n.atSec != null && (
                                    <View style={{ backgroundColor: c.brandSoft, borderRadius: r.xs, paddingHorizontal: 6, paddingVertical: 2 }}>
                                        <Txt role="caption" weight="semibold" color={c.brandInk} size={11} lineHeight={13}>
                                            {clock(n.atSec)}
                                        </Txt>
                                    </View>
                                )}
                                <Txt role="caption" size={11} lineHeight={13}>
                                    {relative(n.createdAt)}
                                </Txt>
                                <Pressable accessibilityRole="button" accessibilityLabel="Delete note" hitSlop={8} onPress={() => void onDelete(n.id)} style={{ marginLeft: "auto" }}>
                                    <Trash2 size={13} color={c.caption} />
                                </Pressable>
                            </View>
                            <Txt size={14} lineHeight={20} style={{ marginTop: 6 }}>
                                {n.body}
                            </Txt>
                        </Inset>
                    ))}
                </View>
            )}
        </View>
    );
}
