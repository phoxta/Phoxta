import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { DossierSection } from "@/lib/dossier/sections";

/**
 * The business dossier's data layer.
 *
 * TWO LAYERS, TWO SETS OF TABLES, ONE SHAPE
 *
 * The shared blueprint dossier is a catalogue: one per blueprint, written by
 * Phoxta, read by every business built from it. The owner's own version is an
 * ordinary tenant table. Both store a row per section carrying the same JSON, so
 * everything above this file — the rail, the slides, the progress bar — works on
 * `DossierRow[]` and never needs to know which layer it is looking at.
 *
 * Generation advances one section per call, driven from the browser. A Supabase
 * function is killed at 150s idle and a full dossier is minutes of model time,
 * so one request that "does everything" would die partway with some sections
 * saved and nothing recording where it stopped. Per-section means a closed tab
 * costs one section, and reopening resumes from what is stored.
 */

export type DossierRow = {
  section: string;
  content: Record<string, unknown>;
  generated_at: string | null;
};

/** The parent row: publish state and whether a run is in flight. */
export type DossierRun = {
  status: string;
  run_started_at: string | null;
  run_finished_at: string | null;
  run_error: string | null;
};

/** The six answers an owner gives before their own version is written. */
export type DossierContext = {
  location: string;
  market: string;
  customer: string;
  budget: string;
  timeline: string;
  assets: string;
};

export const EMPTY_CONTEXT: DossierContext = {
  location: "", market: "", customer: "", budget: "", timeline: "", assets: "",
};

/** The blueprint a dossier belongs to — the little of it this feature needs. */
export type DossierBlueprint = {
  id: string;
  slug: string;
  name: string;
  vertical: string | null;
};

const SECTION_SELECT = "section, content, generated_at";
const RUN_SELECT = "status, run_started_at, run_finished_at, run_error";

/* ── Which blueprint ───────────────────────────────────────────────────── */

/**
 * Resolve the blueprint a business was built from.
 *
 * `blueprint_id` is written by app_provision_business_paid at purchase, so it is
 * exact and it is the first choice. `app_path` is the fallback for businesses
 * provisioned before that column was being read here — it is copied from the
 * same blueprint row, so it identifies one exactly too. Vertical is NOT used as
 * a fallback on purpose: two blueprints share a vertical (a fashion store and a
 * furniture store are both retail), so matching on it would quietly hand someone
 * the wrong trade's dossier, which is worse than showing none.
 */
export async function blueprintForBusiness(
  org: { blueprint_id?: string | null; app_path?: string | null },
): Promise<{ data: DossierBlueprint | null; error: string | null }> {
  const select = "id, slug, name, vertical";

  if (org.blueprint_id) {
    const { data, error } = await supabase
      .from("blueprints").select(select).eq("id", org.blueprint_id).maybeSingle();
    if (data) return { data: data as DossierBlueprint, error: null };
    if (error) return { data: null, error: friendlyError(error.message) };
  }

  if (org.app_path) {
    const { data, error } = await supabase
      .from("blueprints").select(select).eq("app_path", org.app_path).limit(1).maybeSingle();
    return { data: (data as DossierBlueprint | null) ?? null, error: friendlyError(error?.message) };
  }

  return { data: null, error: null };
}

/** Every live blueprint, for the Phoxta-side picker on a console that has none
 *  of its own (the platform business). */
export async function listDossierBlueprints(): Promise<{ data: DossierBlueprint[]; error: string | null }> {
  const { data, error } = await supabase
    .from("blueprints").select("id, slug, name, vertical").order("name", { ascending: true });
  return { data: (data as DossierBlueprint[] | null) ?? [], error: friendlyError(error?.message) };
}

/* ── Layer 1: the shared dossier ───────────────────────────────────────── */

export async function getBlueprintDossier(
  blueprintId: string,
): Promise<{ run: DossierRun | null; rows: DossierRow[]; error: string | null }> {
  const [{ data: run, error: runErr }, { data: rows, error: rowErr }] = await Promise.all([
    supabase.from("blueprint_dossiers").select(RUN_SELECT).eq("blueprint_id", blueprintId).maybeSingle(),
    supabase.from("blueprint_dossier_sections").select(SECTION_SELECT).eq("blueprint_id", blueprintId),
  ]);
  return {
    run: (run as DossierRun | null) ?? null,
    rows: (rows as DossierRow[] | null) ?? [],
    error: friendlyError(runErr?.message ?? rowErr?.message),
  };
}

/* ── Layer 2: the owner's own version ──────────────────────────────────── */

export type OrgDossier = DossierRun & {
  blueprint_id: string | null;
  context: Partial<DossierContext>;
};

