import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Music, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { relative } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, MemberAvatar, MemberMultiPicker, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, Field, Tag } from "@/components/ui/primitives";
import studioModule from "../module";
import { BASE, COST, capState, itemsOfKind, newestFirst } from "../derive";
import { clampSong, suggestSongTitle, templateSong, type SongBrief } from "../generate";
import { LeadSheet, SingAlong } from "../components/studio";
import { SONG_KIND_LABEL, type SongData, type SongKind, type StudioItem } from "../types";

/**
 * Songs.
 *
 * The rule that shapes this page: a song without chords and a structure is a
 * poem, so whatever comes back from the model is clamped into a lead sheet
 * before it is shown — a key, a tempo, named sections and a chord line on each
 * one, borrowed from the written template where the model left a gap. That is
 * why the family always gets something singable, backend or no backend.
 */

const KINDS: SongKind[] = ["family", "worship", "lullaby", "birthday"];

const CHILD_THEMES = ["our family", "being brave", "going to Grandma's", "bedtime", "a birthday", "thank you God"];

export default function SongsPage() {
    const { state, mutate, loading, error } = useModule(studioModule);
    const { me, role, members, space } = useSpace();
    const { ask, available } = useAi();

    const [songKind, setSongKind] = useState<SongKind>("family");
    const [names, setNames] = useState<string[]>([]);
    const [theme, setTheme] = useState("");
    const [title, setTitle] = useState("");
    const [draft, setDraft] = useState<SongData | null>(null);
    const [cost, setCost] = useState(0);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [blocked, setBlocked] = useState<string | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [singing, setSinging] = useState<Extract<StudioItem, { kind: "song" }> | null>(null);

    const child = role === "child";
    const guest = role === "guest";
    const picker = child && (me.ageBand === "little" || me.ageBand === "junior");

    const songs = useMemo(() => (state ? itemsOfKind(state, "song").sort(newestFirst) : []), [state]);
    const cap = state ? capState(state.usage) : null;

    if (loading && !state) return <p className="text-md text-muted">Finding the songs…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const brief = (): SongBrief => ({
        songKind,
        names: names.map((id) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "").filter(Boolean),
        theme: theme.trim(),
        familyName: space.name,
    });

    const generate = async (): Promise<void> => {
        setBusy(true);
        setBlocked(null);
        setProblem(null);
        const b = brief();
        let data = templateSong(b);
        let spent = 0;
        if (cap?.blocked) {
            setBlocked(cap.message);
        } else if (available) {
            try {
                const r = await ask<unknown>({
                    action: "song",
                    prompt: `Write a ${SONG_KIND_LABEL[b.songKind].toLowerCase()} for ${space.name}${b.names.length ? ` featuring ${b.names.join(", ")}` : ""}${b.theme ? ` about ${b.theme}` : ""}. British English, warm, singable, no clichés.`,
                    payload: { kind: b.songKind, names: b.names, theme: b.theme, family: space.name },
                });
                if (r.unavailable) setBlocked(r.unavailable);
                else {
                    data = clampSong(r.data, b);
                    spent = COST.song;
                }
            } catch (e) {
                setProblem(e instanceof Error ? e.message : "The companion could not write that. The written version is below.");
            }
        }
        setDraft(data);
        setCost(spent);
        setTitle((t) => t || suggestSongTitle(b));
        if (spent) {
            try {
                await mutate((r) => r.meter(spent, 1200));
            } catch (e) {
                setBlocked(e instanceof Error ? e.message : null);
            }
        }
        setBusy(false);
    };

    const save = async (): Promise<void> => {
        if (!draft) return;
        setSaving(true);
        try {
            await mutate((r) => r.saveSong({ title: title.trim() || suggestSongTitle(brief()), data: draft, costCents: cost }));
            setDraft(null);
            setCost(0);
            setTitle("");
        } catch (e) {
            setProblem(e instanceof Error ? e.message : "That song could not be saved.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageTitle
                title={child ? "Songs we can sing" : "Songs"}
                sub={
                    child
                        ? "Pick what it is for and I will write the words and the chords. Then press Sing along and the words get big."
                        : "Lyrics, a chord chart, a key and a tempo — a lead sheet the family can pick up and sing. Wàfè writes the words and the chords, not the audio: the recorder on each song is for you singing it."
                }
                area="create"
                actions={
                    <Link to={BASE} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        Back to the companion
                    </Link>
                }
            />

            {!guest && (
                <Card className="mb-8">
                    <h2 className="font-display text-2xl leading-7">{child ? "Make a new song" : "Write a new song"}</h2>
                    <form
                        className="mt-4 space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void generate();
                        }}
                    >
                        <div>
                            <span className="mb-1.5 block text-xs font-medium text-muted">What is it for</span>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What is the song for">
                                {KINDS.map((k) => (
                                    <button
                                        key={k}
                                        type="button"
                                        role="radio"
                                        aria-checked={songKind === k}
                                        onClick={() => setSongKind(k)}
                                        className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition-colors", songKind === k ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                    >
                                        {SONG_KIND_LABEL[k]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <MemberMultiPicker value={names} onChange={setNames} label="Whose names should be in it" />

                        {picker ? (
                            <div>
                                <span className="mb-1.5 block text-xs font-medium text-muted">What is it about</span>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What is the song about">
                                    {CHILD_THEMES.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            role="radio"
                                            aria-checked={theme === t}
                                            onClick={() => setTheme(t)}
                                            className={cn("rounded-full border px-4 py-2 text-md font-semibold transition-colors", theme === t ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Field label="What is it about" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="the life we're building · an evening blessing · Ayo turning six" hint="One line is plenty. Leave it blank and Wàfè uses the family's own words." />
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button type="submit" loading={busy} disabled={Boolean(cap?.blocked)}>
                                <Sparkles size={16} aria-hidden="true" /> {child ? "Make my song" : "Write it"}
                            </Button>
                            {!available && <span className="text-xs text-caption">No backend on this build — you will get the written version, which is a full lead sheet.</span>}
                        </div>
                    </form>

                    {blocked && (
                        <Notice tone="warn" className="mt-4">
                            {blocked} The written version below is a complete lead sheet, so nothing is lost.
                        </Notice>
                    )}
                    {problem && (
                        <Notice tone="danger" className="mt-4">
                            {problem}
                        </Notice>
                    )}

                    {draft && (
                        <div className="mt-6">
                            <div className="mb-3 flex flex-wrap items-end gap-3">
                                <Field label="Call it" value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-[240px] flex-1" />
                                <Button onClick={() => void save()} loading={saving}>
                                    Save to the gallery
                                </Button>
                                <Button variant="ghost" onClick={() => setDraft(null)}>
                                    Throw it away
                                </Button>
                            </div>
                            <Tag tone={draft.source === "ai" ? "create" : "neutral"} className="mb-3">
                                {draft.source === "ai" ? "Written by the companion" : "Wàfè's own words"}
                            </Tag>
                            <LeadSheet song={draft} title={title || "Untitled"} />
                        </div>
                    )}
                </Card>
            )}

            <Section title={guest ? "Songs the family shared with you" : "The family's songbook"} action={<span className="text-xs text-caption">{songs.length} songs</span>}>
                {songs.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        {songs.map((s) => (
                            <li key={s.id}>
                                <Card className="flex h-full flex-col">
                                    <div className="flex items-start gap-3">
                                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-create-soft text-create-ink">
                                            <Music size={18} aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[17px] font-semibold leading-6">{s.title}</h3>
                                            <p className="mt-0.5 text-sm text-muted">
                                                {SONG_KIND_LABEL[s.data.songKind]} · {s.data.key} · {s.data.tempo} bpm · {s.data.structure.length} sections
                                                {s.data.recording ? " · recorded" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-3 whitespace-pre-wrap text-md leading-6 text-muted">{s.data.structure[0]?.lyrics.split("\n").slice(0, 2).join("\n")}</p>
                                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                                        <Button size="md" variant="brand" onClick={() => setSinging(s)}>
                                            <Play size={15} aria-hidden="true" /> Sing along
                                        </Button>
                                        <Link to={`${BASE}/gallery/${s.id}`} className="inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-4 text-sm font-semibold">
                                            The lead sheet
                                        </Link>
                                        <span className="ml-auto flex items-center gap-2 text-xs text-caption">
                                            <MemberAvatar memberId={s.memberId} size="xs" /> {relative(s.createdAt)}
                                        </span>
                                    </div>
                                </Card>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyModule
                        title={guest ? "No songs have been shared with you" : "No songs yet"}
                        body={guest ? "When the family shares one, you can read the chords and sing along from here." : "Write the family anthem first — it takes about twenty seconds and everybody argues about the chorus for a week."}
                    />
                )}
            </Section>

            {singing && <SingAlong song={singing.data} title={singing.title} onClose={() => setSinging(null)} />}
        </div>
    );
}
