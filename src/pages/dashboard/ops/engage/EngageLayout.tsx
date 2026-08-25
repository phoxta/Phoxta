import { NavLink, Outlet, useOutletContext } from "react-router-dom";

/**
 * Engage — the one tab for everything customer-messaging.
 *
 * Inbox, Audience, Flows, Journeys, Broadcasts, Channels, Agent and Insights
 * are areas of ONE module because they are views over one spine: a contact,
 * reached through a channel, acted on by flows/journeys/broadcasts, answered
 * by the AI or a human in the Inbox. The rail keeps each one click from the
 * others — a conversation escalates into a flow edit, a flow ends in a
 * segment, a segment feeds a broadcast, and it all lands back in the Inbox.
 *
 * This layout is chrome only (rail + outlet); every area owns its content.
 * The old top-level Inbox / Marketing / AI Agent tab URLs redirect here.
 */

const AREAS: { seg: string; label: string; hint: string; end?: boolean }[] = [
  { seg: "inbox", label: "Inbox", hint: "Live conversations" },
  { seg: "calls", label: "Calls", hint: "Voice, live & recorded" },
  { seg: "audience", label: "Audience", hint: "Contacts & segments" },
  { seg: "flows", label: "Flows", hint: "Chat automation" },
  { seg: "journeys", label: "Journeys", hint: "Lifecycle automation" },
  { seg: "broadcasts", label: "Broadcasts", hint: "One-off sends" },
  { seg: "channels", label: "Channels", hint: "Where you're reachable" },
  { seg: "agent", label: "Agent", hint: "The AI brain" },
  { seg: "insights", label: "Insights", hint: "What it all earned" },
];

const CSS = `
.egx { display: grid; grid-template-columns: 192px minmax(0, 1fr); gap: 16px; align-items: start; }
.egx-rail { display: flex; flex-direction: column; gap: 2px; background: var(--hrx-card);
  border: 1px solid var(--hrx-border-soft); border-radius: 16px; padding: 8px; }
.egx-link { display: block; padding: 9px 12px; border-radius: 11px; text-decoration: none; min-width: 0; }
.egx-link .l { display: block; font-size: 14px; font-weight: 600; color: var(--hrx-ink); line-height: 1.2; }
.egx-link .h { display: block; font-size: 11.5px; color: var(--hrx-muted); margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.egx-link:hover { background: var(--hrx-soft); }
.egx-link.active { background: var(--hrx-ink); }
.egx-link.active .l { color: #fff; }
.egx-link.active .h { color: rgba(255, 255, 255, 0.65); }
.egx-main { min-width: 0; }
@media (max-width: 899.98px) {
  .egx { grid-template-columns: minmax(0, 1fr); }
  .egx-rail { flex-direction: row; overflow-x: auto; scrollbar-width: none; }
  .egx-rail::-webkit-scrollbar { display: none; }
  .egx-link { flex-shrink: 0; }
  .egx-link .h { display: none; }
}
`;

export default function EngageLayout() {
  // A nested <Outlet /> SHADOWS the parent's outlet context — the Inbox and
  // Agent pages read OperatingLayout's OpsContext via useOutletContext, so it
  // must be forwarded through this layer or they render against undefined.
  const ops = useOutletContext();
  return (
    <div className="egx">
      <style>{CSS}</style>
      <nav className="egx-rail" aria-label="Engage areas">
        {AREAS.map((a) => (
          <NavLink key={a.seg} to={a.seg} end={a.end} className={({ isActive }) => `egx-link${isActive ? " active" : ""}`}>
            <span className="l">{a.label}</span>
            <span className="h">{a.hint}</span>
          </NavLink>
        ))}
      </nav>
      <div className="egx-main">
        <Outlet context={ops} />
      </div>
    </div>
  );
}
