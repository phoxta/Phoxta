import { useCallback, useEffect, useState } from "react";
import { Card, Chip, Empty, StatTile } from "@/components/dash/Ui";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  listObjectives, createObjective, updateObjective, removeObjective,
  listObjectiveRuns, todaysBudget, getCeilings, setCeilings,
  DEFAULT_CEILINGS,
  type Objective, type ObjectiveRun, type Budget, type Ceilings,
} from "@/lib/db/ops/autopilot";

/**
 * Autopilot.
 *
 * The Operator answers when spoken to. This is the same agent working when
 * nobody is: every few minutes it takes the objectives that are due, decides
 * one next action for each, and runs it through the same governed tools — so
 * per-tool policy, the approval queue and the audit log all still apply.
 *
 * Three things are on this panel on purpose, and they are the three questions
 * anyone asks before leaving something running unattended:
 *
 *   What is it trying to do?   — the objectives
 *   What has it actually done? — the run log, including every time it decided
 *                                to do nothing
 *   What can it cost me?       — today's spend against a hard daily ceiling
 *
 * An objective is created PAUSED. One that started the moment it was typed
 * would give nobody the chance to read it back before it acted.
 */

const SUGGESTIONS = [
  { goal: "Reply to every unanswered customer message within two hours during business hours.", guard: "Never discuss refunds or pricing changes — hand those to a human." },
  { goal: "Chase invoices that are more than seven days overdue, once a week, politely.", guard: "Never chase the same invoice twice in a week. Never chase anything under £20." },
  { goal: "Make sure every new order is acknowledged and moves out of pending within a day.", guard: "Do not cancel or refund anything." },
  { goal: "Keep unassigned conversations spread across the team so none is left sitting.", guard: "" },
];

const OUTCOME_TONE: Record<ObjectiveRun["outcome"], "ok" | "warn" | "danger" | "line" | "plain"> = {
  acted: "ok", queued: "warn", noop: "plain", halted: "warn", failed: "danger",
};

