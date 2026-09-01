import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { Card, Empty } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";
import { listDesigns, getDesign, archiveDesign, type Design } from "@/lib/db/designs";
import { DesignSvg } from "@/lib/designs/render";
import { getTemplate } from "@/lib/designs/templates";
import { slidesOf } from "@/lib/designs/types";
import { EmailIndex } from "./designs/EmailIndex";
import { NewDesign } from "./designs/NewDesign";
import { ScheduleDialog } from "./designs/ScheduleDialog";
import { SocialAccounts } from "./designs/SocialAccounts";
import { CalendarDialog } from "./designs/CalendarDialog";
import { PlanDialog } from "./designs/PlanDialog";
import { SocialQueue } from "./designs/SocialQueue";
import { Editor } from "./designs/Editor";
import "./designs.css";

/**
 * Graphics — social posts from the Digital Agency template pack.
 *
 * Two ways to make one, both writing to the same document: type into it, or
 * describe it and let the agent write it. There is no separate "AI mode" — the
 * generator fills the same content map the fields edit, which is what lets a
 * generated post be hand-corrected immediately instead of regenerated until it
 * happens to come out right.
 *
 * This file is the SHELL: the tabs, the library grid and the dialogs. The
 * editor itself lives in designs/Editor.tsx — it used to be inlined here, and
 * an 860-line component inside the page that also owns the library made both
 * halves unreadable.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_CAL = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" /></svg>;
const I_LINK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" /></svg>;
const I_SPARK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;

export default function DesignsPage() {
  const { orgId, org } = useOutletContext<OpsContext>();

  const [rows, setRows] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Design | null>(null);
  /* ── URL state (U10) ───────────────────────────────────────────────────
     The tab and the open design live in the URL — ?mode=email and
     ?design=<id> — so a refresh restores the place, a deep link opens the
     right thing, and the browser's Back closes the editor instead of leaving
     the page (the param pops; the effect below follows it). Every write here
     MERGES into the current params, never replaces them wholesale: ?social=
     (the OAuth return, read by SocialAccounts) and ?email=/?slug= (read by
     EmailIndex) must survive our writes. */
  const [params, setParams] = useSearchParams();
  const designParam = params.get("design");
  // Two things are made in this studio: pictures and email. They share the
  // library, the asset store and the person doing the work, and they do not
  // share a canvas — see the note at the top of EmailComposer for why an SVG
  // artboard cannot be one.
  //
  // Held as state and FOLLOWED from the URL rather than derived live from it:
  // EmailIndex clears the query string once it has read its parameters, and a
  // mode computed straight off the URL would snap back to Graphics mid-read,
  // unmounting the very composer the parameter opened.
  const [mode, setMode] = useState<"graphics" | "email">(() =>
    params.get("mode") === "email" || params.has("email") ? "email" : "graphics");
  useEffect(() => {
    // ?email=… (the blog console's "Send as email" hand-off) implies the email
    // tab even without ?mode= — the component that reads it only exists there.
    if (params.get("mode") === "email" || params.has("email")) setMode("email");
    else if (params.get("mode") === "graphics") setMode("graphics");
    // No verdict in the URL: leave the tab where the person put it.
  }, [params]);

  const switchMode = (m: "graphics" | "email") => {
    setMode(m);
    const next = new URLSearchParams(params);
    if (m === "email") next.set("mode", m); else next.delete("mode");
    // replace, not push: flipping tabs should not make Back a tour of them.
    setParams(next, { replace: true });
  };
  /** The design being scheduled out to social. */
  const [scheduling, setScheduling] = useState<Design | null>(null);
  /** The connected-accounts dialog. */
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await listDesigns(orgId);
    if (error) toastError(error);
    setRows(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  /** Open the editor: state now, URL pushed — so the browser's Back closes it. */
  const openDesign = (d: Design) => {
    setOpen(d);
    const next = new URLSearchParams(params);
    next.set("design", d.id);
    setParams(next);
  };

  /** Close the editor: REPLACE the URL rather than push, so Back from the
   *  library does not step onto the editor entry just left and reopen it. */
  const closeDesign = () => {
    setOpen(null);
    const next = new URLSearchParams(params);
    next.delete("design");
    setParams(next, { replace: true });
    void load();
  };

  // The URL is the truth for which design is open. This covers restore on
  // mount (refresh, deep link) AND popstate (Back/Forward): the param moves,
  // this follows. The row is usually in the loaded list; a deep link that
  // beats the list — or points at a row the list filters out — is fetched
  // directly rather than met with a blank page.
  useEffect(() => {
    if (!designParam) {
      if (open) { setOpen(null); void load(); }
      return;
    }
    if (open?.id === designParam) return;
    const found = rows.find((r) => r.id === designParam);
    if (found) { setOpen(found); return; }
    let alive = true;
    void (async () => {
      const { data } = await getDesign(designParam);
      if (!alive) return;
      if (data) setOpen(data);
      else {
        // A dead link. Dropping the param beats an editor that cannot load.
        const next = new URLSearchParams(window.location.search);
        next.delete("design");
        setParams(next, { replace: true });
        toastError("That design could not be found.");
      }
    })();
    return () => { alive = false; };
    // `open` and `load` change identity without changing what this decides;
    // designParam and rows are the two facts it acts on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designParam, rows]);

  if (open) {
    return (
      <>
        <Editor
          design={open}
          orgName={org?.name ?? "your business"}
          onClose={closeDesign}
          onConnectAccounts={() => setAccountsOpen(true)}
        />
        {/* The editor replaces the whole page, but "connect an account" must
            still work from its Schedule dialog — so the accounts dialog rides
            along, and keeps reading the ?social= OAuth return while the
            editor is open. */}
        <SocialAccounts orgId={orgId} open={accountsOpen} onClose={() => setAccountsOpen(false)} />
      </>
    );
  }

  return (
    <div className="d-flex flex-column" style={{ gap: 8 }}>
      {/* No page header. The tabs and the two start buttons say what this is,
          and a crumb, a title, a paragraph and a counter above them pushed the
          work itself below the fold. */}
      <div className="d-flex gap-2">
        {(["graphics", "email"] as const).map((m) => (
          <button key={m} type="button" className={`hrx-seeall${mode === m ? " opx-solid" : ""}`}
                  onClick={() => switchMode(m)}>
            {m === "graphics" ? "Graphics" : "Email"}
          </button>
        ))}
      </div>

      {mode === "email" ? <EmailIndex orgId={orgId} /> : <>

      <NewDesign
        orgId={orgId}
        onMade={openDesign}
        extra={
          <>
            <button type="button" className="dsn-btn" onClick={() => setPlanOpen(true)}>
              {I_SPARK}Plan a month
            </button>
            <button type="button" className="dsn-btn" onClick={() => setCalendarOpen(true)}>
              {I_CAL}Calendar
            </button>
            <button type="button" className="dsn-btn" onClick={() => setAccountsOpen(true)}>
              {I_LINK}Accounts
            </button>
          </>
        }
      />

      <Card title="Your posts">
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty title="Nothing here yet">
            Start from a template above, or describe the post you want and the agent will draft it.
          </Empty>
        ) : (
          <div className="dsn-grid">
            {rows.map((d) => (
              <article key={d.id} className="dsn-tile">
                <button type="button" className="dsn-tile__art" onClick={() => openDesign(d)}
                        aria-label={`Open ${d.title}`}>
                  <DesignSvg doc={slidesOf(d.doc, d.template_id)[0]} width={260} />
                  {slidesOf(d.doc, d.template_id).length > 1 && (
                    <span className="dsn-tile__count">
                      {slidesOf(d.doc, d.template_id).length} slides
                    </span>
                  )}
                </button>
                <div className="dsn-tile__foot">
                  <div style={{ minWidth: 0 }}>
                    <span className="dsn-tile__name">{d.title}</span>
                    <span className="dsn-tile__meta">
                      {getTemplate(d.template_id)?.name ?? d.template_id}
                    </span>
                  </div>
                  <button
                    type="button" className="dsn-tile__go"
                    onClick={() => setScheduling(d)}
                    aria-label={`Schedule ${d.title}`}
                    title="Schedule this post"
                  >Schedule</button>
                  <button
                    type="button" className="dsn-x"
                    onClick={async () => {
                      if (!(await confirmDanger(`Archive "${d.title}"?`))) return;
                      const { error } = await archiveDesign(d.id);
                      if (error) return toastError(error);
                      toast("Archived.");
                      await load();
                    }}
                    aria-label={`Archive ${d.title}`}
                  >×</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <SocialQueue orgId={orgId} />

      {/* Stays mounted whether or not it is showing: it is what reads the
          ?social= parameter the platform sends the browser back with, and a
          connection whose outcome nobody sees is a connection nobody trusts. */}
      <SocialAccounts orgId={orgId} open={accountsOpen} onClose={() => setAccountsOpen(false)} />

      {/* Mounted only while open, unlike SocialAccounts: nothing sends the
          browser back here with a parameter for it to read, and a month of
          three tables is not worth fetching for a dialog nobody opened. */}
      <CalendarDialog orgId={orgId} open={calendarOpen} onClose={() => setCalendarOpen(false)} />

      <PlanDialog orgId={orgId} open={planOpen} onClose={() => setPlanOpen(false)} />

      {scheduling && (
        <ScheduleDialog orgId={orgId} design={scheduling} onClose={() => setScheduling(null)} />
      )}
    </>}
    </div>
  );
}
