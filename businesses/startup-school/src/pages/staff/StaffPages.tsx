import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTenant } from "@/state/tenant";
import { useStaff } from "@/state/staff";
import { supabase } from "@/lib/supabase";
import {
  schoolRows,
  schoolCommand,
  schoolTime,
  schoolLocalInput,
  staffAction,
  ROLE_LABELS,
  type Intake,
  type CourseRow,
  type ClassRow,
  type NamedRow,
  type StaffMemberRow,
  type InviteRow,
  type AssignmentRow,
  type SubmissionRow,
  type TicketRow,
  type SchoolSettings,
  type OrderRow,
  type AllocationRow,
} from "@/lib/staff";
import {
  StaffPanel,
  Notice,
  Empty,
  ActionForm,
  ActionButton,
  type FormField,
} from "@/components/staff/StaffUI";
import MentorWorkspace from "./MentorWorkspace";

export function useSchoolRows<T>(table: string, columns = "*") {
  const { tenant } = useTenant();
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!tenant) return;
    setError("");
    try {
      setRows(await schoolRows<T>(tenant.id, table, columns));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  }, [tenant, table, columns]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { rows, error, refresh, loading };
}
const options = (rows: { id: string; name?: string; title?: string }[]) =>
  rows.map((r) => ({ value: r.id, label: r.name ?? r.title ?? r.id }));
function Heading({ title, text }: { title: string; text: string }) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">
        School workspace
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{text}</p>
    </header>
  );
}

export function StaffOverview() {
  const { can } = useStaff();
  const { tenant } = useTenant();
  const cards = [
    {
      title: "Teach & mentor",
      body: "Upcoming classes, mentoring appointments and work awaiting feedback.",
      to: "/staff/teaching",
      show: can("teaching") || can("mentoring"),
    },
    {
      title: "Prepare the learning",
      body: "Draft lessons, upload resources and review content before publication.",
      to: "/staff/content",
      show: can("content"),
    },
    {
      title: "Your school team",
      body: "Invite colleagues and manage their assigned responsibilities.",
      to: "/staff/people",
      show: can("people"),
    },
    {
      title: "Run the programme",
      body: "Intakes, school policies, payments and Launch handovers.",
      to: "/staff/operations",
      show: can("operations") || can("finance") || can("launch"),
    },
    {
      title: "Support learners",
      body: "Resolve access issues and reply to learner support requests.",
      to: "/staff/support",
      show: can("support"),
    },
  ].filter((c) => c.show);
  return (
    <>
      <Heading
        title="Ready for what's next."
        text="Your teaching and school operations, in one place. You only see the tools assigned to your account."
      />
      <StaffPriorities />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-2xl border border-line bg-card p-6 transition hover:border-brand"
          >
            <h2 className="text-xl font-semibold">
              {c.title} <span aria-hidden="true">↗</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">{c.body}</p>
          </Link>
        ))}
      </div>
      <StaffPanel
        title="Your teaching profile"
        description="This name appears in classes and learner conversations."
      >
        <ActionForm
          fields={[
            { name: "name", label: "Display name" },
            { name: "headline", label: "Role or expertise" },
          ]}
          submitLabel="Save profile"
          onSubmit={async (v) => {
            const { error } = await supabase.rpc("cs_staff_profile", {
              p_org: tenant!.id,
              p_name: v.name,
              p_headline: v.headline,
            });
            if (error) throw error;
          }}
        />
      </StaffPanel>
      <Notice>
        Staff access is separate from paid admission. To study for your own
        certificates or use Launch services, switch to your learner workspace.
      </Notice>
    </>
  );
}

