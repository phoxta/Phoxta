import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, ShoppingBasket, Sparkles, Trash2, Utensils } from "lucide-react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { Confirm, Notice, PageTitle, Section } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Field, IconButton, Skeleton, Tag } from "@/components/ui/primitives";
import { BASE, dayNumber, planFilled, planForWeek, shiftDay, weekOf } from "../derive";
import type { Ingredient, Recipe, WellnessRepo } from "../types";
import { MealGrid, NoPlanYet } from "../components/MealGrid";
import { MealPlanAi } from "../components/MealPlanAi";
import { useWellness } from "../components/useWellness";

/**
 * The week's food.
 *
 * Seven day cards with a name against every pan, and under them the recipes
 * the family actually cooks — with what each one costs, because the shopping
 * list is priced from exactly these numbers. A child may read the week and the
 * child-safe recipes; only a parent may change them.
 */
export default function MealsPage() {
    const { state, loading, error, sp, child, run, foodBudget } = useWellness();
    const [params, setParams] = useSearchParams();
    const [offset, setOffset] = useState(0);
    const [asking, setAsking] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [addingRecipe, setAddingRecipe] = useState(false);
    const [removingRecipe, setRemovingRecipe] = useState<Recipe | null>(null);
    const [busy, setBusy] = useState(false);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state?.visible) return <EmptyState title="Nothing here for you" body="What is on the table is a family matter." />;

    const canEdit = !child;
    const today = sp.today;
    const weekStart = shiftDay(weekOf(today), offset * 7);
    const plan = planForWeek(state, weekStart);
    const filled = plan ? planFilled(state, plan.id) : { filled: 0, total: 21, pct: 0 };
    const openRecipe = params.get("recipe") ? state.recipes.find((r) => r.id === params.get("recipe")) : undefined;

    return (
        <div>
            <PageTitle
                title="Meals"
                sub="A name against every pan, and a cook against every name. Plan it once on a Sunday and nobody asks what's for dinner five times."
                area="live"
                actions={
                    canEdit && (
                        <>
                            {plan && (
                                <Button variant="outline" onClick={() => setAsking(true)}>
                                    <Sparkles size={16} aria-hidden="true" /> Meals for the budget
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => setAddingRecipe(true)}>
                                <Plus size={16} aria-hidden="true" /> New recipe
                            </Button>
                        </>
                    )
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <IconButton label="The week before" size="md" onClick={() => setOffset(offset - 1)}>
                    <ChevronLeft size={16} aria-hidden="true" />
                </IconButton>
                <p className="text-base font-semibold">
                    {offset === 0 ? "This week" : offset === 1 ? "Next week" : offset === -1 ? "Last week" : `Week of ${dayNumber(weekStart)}`}
                    <span className="ml-2 text-sm font-normal text-caption">
                        {dayNumber(weekStart)} – {dayNumber(shiftDay(weekStart, 6))}
                    </span>
                </p>
                <IconButton label="The week after" size="md" onClick={() => setOffset(offset + 1)}>
                    <ChevronRight size={16} aria-hidden="true" />
                </IconButton>
                {plan && (
                    <Tag tone={filled.filled >= 14 ? "ok" : "warn"} className="ml-1">
                        {filled.filled} of 21 down
                    </Tag>
                )}
                {canEdit && plan && offset !== 0 && (
                    <Button
                        variant="ghost"
                        size="md"
                        loading={busy}
                        onClick={async () => {
                            setBusy(true);
                            await run((r) => r.copyWeek(weekOf(today), weekStart), "Copied from this week");
                            setBusy(false);
                        }}
                    >
                        <Copy size={14} aria-hidden="true" /> Same as this week
                    </Button>
                )}
            </div>

            {plan ? (
                <>
                    {plan.note && <p className="mb-4 rounded-lg bg-live-soft px-4 py-3 text-sm leading-5 text-live-ink">{plan.note}</p>}
                    <MealGrid state={state} planId={plan.id} weekStart={weekStart} canEdit={canEdit} today={today} run={run} />
                    {canEdit && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                loading={busy}
                                onClick={async () => {
                                    setBusy(true);
                                    await run((r) => r.buildGroceryList(plan.id, foodBudget?.remainingCents), "Priced from these meals");
                                    setBusy(false);
                                }}
                            >
                                <ShoppingBasket size={16} aria-hidden="true" /> Price this week&apos;s shop
                            </Button>
                            <Link to={`${BASE}/grocery`} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-md font-semibold text-brand hover:bg-subtle">
                                Open the shopping list
                            </Link>
                        </div>
                    )}
                </>
            ) : canEdit ? (
                <NoPlanYet
                    busy={busy}
                    onCreate={async () => {
                        setBusy(true);
                        await run((r) => r.ensureMealPlan(weekStart), "Week started");
                        setBusy(false);
                    }}
                />
            ) : (
                <EmptyState icon={<Utensils size={20} aria-hidden="true" />} title="Nothing down for this week yet" body="A parent puts the meals up on planning day." />
            )}

            <Section title="Our recipes" className="mt-8">
                {state.recipes.length === 0 ? (
                    <EmptyState icon={<Utensils size={20} aria-hidden="true" />} title="No recipes yet" body="Write down the six things you actually cook. The shopping list prices itself from them." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {[...state.recipes]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((r) => (
                                <li key={r.id}>
                                    <div className={cn("flex h-full flex-col overflow-hidden rounded-xl bg-card", openRecipe?.id === r.id && "outline-2 outline-brand")}>
                                        {r.imageUrl && <img src={r.imageUrl} alt="" width={480} height={220} loading="lazy" className="h-32 w-full object-cover" />}
                                        <div className="flex flex-1 flex-col p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-lg font-semibold leading-5">{r.name}</h3>
                                                {canEdit && (
                                                    <span className="flex shrink-0 gap-1">
                                                        <IconButton label={`Edit ${r.name}`} size="sm" onClick={() => setEditingRecipe(r)}>
                                                            <Pencil size={13} aria-hidden="true" />
                                                        </IconButton>
                                                        <IconButton label={`Delete ${r.name}`} size="sm" onClick={() => setRemovingRecipe(r)}>
                                                            <Trash2 size={13} aria-hidden="true" />
                                                        </IconButton>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-caption">
                                                {r.minutes} min · serves {r.servings} · about {money(r.costEstimateCents, sp.space.currency)}
                                            </p>
                                            {r.blurb && <p className="mt-2 flex-1 text-sm leading-5 text-muted">{r.blurb}</p>}
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {r.tags.slice(0, 3).map((t) => (
                                                    <Tag key={t} tone="neutral">
                                                        {t}
                                                    </Tag>
                                                ))}
                                                {!r.childSafe && <Tag tone="warn">Grown-ups</Tag>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = new URLSearchParams(params);
                                                    next.set("recipe", r.id);
                                                    setParams(next);
                                                }}
                                                className="mt-3 self-start text-sm font-semibold text-brand underline-offset-4 hover:underline"
                                            >
                                                How we make it
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                    </ul>
                )}
            </Section>

            {openRecipe && (
                <Dialog
                    open
                    onClose={() => {
                        const next = new URLSearchParams(params);
                        next.delete("recipe");
                        setParams(next, { replace: true });
                    }}
                    title={openRecipe.name}
                    wide
                >
                    {openRecipe.imageUrl && <img src={openRecipe.imageUrl} alt="" width={640} height={280} loading="lazy" className="mb-4 h-44 w-full rounded-md object-cover" />}
                    <p className="text-sm text-caption">
                        {openRecipe.minutes} min · serves {openRecipe.servings} · about {money(openRecipe.costEstimateCents, sp.space.currency)}
                    </p>
                    {openRecipe.blurb && <p className="mt-2 text-md leading-6 text-muted">{openRecipe.blurb}</p>}
                    <h3 className="mt-5 text-base font-semibold">What you need</h3>
                    <ul className="mt-2 divide-y divide-line rounded-md bg-page">
                        {openRecipe.ingredients.map((ing, i) => (
                            <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                                <span className="flex-1">{ing.item}</span>
                                <span className="text-caption">{ing.qty}</span>
                                <span className="w-16 text-right tabular-nums text-muted">{money(ing.priceEstimateCents, sp.space.currency)}</span>
                            </li>
                        ))}
                    </ul>
                    <h3 className="mt-5 text-base font-semibold">How</h3>
                    <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-md leading-6">
                        {openRecipe.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ol>
                </Dialog>
            )}

            {(addingRecipe || editingRecipe) && (
                <RecipeDialog
                    recipe={editingRecipe}
                    currency={sp.space.currency}
                    onClose={() => {
                        setAddingRecipe(false);
                        setEditingRecipe(null);
                    }}
                    run={run}
                />
            )}

            {plan && (
                <MealPlanAi
                    open={asking}
                    onClose={() => setAsking(false)}
                    planId={plan.id}
                    weekStart={weekStart}
                    people={sp.members.filter((m) => m.role !== "guest").length}
                    currency={sp.space.currency}
                    foodBudget={foodBudget}
                    run={run}
                />
            )}

            <Confirm
                open={Boolean(removingRecipe)}
                title="Delete this recipe?"
                body={removingRecipe ? `"${removingRecipe.name}" goes. Any day it was on keeps the name, but loses the ingredients that priced the shop.` : undefined}
                confirmLabel="Delete it"
                danger
                onConfirm={async () => {
                    if (removingRecipe) await run((r) => r.removeRecipe(removingRecipe.id), "Deleted");
                }}
                onClose={() => setRemovingRecipe(null)}
            />
        </div>
    );
}

function RecipeDialog({ recipe, currency, onClose, run }: { recipe: Recipe | null; currency: string; onClose: () => void; run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean> }) {
    const [name, setName] = useState(recipe?.name ?? "");
    const [blurb, setBlurb] = useState(recipe?.blurb ?? "");
    const [servings, setServings] = useState(String(recipe?.servings ?? 5));
    const [minutes, setMinutes] = useState(String(recipe?.minutes ?? 30));
    const [childSafe, setChildSafe] = useState(recipe?.childSafe ?? true);
    const [tags, setTags] = useState((recipe?.tags ?? []).join(", "));
    const [steps, setSteps] = useState((recipe?.steps ?? []).join("\n"));
    const [rows, setRows] = useState<Ingredient[]>(recipe?.ingredients.length ? recipe.ingredients : [{ item: "", qty: "", priceEstimateCents: 0 }]);
    const [busy, setBusy] = useState(false);

    const total = rows.reduce((n, r) => n + r.priceEstimateCents, 0);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        const input = {
            name: name.trim(),
            blurb: blurb.trim(),
            ingredients: rows.filter((r) => r.item.trim()),
            steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
            servings: Math.max(1, Number(servings) || 4),
            minutes: Math.max(1, Number(minutes) || 30),
            childSafe,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        };
        const ok = recipe ? await run((r) => r.updateRecipe(recipe.id, input), "Saved") : await run((r) => r.addRecipe(input), "Recipe added");
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title={recipe ? "Edit recipe" : "A new recipe"} wide>
            <form onSubmit={submit}>
                <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jollof rice and chicken" />
                <Field label="One line about it" value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="The Sunday one." className="mt-4" />

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
                    <Field label="Serves" value={servings} onChange={(e) => setServings(e.target.value)} inputMode="numeric" />
                    <Field label="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
                    <Field label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Nigerian, Sunday" />
                </div>

                <label className="mt-4 flex items-center gap-2.5 text-md">
                    <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-5 accent-[var(--color-brand)]" />
                    The children may see it (and help cook it)
                </label>

                <fieldset className="mt-5">
                    <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">What you need — and what it costs</legend>
                    <ul className="flex flex-col gap-2">
                        {rows.map((row, i) => (
                            <li key={i} className="flex flex-wrap items-end gap-2">
                                <input
                                    value={row.item}
                                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, item: e.target.value } : r)))}
                                    placeholder="Chicken thighs"
                                    aria-label={`Ingredient ${i + 1}`}
                                    className="h-10 min-w-[9rem] flex-1 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                />
                                <input
                                    value={row.qty}
                                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, qty: e.target.value } : r)))}
                                    placeholder="2 kg"
                                    aria-label={`Quantity ${i + 1}`}
                                    className="h-10 w-24 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                />
                                <input
                                    value={row.priceEstimateCents ? (row.priceEstimateCents / 100).toFixed(2) : ""}
                                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, priceEstimateCents: Math.round(Number(e.target.value.replace(/[^0-9.]/g, "")) * 100) || 0 } : r)))}
                                    placeholder="11.50"
                                    inputMode="decimal"
                                    aria-label={`Estimated cost ${i + 1}`}
                                    className="h-10 w-24 rounded-sm border border-line-strong bg-card px-3 text-md tabular-nums outline-none focus:border-brand"
                                />
                                <IconButton label={`Remove ingredient ${i + 1}`} size="md" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : rows)}>
                                    <Trash2 size={14} aria-hidden="true" />
                                </IconButton>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 flex items-center justify-between">
                        <Button variant="ghost" size="md" onClick={() => setRows([...rows, { item: "", qty: "", priceEstimateCents: 0 }])}>
                            <Plus size={14} aria-hidden="true" /> Another
                        </Button>
                        <p className="text-sm tabular-nums text-muted">About {money(total, currency)} a cook</p>
                    </div>
                </fieldset>

                <label className="mt-5 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">How, one step a line</span>
                    <textarea
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                        rows={5}
                        placeholder={"Blend the peppers, tomatoes and onion.\nSeason and roast the chicken."}
                        className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand"
                    />
                </label>

                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        {recipe ? "Save" : "Add it"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
