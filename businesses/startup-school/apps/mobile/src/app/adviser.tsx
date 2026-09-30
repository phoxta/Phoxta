import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, ArrowUp, CheckCircle2, Lightbulb, Trash2 } from "lucide-react-native";
import { FRAMEWORKS, STAGE_LABEL, frameworksForStage, type Advice } from "@startup-school/core";
import { readJson, writeJson } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Button, Card, Chip, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

type Turn = { question: string; advice: Advice | null; error?: string };

function AdviceCard({ turn, savedTask, onMakeTask }: { turn: Turn; savedTask: boolean; onMakeTask: () => void }) {
    const { c, r } = useTheme();
    const router = useRouter();
    return (
        <Card style={{ borderWidth: 1, borderColor: c.line, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft }}>
                    <Lightbulb size={15} color={c.brand} />
                </View>
                <Txt weight="semibold" size={15} lineHeight={22} style={{ flex: 1 }}>{turn.question}</Txt>
            </View>
            {!turn.advice && !turn.error ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.page, borderRadius: r.md, padding: 12 }}>
                    <ActivityIndicator color={c.brand} /><Txt role="small">Finding the right framework...</Txt>
                </View>
            ) : turn.error ? (
                <View style={{ backgroundColor: c.dangerSoft, borderRadius: r.md, padding: 12 }}><Txt role="small" color={c.dangerInk}>{turn.error}</Txt></View>
            ) : turn.advice ? (
                <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 14 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <Tag tone={turn.advice.refused ? "warn" : "fund"}>{turn.advice.framework}</Tag>
                        <Txt role="caption">{turn.advice.source}</Txt>
                    </View>
                    <Txt size={15} lineHeight={23}>{turn.advice.answer}</Txt>
                    {turn.advice.nextStep ? (
                        <View style={{ gap: 4, backgroundColor: c.brandSoft, borderRadius: r.md, padding: 14 }}>
                            <Txt role="overline" color={c.brandInk}>YOUR NEXT STEP</Txt>
                            <Txt role="small">{turn.advice.nextStep}</Txt>
                        </View>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                        <Button variant="outline" size="md" disabled={savedTask || !turn.advice.nextStep} icon={savedTask ? <CheckCircle2 size={14} color={c.ink} /> : <ArrowRight size={14} color={c.ink} />} onPress={onMakeTask}>{savedTask ? "Added to actions" : "Make it a task"}</Button>
                        <Pressable accessibilityRole="button" onPress={() => router.push("/venture")} style={{ paddingVertical: 9, paddingHorizontal: 4 }}><Txt weight="semibold" size={13} lineHeight={17} color={c.brand}>Update venture</Txt></Pressable>
                    </View>
                </View>
            ) : null}
        </Card>
    );
}

