import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, Archive, ArrowDown, ArrowUp, Download, KeyRound, Lock, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { AGE_BAND, type Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { longDate, money } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, DateText, MemberAvatar, Money, Notice, PageTitle, Points, Section } from "@/components/shared";
import { Button, Card, Field, ProgressBar, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import { FamilyNav } from "../components/FamilyNav";
import { MemberDialog, type MemberInput } from "../components/MemberDialog";
import { PinDialog } from "../components/PinDialog";
import { meter, valueUsage } from "../derive";
import { DEMO_PIN } from "../seed";
import { useFamily } from "../hooks";
import { download, jsonFile, makeZip, mediaFile, textFile, type ZipFile } from "../lib/zip";
import { PLANS, planOf, type FamilySettings, type FamilyValue, type PlanId } from "../types";

/**
 * Settings — and the one page in this module that belongs to everybody.
 *
 * A child or a guest sees their own card and, if they are in child mode, the
 * lock that only a parent's PIN opens. A parent sees the family's profile,
 * the rhythms the daily loop runs on, the values and the mission, the plan
 * and its meter, and the two irreversible doors: export and delete.
 */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SettingsPage() {
    const sp = useSpace();
    const { state, repo, reload } = useFamily();
    const { toast } = useToast();
    const parent = sp.can("family.manage");

    const [editingMe, setEditingMe] = useState(false);
    const [exiting, setExiting] = useState(false);

    if (!state) return null;

    const inChildMode = Boolean(state.childMode[sp.me.id]) && sp.me.role === "child";

    const saveMe = async (input: MemberInput) => {
        // A child may change their picture and their colour; a guest may also
        // fix their own name and birthday. Nothing else is theirs to move.
        const patch: Partial<Member> = sp.me.role === "child" ? { avatarUrl: input.avatarUrl || undefined, hue: input.hue } : { name: input.name, avatarUrl: input.avatarUrl || undefined, hue: input.hue, birthday: input.birthday || undefined };
        await sp.mutateCore((c) => c.updateMember(sp.me.id, parent ? { ...patch, name: input.name, relation: input.relation, birthday: input.birthday || undefined, email: input.email || undefined } : patch));
        toast("Saved", "success");
    };

    return (
        <div>
            <PageTitle title={parent ? "Family settings" : "My profile"} area="family" sub={parent ? "The family's name, rhythms, values and mission — and the doors marked irreversible." : "Your picture, your colour, and how the family runs."} />
            <FamilyNav />

            {/* ---------------------------------------------------------- me */}
            <Section title="My profile">
                <Card className="flex flex-wrap items-center gap-5">
                    <MemberAvatar member={sp.me} size="xl" />
                    <div className="min-w-[200px] flex-1">
                        <p className="font-display text-3xl">{sp.me.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                            <span>{sp.me.relation}</span>
                            {sp.me.role === "child" && <Tag tone="grow">{AGE_BAND[sp.me.ageBand].label}</Tag>}
                            {sp.me.birthday && (
                                <span>
                                    · <DateText iso={sp.me.birthday} long />
                                </span>
                            )}
                        </p>
                        {sp.me.role === "child" && <Points n={sp.me.points} className="mt-2" />}
                    </div>
                    <Button variant="outline" size="md" onClick={() => setEditingMe(true)}>
                        {sp.me.role === "child" ? "Change my picture" : "Edit my profile"}
                    </Button>
                </Card>
            </Section>

            {/* -------------------------------------------------- child mode */}
            {inChildMode && (
                <Section title="Child mode">
                    <Card className="flex flex-wrap items-center gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true">
                            <Lock size={18} />
                        </span>
                        <div className="min-w-[200px] flex-1">
                            <p className="text-base font-semibold">This device is in child mode</p>
                            <p className="mt-0.5 text-sm leading-5 text-muted">Your lessons, chores, garden and studio. To leave, a parent types the family PIN.</p>
                        </div>
                        <Button variant="outline" size="md" onClick={() => setExiting(true)}>
                            Leave child mode
                        </Button>
                    </Card>
                </Section>
            )}

            {parent ? <ParentSettings /> : <RhythmsForEveryone />}

            <MemberDialog open={editingMe} onClose={() => setEditingMe(false)} member={sp.me} scope={parent ? "parent" : sp.me.role === "child" ? "self-child" : "self-adult"} lastParent={parent && sp.members.filter((m) => m.role === "parent").length <= 1} onSave={saveMe} />
            <PinDialog
                open={exiting}
                onClose={() => setExiting(false)}
                title="Ask a parent"
                body="Child mode keeps this device on your screens. A parent's PIN unlocks it."
                confirmLabel="Leave child mode"
                hint={sp.kind === "demo" ? `In this demo the PIN starts as ${DEMO_PIN}.` : "Four to eight digits."}
                verify={checkPinVia}
                onVerified={async () => {
                    toast("Child mode off — hand the device back when you're done", "success");
                }}
            />
        </div>
    );

    // Leaving child mode is the child's own act, gated by the parent's PIN:
    // the repo verifies it and only ever clears this member's own flag.
    async function checkPinVia(pin: string): Promise<boolean> {
        if (!state?.pinSet) return false;
        const ok = await repo.exitChildMode(pin);
        // A wrong PIN changed nothing; a right one already cleared the flag,
        // so reload the slice and let the screen redraw itself.
        if (ok) await reload();
        return ok;
    }
}

// ---------------------------------------------------------------------------
// Everything below is parents-only
// ---------------------------------------------------------------------------

function RhythmsForEveryone() {
    const { state } = useFamily();
    const sp = useSpace();
    if (!state) return null;
    return (
        <Section title="How our family runs">
            <Card>
                <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Fact label="Morning briefing" value={`${String(state.settings.briefingHour).padStart(2, "0")}:00`} />
                    <Fact label="Evening check-in" value={`${String(state.settings.checkinHour).padStart(2, "0")}:00`} />
                    <Fact label="Planning day" value={DAYS[sp.space.planningDay - 1]} />
                    <Fact label="Grace days" value={state.settings.graceDays.map((d) => DAYS[d - 1]).join(", ") || "None"} />
                    <Fact label="Quiet hours" value={`${state.settings.quietFrom} – ${state.settings.quietTo}`} />
                    <Fact label="Our values" value={state.values.filter((v) => !v.archivedAt).map((v) => v.name).join(" · ")} />
                </dl>
                <p className="mt-4 border-t border-line pt-3 text-sm leading-6 text-muted">{sp.space.mission}</p>
            </Card>
        </Section>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-2xs font-semibold uppercase tracking-[0.08em] text-caption">{label}</dt>
            <dd className="mt-0.5 text-md">{value}</dd>
        </div>
    );
}

function ParentSettings() {
    const sp = useSpace();
    const { state, mutate } = useFamily();
    const { slices } = useData();
    const { toast } = useToast();
    const ai = useAi();

    const [profile, setProfile] = useState({ name: sp.space.name, tagline: sp.space.tagline, currency: sp.space.currency, timezone: sp.space.timezone, planningDay: sp.space.planningDay, coverUrl: sp.space.coverUrl ?? "" });
    const [valueDraft, setValueDraft] = useState({ name: "", meaning: "" });
    const [mission, setMission] = useState({ mission: sp.space.mission, vision: "", legacy: "" });
    const [aiText, setAiText] = useState<string | null>(null);
    const [pin, setPin] = useState("");
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [archiving, setArchiving] = useState<FamilyValue | null>(null);
    const [deletingValue, setDeletingValue] = useState<FamilyValue | null>(null);
    const [busy, setBusy] = useState(false);

    const latestMission = state?.missions[0];
    const latestMissionId = latestMission?.id;
    useEffect(() => {
        // Keyed on the VERSION, not on the array: reloading the slice after any
        // other save must not wipe a half-written paragraph.
        if (latestMission) setMission({ mission: latestMission.mission, vision: latestMission.vision, legacy: latestMission.legacy });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latestMissionId]);

    if (!state) return null;

    const values = [...state.values].sort((a, b) => a.order - b.order);
    const active = values.filter((v) => !v.archivedAt);
    const usage = valueUsage(state, slices);
    const met = meter(state);
    const plan = planOf(state.settings.plan);

    const syncValues = (names: string[]) => sp.mutateCore((c) => c.updateSpace({ values: names }));
    const activeNames = active.map((v) => v.name);

    const saveProfile = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await sp.mutateCore((c) => c.updateSpace({ name: profile.name.trim(), tagline: profile.tagline.trim(), currency: profile.currency, timezone: profile.timezone.trim(), planningDay: profile.planningDay, coverUrl: profile.coverUrl.trim() || undefined }));
            await mutate((r) => r.audit({ action: "space", targetType: "space", targetId: sp.space.id, summary: "Updated the family profile", before: sp.space.name, after: profile.name.trim() }));
            toast("Saved", "success");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't save", "danger");
        } finally {
            setBusy(false);
        }
    };

    const saveSettings = async (patch: Partial<FamilySettings>) => {
        await mutate((r) => r.saveSettings(patch));
        toast("Saved", "success");
    };

    const addValue = async (e: FormEvent) => {
        e.preventDefault();
        if (!valueDraft.name.trim()) return;
        try {
            await mutate((r) => r.addValue(valueDraft.name, valueDraft.meaning));
            await syncValues([...activeNames, valueDraft.name.trim()]);
            setValueDraft({ name: "", meaning: "" });
            toast("Added", "success");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't add that", "danger");
        }
    };

    const draftMission = async () => {
        setAiText(null);
        try {
            const res = await ai.ask({
                action: "ask",
                prompt: "Draft our family mission in one paragraph of no more than 60 words, in our own plain voice, built from our values and who we are. Then, on a new line beginning 'Vision:', one sentence about where we want to be in five years.",
                payload: { values: active.map((v) => ({ name: v.name, meaning: v.meaning })), members: sp.members.map((m) => ({ name: m.name, relation: m.relation })) },
            });
            await mutate((r) => r.noteAiCall("call"));
            if (res.unavailable) {
                setAiText(res.unavailable);
                return;
            }
            setAiText(res.text || "The companion had nothing to add this time.");
        } catch {
            setAiText("The companion couldn't answer just now. Your own words are better anyway.");
        }
    };

    const saveMission = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await mutate((r) => r.saveMission(mission));
            await sp.mutateCore((c) => c.updateSpace({ mission: mission.mission.trim() }));
            toast("Mission saved", "success");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't save", "danger");
        } finally {
            setBusy(false);
        }
    };

    const savePin = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await mutate((r) => r.setPin(pin));
            setPin("");
            toast("PIN saved", "success");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't save the PIN", "danger");
        }
    };

    /** The whole space as a ZIP: one JSON per module, plus every picture. */
    const exportAll = async () => {
        setExporting(true);
        try {
            const files: ZipFile[] = [
                textFile("README.txt", `${sp.space.name} — Wàfè export\nMade ${new Date().toISOString()}\n\nEvery module's data is one JSON file under /modules. Pictures are under /media.\nThis archive is yours: no part of Wàfè is needed to read it.\n`),
                jsonFile("space.json", sp.space),
                jsonFile("members.json", sp.members),
                jsonFile("invites.json", sp.coreState.invites),
                jsonFile("notifications.json", sp.coreState.notifications),
            ];
            const urls = new Set<string>();
            if (sp.space.coverUrl) urls.add(sp.space.coverUrl);
            for (const m of sp.members) if (m.avatarUrl) urls.add(m.avatarUrl);
            for (const [id, slice] of Object.entries(slices)) {
                if (!slice || slice.state === undefined) continue;
                const json = JSON.stringify(slice.state);
                files.push({ name: `modules/${id}.json`, data: new TextEncoder().encode(json) });
                for (const m of json.matchAll(/"(\/images\/[^"]+)"/g)) urls.add(m[1]);
            }
            let i = 0;
            for (const url of urls) {
                if (i >= 200) break;
                const name = url.startsWith("data:") ? `upload-${i}.${(url.split(";")[0].split("/")[1] || "png").slice(0, 4)}` : undefined;
                const f = await mediaFile(url, name);
                if (f) files.push(f);
                i += 1;
            }
            const blob = makeZip(files);
            download(blob, `${sp.space.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-wafe-${sp.today}.zip`);
            await mutate((r) => r.recordExport(blob.size));
            toast(`Archive ready — ${Math.round(blob.size / 1024)} KB`, "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't build the archive", "danger");
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            {/* ------------------------------------------------ family profile */}
            <Section title="The family">
                <Card>
                    <form onSubmit={saveProfile} className="grid gap-4">
                        {profile.coverUrl && <img src={profile.coverUrl} alt={`${profile.name} cover`} width={1200} height={320} loading="lazy" className="h-40 w-full rounded-lg object-cover" />}
                        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                            <Field label="Name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} required />
                            <Field label="Tagline" value={profile.tagline} onChange={(e) => setProfile((p) => ({ ...p, tagline: e.target.value }))} placeholder="Croydon, South London · since 2009" />
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                            <Field label="Currency" value={profile.currency} onChange={(e) => setProfile((p) => ({ ...p, currency: e.target.value.toUpperCase().slice(0, 3) }))} hint="Three letters, e.g. GBP" />
                            <Field label="Timezone" value={profile.timezone} onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))} hint="Europe/London" />
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Planning day</span>
                                <select value={profile.planningDay} onChange={(e) => setProfile((p) => ({ ...p, planningDay: Number(e.target.value) }))} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                    {DAYS.map((d, i) => (
                                        <option key={d} value={i + 1}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <Field label="Cover photo URL" value={profile.coverUrl} onChange={(e) => setProfile((p) => ({ ...p, coverUrl: e.target.value }))} placeholder="/images/family-hero.jpg" />
                        <div>
                            <Button type="submit" variant="brand" loading={busy}>
                                Save the family
                            </Button>
                        </div>
                    </form>
                </Card>
            </Section>

            {/* -------------------------------------------------------- rhythms */}
            <Section title="Our rhythms">
                <Card className="grid gap-5">
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                        <Select label="Week starts" value={String(state.settings.weekStart)} onChange={(v) => void saveSettings({ weekStart: Number(v) })} options={DAYS.map((d, i) => ({ value: String(i + 1), label: d }))} />
                        <Select label="Morning briefing" value={String(state.settings.briefingHour)} onChange={(v) => void saveSettings({ briefingHour: Number(v) })} options={HOURS.map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }))} />
                        <Select label="Evening check-in" value={String(state.settings.checkinHour)} onChange={(v) => void saveSettings({ checkinHour: Number(v) })} options={HOURS.map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }))} />
                    </div>
                    <div>
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Grace days</span>
                        <p className="mb-2 text-xs text-caption">Rituals over streaks: on a grace day nothing is “missed”, and no streak is lost.</p>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map((d, i) => {
                                const day = i + 1;
                                const on = state.settings.graceDays.includes(day);
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => void saveSettings({ graceDays: on ? state.settings.graceDays.filter((x) => x !== day) : [...state.settings.graceDays, day].sort() })}
                                        className={cn("rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                    >
                                        {d.slice(0, 3)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        <Field
                            label={`Ask a parent above (${sp.space.currency})`}
                            type="number"
                            min={0}
                            step={1}
                            value={Math.round(state.settings.purchaseApprovalCents / 100)}
                            onChange={(e) => void saveSettings({ purchaseApprovalCents: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                            hint={`A child's purchase request over ${money(state.settings.purchaseApprovalCents, sp.space.currency)} needs a parent's yes.`}
                        />
                        <Field label="Digest above (nudges a day)" type="number" min={1} max={20} value={state.settings.digestAbove} onChange={(e) => void saveSettings({ digestAbove: Math.max(1, Number(e.target.value)) })} hint="More than this in one day arrive as a single digest." />
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        <Field label="Quiet from" type="time" value={state.settings.quietFrom} onChange={(e) => void saveSettings({ quietFrom: e.target.value })} hint="Nudges wait; they are never dropped." />
                        <Field label="Quiet until" type="time" value={state.settings.quietTo} onChange={(e) => void saveSettings({ quietTo: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <Toggle label="Push notifications" on={state.settings.notifyPush} onChange={(v) => void saveSettings({ notifyPush: v })} />
                        <Toggle label="Email notifications" on={state.settings.notifyEmail} onChange={(v) => void saveSettings({ notifyEmail: v })} />
                    </div>
                </Card>
            </Section>

            {/* --------------------------------------------------------- values */}
            <Section title={`Our values (${active.length} of 7)`}>
                <Card className="grid gap-3">
                    <img src="/images/family-values.jpg" alt="" width={1200} height={200} loading="lazy" className="h-28 w-full rounded-lg object-cover" />
                    <ul className="grid gap-2">
                        {values.map((v, i) => {
                            const refs = usage[v.id] ?? [];
                            return (
                                <li key={v.id} className={cn("rounded-lg border p-3.5", v.archivedAt ? "border-line bg-page opacity-70" : "border-line bg-card")}>
                                    <div className="flex flex-wrap items-start gap-3">
                                        <div className="min-w-[200px] flex-1">
                                            <p className="flex items-center gap-2 text-base font-semibold">
                                                {v.name}
                                                {v.archivedAt && <Tag tone="neutral">Archived</Tag>}
                                                {refs.length > 0 && <Tag tone="brand">{refs.length} linked</Tag>}
                                            </p>
                                            <input
                                                aria-label={`What ${v.name} means`}
                                                defaultValue={v.meaning}
                                                onBlur={(e) => {
                                                    if (e.target.value !== v.meaning) void mutate((r) => r.updateValue(v.id, { meaning: e.target.value }));
                                                }}
                                                placeholder="One line, in your own words"
                                                className="mt-1 w-full border-0 border-b border-transparent bg-transparent pb-0.5 text-sm text-muted outline-none focus:border-brand"
                                            />
                                            {refs.length > 0 && <p className="mt-1.5 text-xs text-caption">{refs.slice(0, 3).map((r) => r.label).join(" · ")}{refs.length > 3 ? ` · +${refs.length - 3}` : ""}</p>}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <IconBtn label={`Move ${v.name} up`} disabled={i === 0} onClick={() => void mutate((r) => r.moveValue(v.id, -1)).then(() => syncValues(reorder(activeNames, v.name, -1)))}>
                                                <ArrowUp size={14} />
                                            </IconBtn>
                                            <IconBtn label={`Move ${v.name} down`} disabled={i === values.length - 1} onClick={() => void mutate((r) => r.moveValue(v.id, 1)).then(() => syncValues(reorder(activeNames, v.name, 1)))}>
                                                <ArrowDown size={14} />
                                            </IconBtn>
                                            <Button size="sm" variant="ghost" onClick={() => setArchiving(v)}>
                                                <Archive size={13} aria-hidden="true" /> {v.archivedAt ? "Restore" : "Archive"}
                                            </Button>
                                            <Button size="sm" variant="ghost" disabled={refs.length > 0} title={refs.length > 0 ? `${refs.length} records still point at this value — archive it instead` : "Delete"} onClick={() => setDeletingValue(v)}>
                                                <Trash2 size={13} aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <form onSubmit={addValue} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-lg bg-page p-3.5 md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-end">
                        <Field label="A new value" value={valueDraft.name} onChange={(e) => setValueDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Hospitality" />
                        <Field label="What it means here" value={valueDraft.meaning} onChange={(e) => setValueDraft((d) => ({ ...d, meaning: e.target.value }))} placeholder="The door opens before the house is tidy." />
                        <Button type="submit" variant="outline" disabled={active.length >= 7}>
                            <Plus size={14} aria-hidden="true" /> Add
                        </Button>
                    </form>
                    <p className="text-xs leading-5 text-caption">
                        Values are chips everywhere else in Wàfè: a goal, a task, a study, a gift can each point at one. A value something references is archived rather than deleted, so the record keeps its meaning.
                    </p>
                </Card>
            </Section>

            {/* -------------------------------------------------------- mission */}
            <Section title="Our mission">
                <Card>
                    <img src="/images/family-table.jpg" alt="" width={1200} height={220} loading="lazy" className="mb-4 h-32 w-full rounded-lg object-cover" />
                    <form onSubmit={saveMission} className="grid gap-4">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Mission</span>
                            <textarea value={mission.mission} onChange={(e) => setMission((m) => ({ ...m, mission: e.target.value }))} rows={3} className="rounded-md border border-line-strong bg-card p-3 text-md leading-6 outline-none focus:border-brand" />
                        </label>
                        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Vision (five years)</span>
                                <textarea value={mission.vision} onChange={(e) => setMission((m) => ({ ...m, vision: e.target.value }))} rows={3} className="rounded-md border border-line-strong bg-card p-3 text-md leading-6 outline-none focus:border-brand" />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Legacy</span>
                                <textarea value={mission.legacy} onChange={(e) => setMission((m) => ({ ...m, legacy: e.target.value }))} rows={3} className="rounded-md border border-line-strong bg-card p-3 text-md leading-6 outline-none focus:border-brand" />
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="submit" variant="brand" loading={busy}>
                                Save the mission
                            </Button>
                            <Button type="button" variant="outline" loading={ai.busy} onClick={() => void draftMission()}>
                                <Sparkles size={15} aria-hidden="true" /> Draft it from our values
                            </Button>
                        </div>
                        {aiText && (
                            <div className="rounded-lg bg-brand-soft p-4 text-md leading-6 text-brand-ink">
                                <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em]">From the companion · using your values and who is in the family</p>
                                <p className="whitespace-pre-wrap">{aiText}</p>
                                <Button size="sm" variant="outline" className="mt-3" onClick={() => setMission((m) => ({ ...m, mission: aiText.split(/\nVision:/i)[0].trim(), vision: (aiText.split(/\nVision:/i)[1] ?? m.vision).trim() }))}>
                                    Use this wording
                                </Button>
                            </div>
                        )}
                    </form>
                    {state.missions.length > 1 && (
                        <details className="mt-4 border-t border-line pt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-brand">Earlier versions ({state.missions.length - 1})</summary>
                            <ul className="mt-3 grid gap-3">
                                {state.missions.slice(1).map((m) => (
                                    <li key={m.id} className="rounded-lg bg-page p-3.5">
                                        <p className="text-sm leading-6">{m.mission}</p>
                                        <p className="mt-1 text-xs text-caption">
                                            {sp.members.find((x) => x.id === m.authorId)?.name ?? "Someone"} · {longDate(m.createdAt)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </Card>
            </Section>

            {/* ------------------------------------------------- plan and meter */}
            <Section title="Plan and the companion's allowance">
                <Card className="grid gap-4">
                    {met.pct >= 80 && <Notice tone={met.pct >= 100 ? "danger" : "warn"}>{met.message}</Notice>}
                    <div>
                        <div className="mb-1.5 flex items-baseline justify-between text-sm">
                            <span className="font-semibold">
                                {met.used} of {met.cap} companion answers
                            </span>
                            <span className="text-caption">{met.pct}% of {new Date(`${state.usage.month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long" })}</span>
                        </div>
                        <ProgressBar value={met.pct} label="Companion allowance used" className="h-1.5" />
                        <p className="mt-2 text-xs text-caption">
                            {state.usage.images} of {plan.images} pictures · {Math.round(state.usage.mediaMb / 10.24) / 100} of {plan.mediaGb} GB of media · {state.usage.reels} of {plan.reels} reels
                        </p>
                    </div>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
                        {PLANS.map((p) => {
                            const on = p.id === state.settings.plan;
                            return (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => void saveSettings({ plan: p.id as PlanId })}
                                        className={cn("h-full w-full rounded-lg border p-4 text-left transition-colors", on ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink")}
                                    >
                                        <span className="flex items-baseline justify-between">
                                            <span className="text-base font-semibold">{p.name}</span>
                                            <span className="text-sm font-semibold">{p.priceCents ? <Money cents={p.priceCents} /> : "Free"}</span>
                                        </span>
                                        <span className="mt-1 block text-xs leading-5 text-muted">{p.blurb}</span>
                                        <span className="mt-2 block text-2xs uppercase tracking-[0.06em] text-caption">
                                            {p.aiCalls} answers · {p.images || "no"} pictures · {p.mediaGb} GB · {p.reels} reels · {p.members} people
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            </Section>

            {/* ------------------------------------------------------ child PIN */}
            <Section title="The parent PIN">
                <Card className="flex flex-wrap items-end gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-page text-muted" aria-hidden="true">
                        <KeyRound size={18} />
                    </span>
                    <form onSubmit={savePin} className="flex min-w-[240px] flex-1 flex-wrap items-end gap-3">
                        <Field label={state.pinSet ? "Change the PIN" : "Set a PIN"} type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="••••" hint="Four to eight digits. It unlocks child mode and confirms deleting the family." className="min-w-[200px] flex-1" />
                        <Button type="submit" variant="outline" disabled={pin.length < 4}>
                            Save PIN
                        </Button>
                    </form>
                    {sp.kind === "demo" && <p className="basis-full text-xs text-caption">In this demo the PIN starts as <strong>{DEMO_PIN}</strong>, so you can try the child-mode lock.</p>}
                </Card>
            </Section>

            {/* --------------------------------------------- export and delete */}
            <Section title="Your data">
                <Card className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-page text-muted" aria-hidden="true">
                            <Download size={18} />
                        </span>
                        <div className="min-w-[200px] flex-1">
                            <p className="text-base font-semibold">Export everything</p>
                            <p className="mt-0.5 text-sm leading-5 text-muted">One ZIP: a JSON file per module and every picture. Yours to keep, readable without Wàfè.</p>
                        </div>
                        <Button variant="outline" loading={exporting} onClick={() => void exportAll()}>
                            Download the archive
                        </Button>
                    </div>
                    {state.exports.length > 0 && (
                        <ul className="grid gap-1.5 border-t border-line pt-3 text-xs text-caption">
                            {state.exports.slice(0, 3).map((x) => (
                                <li key={x.id}>
                                    {longDate(x.requestedAt)} · {x.bytes ? `${Math.round(x.bytes / 1024)} KB` : x.status} · {sp.members.find((m) => m.id === x.requestedBy)?.name.split(" ")[0] ?? "A parent"}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </Section>

            <Section title="Irreversible">
                <Card className="grid gap-4 border border-danger/25">
                    {sp.kind === "demo" && (
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-page text-muted" aria-hidden="true">
                                <RotateCcw size={18} />
                            </span>
                            <div className="min-w-[200px] flex-1">
                                <p className="text-base font-semibold">Reset the demo</p>
                                <p className="mt-0.5 text-sm leading-5 text-muted">Put the Adeyemis back exactly as the brief left them. Nothing you have done here is kept.</p>
                            </div>
                            <Button variant="outline" onClick={() => setResetting(true)}>
                                Start again
                            </Button>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger-soft text-danger-ink" aria-hidden="true">
                            <AlertTriangle size={18} />
                        </span>
                        <div className="min-w-[200px] flex-1">
                            <p className="text-base font-semibold">Delete this family</p>
                            <p className="mt-0.5 text-sm leading-5 text-muted">Every row and every picture, gone within a day. You will be asked to prove it is you.</p>
                        </div>
                        <Button variant="danger" onClick={() => setDeleting(true)}>
                            <Trash2 size={15} aria-hidden="true" /> Delete
                        </Button>
                    </div>
                </Card>
            </Section>

            <Confirm
                open={Boolean(archiving)}
                title={archiving?.archivedAt ? `Bring back “${archiving.name}”?` : `Archive “${archiving?.name}”?`}
                body={archiving?.archivedAt ? "It goes back on the chip row everywhere in Wàfè." : "It leaves the chip rows but stays on every record that already points at it."}
                confirmLabel={archiving?.archivedAt ? "Bring it back" : "Archive it"}
                onConfirm={async () => {
                    if (!archiving) return;
                    const on = !archiving.archivedAt;
                    await mutate((r) => r.setValueArchived(archiving.id, on));
                    await syncValues(on ? activeNames.filter((n) => n !== archiving.name) : [...activeNames, archiving.name]);
                    toast(on ? "Archived" : "Back on the row", "success");
                }}
                onClose={() => setArchiving(null)}
            />

            <Confirm
                open={Boolean(deletingValue)}
                title={`Delete “${deletingValue?.name}”?`}
                body="Nothing references it, so it can go for good."
                confirmLabel="Delete it"
                danger
                onConfirm={async () => {
                    if (!deletingValue) return;
                    try {
                        await mutate((r) => r.deleteValue(deletingValue.id, (usage[deletingValue.id] ?? []).length));
                        await syncValues(activeNames.filter((n) => n !== deletingValue.name));
                        toast("Deleted", "success");
                    } catch (e) {
                        toast(e instanceof Error ? e.message : "Couldn't delete it", "danger");
                    }
                }}
                onClose={() => setDeletingValue(null)}
            />

            <Confirm
                open={resetting}
                title="Reset the demo?"
                body="The Adeyemis go back to the beginning and the page reloads."
                confirmLabel="Reset"
                danger
                onConfirm={async () => {
                    await sp.core.resetDemo?.();
                }}
                onClose={() => setResetting(false)}
            />

            <DeleteSpaceDialog open={deleting} onClose={() => setDeleting(false)} />
        </>
    );
}

// ---------------------------------------------------------------------------

/** Deleting a family is confirmed by re-authentication, never by a checkbox. */
function DeleteSpaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const sp = useSpace();
    const { mutate } = useFamily();
    const { toast } = useToast();
    const [typed, setTyped] = useState("");
    const [secret, setSecret] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setTyped("");
            setSecret("");
            setError(null);
        }
    }, [open]);

    const nameOk = typed.trim().toLowerCase() === sp.space.name.trim().toLowerCase();

    const go = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            let ok = false;
            await mutate(async (r) => {
                ok = await r.reauth(secret);
                if (ok) await r.deleteSpace();
            });
            if (!ok) {
                setError(sp.kind === "demo" ? "That PIN isn't right." : "That password isn't right.");
                return;
            }
            toast("The family and everything in it is being deleted", "success");
            window.location.assign("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't delete the family");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Delete this family">
            <form onSubmit={go} className="grid gap-4">
                <Notice tone="danger">
                    Every member, every task, every photograph and every prayer in <strong>{sp.space.name}</strong> is removed, along with the media, within a day. There is no undo. Export first if you want to keep it.
                </Notice>
                <Field label={`Type the family's name`} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={sp.space.name} error={typed && !nameOk ? "That doesn't match" : null} />
                <Field
                    label={sp.kind === "demo" ? "Parent PIN" : "Your password"}
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    hint={sp.kind === "demo" ? "Re-authentication. In this demo, the parent PIN." : "We ask again because this cannot be undone."}
                    error={error}
                />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Keep it
                    </Button>
                    <Button type="submit" variant="danger" loading={busy} disabled={!nameOk || secret.length < 4}>
                        Delete for good
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="inline-flex items-center gap-2.5 text-md font-medium">
            <span className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-brand" : "bg-track")} aria-hidden="true">
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-[left]", on ? "left-[22px]" : "left-0.5")} />
            </span>
            {label}
        </button>
    );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
    return (
        <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:text-ink disabled:opacity-40">
            {children}
        </button>
    );
}

/** Move a name one step in the mirrored list that other modules read. */
function reorder(names: string[], name: string, dir: -1 | 1): string[] {
    const list = [...names];
    const i = list.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return list;
    [list[i], list[j]] = [list[j], list[i]];
    return list;
}