function StaffPriorities() {
  const { tenant } = useTenant();
  const [data, setData] = useState<{
    classes?: { id: string; title: string; starts_at: string }[];
    appointments?: { id: string; name: string; starts_at: string }[];
    content_reviews?: number;
    pending_invites?: number;
    support_requests?: number;
    launch_handovers?: number;
    mentor_coverage?: {
      id: string;
      name: string;
      starts_at: string;
      learners: number;
      assigned_mentors: number;
      without_weekly_booking: number;
    }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    void supabase
      .rpc("cs_staff_overview", { p_org: tenant!.id })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError("Current priorities could not be loaded.");
        else setData(data);
      });
    return () => {
      alive = false;
    };
  }, [tenant]);
  if (error) return <Notice error>{error}</Notice>;
  if (!data)
    return (
      <p role="status" className="text-sm text-muted">
        Loading your priorities…
      </p>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Content reviews", data.content_reviews, "/staff/content"],
            ["Pending invitations", data.pending_invites, "/staff/people"],
            ["Support requests", data.support_requests, "/staff/support"],
            ["Launch handovers", data.launch_handovers, "/staff/operations"],
          ] as const
        )
          .filter(([, count]) => count !== undefined)
          .map(([label, count, to]) => (
            <Link
              key={label}
              to={to}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <span className="block text-2xl font-semibold">{count}</span>
              <span className="mt-1 block text-xs text-muted">{label}</span>
            </Link>
          ))}
      </div>
      {!!data.classes?.length && (
        <StaffPanel title="Your next classes">
          {data.classes.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">
                  {schoolTime(c.starts_at)}
                </p>
              </div>
              <Link
                className="inline-flex min-h-11 items-center font-semibold text-brand"
                to={`/staff/room/${c.id}`}
              >
                Open classroom →
              </Link>
            </div>
          ))}
        </StaffPanel>
      )}
      {!!data.appointments?.length && (
        <StaffPanel title="Upcoming mentoring">
          {data.appointments.map((b) => (
            <Link
              key={b.id}
              to="/staff/teaching"
              className="block rounded-xl border border-line p-4 text-sm"
            >
              <strong>{b.name}</strong>
              <span className="mt-1 block text-muted">
                {schoolTime(b.starts_at)}
              </span>
            </Link>
          ))}
        </StaffPanel>
      )}
      {!!data.mentor_coverage?.length && (
        <StaffPanel
          title="Weekly mentoring coverage"
          description="Plan at least one session per learner each week. Enrolment is uncapped; add mentors and availability as your intake grows."
        >
          {data.mentor_coverage.map((c) => (
            <div key={c.id} className="rounded-xl border border-line p-4">
              <h3 className="font-semibold">{c.name}</h3>
              <p className="mt-2 text-sm leading-6">
                {c.learners} learners · {c.assigned_mentors} school/intake
                mentors
                {Date.parse(c.starts_at) <= Date.now()
                  ? ` · ${c.without_weekly_booking} without a booking this week`
                  : " · Intake has not started"}
              </p>
              {c.assigned_mentors === 0 && (
                <p className="mt-2 text-sm text-danger-ink">
                  Assign mentors in People and ask them to publish availability
                  before teaching begins.
                </p>
              )}
            </div>
          ))}
        </StaffPanel>
      )}
    </>
  );
}