/** A concise, decision-first AI workspace that preserves its grounded responses on-device. */
export default function AdviserScreen() {
    const { repo, user, mutate } = useData();
    const { toast } = useToast();
    const { c, r } = useTheme();
    const router = useRouter();
    const { draft } = useLocalSearchParams<{ draft?: string }>();
    const [turns, setTurns] = useState<Turn[]>([]);
    const [question, setQuestion] = useState("");
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);
    const [taskTurns, setTaskTurns] = useState<number[]>([]);
    const input = useRef<TextInput>(null);
    const key = `startup-school:adviser:${user.profile.id}`;
    const suggestions = useMemo(() => (frameworksForStage(user.venture.stage).length ? frameworksForStage(user.venture.stage) : FRAMEWORKS).slice(0, 3).map((framework) => framework.question), [user.venture.stage]);
    const ventureReady = Boolean(user.venture.name || user.venture.oneLiner || user.venture.country);

    useEffect(() => { void readJson<Turn[]>(key).then((saved) => { setTurns(Array.isArray(saved) ? saved : []); setReady(true); }); }, [key]);
    useEffect(() => { if (ready) void writeJson(key, turns.slice(-12)); }, [key, ready, turns]);
    useEffect(() => { if (typeof draft === "string" && draft) { setQuestion(draft); setTimeout(() => input.current?.focus(), 0); } }, [draft]);

    const ask = async (value: string) => {
        const text = value.trim();
        if (!text || busy) return;
        setQuestion(""); setBusy(true);
        const index = turns.length;
        setTurns((current) => [...current, { question: text, advice: null }]);
        try {
            const advice = await repo.advise(text);
            setTurns((current) => current.map((turn, i) => i === index ? { ...turn, advice } : turn));
        } catch (error) {
            setTurns((current) => current.map((turn, i) => i === index ? { ...turn, error: error instanceof Error ? error.message : "The adviser is unavailable." } : turn));
        } finally { setBusy(false); input.current?.focus(); }
    };

    const makeTask = async (turn: Turn, index: number) => {
        if (!turn.advice?.nextStep || taskTurns.includes(index)) return;
        const due = new Date(); due.setDate(due.getDate() + 3); due.setHours(18, 0, 0, 0);
        try {
            await mutate((repository) => repository.addTask({ title: turn.advice!.nextStep, courseId: null, dueAt: due.toISOString() }));
            setTaskTurns((current) => [...current, index]);
            toast("Added to your next actions", "success");
        } catch (error) { toast(error instanceof Error ? error.message : "Could not add that task", "danger"); }
    };

    return (
        <Screen header={<Header title="Adviser" />} keyboardAware>
            <PageTitle title="Founder adviser" sub="Turn one real decision into a clear next step." />
            {!ventureReady ? (
                <Card style={{ backgroundColor: c.peachSoft, borderWidth: 1, borderColor: c.peachSoft, gap: 10 }}>
                    <Txt role="small">Add your venture name, description, and market first. The adviser will then use your actual context.</Txt>
                    <Button size="md" variant="outline" onPress={() => router.push("/venture")}>Set up venture</Button>
                </Card>
            ) : (
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: c.line }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft }}><Lightbulb size={17} color={c.brand} /></View>
                    <Txt role="small" style={{ flex: 1 }}>Advising <Txt weight="semibold" role="small">{user.venture.name || "your venture"}</Txt> at the {STAGE_LABEL[user.venture.stage].toLowerCase()} stage.</Txt>
                </Card>
            )}

            <Card style={{ marginTop: 18, borderWidth: 1, borderColor: c.line, gap: 10 }}>
                <Txt role="overline">START WITH THE DECISION</Txt>
                <Txt role="h2">What do you need to decide or test?</Txt>
                <Txt role="small">Be specific about the customer, choice, evidence, or trade-off. You will get a framework and an action, not a generic business plan.</Txt>
                <TextInput ref={input} value={question} onChangeText={setQuestion} placeholder="For example: We spoke to eight households. Is the problem painful enough to test?" placeholderTextColor={c.caption} multiline textAlignVertical="top" style={{ minHeight: 118, borderRadius: r.md, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.page, color: c.ink, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, lineHeight: 22 }} />
                <Button block disabled={!question.trim() || busy} loading={busy} icon={!busy ? <ArrowUp size={16} color={c.white} /> : undefined} onPress={() => void ask(question)}>Get a next step</Button>
            </Card>

            {!turns.length ? (
                <View style={{ gap: 8, marginTop: 20 }}>
                    <Txt role="overline">USEFUL STARTING POINTS</Txt>
                    {suggestions.map((suggestion) => <Pressable key={suggestion} accessibilityRole="button" onPress={() => void ask(suggestion)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, padding: 14, opacity: pressed ? 0.8 : 1 })}><ArrowRight size={15} color={c.brand} style={{ marginTop: 2 }} /><Txt size={14} lineHeight={21} style={{ flex: 1 }}>{suggestion}</Txt></Pressable>)}
                </View>
            ) : (
                <View style={{ gap: 12, marginTop: 20 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}><Txt role="h2" style={{ flex: 1 }}>Your decisions</Txt><Pressable accessibilityRole="button" onPress={() => { setTurns([]); setTaskTurns([]); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, padding: 8 }}><Trash2 size={14} color={c.muted} /><Txt weight="semibold" size={12} lineHeight={16} color={c.muted}>Clear</Txt></Pressable></View>
                    {turns.map((turn, index) => <AdviceCard key={`${turn.question}-${index}`} turn={turn} savedTask={taskTurns.includes(index)} onMakeTask={() => void makeTask(turn, index)} />)}
                </View>
            )}
            <Card style={{ marginTop: 20, gap: 5, borderWidth: 1, borderColor: c.line }}><Txt weight="semibold" size={14} lineHeight={19}>How it works</Txt><Txt role="small">The adviser uses your venture record and course frameworks. Every response names its framework; you keep the judgement and the evidence.</Txt></Card>
        </Screen>
    );
}