const when = (iso: string | null) => {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export function AutopilotPanel({ orgId }: { orgId: string }) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [runs, setRuns] = useState<ObjectiveRun[]>([]);
  const [budget, setBudget] = useState<Budget>({ actions: 0, calls: 0, emails: 0 });
  const [ceilings, setCaps] = useState<Ceilings>(DEFAULT_CEILINGS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ goal: "", guardrails: "", cadence: 60, max: 20 });
  const [focus, setFocus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, r, b, c] = await Promise.all([
      listObjectives(orgId), listObjectiveRuns(orgId, undefined, 60), todaysBudget(orgId), getCeilings(orgId),
    ]);
    if (o.error) toastError(o.error);
    setObjectives(o.data);
    setRuns(r.data);
    setBudget(b.data);
    setCaps(c.data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  async function add() {
    if (!draft.goal.trim()) return toastError("Say what the agent should be trying to do.");
    setBusy(true);
    const { error } = await createObjective(orgId, {
      goal: draft.goal, guardrails: draft.guardrails,
      cadenceMinutes: draft.cadence, maxActionsPerDay: draft.max,
    });
    setBusy(false);
    if (error) return toastError(error);
    setDraft({ goal: "", guardrails: "", cadence: 60, max: 20 });
    toast("Objective saved — paused. Read it back, then start it.");
    void load();
  }

  async function setStatus(o: Objective, status: Objective["status"]) {
    if (status === "active" && !(await confirmDanger(
      `Start "${o.goal.slice(0, 60)}"?\n\nThe agent will act on this on its own, up to ${o.max_actions_per_day} times a day. Anything its policy marks "approve" still waits for you.`,
    ))) return;
    const { error } = await updateObjective(o.id, { status });
    if (error) return toastError(error);
    toast(status === "active" ? "Running." : "Paused.");
    void load();
  }

  const shown = focus ? runs.filter((r) => r.objective_id === focus) : runs;
  const acted = runs.filter((r) => r.outcome === "acted").length;

  return (
    <div className="d-flex flex-column" style={{ gap: 12 }}>
      <Card title="Autopilot">
        <p className="hrx-note">
          The Operator answers when you ask. Autopilot is the same agent working when you are not —
          it checks each objective on its own schedule and does the single next thing it thinks is needed.
          Everything it does goes through the same permissions as the chat, so anything set to
          <strong> approve</strong> still waits for you in Approvals.
        </p>

        {/* The ceiling first. It is the answer to "what can this cost me", and
            nobody should have to hunt for it. */}
        <div className="hrx-statrow" style={{ marginTop: 10 }}>
          <StatTile tone="dark" label="Actions today" value={`${budget.actions} / ${ceilings.max_actions_per_day}`} />
          <StatTile label="Calls today" value={`${budget.calls} / ${ceilings.max_calls_per_day}`} />
          <StatTile label="Emails today" value={`${budget.emails} / ${ceilings.max_emails_per_day}`} />
          <StatTile label="Acted recently" value={acted} />
        </div>

        <details className="apx-details" style={{ marginTop: 10 }}>
          <summary>Daily limits</summary>
          <p className="hrx-note">
            Hard stops, enforced in the database rather than by the model — no instruction can talk its way past them.
            When a limit is reached the agent stops for the day and says so in the log.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-end">
            {([
              ["max_actions_per_day", "Actions"],
              ["max_calls_per_day", "Phone calls"],
              ["max_emails_per_day", "Emails"],
            ] as const).map(([k, label]) => (
              <label key={k} className="hrx-field mb-0" style={{ minWidth: 130 }}>
                <span>{label}</span>
                <input className="form-control form-control-sm" type="number" min={0} value={ceilings[k]}
                       onChange={(e) => setCaps({ ...ceilings, [k]: Math.max(0, Number(e.target.value)) })} />
              </label>
            ))}
            <button type="button" className="hrx-pill dark" disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const { error } = await setCeilings(orgId, ceilings);
                      setBusy(false);
                      if (error) toastError(error); else toast("Limits saved.");
                    }}>Save limits</button>
          </div>
        </details>
      </Card>

      {/* ── Objectives ──────────────────────────────────────────────────── */}
      <Card title={`Objectives (${objectives.length})`}>
        {loading ? (
          <p className="hrx-note mb-0" role="status">Loading…</p>
        ) : objectives.length === 0 ? (
          <Empty title="Nothing on autopilot yet">
            Give the agent a standing goal below. It starts paused, so nothing happens until you say so.
          </Empty>
        ) : (
          <ul className="apx-list">
            {objectives.map((o) => (
              <li key={o.id} className={focus === o.id ? "is-on" : ""}>
                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                  <p className="apx-goal">{o.goal}</p>
                  {o.guardrails && <p className="apx-guard">Never: {o.guardrails}</p>}
                  <p className="apx-meta">
                    every {o.cadence_minutes < 60 ? `${o.cadence_minutes}m` : `${Math.round(o.cadence_minutes / 60)}h`}
                    {" · "}up to {o.max_actions_per_day}/day
                    {" · "}last thought {when(o.last_run_at)}
                  </p>
                  {o.halted_reason && <p className="apx-halt">{o.halted_reason}</p>}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Chip tone={o.status === "active" ? "ok" : o.status === "stopped" ? "danger" : "plain"}>
                    {o.status === "active" ? "Running" : o.status === "stopped" ? "Stopped" : "Paused"}
                  </Chip>
                  <button type="button" className="hrx-seeall" onClick={() => setFocus(focus === o.id ? null : o.id)}>
                    {focus === o.id ? "All activity" : "Its activity"}
                  </button>
                  {o.status === "active" ? (
                    <button type="button" className="hrx-seeall" onClick={() => void setStatus(o, "paused")}>Pause</button>
                  ) : (
                    <button type="button" className="hrx-pill dark" onClick={() => void setStatus(o, "active")}>Start</button>
                  )}
                  <button type="button" className="hrx-seeall" onClick={async () => {
                    if (!(await confirmDanger("Delete this objective? Its activity log goes with it."))) return;
                    const { error } = await removeObjective(o.id);
                    if (error) toastError(error); else toast("Deleted.");
                    void load();
                  }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="apx-new">
          <label className="hrx-field">
            <span>What should it keep on top of?</span>
            <textarea className="form-control" rows={2} value={draft.goal}
                      placeholder="e.g. Reply to every unanswered customer message within two hours during business hours."
                      onChange={(e) => setDraft({ ...draft, goal: e.target.value })} />
          </label>
          <label className="hrx-field">
            <span>What must it never do?</span>
            <input className="form-control" value={draft.guardrails}
                   placeholder="e.g. Never discuss refunds — hand those to a human."
                   onChange={(e) => setDraft({ ...draft, guardrails: e.target.value })} />
          </label>
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <label className="hrx-field mb-0" style={{ minWidth: 130 }}>
              <span>Check every</span>
              <select className="form-select form-select-sm" value={draft.cadence}
                      onChange={(e) => setDraft({ ...draft, cadence: Number(e.target.value) })}>
                <option value={15}>15 minutes</option>
                <option value={60}>hour</option>
                <option value={240}>4 hours</option>
                <option value={1440}>day</option>
              </select>
            </label>
            <label className="hrx-field mb-0" style={{ minWidth: 130 }}>
              <span>At most, per day</span>
              <input className="form-control form-control-sm" type="number" min={0} value={draft.max}
                     onChange={(e) => setDraft({ ...draft, max: Math.max(0, Number(e.target.value)) })} />
            </label>
            <button type="button" className="hrx-pill primary" disabled={busy} onClick={() => void add()}>
              Add objective
            </button>
          </div>
          <div className="apx-sugg">
            <span className="hrx-note mb-0">Or start from one of these:</span>
            {SUGGESTIONS.map((s) => (
              <button key={s.goal} type="button" className="hrx-seeall"
                      onClick={() => setDraft({ ...draft, goal: s.goal, guardrails: s.guard })}>
                {s.goal.split(/[.,]/)[0]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── What it actually did ────────────────────────────────────────── */}
      <Card title={focus ? "Activity for this objective" : "Everything autopilot has done"}>
        {shown.length === 0 ? (
          <Empty title="Nothing yet">
            Once an objective is running, every decision appears here — including the times it looked and decided
            nothing needed doing, which is most of them.
          </Empty>
        ) : (
          <ul className="apx-runs">
            {shown.map((r) => (
              <li key={r.id}>
                <Chip tone={OUTCOME_TONE[r.outcome]}>{r.outcome}</Chip>
                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                  <p className="apx-reason">{r.reason || "(no reason recorded)"}</p>
                  {r.tool && <p className="apx-tool"><code>{r.tool}</code> {r.result}</p>}
                </div>
                <span className="apx-when">{when(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.apx-list{list-style:none;margin:0;padding:0;border:1px solid var(--hrx-border);border-radius:14px;overflow:hidden}
.apx-list li{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-bottom:1px solid var(--hrx-border-soft,var(--hrx-border));flex-wrap:wrap}
.apx-list li:last-child{border-bottom:0}
.apx-list li.is-on{background:var(--hrx-soft)}
.apx-goal{margin:0;font-size:14px;font-weight:600;color:var(--hrx-ink)}
.apx-guard{margin:2px 0 0;font-size:12.5px;color:#b45309}
.apx-meta{margin:3px 0 0;font-size:12px;color:var(--hrx-muted)}
.apx-halt{margin:4px 0 0;font-size:12.5px;color:#dc2626}
.apx-new{margin-top:14px;padding-top:14px;border-top:1px solid var(--hrx-border-soft,var(--hrx-border))}
.apx-sugg{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
.apx-runs{list-style:none;margin:0;padding:0}
.apx-runs li{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--hrx-border-soft,var(--hrx-border))}
.apx-runs li:last-child{border-bottom:0}
.apx-reason{margin:0;font-size:13.5px;color:var(--hrx-ink)}
.apx-tool{margin:2px 0 0;font-size:12px;color:var(--hrx-muted)}
.apx-tool code{font-size:11.5px;background:var(--hrx-soft);padding:1px 5px;border-radius:5px}
.apx-when{flex:0 0 auto;font-size:12px;color:var(--hrx-muted);white-space:nowrap}
.apx-details summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--hrx-ink);padding:6px 0}
.apx-details[open] summary{margin-bottom:6px}
`;