export function StaffTeaching() {
  const { can } = useStaff();
  const { tenant } = useTenant();
  const org = tenant!.id;
  const classes = useSchoolRows<ClassRow>("cs_live_lessons");
  const cohorts = useSchoolRows<Intake>("cs_cohorts");
  const mentors = useSchoolRows<NamedRow>("cs_mentors", "id,name,user_id");
  const categories = useSchoolRows<NamedRow>("cs_categories", "id,name");
  const courses = useSchoolRows<CourseRow>(
    "cs_courses",
    "id,title,slug,published,category_id,mentor_id",
  );
  const submissions = useSchoolRows<SubmissionRow>("cs_submissions");
  const assignments = useSchoolRows<AssignmentRow>("cs_assignments");
  const [tab, setTab] = useState(can("teaching") ? "classes" : "mentoring");
  const tabs = [
    { id: "classes", label: "Classes", show: can("teaching") },
    {
      id: "assessment",
      label: "Assignments & feedback",
      show: can("teaching"),
    },
    { id: "mentoring", label: "Mentoring", show: can("mentoring") },
  ].filter((t) => t.show);
  return (
    <>
      <Heading
        title="Teaching"
        text="Plan the next class, support your founders and review their work. Class times below use your device's timezone."
      />
      <nav aria-label="Teaching tools" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold ${tab === t.id ? "bg-ink text-white" : "border border-line bg-white"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "mentoring" && <MentorWorkspace />}
      {tab === "classes" && (
        <>
          {classes.error && <Notice error>{classes.error}</Notice>}
          <StaffPanel title="Class timetable">
            <div className="grid gap-3 md:grid-cols-2">
              {classes.rows
                .filter((c) => !c.cancelled_at)
                .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                .map((c) => (
                  <article
                    key={c.id}
                    className="rounded-xl border border-line p-4"
                  >
                    <p className="text-xs text-brand">
                      {schoolTime(c.starts_at)} · {c.duration_min} min
                    </p>
                    <h3 className="mt-2 font-semibold">{c.title}</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Link
                        to={`/staff/room/${c.id}`}
                        className="inline-flex min-h-11 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white"
                      >
                        Open classroom
                      </Link>
                      <a
                        href={calendarUrl(c)}
                        download={`${c.id}.ics`}
                        className="text-xs underline"
                      >
                        Add to calendar
                      </a>
                      {c.recording_url && c.replay_status !== "approved" && (
                        <ActionButton
                          action={async () => {
                            await schoolCommand(
                              org,
                              "approve_replay",
                              { id: c.id },
                              true,
                            );
                            await classes.refresh();
                          }}
                        >
                          Approve replay
                        </ActionButton>
                      )}
                      <ActionButton
                        destructive
                        action={async () => {
                          await schoolCommand(
                            org,
                            "cancel_class",
                            { id: c.id },
                            true,
                          );
                          await classes.refresh();
                        }}
                      >
                        Cancel class
                      </ActionButton>
                    </div>
                    <ClassFollowup lessonId={c.id} />
                  </article>
                ))}
            </div>
            {!classes.rows.length && (
              <Empty>
                No assigned classes yet. Schedule a class below or ask your
                programme manager for an assignment.
              </Empty>
            )}
          </StaffPanel>
          <StaffPanel
            title="Schedule a class"
            description="Weekly repeats keep the same local time across UK daylight-saving changes. Assign the lecturer to the intake first."
          >
            <ActionForm
              submitLabel="Schedule classes"
              onSubmit={async (v) => {
                await schoolCommand(org, "schedule", v, true);
                await classes.refresh();
              }}
              fields={[
                { name: "title", label: "Class title" },
                {
                  name: "cohort_id",
                  label: "Intake",
                  options: options(cohorts.rows),
                },
                {
                  name: "host_id",
                  label: "Lecturer account",
                  options: mentors.rows
                    .filter((m) => m.user_id)
                    .map((m) => ({ value: m.user_id!, label: m.name })),
                },
                {
                  name: "category_id",
                  label: "Subject",
                  options: options(categories.rows),
                },
                {
                  name: "local_start",
                  label: "First class (in the timezone below)",
                  type: "datetime-local",
                },
                {
                  name: "timezone",
                  label: "Class timezone",
                  value: "Europe/London",
                },
                {
                  name: "duration_min",
                  label: "Duration in minutes",
                  type: "number",
                  value: 60,
                  min: 15,
                  max: 240,
                },
                {
                  name: "repeat_count",
                  label: "Number of weekly classes",
                  type: "number",
                  value: 1,
                  min: 1,
                  max: 12,
                },
                {
                  name: "description",
                  label: "Class description",
                  type: "textarea",
                },
              ]}
            />
          </StaffPanel>
        </>
      )}
      {tab === "assessment" && (
        <>
          <StaffPanel
            title="Work awaiting feedback"
            description="Review the submission against its rubric. Your assessment—not an AI suggestion—determines the outcome."
          >
            {submissions.error && <Notice error>{submissions.error}</Notice>}
            {submissions.rows.map((s) => (
              <details key={s.id} className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  {assignments.rows.find((a) => a.id === s.assignment_id)
                    ?.title ?? "Assignment"}{" "}
                  · {s.outcome.replaceAll("_", " ")}
                </summary>
                <p className="my-3 whitespace-pre-wrap text-sm leading-6">
                  {s.body}
                </p>
                <p className="mb-4 text-sm text-muted">
                  Rubric:{" "}
                  {
                    assignments.rows.find((a) => a.id === s.assignment_id)
                      ?.rubric
                  }
                </p>
                <ActionForm
                  fields={[
                    {
                      name: "feedback",
                      label: "Feedback to the learner",
                      type: "textarea",
                      value: s.feedback,
                    },
                    {
                      name: "outcome",
                      label: "Assessment outcome",
                      options: [
                        { value: "passed", label: "Passed" },
                        {
                          value: "changes_requested",
                          label: "Changes requested",
                        },
                      ],
                    },
                  ]}
                  submitLabel="Confirm assessment"
                  onSubmit={async (v) => {
                    await schoolCommand(org, "review_work", { ...v, id: s.id });
                    await submissions.refresh();
                  }}
                />
              </details>
            ))}
            {!submissions.rows.length && (
              <Empty>No submissions to review.</Empty>
            )}
          </StaffPanel>
          <StaffPanel title="Create a practical assignment">
            <ActionForm
              submitLabel="Publish assignment"
              onSubmit={async (v) => {
                await schoolCommand(org, "save_assignment", {
                  ...v,
                  due_at: v.due_at ? new Date(v.due_at).toISOString() : null,
                });
                await assignments.refresh();
              }}
              fields={[
                { name: "title", label: "Title" },
                {
                  name: "course_id",
                  label: "Course",
                  options: options(courses.rows),
                },
                {
                  name: "cohort_id",
                  label: "Intake (optional)",
                  optional: true,
                  options: options(cohorts.rows),
                },
                {
                  name: "due_at",
                  label: "Due date (your timezone)",
                  type: "datetime-local",
                  optional: true,
                },
                { name: "brief", label: "Assignment brief", type: "textarea" },
                {
                  name: "rubric",
                  label: "Assessment rubric",
                  type: "textarea",
                },
              ]}
            />
          </StaffPanel>
        </>
      )}
    </>
  );
}
function calendarUrl(c: ClassRow) {
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replaceAll(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const clean = (s: string) =>
    s
      .replaceAll("\\", "\\\\")
      .replaceAll(";", "\\;")
      .replaceAll(",", "\\,")
      .replaceAll(/\r?\n/g, "\\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phoxta//Startup School//EN", "BEGIN:VEVENT", `UID:${c.id}@learn.phoxta.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(new Date(c.starts_at))}`, `DTEND:${stamp(new Date(Date.parse(c.starts_at) + c.duration_min * 60_000))}`, `SUMMARY:${clean(c.title)}`, `URL:https://learn.phoxta.com/room/${c.id}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n"))}`;
}

export function StaffPeople() {
  const { tenant } = useTenant();
  const { can } = useStaff();
  const org = tenant!.id;
  const staff = useSchoolRows<StaffMemberRow>("cs_staff_assignments");
  const invites = useSchoolRows<InviteRow>(
    "cs_staff_invites",
    "id,email,role,scope_type,scope_id,expires_at,accepted_at,revoked_at",
  );
  const [inviteLink, setInviteLink] = useState("");
  const [scope, setScope] = useState("school");
  const courses = useSchoolRows<CourseRow>("cs_courses");
  const intakes = useSchoolRows<Intake>("cs_cohorts");
  const classes = useSchoolRows<ClassRow>("cs_live_lessons");
  const [directory, setDirectory] = useState<
    { user_id: string; name: string; email: string }[]
  >([]);
  useEffect(() => {
    void supabase
      .rpc("cs_school_directory", { p_org: org })
      .then(({ data }) => setDirectory(data ?? []));
  }, [org]);
  return (
    <>
      <Heading
        title="People"
        text="Every colleague uses their own verified account. Assign only the responsibility and scope they need."
      />
      {staff.error && <Notice error>{staff.error}</Notice>}
      <StaffPanel title="School team">
        {staff.rows.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4"
          >
            <div>
              <p className="text-sm font-semibold">
                {ROLE_LABELS[s.role]} {s.active ? "" : "· suspended"}
              </p>
              <p className="mt-1 text-sm">
                {directory.find((p) => p.user_id === s.user_id)?.name ??
                  "School colleague"}
              </p>
              <p className="mt-1 break-all text-xs text-muted">
                {directory.find((p) => p.user_id === s.user_id)?.email ??
                  s.user_id}
              </p>
              <p className="mt-1 text-xs text-brand">
                {s.scope_type}: {s.scope_id || "This school"}
                {s.expires_at ? ` · Until ${schoolTime(s.expires_at)}` : ""}
              </p>
            </div>
            {can("invite") && s.role !== "owner" && s.active && (
              <ActionButton
                destructive
                action={async () => {
                  await staffAction({
                    op: "revoke_staff",
                    organizationId: org,
                    id: s.id,
                  });
                  await staff.refresh();
                }}
              >
                Suspend assignment
              </ActionButton>
            )}
          </div>
        ))}
      </StaffPanel>
      {can("invite") && (
        <>
          <StaffPanel
            title="Invite a colleague"
            description="Verify your authenticator in Security first. Invitations are single-use, expire after seven days and require the exact verified email. Share the generated link privately; no email is sent automatically."
          >
            <ActionForm
              submitLabel="Create secure invitation"
              onValuesChange={(v) => setScope(v.scope_type || "school")}
              onSubmit={async (v) => {
                const result = await schoolCommand<{ token: string }>(
                  org,
                  "invite",
                  {
                    ...v,
                    scope_id: v.scope_type === "school" ? "" : v.scope_id,
                    expires_at: v.expires_at
                      ? new Date(v.expires_at).toISOString()
                      : null,
                  },
                );
                setInviteLink(
                  `${window.location.origin}/staff/invite?token=${result.token}`,
                );
                await invites.refresh();
              }}
              fields={[
                { name: "email", label: "Colleague's email", type: "email" },
                {
                  name: "role",
                  label: "Responsibility",
                  options: Object.entries(ROLE_LABELS)
                    .filter(
                      ([r]) =>
                        r !== "owner" &&
                        (can("owner") ||
                          !["school_admin", "finance"].includes(r)),
                    )
                    .map(([value, label]) => ({ value, label })),
                },
                {
                  name: "scope_type",
                  label: "Assignment scope",
                  value: "school",
                  options: [
                    "school",
                    "course",
                    "cohort",
                    "class",
                    "learner",
                  ].map((v) => ({
                    value: v,
                    label: v[0].toUpperCase() + v.slice(1),
                  })),
                },
                {
                  name: "scope_id",
                  label:
                    scope === "school"
                      ? "School-wide access"
                      : `Assigned ${scope === "cohort" ? "intake" : scope}`,
                  optional: scope === "school",
                  options:
                    scope === "school"
                      ? [{ value: "", label: "All records in this school" }]
                      : scope === "course"
                        ? options(courses.rows)
                        : scope === "cohort"
                          ? options(intakes.rows)
                          : scope === "class"
                            ? options(classes.rows)
                            : directory.map((p) => ({
                                value: p.user_id,
                                label: `${p.name} (${p.email})`,
                              })),
                  help: "Use a specific course, intake, class or learner unless this colleague needs school-wide responsibility.",
                },
                {
                  name: "expires_at",
                  label: "Assignment ends (your timezone, optional)",
                  type: "datetime-local",
                  optional: true,
                },
              ]}
            />
            {inviteLink && (
              <Notice>
                <span className="block break-all">{inviteLink}</span>
                <button
                  className="mt-2 min-h-10 font-semibold underline"
                  onClick={() => void navigator.clipboard.writeText(inviteLink)}
                >
                  Copy invitation link
                </button>
              </Notice>
            )}
          </StaffPanel>
          <StaffPanel title="Pending invitations">
            {invites.error && <Notice error>{invites.error}</Notice>}
            {invites.rows
              .filter((i) => !i.accepted_at && !i.revoked_at)
              .map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4"
                >
                  <p className="break-all text-sm">
                    {i.email} · {ROLE_LABELS[i.role]}
                    <span className="block text-xs text-muted">
                      Expires {schoolTime(i.expires_at)}
                    </span>
                  </p>
                  <ActionButton
                    destructive
                    action={async () => {
                      await schoolCommand(org, "revoke_invite", { id: i.id });
                      await invites.refresh();
                    }}
                  >
                    Revoke
                  </ActionButton>
                </div>
              ))}
            {!invites.rows.length && <Empty>No invitations yet.</Empty>}
          </StaffPanel>
        </>
      )}
    </>
  );
}

