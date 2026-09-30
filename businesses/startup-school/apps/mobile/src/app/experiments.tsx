import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, ClipboardCheck, FlaskConical, Pencil, Plus, Trash2 } from "lucide-react-native";
import type { EvidenceType, Experiment, ExperimentStatus, NewExperiment } from "@startup-school/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Button, Card, Chip, Field, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

type Draft = { title: string; hypothesis: string; method: string; threshold: string; status: ExperimentStatus; evidenceType: EvidenceType | ""; evidence: string; result: string; decision: string; nextStep: string };
const states: { id: ExperimentStatus; label: string }[] = [{ id: "planned", label: "Planned" }, { id: "running", label: "In field" }, { id: "validated", label: "Validated" }, { id: "invalidated", label: "Changed" }, { id: "inconclusive", label: "Inconclusive" }];
const evidence: { id: EvidenceType; label: string }[] = [{ id: "conversation", label: "Conversation" }, { id: "payment", label: "Payment" }, { id: "metric", label: "Metric" }, { id: "prototype", label: "Prototype" }, { id: "observation", label: "Observation" }, { id: "research", label: "Research" }];
const blank = (): Draft => ({ title: "", hypothesis: "", method: "", threshold: "", status: "planned", evidenceType: "", evidence: "", result: "", decision: "", nextStep: "" });
const fromExperiment = (item: Experiment): Draft => ({ title: item.title, hypothesis: item.hypothesis, method: item.method, threshold: item.threshold, status: item.status, evidenceType: item.evidenceType ?? "", evidence: item.evidence, result: item.result, decision: item.decision, nextStep: item.nextStep });

