import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { relative } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, Field, Tag } from "@/components/ui/primitives";
import studioModule from "../module";
import { BASE, COST, capState, itemsOfKind, newestFirst, planOf } from "../derive";
import { IMAGE_UNAVAILABLE, paletteFor } from "../generate";
import { TypographicCard } from "../components/studio";
import type { ImageData } from "../types";

/**
 * Pictures — and the honest state when there is no image model.
 *
 * The brief says "image generation where the plan allows", which is only
 * meaningful if the other case is designed rather than caught. It is: the
 * prompt is kept, the family gets a typographic card set on one of their own
 * grounds, the reason is said in a sentence, and the row is the same row that
 * will render as a picture the day images are switched on. No spinner that
 * never ends, no silent nothing.
 */

const CHILD_IDEAS = [
    "a friendly dragon reading a book",
    "our dog Bella wearing a party hat",
    "a rocket made out of a cardboard box",
    "a garden with one very big sunflower",
];

export default function ImagesPage() {
    const { state, mutate, loading, error } = useModule(studioModule);
    const { me, role } = useSpace();
    const { ask, available } = useAi();

    const [prompt, setPrompt] = useState("");
    const [title, setTitle] = useState("");
    const [draft, setDraft] = useState<ImageData | null>(null);
    const [cost, setCost] = useState(0);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    const child = role === "child";
    const guest = role === "guest";
    const picker = child && (me.ageBand === "little" || me.ageBand === "junior");

    const images = useMemo(() => (state ? itemsOfKind(state, "image").sort(newestFirst) : []), [state]);

    if (loading && !state) return <p className="text-md text-muted">Opening the pictures…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const plan = planOf(state);
    const cap = capState(state.usage);

    const generate = async (): Promise<void> => {
        const p = prompt.trim();
        if (!p) return;
        setBusy(true);
        setProblem(null);
        const palette = paletteFor(p);
        let data: ImageData = { prompt: p, url: null, status: "unavailable_typographic", model: null, note: IMAGE_UNAVAILABLE, palette };
        let spent = 0;

        if (!plan.images) {
            data = { ...data, note: `${IMAGE_UNAVAILABLE} The ${plan.name} plan does not include an image model.` };
        } else if (cap.blocked) {
            data = { ...data, note: cap.message ?? IMAGE_UNAVAILABLE };
        } else if (!available) {
            data = { ...data, note: `${IMAGE_UNAVAILABLE} (This build has no backend configured.)` };
        } else {
            try {
                const r = await ask<{ url?: string }>({ action: "image", prompt: p, payload: { prompt: p, childSafe: child } });
                const url = r.data?.url ?? null;
                if (r.unavailable || !url) data = { ...data, note: r.unavailable ?? IMAGE_UNAVAILABLE };
                else {
                    data = { prompt: p, url, status: "generated", model: r.model ?? "companion", note: "", palette };
                    spent = COST.image;
                }
            } catch (e) {
                setProblem(e instanceof Error ? e.message : "The companion could not make that picture.");
            }
        }

        setDraft(data);
        setCost(spent);
        setTitle((t) => t || (p.length > 46 ? `${p.slice(0, 43)}…` : p.charAt(0).toUpperCase() + p.slice(1)));
        if (spent) {
            try {
                await mutate((r) => r.meter(spent, 0));
            } catch (e) {
                setProblem(e instanceof Error ? e.message : null);
            }
        }
        setBusy(false);
    };

    const save = async (): Promise<void> => {
        if (!draft) return;
        setSaving(true);
        try {
            await mutate((r) => r.saveImage({ title: title.trim() || "Untitled", data: draft, costCents: cost }));
            setDraft(null);
            setCost(0);
            setTitle("");
            setPrompt("");
        } catch (e) {
            setProblem(e instanceof Error ? e.message : "That picture could not be saved.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageTitle
                title={child ? "Make a picture" : "Pictures"}
                sub={
                    child
                        ? "Say what you would like a picture of. If Wàfè cannot draw it today it will make your words look beautiful instead — and keep them."
                        : "A picture from a description, where the plan includes an image model. Where it does not, your words are kept and set as a card — the prompt is never thrown away."
                }
                area="create"
                actions={
                    <Link to={BASE} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        Back to the companion
                    </Link>
                }
            />

            {!plan.images && (
                <Notice tone="info" className="mb-6">
                    Image generation is not on the {plan.name} plan. Everything here still works — you will get a typographic card with your prompt kept on it, and the same card becomes a picture the moment images are switched on.
                </Notice>
            )}

            {!guest && (
                <Card className="mb-8">
                    <h2 className="font-display text-2xl leading-7">{child ? "What shall I draw?" : "A new picture"}</h2>
                    <form
                        className="mt-4 space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void generate();
                        }}
                    >
                        {picker ? (
                            <div>
                                <span className="mb-1.5 block text-xs font-medium text-muted">Pick one</span>
                                <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pick a picture">
                                    {CHILD_IDEAS.map((idea) => (
                                        <button
                                            key={idea}
                                            type="button"
                                            role="radio"
                                            aria-checked={prompt === idea}
                                            onClick={() => setPrompt(idea)}
                                            className={cn("rounded-xl border px-4 py-3.5 text-left text-base font-semibold transition-colors", prompt === idea ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong hover:border-ink")}
                                        >
                                            {idea}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Field
                                label="Describe it"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Our long Sunday table with every chair full and one spare, in the style of a woodcut."
                                hint="Say what is in it and how it should feel. The description is kept either way."
                            />
                        )}

                        <Button type="submit" loading={busy} disabled={!prompt.trim()}>
                            <Sparkles size={16} aria-hidden="true" /> {plan.images && !cap.blocked ? "Make the picture" : "See what I get"}
                        </Button>
                    </form>

                    {problem && (
                        <Notice tone="danger" className="mt-4">
                            {problem}
                        </Notice>
                    )}

                    {draft && (
                        <div className="mt-6">
                            {draft.status === "unavailable_typographic" && <Notice className="mb-4">{draft.note}</Notice>}
                            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                                {draft.url ? (
                                    <img src={draft.url} alt={draft.prompt} width={640} height={480} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                                ) : (
                                    <TypographicCard prompt={draft.prompt} palette={draft.palette} title={title || undefined} />
                                )}
                                <div>
                                    <Tag tone={draft.status === "generated" ? "create" : "neutral"} className="mb-3">
                                        {draft.status === "generated" ? "Generated" : "Typographic card · prompt kept"}
                                    </Tag>
                                    <Field label="Call it" value={title} onChange={(e) => setTitle(e.target.value)} />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button onClick={() => void save()} loading={saving}>
                                            Save to the gallery
                                        </Button>
                                        <Button variant="ghost" onClick={() => setDraft(null)}>
                                            Throw it away
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            <Section title={guest ? "Pictures the family shared with you" : "Pictures"} action={<span className="text-xs text-caption">{images.length}</span>}>
                {images.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {images.map((i) => (
                            <li key={i.id}>
                                <Card className="flex h-full flex-col p-0">
                                    {i.data.url ? (
                                        <img src={i.data.url} alt={i.data.prompt} width={480} height={360} loading="lazy" className="aspect-[4/3] w-full rounded-t-xl object-cover" />
                                    ) : (
                                        <TypographicCard prompt={i.data.prompt} palette={i.data.palette} className="rounded-b-none" />
                                    )}
                                    <div className="flex flex-1 flex-col p-4">
                                        <h3 className="text-lg font-semibold leading-6">{i.title}</h3>
                                        <p className="mt-1 text-sm leading-5 text-muted">{i.data.status === "generated" ? "Generated picture" : "No image model on the plan — the prompt is kept"}</p>
                                        <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-caption">
                                            <MemberAvatar memberId={i.memberId} size="xs" /> {relative(i.createdAt)}
                                            <Link to={`${BASE}/gallery/${i.id}`} className="ml-auto font-semibold text-brand underline-offset-4 hover:underline">
                                                Open
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyModule title="No pictures yet" body="Describe something the family would put on the fridge. If the plan has no image model you will still get a card worth keeping." />
                )}
            </Section>
        </div>
    );
}
