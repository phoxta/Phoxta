import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/state/tenant";
import { supabase } from "@/lib/supabase";
import { schoolCommand, schoolTime } from "@/lib/staff";
import {
  StaffPanel,
  Notice,
  Empty,
  ActionForm,
  ActionButton,
  inputClass,
} from "@/components/staff/StaffUI";
import { useSchoolRows } from "./StaffPages";

type Booking = {
  id: string;
  user_id: string;
  mentor_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  agenda: string;
  shared_notes: string;
};
export default function MentorWorkspace() {
  const { tenant } = useTenant();
  const org = tenant!.id;
  const bookings = useSchoolRows<Booking>("cs_bookings");
  const slots = useSchoolRows<{
    id: string;
    mentor_id: string;
    weekday: number;
    start_time: string;
    end_time: string;
  }>("cs_availability");
  const mentors = useSchoolRows<{ id: string; user_id: string; name: string }>(
    "cs_mentors",
    "id,user_id,name",
  );
  return (
    <>
      <StaffPanel
        title="Your mentoring appointments"
        description="Preparation stays private. Shared notes are sent to the learner only when you save them. AI suggestions are drafts for you to review."
      >
        {bookings.error && <Notice error>{bookings.error}</Notice>}
        {bookings.rows
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
          .map((b) => (
            <BookingCard key={b.id} booking={b} refresh={bookings.refresh} />
          ))}
        {!bookings.rows.length && (
          <Empty>
            No appointments assigned yet. Publish your availability below so
            eligible founders can book their included sessions.
          </Empty>
        )}
      </StaffPanel>
      <StaffPanel
        title="Weekly availability"
        description="Set availability in your local timezone. Existing booking checks prevent overlaps and honour the session buffer."
      >
        <ActionForm
          submitLabel="Add availability"
          fields={[
            {
              name: "timezone",
              label: "Your timezone",
              value: "Europe/London",
            },
            {
              name: "weekday",
              label: "Day",
              options: [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((label, i) => ({ value: String(i), label })),
            },
            { name: "start_time", label: "Available from", type: "time" },
            { name: "end_time", label: "Available until", type: "time" },
            {
              name: "session_min",
              label: "Session length (minutes)",
              type: "number",
              min: 15,
              max: 120,
              value: 30,
            },
            {
              name: "buffer_min",
              label: "Buffer on each side (minutes)",
              type: "number",
              min: 0,
              max: 120,
              value: 10,
            },
          ]}
          onSubmit={async (v) => {
            await schoolCommand(org, "mentor_availability", v, true);
            await slots.refresh();
          }}
        />
        {slots.rows.map((s) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm"
            key={s.id}
          >
            <p>
              {mentors.rows.find((m) => m.id === s.mentor_id)?.name} ·{" "}
              {
                [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ][s.weekday]
              }{" "}
              · {s.start_time}–{s.end_time}
            </p>
            <ActionButton
              destructive
              action={async () => {
                await schoolCommand(
                  org,
                  "remove_availability",
                  { id: s.id },
                  true,
                );
                await slots.refresh();
              }}
            >
              Remove slot rule
            </ActionButton>
          </div>
        ))}
      </StaffPanel>
    </>
  );
}
function BookingCard({
  booking: b,
  refresh,
}: {
  booking: Booking;
  refresh: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const org = tenant!.id;
  const [brief, setBrief] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [shared, setShared] = useState(b.shared_notes);
  const [loaded, setLoaded] = useState(false);
  const loadPrivate = async () => {
    if (loaded) return;
    const { data, error } = await supabase
      .from("cs_booking_notes")
      .select("body")
      .eq("organization_id", org)
      .eq("booking_id", b.id)
      .maybeSingle();
    if (!error) setPrivateNotes(data?.body ?? "");
    setLoaded(true);
  };
  const ai = async (op: string) => {
    const { data, error } = await supabase.functions.invoke(
      "startup-school-ai",
      { body: { op, organizationId: org, bookingId: b.id } },
    );
    if (error || data?.error)
      throw new Error(
        data?.error ?? "There is not enough session context yet.",
      );
    if (op === "capture") {
      const draft = data.capture ?? data;
      if (typeof draft.notes !== "string")
        throw new Error("No session summary was available.");
      setShared(draft.notes);
    } else setBrief(JSON.stringify(data.brief ?? data, null, 2));
  };
  return (
    <details
      className="rounded-xl border border-line p-4"
      onToggle={(e) => {
        if (e.currentTarget.open) void loadPrivate();
      }}
    >
      <summary className="cursor-pointer text-sm font-semibold">
        {schoolTime(b.starts_at)} · {b.status.replaceAll("_", " ")}
      </summary>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
        {b.agenda || "No preparation agenda submitted."}
      </p>
      {b.status === "confirmed" && (
        <div className="mt-4">
          <ActionButton
            action={async () => {
              const { data, error } = await supabase.rpc("cs_mentoring_room", {
                p_org: org,
                p_booking: b.id,
              });
              if (error) throw error;
              navigate(`/staff/room/${data}`);
            }}
          >
            Open private mentoring room
          </ActionButton>
        </div>
      )}
      <p className="mt-2 break-all text-xs text-muted">
        Assigned founder: {b.user_id}
      </p>
      <div className="my-4 flex flex-wrap gap-3">
        <ActionButton action={() => ai("brief")}>Prepare with AI</ActionButton>
        <ActionButton action={() => ai("capture")}>
          Draft shared summary
        </ActionButton>
      </div>
      {brief && (
        <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-subtle p-4 text-xs leading-6">
          {brief}
        </pre>
      )}
      <label className="mt-4 block text-sm">
        Private preparation notes
        <textarea
          className={`${inputClass} mt-2`}
          rows={4}
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
        />
      </label>
      <label className="mt-4 block text-sm">
        Notes to share with the learner
        <textarea
          className={`${inputClass} mt-2`}
          rows={5}
          value={shared}
          onChange={(e) => setShared(e.target.value)}
        />
      </label>
      <div className="mt-4">
        <ActionForm
          submitLabel="Approve & save notes"
          fields={[
            {
              name: "status",
              label: "Session outcome",
              value: b.status,
              options: ["confirmed", "completed", "no_show", "cancelled"].map(
                (v) => ({ value: v, label: v.replaceAll("_", " ") }),
              ),
            },
          ]}
          onSubmit={async (v) => {
            await schoolCommand(
              org,
              "mentor_notes",
              {
                id: b.id,
                status: v.status,
                shared_notes: shared,
                private_notes: privateNotes,
              },
              true,
            );
            await refresh();
          }}
        />
      </div>
      <Notice>
        AI text is not sent automatically. Check accuracy and remove anything
        that should remain private before saving.
      </Notice>
    </details>
  );
}
