import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Check, CheckCircle2, CircleAlert, FlaskConical, Plus, Trash2 } from "lucide-react-native";
import {
    STAGE_LABEL,
    STAGE_ORDER,
    VENTURE_SECTIONS,
    type SectionSpec,
    type VentureClaim,
    type VentureConfidence,
    type VentureSection,
    type VentureSectionId,
    type VentureStage,
    type VenturePath,
} from "@startup-school/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Button, Card, Chip, Field, ProgressBar, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

const uid = (): string => `venture-${Math.random().toString(36).slice(2, 10)}`;
const written = (section?: VentureSection): boolean => Boolean(section?.body.trim() || section?.claims.length);
const nextSection = (sections: Partial<Record<VentureSectionId, VentureSection>>): SectionSpec => VENTURE_SECTIONS.find((section) => !written(sections[section.id])) ?? VENTURE_SECTIONS[0];

const CONFIDENCE: { id: VentureConfidence; label: string; description: string }[] = [
    { id: "guess", label: "Assumption", description: "Believed, not checked." },
    { id: "evidence", label: "Evidence", description: "Something real points this way." },
    { id: "proven", label: "Proven", description: "It has happened repeatedly." },
];

const PATHS: { id: VenturePath; label: string }[] = [
    { id: "build", label: "Build from scratch" },
    { id: "phoxta_turnkey", label: "Phoxta AI business" },
    { id: "hybrid", label: "Adapt a Phoxta system" },
];

function ClaimRow({ claim, onChange, onRemove }: { claim: VentureClaim; onChange: (next: VentureClaim) => void; onRemove: () => void }) {
    const { c, r } = useTheme();
    const confidence = CONFIDENCE.find((item) => item.id === claim.confidence)!;
    return (
        <View style={{ gap: 10, borderWidth: 1, borderColor: c.line, borderRadius: r.md, backgroundColor: c.page, padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <TextInput value={claim.text} onChangeText={(text) => onChange({ ...claim, text })} multiline placeholder="A belief you need to prove" placeholderTextColor={c.caption} style={{ flex: 1, minHeight: 54, borderWidth: 1, borderColor: c.lineStrong, borderRadius: r.sm, backgroundColor: c.card, color: c.ink, fontSize: 14, lineHeight: 20, paddingHorizontal: 10, paddingVertical: 8, textAlignVertical: "top" }} />
                <Pressable accessibilityRole="button" accessibilityLabel="Remove assumption" onPress={onRemove} style={{ padding: 8 }}><Trash2 size={16} color={c.muted} /></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CONFIDENCE.map((item) => <Chip key={item.id} on={claim.confidence === item.id} onPress={() => onChange({ ...claim, confidence: item.id })} tone="brand">{item.label}</Chip>)}
            </ScrollView>
            <Txt role="caption">{confidence.description}</Txt>
            {claim.confidence !== "proven" ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <FlaskConical size={14} color={c.muted} />
                    <TextInput value={claim.test} onChangeText={(test) => onChange({ ...claim, test })} placeholder="What is the smallest test this week?" placeholderTextColor={c.caption} style={{ flex: 1, minHeight: 38, borderWidth: 1, borderColor: c.lineStrong, borderRadius: r.sm, backgroundColor: c.card, color: c.ink, fontSize: 13, paddingHorizontal: 10, paddingVertical: 8 }} />
                </View>
            ) : null}
        </View>
    );
}

