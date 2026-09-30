import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/state/tenant";
import { useAccess } from "@/state/access";
import {
  schoolCommand,
  schoolTime,
  type AssignmentRow,
  type SubmissionRow,
  type TicketRow,
  type Intake,
  type AllocationRow,
} from "@/lib/staff";
import { useSchoolRows } from "@/pages/staff/StaffPages";
import {
  StaffPanel,
  Empty,
  Notice,
  ActionForm,
  ActionButton,
} from "@/components/staff/StaffUI";

export default function ProgrammePage() {
  const { tenant } = useTenant();
  const { can, plan, entitlement } = useAccess();
  const org = tenant!.id;
  const navigate = useNavigate();
  const bookings = useSchoolRows<{
    id: string;
    starts_at: string;
    status: string;
    shared_notes: string;
  }>("cs_bookings");
  const cohorts = useSchoolRows<Intake>("cs_cohorts");
  const announcements = useSchoolRows<{
    id: string;
    title: string;
    body: string;
    created_at: string;
  }>("cs_announcements");
  const assignments = useSchoolRows<AssignmentRow>("cs_assignments");
  const work = useSchoolRows<SubmissionRow>("cs_submissions");
  const tickets = useSchoolRows<TicketRow>("cs_support_tickets");
  return (
    <main className="min-h-dvh bg-page px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <nav className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold">
          <Link to={plan ? "/" : "/pricing"} className="min-h-11 text-brand">
            ← {plan ? "My learning" : "Pricing"}
          </Link>
          <Link to="/pricing">Admission options</Link>
          <Link to="/admission-terms">Access & cancellation terms</Link>
        </nav>
        <header>
          <h1 className="text-3xl font-semibold">Your programme</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Intake updates, practical assignments and support. Everything you
            need outside the lesson.
          </p>
        </header>
        {entitlement?.expiresAt && (
          <Notice>
            Your course access ends {schoolTime(entitlement.expiresAt)}. There
            is no automatic renewal.
          </Notice>
        )}
        {can("cohort") && (
          <>
            <StaffPanel title="Your mentoring sessions">
              {bookings.rows.map((b) => (
                <article
                  key={b.id}
                  className="space-y-3 rounded-xl border border-line p-4"
                >
                  <p className="text-sm font-semibold">
                    {schoolTime(b.starts_at)} · {b.status.replaceAll("_", " ")}
                  </p>
                  {b.status === "confirmed" && (
                    <ActionButton
                      action={async () => {
                        const { data, error } = await supabase.rpc(
                          "cs_mentoring_room",
                          { p_org: org, p_booking: b.id },
                        );
                        if (error) throw error;
                        navigate(`/room/${data}`);
                      }}
                    >
                      Join private mentoring room
                    </ActionButton>
                  )}
                  {b.shared_notes && (
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {b.shared_notes}
                    </p>
                  )}
                </article>
              ))}
              {!bookings.rows.length && (
                <Empty>No mentoring sessions booked yet.</Empty>
              )}
              <Link
                to="/sessions"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
              >
                Book, reschedule or cancel a session →
              </Link>
            </StaffPanel>
            <StaffPanel title="Your intake">
              {cohorts.rows.map((c) => (
                <div key={c.id}>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="mt-2 text-sm leading-6">
                    {schoolTime(c.starts_at)} – {schoolTime(c.ends_at)}
                    <br />
                    One mentoring session each week; up to three where slots are
                    available.
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Times are displayed in your device's timezone. Intake
                    timezone: {c.timezone}.
                  </p>
                  <Link
                    to="/lessons"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand"
                  >
                    View class timetable →
                  </Link>
                </div>
              ))}
              {!cohorts.rows.length && (
                <Empty>
                  Your intake has not been assigned yet. Contact programme
                  support below; do not pay again.
                </Empty>
              )}
            </StaffPanel>
            <StaffPanel title="Programme announcements">
              {announcements.rows.map((a) => (
                <article
                  key={a.id}
                  className="rounded-xl border border-line p-4"
                >
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    {a.body}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {schoolTime(a.created_at)}
                  </p>
                </article>
              ))}
              {!announcements.rows.length && (
                <Empty>No announcements yet.</Empty>
              )}
            </StaffPanel>
          </>
        )}
        {plan && (
          <StaffPanel title="Practical assignments">
            {assignments.error && <Notice error>{assignments.error}</Notice>}
            {assignments.rows.map((a) => {
              const s = work.rows.find((w) => w.assignment_id === a.id);
              return (
                <details
                  key={a.id}
                  className="rounded-xl border border-line p-4"
                >
                  <summary className="cursor-pointer font-semibold">
                    {a.title} ·{" "}
                    {s?.outcome.replaceAll("_", " ") ?? "Not submitted"}
                  </summary>
                  <p className="my-4 whitespace-pre-wrap text-sm leading-6">
                    {a.brief}
                  </p>
                  <p className="mb-3 text-sm leading-6">
                    <strong>Assessment rubric:</strong> {a.rubric}
                  </p>
                  {a.due_at && (
                    <p className="mb-3 text-xs text-muted">
                      Due {schoolTime(a.due_at)}
                    </p>
                  )}
                  {s?.feedback && (
                    <Notice>Lecturer feedback: {s.feedback}</Notice>
                  )}
                  {s?.outcome === "passed" ? (
                    <Notice>You have passed this assignment.</Notice>
                  ) : (
                    <ActionForm
                      fields={[
                        {
                          name: "body",
                          label: "Your submission",
                          type: "textarea",
                          value: s?.body,
                        },
                      ]}
                      submitLabel={
                        s ? "Submit revised work" : "Submit assignment"
                      }
                      onSubmit={async (v) => {
                        await schoolCommand(org, "submit_work", {
                          assignment_id: a.id,
                          body: v.body,
                        });
                        await work.refresh();
                      }}
                    />
                  )}
                </details>
              );
            })}
            {!assignments.rows.length && (
              <Empty>
                No assignments have been published for your access yet.
              </Empty>
            )}
          </StaffPanel>
        )}
        {can("launch") && <LaunchSelection />}
        <StaffPanel
          title="Programme support"
          description="Ask about admission, access, schedules or a technical issue. Do not include card numbers, passwords or private client information."
        >
          <ActionForm
            submitLabel="Send support request"
            fields={[
              { name: "subject", label: "Subject" },
              { name: "body", label: "How can we help?", type: "textarea" },
            ]}
            onSubmit={async (v) => {
              await schoolCommand(org, "ticket", v);
              await tickets.refresh();
            }}
          />
          {tickets.rows.map((t) => (
            <article key={t.id} className="rounded-xl border border-line p-4">
              <h3 className="text-sm font-semibold">
                {t.subject} · {t.status.replaceAll("_", " ")}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {t.reply || "Your request is with the school team."}
              </p>
            </article>
          ))}
        </StaffPanel>
      </div>
    </main>
  );
}
function LaunchSelection() {
  const { tenant } = useTenant();
  const org = tenant!.id;
  const catalogue = useSchoolRows<{
    blueprint_id: string;
    included_assets: string;
    ongoing_costs: string;
    enabled: boolean;
  }>("cs_launch_catalogue");
  const allocations = useSchoolRows<AllocationRow>("cs_launch_allocations");
  const [businesses, setBusinesses] = useState<
    { id: string; name: string; cover_url: string | null; slug: string }[]
  >([]);
  useEffect(() => {
    void supabase
      .from("blueprints")
      .select("id,name,cover_url,slug")
      .eq("status", "live")
      .then(({ data }) => setBusinesses(data ?? []));
  }, []);
  const a = allocations.rows[0];
  return (
    <>
      <StaffPanel
        title="Your Phoxta business"
        description="Choose any live Phoxta business, review its listed assets and costs, then accept ownership. Three months of Operating Console access are included from provisioning, with no automatic paid renewal."
      >
        {a && (
          <Notice>
            Current stage: {a.status.replaceAll("_", " ")}
            {a.console_included_until && (
              <span className="block">
                Operating Console included until{" "}
                {schoolTime(a.console_included_until)}.
              </span>
            )}
            {a.provisioned_org_id && (
              <>
                {" "}
                ·{" "}
                <a
                  className="font-semibold underline"
                  href="https://www.phoxta.com/dashboard"
                >
                  Open Phoxta Operating Console
                </a>
              </>
            )}
          </Notice>
        )}
        {catalogue.rows
          .filter((c) => c.enabled)
          .map((c) => (
            <article
              key={c.blueprint_id}
              className="space-y-3 rounded-xl border border-line p-5"
            >
              {businesses.find((b) => b.id === c.blueprint_id)?.cover_url && (
                <img
                  src={
                    businesses.find((b) => b.id === c.blueprint_id)!.cover_url!
                  }
                  alt=""
                  className="aspect-[16/7] w-full rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              <h3 className="text-lg font-semibold">
                {businesses.find((b) => b.id === c.blueprint_id)?.name ??
                  "Phoxta business"}
              </h3>
              <a
                href={`https://www.phoxta.com/dashboard/marketplace/${c.blueprint_id}`}
                className="text-sm font-semibold text-brand underline"
              >
                View this business
              </a>
              <p className="whitespace-pre-wrap text-sm leading-6">
                <strong>Included:</strong> {c.included_assets}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6">
                <strong>Ongoing costs:</strong> {c.ongoing_costs}
              </p>
              {!a?.provisioned_org_id && (
                <ActionForm
                  submitLabel="Select & accept business"
                  fields={[
                    {
                      name: "accept",
                      label: "Ownership confirmation",
                      options: [
                        {
                          value: "yes",
                          label:
                            "I accept the included assets and ongoing costs",
                        },
                      ],
                    },
                  ]}
                  onSubmit={async (v) => {
                    await schoolCommand(org, "select_business", {
                      blueprint_id: c.blueprint_id,
                      accept_ownership: v.accept === "yes",
                    });
                    await allocations.refresh();
                  }}
                />
              )}
            </article>
          ))}
        {!catalogue.rows.length && (
          <Empty>
            The team has not enabled any included business selections yet. Your
            Launch admission remains recorded; contact programme support for
            your eligibility review.
          </Empty>
        )}
      </StaffPanel>
      <StaffPanel
        title="Investor introductions"
        description="Request a readiness review and consent to sharing only the materials you provide here. Network access is not a promise of investment."
      >
        <ActionForm
          submitLabel="Request an introduction review"
          fields={[
            {
              name: "materials",
              label: "Approved pitch materials or secure links",
              type: "textarea",
              value: a?.shared_materials,
            },
            {
              name: "consent",
              label: "Sharing consent",
              options: [
                {
                  value: "yes",
                  label:
                    "I consent to sharing these materials with prospective investors",
                },
              ],
            },
          ]}
          onSubmit={async (v) => {
            await schoolCommand(org, "investor_request", {
              materials: v.materials,
              consent: v.consent === "yes",
            });
            await allocations.refresh();
          }}
        />
        {a?.investor_consent_at && (
          <>
            <Notice>
              Introduction status: {a.investor_status.replaceAll("_", " ")}
            </Notice>
            <ActionButton
              action={async () => {
                await schoolCommand(org, "withdraw_consent");
                await allocations.refresh();
              }}
            >
              Withdraw sharing consent
            </ActionButton>
          </>
        )}
      </StaffPanel>
    </>
  );
}