export function StaffSupport() {
  const { tenant } = useTenant();
  const tickets = useSchoolRows<TicketRow>("cs_support_tickets");
  return (
    <>
      <Heading
        title="Learner support"
        text="Resolve access and programme issues without exposing private mentoring notes."
      />
      <StaffPanel title="Support requests">
        {tickets.error && <Notice error>{tickets.error}</Notice>}
        {tickets.rows.map((t) => (
          <details key={t.id} className="rounded-xl border border-line p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              {t.subject} · {t.status.replaceAll("_", " ")}
            </summary>
            <p className="my-4 whitespace-pre-wrap text-sm leading-6">
              {t.body}
            </p>
            <ActionForm
              submitLabel="Save reply"
              fields={[
                {
                  name: "reply",
                  label: "Reply to learner",
                  type: "textarea",
                  value: t.reply,
                },
                {
                  name: "status",
                  label: "Status",
                  value: t.status,
                  options: ["open", "in_progress", "resolved"].map((v) => ({
                    value: v,
                    label: v.replaceAll("_", " "),
                  })),
                },
              ]}
              onSubmit={async (v) => {
                await schoolCommand(tenant!.id, "reply_ticket", {
                  ...v,
                  id: t.id,
                });
                await tickets.refresh();
              }}
            />
          </details>
        ))}
        {!tickets.rows.length && <Empty>No support requests.</Empty>}
      </StaffPanel>
    </>
  );
}

