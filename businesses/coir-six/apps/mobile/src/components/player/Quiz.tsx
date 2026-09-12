import { useState } from "react";
import { Pressable, View } from "react-native";
import { Check, X } from "lucide-react-native";
import type { QuizQuestion } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { Button, Card, Inset } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";

/** A module check: pick, submit, see why. Passing is two out of three. */
export function Quiz({ questions, onSubmit, lastScore }: { questions: QuizQuestion[]; onSubmit: (score: number, total: number) => Promise<void>; lastScore?: { score: number; total: number } | null }) {
    const { c, r } = useTheme();
    const [picked, setPicked] = useState<Record<string, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);

    const score = questions.filter((q) => picked[q.id] === q.answer).length;
    const complete = questions.every((q) => picked[q.id] !== undefined);
    const passed = submitted && score / Math.max(1, questions.length) >= 0.66;

    const submit = async () => {
        setBusy(true);
        await onSubmit(score, questions.length);
        setBusy(false);
        setSubmitted(true);
    };

    return (
        <View style={{ gap: 16 }}>
            {lastScore && !submitted && (
                <Inset>
                    <Txt role="small">
                        Last attempt: {lastScore.score}/{lastScore.total}. Retake as often as you like.
                    </Txt>
                </Inset>
            )}
            {questions.map((q, i) => (
                <Card key={q.id} style={{ gap: 12 }}>
                    <Txt role="h3">
                        <Txt role="h3" color={c.caption}>
                            {i + 1}.{" "}
                        </Txt>
                        {q.prompt}
                    </Txt>
                    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
                        {q.options.map((opt, j) => {
                            const chosen = picked[q.id] === j;
                            const state = submitted ? (j === q.answer ? "right" : chosen ? "wrong" : "idle") : chosen ? "picked" : "idle";
                            const border = state === "picked" ? c.brand : state === "right" ? c.mint : state === "wrong" ? c.danger : c.lineStrong;
                            const bg = state === "picked" ? c.brandSoft : state === "right" ? c.mintSoft : state === "wrong" ? c.dangerSoft : c.card;
                            return (
                                <Pressable key={j} accessibilityRole="radio" accessibilityState={{ checked: chosen, disabled: submitted }} disabled={submitted} onPress={() => setPicked((p) => ({ ...p, [q.id]: j }))} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: border, backgroundColor: bg, borderRadius: r.md, paddingHorizontal: 14, paddingVertical: 10 }}>
                                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: chosen || state === "right" ? border : c.lineStrong, alignItems: "center", justifyContent: "center" }}>
                                        {state === "right" ? <Check size={12} color={c.mint} strokeWidth={3} /> : state === "wrong" ? <X size={12} color={c.danger} strokeWidth={3} /> : chosen ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.brand }} /> : null}
                                    </View>
                                    <Txt size={14} lineHeight={19} style={{ flex: 1 }}>
                                        {opt}
                                    </Txt>
                                </Pressable>
                            );
                        })}
                    </View>
                    {submitted && <Txt role="small">{q.explanation}</Txt>}
                </Card>
            ))}
            {submitted ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, borderRadius: r.xl, padding: 16, backgroundColor: passed ? c.mintSoft : c.peachSoft }}>
                    <Txt weight="semibold" size={16} lineHeight={21} color={passed ? c.mint : c.peach} style={{ flex: 1 }}>
                        {score}/{questions.length} — {passed ? "passed. Lesson complete." : "not quite. Two out of three passes."}
                    </Txt>
                    {!passed && (
                        <Button
                            variant="outline"
                            size="md"
                            onPress={() => {
                                setPicked({});
                                setSubmitted(false);
                            }}
                        >
                            Try again
                        </Button>
                    )}
                </View>
            ) : (
                <Button onPress={() => void submit()} disabled={!complete} loading={busy}>
                    Submit answers
                </Button>
            )}
        </View>
    );
}
