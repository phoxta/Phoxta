import { Link, useOutletContext } from "react-router-dom";
import { Card, PageHeader } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";

type Hub = "run" | "grow" | "setup";

type Action = { title: string; note: string; to: string; label: string };

const CSS = `
.ohx-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; }
.ohx-card { min-height:166px; display:flex; flex-direction:column; }
.ohx-card h2 { font-size:17px; letter-spacing:-.02em; margin:0 0 8px; }
.ohx-card p { font-size:14px; line-height:1.5; color:var(--hrx-muted); margin:0; }
.ohx-card a { margin-top:auto; padding-top:18px; font-size:13px; font-weight:650; color:var(--hrx-ink); text-decoration:none; }
.ohx-card a:hover { text-decoration:underline; }
`;

export default function OwnerHubPage({ hub }: { hub: Hub }) {
  const { orgId, org, console } = useOutletContext<OpsContext>();
  const base = `/dashboard/businesses/${orgId}/ops`;
  const businessBase = `/dashboard/businesses/${orgId}`;
  const booking = console.booking === "appointments" ? "Appointments" : console.booking === "reservations" ? "Bookings" : null;

  const content: Record<Hub, { crumb: string; title: string; note: string; actions: Action[] }> = {
    run: {
      crumb: "Run",
      title: "Run the business",
      note: "Handle customers, fulfilment and the numbers that need your attention today.",
      actions: [
        { title: "Customer inbox", note: "See live conversations and take over when the AI needs a human.", to: `${base}/engage/inbox`, label: "Open inbox" },
        { title: "Customers", note: "Keep the customer record, notes and relationship context in one place.", to: `${base}/crm`, label: "View customers" },
        ...(console.modules.includes("commerce") ? [{ title: console.commerceLabel, note: `Maintain the ${console.itemNoun.toLowerCase()} information customers can actually buy.`, to: `${base}/commerce`, label: `Manage ${console.commerceLabel.toLowerCase()}` }] : []),
        ...(booking ? [{ title: booking, note: "Review the bookings that need availability, service or fulfilment decisions.", to: `${base}/${console.booking === "appointments" ? "bookings" : "reservations"}`, label: `Open ${booking.toLowerCase()}` }] : []),
        { title: "Money", note: "Review invoices and the commercial work that needs an owner decision.", to: `${base}/invoicing`, label: "Open money" },
      ],
    },
    grow: {
      crumb: "Grow",
      title: "Grow deliberately",
      note: "Use a clear audience, a tested message and evidence—not more activity for its own sake.",
      actions: [
        { title: "Audience", note: "See the people you are trying to help and the segments worth serving differently.", to: `${base}/engage/audience`, label: "View audience" },
        { title: "Campaigns", note: "Create and review one-off messages without losing the customer context behind them.", to: `${base}/engage/broadcasts`, label: "Plan a campaign" },
        { title: "Automations", note: "Build small, reviewable follow-up flows before you automate more of the customer journey.", to: `${base}/engage/flows`, label: "Manage automations" },
        { title: "Lifecycle journeys", note: "Map the useful moments between first interest, purchase, support and return.", to: `${base}/engage/journeys`, label: "View journeys" },
        { title: "What is working", note: "Use the operational signals available in the Console to decide what to improve next.", to: `${base}/engage/insights`, label: "Review insights" },
      ],
    },
    setup: {
      crumb: "Set up",
      title: "Set the system up well",
      note: "Make the offer, brand, knowledge and approval boundaries ready before asking automation to do more.",
      actions: [
        { title: "Launch playbook", note: "Use the business blueprint to understand the starting offer, operating model and launch work.", to: `${base}/dossier`, label: "Open playbook" },
        { title: "Business and brand", note: "Set the live site, domain, brand and business profile your customers will see.", to: businessBase, label: "Edit business" },
        { title: "AI assistant", note: "Define the assistant’s job, tone and escalation boundaries before it talks to customers.", to: `${base}/engage/agent`, label: "Configure AI" },
        { title: "Knowledge and channels", note: "Keep approved answers current and decide where customers can reach you.", to: `${base}/engage/knowledge`, label: "Manage knowledge" },
        { title: "Team and permissions", note: "Invite the people who need access and give them only the responsibilities they need.", to: businessBase, label: "Manage team" },
      ],
    },
  };

  const current = content[hub];
  return (
    <div className="d-flex flex-column gap-2">
      <style>{CSS}</style>
      <PageHeader crumb={current.crumb} title={current.title} note={current.note} />
      <div className="ohx-grid">
        {current.actions.map((action) => (
          <Card key={action.title} className="ohx-card">
            <h2>{action.title}</h2>
            <p>{action.note}</p>
            <Link to={action.to}>{action.label} →</Link>
          </Card>
        ))}
      </div>
      <Card title="Keep the next decision small">
        <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>
          {org.name} does not need every tool at once. Pick the customer, operating or growth decision that matters now, complete it, then come back for the next one.
        </p>
      </Card>
    </div>
  );
}