function SectionEditor({ spec, section }: { spec: SectionSpec; section?: VentureSection }) {
    const { mutate } = useData();
    const { toast } = useToast();
    const { c, r } = useTheme();
    const router = useRouter();
    const [body, setBody] = useState(section?.body ?? "");
    const [claims, setClaims] = useState<VentureClaim[]>(section?.claims ?? []);
    const [saving, setSaving] = useState(false);
    const openTests = claims.filter((claim) => claim.confidence !== "proven" && !claim.test.trim()).length;

    const save = async () => {
        setSaving(true);
        try {
            await mutate((repository) => repository.saveVenture({ sections: { [spec.id]: { body: body.trim(), claims: claims.filter((claim) => claim.text.trim()), updatedAt: new Date().toISOString() } } }));
            toast(`${spec.title} saved`, "success");
        } catch (error) { toast(error instanceof Error ? error.message : "Could not save this section", "danger"); }
        finally { setSaving(false); }
    };

    return (
        <Card style={{ marginTop: 16, gap: 14, borderWidth: 1, borderColor: c.line }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flex: 1 }}><Txt role="overline">VENTURE CANVAS</Txt><Txt role="h2" style={{ marginTop: 3 }}>{spec.title}</Txt><Txt role="small" style={{ marginTop: 4 }}>{spec.blurb}</Txt></View>
                {openTests ? <Tag tone="warn">{openTests} test{openTests === 1 ? "" : "s"}</Tag> : null}
            </View>
            <View style={{ gap: 7 }}>
                <Txt weight="semibold" size={14} lineHeight={19}>Write what you know</Txt>
                <Txt role="small">{spec.prompt}</Txt>
                <TextInput value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="Write in plain language. You can improve it later." placeholderTextColor={c.caption} style={{ minHeight: 145, borderRadius: r.md, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.page, color: c.ink, fontSize: 14, lineHeight: 21, paddingHorizontal: 12, paddingVertical: 10 }} />
            </View>
            <View style={{ gap: 4 }}><Txt weight="semibold" size={15} lineHeight={20}>Assumptions and evidence</Txt><Txt role="caption">{spec.claimHint}</Txt></View>
            {claims.length ? <View style={{ gap: 10 }}>{claims.map((claim, index) => <ClaimRow key={claim.id} claim={claim} onChange={(next) => setClaims((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} onRemove={() => setClaims((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</View> : <View style={{ backgroundColor: c.page, borderRadius: r.md, padding: 12 }}><Txt role="small">Add only the beliefs that would change your next decision if they were wrong.</Txt></View>}
            <Button variant="outline" size="md" icon={<Plus size={15} color={c.ink} />} onPress={() => setClaims((current) => [...current, { id: uid(), text: "", confidence: "guess", test: "" }])}>Add an assumption</Button>
            <View style={{ gap: 10 }}>
                <Button block loading={saving} icon={!saving ? <Check size={16} color={c.white} /> : undefined} onPress={() => void save()}>Save section</Button>
                <Button block variant="outline" icon={<ArrowRight size={16} color={c.ink} />} onPress={() => router.push({ pathname: "/adviser", params: { draft: `Help me decide what to test next for ${spec.title.toLowerCase()}.` } })}>Ask adviser</Button>
            </View>
        </Card>
    );
}

/** The mobile venture canvas mirrors the web workspace: one clear section and its evidence at a time. */
export default function VentureScreen() {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const { c, r } = useTheme();
    const venture = user.venture;
    const focus = useMemo(() => nextSection(venture.sections), [venture.sections]);
    const [selectedId, setSelectedId] = useState<VentureSectionId>(focus.id);
    const selected = VENTURE_SECTIONS.find((section) => section.id === selectedId) ?? focus;
    const [name, setName] = useState(venture.name);
    const [oneLiner, setOneLiner] = useState(venture.oneLiner);
    const [country, setCountry] = useState(venture.country);
    const [stage, setStage] = useState<VentureStage>(venture.stage);
    const [path, setPath] = useState<VenturePath>(venture.path);
    const [savingDetails, setSavingDetails] = useState(false);
    const summary = useMemo(() => {
        const sections = Object.values(venture.sections);
        const claims = sections.flatMap((section) => section?.claims ?? []);
        return { written: sections.filter((section) => written(section)).length, openTests: claims.filter((claim) => claim.confidence !== "proven" && !claim.test.trim()).length };
    }, [venture.sections]);

    useEffect(() => { setName(venture.name); setOneLiner(venture.oneLiner); setCountry(venture.country); setStage(venture.stage); setPath(venture.path); }, [venture]);
    const saveDetails = async () => {
        setSavingDetails(true);
        try {
            await mutate((repository) => repository.saveVenture({ name: name.trim(), oneLiner: oneLiner.trim(), country: country.trim(), stage, path }));
            toast("Venture details saved", "success");
        } catch (error) { toast(error instanceof Error ? error.message : "Could not save your venture", "danger"); }
        finally { setSavingDetails(false); }
    };

    return (
        <Screen header={<Header title="Venture" />} keyboardAware>
            <PageTitle title="Venture canvas" sub="Capture the decisions, evidence, and tests that move your business forward." />
            <Card style={{ gap: 14, borderWidth: 1, borderColor: c.line }}>
                <Field label="Venture name" value={name} onChangeText={setName} placeholder="A working name is enough" />
                <Field label="What are you building?" value={oneLiner} onChangeText={setOneLiner} placeholder="For a specific customer, we help them..." multiline style={{ minHeight: 72, paddingVertical: 10, textAlignVertical: "top" }} />
                <Field label="Country or primary market" value={country} onChangeText={setCountry} placeholder="Nigeria, Kenya, UK..." />
                <View style={{ gap: 8 }}><Txt role="overline">CURRENT STAGE</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{STAGE_ORDER.map((item) => <Chip key={item} on={stage === item} onPress={() => setStage(item)} tone="brand">{STAGE_LABEL[item]}</Chip>)}</ScrollView></View>
                <View style={{ gap: 8 }}><Txt role="overline">STARTING LANE</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{PATHS.map((item) => <Chip key={item.id} on={path === item.id} onPress={() => setPath(item.id)} tone="brand">{item.label}</Chip>)}</ScrollView></View>
                <Button block loading={savingDetails} icon={!savingDetails ? <Check size={16} color={c.white} /> : undefined} onPress={() => void saveDetails()}>Save venture details</Button>
            </Card>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Card style={{ flex: 1, gap: 4, borderWidth: 1, borderColor: c.line }}><Txt role="overline">CANVAS</Txt><Txt weight="semibold" size={21} lineHeight={26}>{summary.written}<Txt role="small"> / {VENTURE_SECTIONS.length}</Txt></Txt><ProgressBar value={(summary.written / VENTURE_SECTIONS.length) * 100} /></Card>
                <Card style={{ flex: 1, gap: 4, borderWidth: 1, borderColor: summary.openTests ? c.peachSoft : c.line, backgroundColor: summary.openTests ? c.peachSoft : c.card }}><Txt role="overline">TESTS TO DEFINE</Txt><Txt weight="semibold" size={21} lineHeight={26}>{summary.openTests}</Txt><Txt role="caption">{summary.openTests ? "Assumptions need a next test." : "No missing tests."}</Txt></Card>
            </View>

            <View style={{ marginTop: 20, gap: 8 }}><Txt role="overline">CHOOSE A SECTION</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{VENTURE_SECTIONS.map((section) => <Chip key={section.id} on={selected.id === section.id} onPress={() => setSelectedId(section.id)} tone="brand">{written(venture.sections[section.id]) ? "✓ " : ""}{section.title}</Chip>)}</ScrollView></View>
            <SectionEditor key={selected.id} spec={selected} section={venture.sections[selected.id]} />
            {summary.openTests ? <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 16, borderRadius: r.md, borderWidth: 1, borderColor: c.peachSoft, backgroundColor: c.peachSoft, padding: 14 }}><CircleAlert size={17} color={c.peach} /><Txt role="small" style={{ flex: 1 }}>Give each open assumption a smallest next test before treating it as a fact.</Txt></View> : null}
        </Screen>
    );
}