export function StaffOperations() {
  const { can } = useStaff();
  const { tenant } = useTenant();
  const org = tenant!.id;
  const cohorts = useSchoolRows<Intake>("cs_cohorts");
  const settings = useSchoolRows<SchoolSettings>("cs_school_settings");
  const [tab, setTab] = useState(
    can("operations") ? "intakes" : can("finance") ? "billing" : "launch",
  );
  const tabs = [
    { id: "intakes", label: "Intakes", show: can("operations") },
    { id: "settings", label: "School policies", show: can("settings") },
    { id: "billing", label: "Payments", show: can("finance") },
    { id: "launch", label: "Launch handovers", show: can("launch") },
    { id: "audit", label: "Activity log", show: can("settings") },
  ].filter((t) => t.show);
  const cohortFields: FormField[] = [
    { name: "name", label: "Intake name" },
    { name: "timezone", label: "Intake timezone", value: "Europe/London" },
    {
      name: "starts_at",
      label: "Starts (intake timezone)",
      type: "datetime-local",
    },
    {
      name: "ends_at",
      label: "Ends (intake timezone)",
      type: "datetime-local",
    },
    {
      name: "capacity",
      label: "Maximum learners (optional)",
      type: "number",
      min: 1,
      max: 10000,
      optional: true,
      help: "Leave blank for no enrolment cap. Mentoring: one weekly session, up to three when slots are available.",
    },
    {
      name: "status",
      label: "Admission status",
      value: "draft",
      options: ["draft", "open", "closed", "completed"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      name: "release_mode",
      label: "Course access",
      value: "immediate",
      options: [
        { value: "immediate", label: "Immediate" },
        { value: "scheduled", label: "Scheduled releases" },
      ],
    },
    {
      name: "recording_days",
      label: "Replay access in days",
      type: "number",
      value: 90,
      min: 0,
      max: 3650,
    },
  ];
  return (
    <>
      <Heading
        title="Operations"
        text="Manage admissions and fulfil the promises made to learners. Set programme terms before opening an intake."
      />
      <nav aria-label="Operations tools" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold ${tab === t.id ? "bg-ink text-white" : "border border-line bg-white"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "intakes" && (
        <>
          <StaffPanel title="Cohort intakes">
            {cohorts.error && <Notice error>{cohorts.error}</Notice>}
            {cohorts.rows.map((c) => (
              <details key={c.id} className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  {c.name} · {c.status} ·{" "}
                  {c.capacity == null
                    ? "No enrolment cap"
                    : `${c.capacity} places`}
                </summary>
                <p className="my-3 break-all text-xs text-muted">
                  Intake ID: {c.id}
                  <br />
                  {schoolTime(c.starts_at, c.timezone)} –{" "}
                  {schoolTime(c.ends_at, c.timezone)} · {c.timezone}
                </p>
                <ActionForm
                  key={c.id}
                  fields={cohortFields.map((f) => ({
                    ...f,
                    value:
                      f.type === "datetime-local"
                        ? schoolLocalInput(
                            String(
                              (c as unknown as Record<string, unknown>)[f.name],
                            ),
                            c.timezone,
                          )
                        : String(
                            (c as unknown as Record<string, unknown>)[f.name] ??
                              f.value ??
                              "",
                          ),
                  }))}
                  submitLabel="Update intake"
                  onSubmit={async (v) => {
                    await schoolCommand(org, "save_cohort", { ...v, id: c.id });
                    await cohorts.refresh();
                  }}
                />
              </details>
            ))}
            {!cohorts.rows.length && (
              <Empty>
                No intakes configured. Create a draft below; publish it when
                dates, capacity and programme policies are confirmed.
              </Empty>
            )}
          </StaffPanel>
          <StaffPanel title="Create an intake">
            <ActionForm
              fields={cohortFields}
              submitLabel="Save intake"
              onSubmit={async (v) => {
                await schoolCommand(org, "save_cohort", v);
                await cohorts.refresh();
              }}
            />
          </StaffPanel>
          <IntakeTools cohorts={cohorts.rows} />
        </>
      )}
      {tab === "settings" && (
        <StaffPanel
          title="Programme policies"
          description="Use the agreed commercial terms. These fields do not invent a cohort duration, unlimited mentoring or guaranteed funding."
        >
          <ActionForm
            key={JSON.stringify(settings.rows)}
            submitLabel="Save school policies"
            fields={[
              {
                name: "access_policy",
                label: "Duration and terms of learning access",
                type: "textarea",
                value: settings.rows[0]?.access_policy,
              },
              {
                name: "cancellation_policy",
                label: "Cancellation, transfers and missed sessions",
                type: "textarea",
                value: settings.rows[0]?.cancellation_policy,
              },
              {
                name: "completion_policy",
                label: "Completion and certificate requirements",
                type: "textarea",
                value: settings.rows[0]?.completion_policy,
              },
              {
                name: "launch_terms",
                label: "Business ownership and handover terms",
                type: "textarea",
                value: settings.rows[0]?.launch_terms,
              },
            ]}
            onSubmit={async (v) => {
              await schoolCommand(org, "save_settings", v);
              await settings.refresh();
            }}
          />
        </StaffPanel>
      )}
      {tab === "billing" && <BillingOperations />}
      {tab === "launch" && <LaunchOperations />}
      {tab === "audit" && <AuditLog />}
    </>
  );
}
function IntakeTools({ cohorts }: { cohorts: Intake[] }) {
  const { tenant } = useTenant();
  const org = tenant!.id;
  const courses = useSchoolRows<CourseRow>("cs_courses", "id,title");
  const members = useSchoolRows<{
    cohort_id: string;
    user_id: string;
    status: string;
  }>("cs_cohort_members");
  return (
    <>
      <StaffPanel title="Enrolment register">
        {members.error && <Notice error>{members.error}</Notice>}
        {members.rows.map((m) => (
          <p
            key={`${m.cohort_id}-${m.user_id}`}
            className="break-all border-b border-line pb-3 text-sm"
          >
            {cohorts.find((c) => c.id === m.cohort_id)?.name} · {m.status}
            <span className="block text-xs text-muted">
              Learner: {m.user_id}
            </span>
          </p>
        ))}
        {!members.rows.length && (
          <Empty>
            Paid Cohort and Launch admissions appear here after Stripe confirms
            payment.
          </Empty>
        )}
        <ActionForm
          submitLabel="Transfer learner"
          fields={[
            { name: "user_id", label: "Learner ID" },
            {
              name: "cohort_id",
              label: "Destination intake",
              options: options(cohorts),
            },
          ]}
          onSubmit={async (v) => {
            await schoolCommand(org, "transfer_member", v);
            await members.refresh();
          }}
        />
      </StaffPanel>
      <StaffPanel title="Course release schedule">
        <ActionForm
          submitLabel="Save release"
          fields={[
            { name: "cohort_id", label: "Intake", options: options(cohorts) },
            {
              name: "course_id",
              label: "Course",
              options: options(courses.rows),
            },
            {
              name: "unlock_at",
              label: "Unlock at (your timezone)",
              type: "datetime-local",
            },
          ]}
          onSubmit={(v) =>
            schoolCommand(org, "release_course", {
              ...v,
              unlock_at: new Date(v.unlock_at).toISOString(),
            })
          }
        />
      </StaffPanel>
      <StaffPanel title="Send an intake announcement">
        <ActionForm
          submitLabel="Publish announcement"
          fields={[
            { name: "cohort_id", label: "Intake", options: options(cohorts) },
            { name: "title", label: "Title" },
            { name: "body", label: "Announcement", type: "textarea" },
          ]}
          onSubmit={(v) => schoolCommand(org, "announce", v)}
        />
      </StaffPanel>
    </>
  );
}
function BillingOperations() {
  const { tenant } = useTenant();
  const orders = useSchoolRows<OrderRow>("cs_plan_orders");
  return (
    <StaffPanel
      title="Admission payments"
      description="Fees are one-off: Self-study £250, Cohort £1,200 and Launch £5,000. Historical purchases retain their original amount. Refunds require an authenticator check and are reconciled from Stripe."
    >
      {orders.error && <Notice error>{orders.error}</Notice>}
      {orders.rows.map((o) => (
        <details key={o.id} className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            {o.plan.replaceAll("_", " ")} · £
            {(o.amount_pence / 100).toLocaleString("en-GB")} · {o.status}
          </summary>
          <p className="my-3 break-all text-xs text-muted">
            Order {o.id}
            <br />
            Learner {o.user_id}
          </p>
          {o.status === "paid" && (
            <ActionButton
              destructive
              action={async () => {
                await staffAction({
                  op: "refund",
                  organizationId: tenant!.id,
                  orderId: o.id,
                });
                await orders.refresh();
              }}
            >
              Request full refund
            </ActionButton>
          )}
        </details>
      ))}
      {!orders.rows.length && <Empty>No admission payments.</Empty>}
    </StaffPanel>
  );
}
function LaunchOperations() {
  const { tenant } = useTenant();
  const org = tenant!.id;
  const allocations = useSchoolRows<AllocationRow>("cs_launch_allocations");
  const [blueprints, setBlueprints] = useState<NamedRow[]>([]);
  useEffect(() => {
    void supabase
      .from("blueprints")
      .select("id,name")
      .eq("status", "live")
      .then(({ data }) => setBlueprints((data ?? []) as NamedRow[]));
  }, []);
  return (
    <>
      <StaffPanel
        title="Launch fulfilment"
        description="Provision only the founder's accepted selection. One paid Launch admission grants one business. Investor introductions require the founder's consent and do not guarantee funding."
      >
        {allocations.error && <Notice error>{allocations.error}</Notice>}
        {allocations.rows.map((a) => (
          <details
            key={a.user_id}
            className="rounded-xl border border-line p-4"
          >
            <summary className="cursor-pointer break-all text-sm font-semibold">
              {a.status} · {a.user_id}
            </summary>
            <p className="my-3 text-sm">
              Business:{" "}
              {blueprints.find((b) => b.id === a.blueprint_id)?.name ??
                "Not selected"}
            </p>
            {a.status === "reserved" && (
              <ActionButton
                destructive
                action={async () => {
                  const { error } = await supabase.rpc("cs_provision_launch", {
                    p_org: org,
                    p_user: a.user_id,
                  });
                  if (error) throw error;
                  await allocations.refresh();
                }}
              >
                Provision accepted business
              </ActionButton>
            )}
            {a.provisioned_org_id && (
              <p className="my-3 break-all text-xs text-muted">
                Provisioned business: {a.provisioned_org_id}
              </p>
            )}
            <p className="my-4 whitespace-pre-wrap text-sm">
              {a.investor_consent_at
                ? `Founder-approved materials: ${a.shared_materials}`
                : "No investor sharing consent."}
            </p>
            <ActionForm
              submitLabel="Update handover"
              fields={[
                ...["credentials", "training", "domain", "operations"].map(
                  (name) => ({
                    name,
                    label: `${name[0].toUpperCase() + name.slice(1)} handover`,
                    value: String(a.checklist[name] ?? false),
                    options: [
                      { value: "false", label: "Outstanding" },
                      { value: "true", label: "Complete" },
                    ],
                  }),
                ),
                {
                  name: "status",
                  label: "Handover status",
                  optional: true,
                  options: ["handover", "launched", "on_hold"].map((v) => ({
                    value: v,
                    label: v.replaceAll("_", " "),
                  })),
                },
                {
                  name: "investor_status",
                  label: "Investor introduction",
                  value: a.investor_status,
                  options: [
                    "not_requested",
                    "requested",
                    "reviewing",
                    "ready",
                    "introduced",
                  ].map((v) => ({ value: v, label: v.replaceAll("_", " ") })),
                },
              ]}
              onSubmit={async (v) => {
                await schoolCommand(org, "launch_handover", {
                  user_id: a.user_id,
                  status: v.status,
                  investor_status: v.investor_status,
                  checklist: Object.fromEntries(
                    ["credentials", "training", "domain", "operations"].map(
                      (k) => [k, v[k] === "true"],
                    ),
                  ),
                });
                await allocations.refresh();
              }}
            />
          </details>
        ))}
        {!allocations.rows.length && (
          <Empty>No Launch admissions awaiting fulfilment.</Empty>
        )}
      </StaffPanel>
      <StaffPanel
        title="Included business catalogue"
        description="Choose only businesses you can supply within the Launch admission. Disclose ongoing costs before enabling a selection."
      >
        <ActionForm
          submitLabel="Enable business selection"
          fields={[
            {
              name: "blueprint_id",
              label: "Available Phoxta business",
              options: options(blueprints),
            },
            {
              name: "included_assets",
              label: "Assets and services included",
              type: "textarea",
            },
            {
              name: "ongoing_costs",
              label: "Ongoing costs the founder will pay",
              type: "textarea",
            },
          ]}
          onSubmit={(v) => schoolCommand(org, "launch_catalogue", v)}
        />
      </StaffPanel>
    </>
  );
}
function AuditLog() {
  const log = useSchoolRows<{
    id: number;
    action: string;
    target: string;
    actor_id: string;
    created_at: string;
  }>("cs_staff_audit");
  return (
    <StaffPanel title="School activity log">
      {log.error && <Notice error>{log.error}</Notice>}
      {log.rows
        .slice()
        .sort((a, b) => b.id - a.id)
        .map((r) => (
          <div
            key={r.id}
            className="border-b border-line pb-3 text-xs leading-6"
          >
            <p className="font-semibold">
              {r.action} · {schoolTime(r.created_at)}
            </p>
            <p className="break-all text-muted">
              Actor: {r.actor_id ?? "Verified system event"}
              <br />
              Record: {r.target}
            </p>
          </div>
        ))}
      {!log.rows.length && <Empty>No school activity recorded yet.</Empty>}
    </StaffPanel>
  );
}

function ClassFollowup({ lessonId }: { lessonId: string }) {
  const { tenant } = useTenant();
  const [recap, setRecap] = useState<{
    summary: string;
    keyPoints: string[];
    questions: string[];
    actions: string[];
  } | null>(null);
  const [attendance, setAttendance] = useState<
    { user_id: string; name: string; seconds: number; role: string }[]
  >([]);
  const [message, setMessage] = useState("");
  return (
    <details className="mt-4 border-t border-line pt-3">
      <summary className="min-h-10 cursor-pointer text-sm font-semibold">
        Attendance & class recap
      </summary>
      <div className="mt-3 space-y-3">
        <ActionButton
          action={async () => {
            const { data, error } = await supabase
              .from("cs_live_participants")
              .select("user_id,name,seconds,role")
              .eq("organization_id", tenant!.id)
              .eq("live_lesson_id", lessonId);
            if (error) throw error;
            setAttendance(data ?? []);
            setMessage(
              data?.length
                ? "Attendance loaded."
                : "No attendance recorded yet.",
            );
          }}
        >
          Load attendance
        </ActionButton>
        {attendance.map((p) => (
          <p key={p.user_id} className="text-xs">
            {p.name} · {p.role} · {Math.floor(p.seconds / 60)} minutes
          </p>
        ))}
        <ActionButton
          action={async () => {
            const { data, error } = await supabase.functions.invoke(
              "coir-live-recap",
              { body: { organizationId: tenant!.id, lessonId, force: true } },
            );
            if (error || data?.error)
              throw new Error(
                data?.error ??
                  "A recap needs recorded captions or class discussion.",
              );
            setRecap(data.recap);
            setMessage("Draft generated. Review before publishing.");
          }}
        >
          Prepare recap draft
        </ActionButton>
        {message && <Notice>{message}</Notice>}
        {recap && (
          <>
            <p className="text-sm leading-6">{recap.summary}</p>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {[...recap.keyPoints, ...recap.questions, ...recap.actions].map(
                (p, i) => (
                  <li key={i}>{p}</li>
                ),
              )}
            </ul>
            <ActionButton
              action={async () => {
                const { error } = await supabase.rpc("cs_approve_recap", {
                  p_org: tenant!.id,
                  p_lesson: lessonId,
                });
                if (error) throw error;
                setMessage("Recap approved and published to this class.");
              }}
            >
              Approve & publish recap
            </ActionButton>
          </>
        )}
      </div>
    </details>
  );
}