export default function ExperimentsScreen() {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const { c, r } = useTheme();
    const router = useRouter();
    const [editing, setEditing] = useState<Experiment | null>(null);
    const [draft, setDraft] = useState<Draft>(blank);
    const [saving, setSaving] = useState(false);
    const active = useMemo(() => user.experiments.filter((item) => item.status === "planned" || item.status === "running"), [user.experiments]);
    const reviewed = useMemo(() => user.experiments.filter((item) => item.status !== "planned" && item.status !== "running"), [user.experiments]);
    const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));
    const reset = () => { setEditing(null); setDraft(blank()); };
    const save = async () => {
        if (![draft.title, draft.hypothesis, draft.method, draft.threshold].every((value) => value.trim())) { toast("Add the test, hypothesis, method and threshold.", "danger"); return; }
        const payload: NewExperiment = { ...draft, evidenceType: draft.evidenceType || null };
        setSaving(true);
        try {
            if (editing) await mutate((repo) => repo.updateExperiment(editing.id, payload)); else await mutate((repo) => repo.addExperiment(payload));
            toast(editing ? "Evidence saved" : "Field test created", "success"); reset();
        } catch (error) { toast(error instanceof Error ? error.message : "Could not save the field test", "danger"); }
        finally { setSaving(false); }
    };
    const remove = async (item: Experiment) => {
        try { await mutate((repo) => repo.deleteExperiment(item.id)); if (editing?.id === item.id) reset(); toast("Field test deleted"); }
        catch (error) { toast(error instanceof Error ? error.message : "Could not delete the field test", "danger"); }
    };
    const list = (items: Experiment[]) => items.length ? <View style={{ gap: 10 }}>{items.map((item) => <Card key={item.id} style={{ gap: 8, borderWidth: 1, borderColor: c.line }}><View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><View style={{ flex: 1, gap: 5 }}><Tag tone={item.status === "validated" ? "ok" : item.status === "invalidated" ? "warn" : item.status === "running" ? "fund" : "neutral"}>{states.find((state) => state.id === item.status)?.label}</Tag><Txt weight="semibold" size={16} lineHeight={21}>{item.title}</Txt><Txt role="small">{item.hypothesis}</Txt></View><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={() => { setEditing(item); setDraft(fromExperiment(item)); }} style={{ padding: 6 }}><Pencil size={16} color={c.brand} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} onPress={() => void remove(item)} style={{ padding: 6 }}><Trash2 size={16} color={c.muted} /></Pressable></View><View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, gap: 4 }}><Txt weight="semibold" size={13} lineHeight={18}>Test</Txt><Txt role="small">{item.method}</Txt><Txt weight="semibold" size={13} lineHeight={18} style={{ marginTop: 4 }}>Success means</Txt><Txt role="small">{item.threshold}</Txt>{item.decision ? <View style={{ backgroundColor: c.brandSoft, borderRadius: r.sm, padding: 10, marginTop: 4 }}><Txt weight="semibold" size={13} lineHeight={18}>Decision</Txt><Txt role="small" style={{ marginTop: 2 }}>{item.decision}</Txt></View> : null}</View></Card>)}</View> : <Card style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}><ClipboardCheck size={23} color={c.muted} /><Txt weight="semibold" size={16} lineHeight={21}>Nothing here yet</Txt><Txt role="small" style={{ textAlign: "center" }}>The next field test belongs here.</Txt></Card>;
    return <Screen header={<Header title="Proof loop" />} keyboardAware><PageTitle title="Proof loop" sub="Test a real assumption, keep the evidence, then decide what changes." />
        <View style={{ flexDirection: "row", gap: 10 }}><Card style={{ flex: 1, gap: 3, borderWidth: 1, borderColor: c.line }}><Txt role="overline">IN THE FIELD</Txt><Txt weight="semibold" size={23} lineHeight={29}>{active.length}</Txt><Txt role="caption">tests to run</Txt></Card><Card style={{ flex: 1, gap: 3, borderWidth: 1, borderColor: c.line }}><Txt role="overline">DECISIONS</Txt><Txt weight="semibold" size={23} lineHeight={29}>{user.experiments.filter((item) => item.decision.trim()).length}</Txt><Txt role="caption">evidence reviewed</Txt></Card></View>
        <Card style={{ marginTop: 16, gap: 13, borderWidth: 1, borderColor: c.brand }}><View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}><View style={{ flex: 1 }}><Txt role="overline">{editing ? "REVIEW EVIDENCE" : "PLAN A FIELD TEST"}</Txt><Txt role="h2" style={{ marginTop: 3 }}>{editing ? "Update the decision trail" : "What needs proof next?"}</Txt><Txt role="small" style={{ marginTop: 4 }}>Use a test that could prove you wrong, not a task that makes you feel busy.</Txt></View>{editing ? <Button variant="ghost" size="sm" onPress={reset}>Cancel</Button> : null}</View>
            <Field label="Experiment title" value={draft.title} onChangeText={(title) => patch({ title })} placeholder="Ask for a paid pilot before building" />
            <Field label="Hypothesis" value={draft.hypothesis} onChangeText={(hypothesis) => patch({ hypothesis })} multiline placeholder="We believe this will be true..." style={{ minHeight: 58, textAlignVertical: "top", paddingVertical: 9 }} />
            <Field label="Smallest credible test" value={draft.method} onChangeText={(method) => patch({ method })} multiline placeholder="What will you do, with whom, by when?" style={{ minHeight: 58, textAlignVertical: "top", paddingVertical: 9 }} />
            <Field label="Success threshold" value={draft.threshold} onChangeText={(threshold) => patch({ threshold })} multiline placeholder="What result changes your decision?" style={{ minHeight: 58, textAlignVertical: "top", paddingVertical: 9 }} />
            <View style={{ gap: 7 }}><Txt role="overline">STATUS</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{states.map((item) => <Chip key={item.id} on={draft.status === item.id} tone="brand" onPress={() => patch({ status: item.id })}>{item.label}</Chip>)}</ScrollView></View>
            <View style={{ gap: 7 }}><Txt role="overline">EVIDENCE TYPE</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{evidence.map((item) => <Chip key={item.id} on={draft.evidenceType === item.id} tone="brand" onPress={() => patch({ evidenceType: item.id })}>{item.label}</Chip>)}</ScrollView></View>
            <Field label="Raw evidence" value={draft.evidence} onChangeText={(evidenceText) => patch({ evidence: evidenceText })} multiline placeholder="Quotes, counts, observations—not an AI summary." style={{ minHeight: 72, textAlignVertical: "top", paddingVertical: 9 }} />
            <Field label="Result" value={draft.result} onChangeText={(result) => patch({ result })} multiline placeholder="What happened against the threshold?" style={{ minHeight: 58, textAlignVertical: "top", paddingVertical: 9 }} />
            <Field label="Founder decision" value={draft.decision} onChangeText={(decision) => patch({ decision })} multiline placeholder="Continue, change or stop—and why?" style={{ minHeight: 58, textAlignVertical: "top", paddingVertical: 9 }} />
            <Button block loading={saving} icon={!saving ? <Check size={16} color={c.white} /> : undefined} onPress={() => void save()}>{editing ? "Save evidence" : "Create field test"}</Button>
        </Card>
        <View style={{ marginTop: 22, gap: 10 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><FlaskConical size={18} color={c.brand} /><Txt role="h2">Active tests</Txt></View>{list(active)}</View>
        {reviewed.length ? <View style={{ marginTop: 22, gap: 10 }}><Txt role="h2">Evidence reviewed</Txt>{list(reviewed)}</View> : null}
        <Button block variant="outline" icon={<Plus size={16} color={c.ink} />} onPress={() => { reset(); router.push("/venture"); }} style={{ marginTop: 22 }}>Update venture claims</Button>
    </Screen>;
}
