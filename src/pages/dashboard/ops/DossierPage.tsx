import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader, Empty } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { can } from "@/lib/ops/permissions";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery } from "@/lib/cache/dashboardQueries";
import { isPlatformAdmin } from "@/lib/db/platform";
import {
  EMPTY_CONTEXT, blueprintForBusiness, deleteOrgDossier, fillDossierImages,
  getBlueprintDossier, getOrgDossier, listDossierBlueprints, needsImages, runDossierSection,
  saveDossierContext,
  type DossierBlueprint, type DossierContext, type DossierRow, type DossierRun, type OrgDossier,
  type RunTarget,
} from "@/lib/db/dossier";
import {
  ESTIMATED_SECONDS, GROUPS, TOTAL_SECTIONS, completedSections, getSection, humanDuration,
  nextSection, progressPercent, remainingSeconds, sectionIndex, TAB_KEYS,
  type DossierSection, type DossierTab,
} from "@/lib/dossier/sections";
import DossierSlide from "./dossier/DossierSlide";
import ContextDialog from "./dossier/ContextDialog";
import "./dossier.css";

/**
 * The Playbook — everything a buyer needs to know about the business they just
 * bought, and everything they need to run it.
 *
 * TWO LAYERS, AND THE READER IS ALWAYS TOLD WHICH ONE THEY ARE ON
 *
 * By default this page shows the SHARED dossier: one per blueprint, written
 * once by Phoxta, identical for every business built from it. That is the
 * honest default — the analysis is about the trade, not about a particular shop
 * — and the banner above the slide says so in those words rather than letting
 * someone assume a general document was written for them.
 *
 * When the owner asks, and only then, they answer six questions and the whole
 * dossier is rewritten around their location, their slice of the market and
 * their budget. Their version never silently replaces the shared one: both stay
 * on the page, the switch shows which is on screen, and going back is one click.
 *
 * ONE SECTION PER CALL. A Supabase function is killed at 150s idle and a full
 * dossier is minutes of model time, so the chain is driven from here a section
 * at a time. A closed tab costs one section rather than the document, and after
 * every section the page re-reads what is actually stored rather than trusting
 * its own loop — which is what makes two tabs, or two people, advancing the same
 * dossier safe.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_SPARK = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
const I_GLOBE = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>;

type View = "global" | "mine";

export default function DossierPage() {
  const { orgId, org } = useOutletContext<OpsContext>();

  const [bp, setBp] = useState<DossierBlueprint | null>(null);
  // Separate from `bp` because "still looking" and "there isn't one" need
  // different screens, and null cannot say which it is.
  const [bpResolved, setBpResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [globalRun, setGlobalRun] = useState<DossierRun | null>(null);
  const [globalRows, setGlobalRows] = useState<DossierRow[]>([]);
  const [orgDossier, setOrgDossier] = useState<OrgDossier | null>(null);
  const [orgRows, setOrgRows] = useState<DossierRow[]>([]);

  const [view, setView] = useState<View>("global");
  const [tab, setTab] = useState<DossierTab>("industry");
  const [running, setRunning] = useState<DossierSection | null>(null);
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Phoxta's own side of the page: only a platform admin may write the shared
  // dossier, and only they see the controls that do it.
  const [admin, setAdmin] = useState(false);
  const [allBlueprints, setAllBlueprints] = useState<DossierBlueprint[]>([]);
  const [pick, setPick] = useState("");

  const chainRef = useRef(false);
  // The tab follows the run once, on load. After that it follows the reader:
  // yanking the pane away mid-paragraph because a background section landed is
  // the kind of helpfulness nobody asked for.
  const tabPinned = useRef(false);
  // The same rule for which version is on screen. Landing on the owner's own
  // version is right on arrival and wrong every time after: a reader who has
  // deliberately switched to the global picture must not be thrown back to
  // theirs because a background reload happened to run.
  const viewPinned = useRef(false);
  // Once per mount, per layer. A search that finds nothing must not become a
  // request on every render for the rest of the session.
  const imagesTried = useRef({ global: false, mine: false });

  const myRole = useCachedData(organizationsQuery.key, organizationsQuery.fetch)
    .data?.find((m) => m.organization.id === orgId)?.role ?? null;
  // The null guard is deliberate: without it the button flickers to disabled
  // while the membership cache warms. The edge function is the real gate.
  const mayLocalise = myRole === null || can(myRole, "manage_settings");

  /* ── Which blueprint's dossier is on screen ─────────────────────────── */

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await blueprintForBusiness(org);
      if (!active) return;
      setBp(data);
      setBpResolved(true);
    })();
    return () => { active = false; };
  }, [org]);

  useEffect(() => {
    let active = true;
    isPlatformAdmin()
      .then(async (ok) => {
        if (!active || !ok) return;
        setAdmin(true);
        const { data } = await listDossierBlueprints();
        if (active) setAllBlueprints(data);
      })
      .catch(() => { /* not an admin — the controls simply never appear */ });
    return () => { active = false; };
  }, []);

  // Phoxta's own business is not built from a blueprint, so on its console
  // there is nothing to resolve — and without this the admin would be shown the
  // "no blueprint" screen with the picker that fixes it stranded below it.
  useEffect(() => {
    if (bpResolved && !bp && admin && !pick && allBlueprints.length > 0) setPick(allBlueprints[0].id);
  }, [bpResolved, bp, admin, pick, allBlueprints]);

  const picked = allBlueprints.find((b) => b.id === pick) ?? null;
  const blueprint = picked ?? bp;
  const blueprintId = blueprint?.id ?? "";

  /* ── Load ───────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const [g, o] = await Promise.all([
      blueprintId ? getBlueprintDossier(blueprintId) : Promise.resolve({ run: null, rows: [], error: null }),
      getOrgDossier(orgId),
    ]);
    setGlobalRun(g.run);
    setGlobalRows(g.rows);
    setOrgDossier(o.dossier);
    setOrgRows(o.rows);
    setLoading(false);
    return { global: g.rows, mine: o.rows };
  }, [blueprintId, orgId]);

  useEffect(() => {
    void (async () => {
      const rows = await load();
      const mineDone = completedSections(rows.mine);
      // Land on the owner's own version when they have one — it is the thing
      // they asked for, and showing the shared picture instead would read as
      // the localisation not having worked. Once only; see viewPinned.
      if (!viewPinned.current) {
        if (mineDone.length > 0) setView("mine");
        viewPinned.current = true;
      }
      // Nothing to pin to until the blueprint has resolved, unless the owner's
      // own version is already there — pinning early would leave the reader on
      // section one of a dossier that was fully written.
      if (!tabPinned.current && (blueprintId || mineDone.length > 0)) {
        const done = mineDone.length > 0 ? mineDone : completedSections(rows.global);
        setTab(done.length > 0 ? done[done.length - 1] : "industry");
        tabPinned.current = true;
      }
    })();
    return () => { chainRef.current = false; };
  }, [load, blueprintId]);

  // Sections written before their photograph resolved (a bad afternoon at
  // Pexels) get one quiet backfill, and the page reloads only if something
  // landed — a reader should not watch it flicker for nothing.
  useEffect(() => {
    void (async () => {
      if (blueprintId && !imagesTried.current.global && needsImages(globalRows)) {
        imagesTried.current.global = true;
        const { filled } = await fillDossierImages({ scope: "blueprint", blueprintId });
        if (filled > 0) await load();
      }
      if (!imagesTried.current.mine && needsImages(orgRows)) {
        imagesTried.current.mine = true;
        const { filled } = await fillDossierImages({ scope: "org", orgId });
        if (filled > 0) await load();
      }
    })();
  }, [blueprintId, orgId, globalRows, orgRows, load]);

  /* ── Running the chain ──────────────────────────────────────────────── */

  const runChain = useCallback(async (target: RunTarget, done: string) => {
    chainRef.current = true;
    const which = target.scope === "org" ? "mine" : "global";
    // Where to start is read from the database, not from this component's state.
    // The caller may have just deleted the previous version (Change my answers
    // does exactly that), and a start point computed from a stale render would
    // skip straight past every section that used to exist.
    const start = await load();
    let step = nextSection(completedSections(which === "mine" ? start.mine : start.global));

    while (step && chainRef.current) {
      setRunning(step);
      setTab(step);
      const { error } = await runDossierSection(target, step);
      setRunning(null);
      if (error) {
        chainRef.current = false;
        toastError(error);
        await load();
        return;
      }
      // Re-read what is stored rather than trusting the loop, so nothing runs
      // twice if another tab (or another admin) advanced the same dossier.
      const fresh = await load();
      step = nextSection(completedSections(which === "mine" ? fresh.mine : fresh.global));
    }

    if (chainRef.current) toast(done);
    chainRef.current = false;
  }, [load]);

  /* ── Make it mine ───────────────────────────────────────────────────── */

  async function startMine(context: DossierContext) {
    setSaving(true);
    const { error } = await saveDossierContext(orgId, blueprintId || null, context);
    if (error) { setSaving(false); toastError(error); return; }
    // DELIBERATELY NOT CLEARING FIRST. The old sections do answer the old
    // questions, so wiping them looks tidy — but the rewrite is nine model calls
    // and any one of them can fail on an outage, a rate limit or an expired key.
    // Clearing up front means a failure at section one leaves an owner with
    // nothing at all, having pressed a button that promised them something
    // better. Each section is an upsert keyed on (organization_id, section), so
    // the chain replaces them one at a time: worst case the owner keeps a mix of
    // new and previous sections, every one of which is a real answer, and can
    // press the button again. The rail marks which are from the current answers.
    setSaving(false);
    setAsking(false);
    setView("mine");
    await load();
    await runChain({ scope: "org", orgId }, "Your version is written.");
  }

  async function startAgain() {
    if (!confirmDanger("Delete your version and go back to the global picture? Your answers go with it.")) return;
    const { error } = await deleteOrgDossier(orgId);
    if (error) { toastError(error); return; }
    setView("global");
    imagesTried.current.mine = false;
    await load();
    toast("Back to the global picture.");
  }

  /* ── Derived ────────────────────────────────────────────────────────── */

  const rows = view === "mine" ? orgRows : globalRows;
  const bySection = new Map(rows.map((r) => [r.section, r.content]));
  const done = completedSections(rows);
  const pct = progressPercent(done);
  const upNext = nextSection(done);
  const mineExists = completedSections(orgRows).length > 0 || orgDossier !== null;
  // Localising rewrites the shared dossier around someone's answers. With no
  // shared dossier to rewrite there is nothing to offer, so the button says so
  // rather than starting a run whose baseline does not exist.
  const globalReady = completedSections(globalRows).length > 0;
  const runState = view === "mine" ? orgDossier : globalRun;
  const spec = getSection(tab);
  const content = tab === "legal" ? {} : bySection.get(tab);
  const tabReady = tab === "legal" || (done as string[]).includes(tab);

  // `bpResolved` matters as much as `loading`: rendering before it is known
  // whether this business has a blueprint flashes the "nothing here" screen at
  // people who do have one.
  if (loading || !bpResolved) {
    return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</div>;
  }

  if (!blueprint) {
    return (
      <div className="hrx-card hrx-pad">
        <Empty title="No blueprint behind this business yet">
          The Playbook is written per blueprint — the industry, the competition, the numbers and the
          operating manual for that trade. This business is not linked to one, so there is nothing to
          show. Open it from a business you bought in the marketplace, or ask Phoxta to link it.
        </Empty>
      </div>
    );
  }

  const seed = `${blueprint.name} ${blueprint.vertical ?? ""} ${org.name}`;

  return (
    <div>
      <PageHeader
        crumb={org.name}
        title="Playbook"
        note={`Everything behind ${blueprint.name}: the industry, the competition, the strategy, and the documents you need to run it.`}
        tabs={
          <div className="bdx-switch" role="group" aria-label="Which version">
            <button type="button" aria-pressed={view === "global"} onClick={() => setView("global")}>
              The global picture
            </button>
            <button type="button" aria-pressed={view === "mine"} disabled={!mineExists}
                    onClick={() => setView("mine")}>
              Yours
            </button>
          </div>
        }
      />

      {/* Which version is on screen, said in the owner's words. It is not a
          toast: "you are reading the shared picture" is a fact about the page
          for as long as it is true, not an event that happened once. */}
      <div className={`bdx-source${view === "mine" ? " bdx-source--mine" : ""}`}>
        <span className="bdx-source__txt">
          {view === "global" ? (
            globalReady ? (
              <>
                <b>This is the global picture.</b> Every {blueprint.name} owner reads exactly this — it is
                about the trade, not about your shop. It does not know where you are trading, who you are
                selling to or what you can spend.
              </>
            ) : (
              <>
                <b>Phoxta has not written this one yet.</b> The {blueprint.name} playbook is written once
                and arrives for every owner of this blueprint at the same time. Nothing here is waiting
                on you.
              </>
            )
          ) : (
            <>
              <b>This is your version.</b> Written around the answers you gave
              {orgDossier?.context?.location ? ` for ${orgDossier.context.location}` : ""}. The global
              picture is still there whenever you want to compare.
            </>
          )}
        </span>
        <div className="d-flex gap-2 flex-wrap">
          {view === "global" && mayLocalise && globalReady && (
            <button type="button" className="hrx-pill dark" disabled={running !== null}
                    onClick={() => setAsking(true)}>
              {I_SPARK} {mineExists ? "Change my answers" : "Make it mine"}
            </button>
          )}
          {view === "mine" && (
            <>
              <button type="button" className="hrx-pill" onClick={() => setView("global")}>
                {I_GLOBE} See the global picture
              </button>
              {mayLocalise && (
                <>
                  <button type="button" className="hrx-pill" disabled={running !== null}
                          onClick={() => setAsking(true)}>
                    Change my answers
                  </button>
                  <button type="button" className="hrx-pill" disabled={running !== null}
                          onClick={() => void startAgain()}>
                    Start again
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Phoxta's own strip. The shared dossier is written once and read by
          every buyer, so only a platform admin can write it — and nobody else
          ever sees that it can be written. */}
      {admin && (
        <div className="bdx-source">
          <span className="bdx-source__txt">
            <b>Phoxta only.</b> This writes the shared dossier that every buyer of this blueprint reads.
            It is generated once and costs nothing per customer — regenerate it when the trade has moved,
            not per business.
          </span>
          <div className="d-flex gap-2 flex-wrap align-items-center">
            {allBlueprints.length > 0 && (
              <select className="form-select form-select-sm w-auto" value={pick}
                      aria-label="Which blueprint's dossier"
                      onChange={(e) => { setPick(e.target.value); tabPinned.current = false; imagesTried.current.global = false; }}>
                <option value="">{bp ? `${bp.name} (this business)` : "Choose a blueprint"}</option>
                {allBlueprints.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button type="button" className="hrx-pill" disabled={running !== null || !blueprintId}
                    onClick={() => void runChain({ scope: "blueprint", blueprintId }, "Shared dossier written.")}>
              {completedSections(globalRows).length === 0
                ? "Write the shared dossier"
                : completedSections(globalRows).length < TOTAL_SECTIONS
                  ? "Carry on writing it"
                  : "It is complete"}
            </button>
          </div>
        </div>
      )}

      {runState?.run_error && (
        <div className="alert alert-warning py-2 px-3" role="alert" style={{ fontSize: 14 }}>
          The last run stopped: {runState.run_error}
        </div>
      )}

      <div className="row g-4">
        {/* ── Rail: progress, then the sections ─────────────────────────── */}
        <div className="col-lg-4 col-xl-3">
          <div className="bdx-rail">
            <div className="bdx-rail__card">
              <div className="d-flex align-items-baseline justify-content-between mb-15">
                <span style={{ fontSize: 13, color: "var(--hrx-muted)" }}>
                  {done.length} of {TOTAL_SECTIONS} written
                </span>
                <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{pct}%</span>
              </div>

              <div className="bdx-bar">
                {GROUPS.map((g) => (
                  <div key={g.name} className="bdx-bar__group">
                    {g.keys.filter((k) => k !== "legal").map((k) => {
                      const isDone = (done as string[]).includes(k);
                      const isRunning = running === k;
                      const tone = view === "mine" ? "mine" : "done";
                      return (
                        <span key={k}
                              className={`bdx-seg${isDone || isRunning ? ` bdx-seg--${tone}` : ""}${isRunning ? " bdx-seg--current" : ""}`} />
                      );
                    })}
                  </div>
                ))}
              </div>

              {running ? (
                <>
                  <p className="mb-0 mt-15" style={{ fontSize: 13, color: "var(--hrx-muted)" }}>
                    Writing {getSection(running)?.name.toLowerCase()} — {humanDuration(remainingSeconds(done))} left.
                  </p>
                  <button type="button" className="hrx-pill mt-15"
                          onClick={() => { chainRef.current = false; toast("Stopping after this section."); }}>
                    Stop after this one
                  </button>
                </>
              ) : upNext ? (
                <p className="mb-0 mt-15" style={{ fontSize: 13, color: "var(--hrx-muted)" }}>
                  {done.length === 0
                    ? view === "mine"
                      ? `Nothing written yet — ${humanDuration(ESTIMATED_SECONDS)} once it starts.`
                      : "Phoxta has not written this one yet."
                    : `${humanDuration(remainingSeconds(done))} of writing left.`}
                </p>
              ) : (
                <p className="mb-0 mt-15" style={{ fontSize: 13, color: "var(--hrx-muted)" }}>
                  Every section written.
                </p>
              )}
            </div>

            <nav className="bdx-tabs" aria-label="Dossier sections">
              {GROUPS.map((g) => (
                <div key={g.name}>
                  <p className="bdx-tabs__group">{g.name}</p>
                  {g.keys.map((key) => {
                    const s = getSection(key);
                    const isDone = key === "legal" || (done as string[]).includes(key);
                    const isRunning = running === key;
                    const dot = isRunning ? "is-running"
                      : key === "legal" ? "is-static"
                        : isDone ? (view === "mine" ? "is-mine" : "is-done") : "";
                    return (
                      <button key={key} type="button" onClick={() => setTab(key)}
                              aria-current={tab === key ? "true" : undefined}
                              className={`bdx-tab${tab === key ? " bdx-tab--on" : ""}`}>
                        <span className={`bdx-tab__dot ${dot}`} />
                        <span className="bdx-tab__n">
                          {key === "legal" ? "§" : String(sectionIndex(key) + 1).padStart(2, "0")}
                        </span>
                        <span className="bdx-tab__name">{s?.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* ── Pane: the section itself ──────────────────────────────────── */}
        <div className="col-lg-8 col-xl-9">
          {tabReady && (content != null || tab === "legal") ? (
            <DossierSlide
              section={tab}
              content={content}
              seed={seed}
              mine={view === "mine"}
              blueprintSlug={blueprint.slug}
              vertical={org.vertical}
            />
          ) : (
            <div className="hrx-card hrx-pad">
              <span style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--hrx-muted)" }}>
                {String(sectionIndex(tab) + 1).padStart(2, "0")} of {TAB_KEYS.length} — {spec?.group}
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 600, margin: "10px 0 8px" }}>{spec?.name}</h2>
              <p style={{ color: "var(--hrx-muted)", marginBottom: 18 }}>{spec?.description}</p>
              {running === tab ? (
                <p className="mb-0" style={{ fontSize: 14 }}>Writing this one now — {spec?.seconds}s or so.</p>
              ) : view === "mine" ? (
                <p className="mb-0" style={{ fontSize: 14 }}>
                  Not written yet. It is next in line once the rest of your version finishes —
                  or switch to the global picture to read Phoxta's version of it now.
                </p>
              ) : (
                <p className="mb-0" style={{ fontSize: 14 }}>
                  Phoxta has not written this section for {blueprint.name} yet. It arrives for every
                  owner of this blueprint at once, so there is nothing to do here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {asking && (
        <ContextDialog
          initial={{ ...EMPTY_CONTEXT, ...(orgDossier?.context ?? {}) }}
          prefillLocation={org.profile?.address || org.primary_region || ""}
          busy={saving}
          onCancel={() => setAsking(false)}
          onSubmit={(c) => void startMine(c)}
        />
      )}
    </div>
  );
}