export async function getOrgDossier(
  orgId: string,
): Promise<{ dossier: OrgDossier | null; rows: DossierRow[]; error: string | null }> {
  const [{ data: d, error: dErr }, { data: rows, error: rowErr }] = await Promise.all([
    supabase.from("org_dossiers").select(`blueprint_id, context, ${RUN_SELECT}`)
      .eq("organization_id", orgId).maybeSingle(),
    supabase.from("org_dossier_sections").select(SECTION_SELECT).eq("organization_id", orgId),
  ]);
  return {
    dossier: (d as OrgDossier | null) ?? null,
    rows: (rows as DossierRow[] | null) ?? [],
    error: friendlyError(dErr?.message ?? rowErr?.message),
  };
}

/**
 * Save the owner's answers.
 *
 * Written from the browser rather than inside the edge function, because these
 * are the owner's own words about their own business and the ordinary tenant
 * policy already governs them. It also means the answers survive a run that
 * fails on its first section — they are not re-asked, which is the whole point
 * of storing them rather than passing them through.
 */
export async function saveDossierContext(
  orgId: string,
  blueprintId: string | null,
  context: DossierContext,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("org_dossiers").upsert(
    { organization_id: orgId, blueprint_id: blueprintId, context, run_error: null },
    { onConflict: "organization_id" },
  );
  return { error: friendlyError(error?.message) };
}

/** Throw away the owner's version and go back to the shared one. The answers go
 *  with it — "start again" that keeps the old answers is not starting again. */
export async function deleteOrgDossier(orgId: string): Promise<{ error: string | null }> {
  const { error: secErr } = await supabase.from("org_dossier_sections")
    .delete().eq("organization_id", orgId);
  if (secErr) return { error: friendlyError(secErr.message) };
  const { error } = await supabase.from("org_dossiers").delete().eq("organization_id", orgId);
  return { error: friendlyError(error?.message) };
}

/** Clear the written sections but keep the answers, for "write it again". */
export async function clearOrgSections(orgId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("org_dossier_sections").delete().eq("organization_id", orgId);
  if (error) return { error: friendlyError(error.message) };
  const { error: upErr } = await supabase.from("org_dossiers")
    .update({ status: "draft", run_error: null, run_finished_at: null })
    .eq("organization_id", orgId);
  return { error: friendlyError(upErr?.message) };
}

/* ── Generation ────────────────────────────────────────────────────────── */

/** supabase-js hides a function's own error message behind a generic one, so
 *  the real reason is dug out of the response body. Same idiom as runStep. */
async function invokeMessage(error: unknown): Promise<string> {
  const generic = (error as { message?: string })?.message ?? "That didn't work.";
  try {
    const ctx = await (error as { context?: Response }).context?.json?.();
    if (ctx?.error) return String(ctx.error);
  } catch {
    /* keep the generic message */
  }
  return generic;
}

export type RunTarget =
  | { scope: "blueprint"; blueprintId: string }
  | { scope: "org"; orgId: string };

/**
 * Generate one section.
 *
 * Returns what the next section would be, so the caller can drive the chain
 * without holding its own copy of the order — and the server derives `next`
 * from what is actually stored, so re-running one section in the middle resumes
 * correctly instead of restarting everything after it.
 */
export async function runDossierSection(
  target: RunTarget,
  section: DossierSection,
): Promise<{ next: DossierSection | null; done: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("dossier-run", {
    body: { ...target, section },
  });
  if (error) return { next: null, done: false, error: friendlyError(await invokeMessage(error)) };
  const d = (data ?? {}) as { next?: DossierSection | null; done?: boolean; error?: string };
  if (d.error) return { next: null, done: false, error: d.error };
  return { next: d.next ?? null, done: d.done === true, error: null };
}

/**
 * Fill in photographs for sections that named a subject but have not got one.
 *
 * Never calls the model — the subject was chosen and stored when the section was
 * written, and this only turns that string into a picture. Returns the count,
 * because a caller with no count cannot tell success from a silent no-op, which
 * is how a broken backfill hides.
 */
export async function fillDossierImages(target: RunTarget): Promise<{ filled: number; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("dossier-image", { body: target });
  if (error) return { filled: 0, error: friendlyError(await invokeMessage(error)) };
  const d = (data ?? {}) as { filled?: number; error?: string };
  if (d.error) return { filled: 0, error: d.error };
  return { filled: d.filled ?? 0, error: null };
}

/** Any section that named an image subject but has no picture yet. */
export function needsImages(rows: DossierRow[]): boolean {
  return rows.some((r) => {
    const c = r.content;
    if (!c || typeof c !== "object") return false;
    const q = (c as Record<string, unknown>).imageQuery;
    return typeof q === "string" && q.trim() !== "" && !(c as Record<string, unknown>).image;
  });
}
