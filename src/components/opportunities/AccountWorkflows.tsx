import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import {
  command,
  teamAction,
  teamInbox,
  teamPending,
  type TeamInbox,
  type TeamMember,
  type TeamPending,
} from "@/lib/opportunities/repository";
import {
  ActionButton,
  ActionForm,
  Badge,
  Field,
  Loading,
  Notice,
  useLoad,
} from "./UI";

export function Notifications() {
  const [open, setOpen] = useState(false);
  const state = useLoad(async () => {
    const result = await supabase
      .from("opportunity_notifications")
      .select("id,title,href,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (result.error) throw result.error;
    return result.data;
  }, String(open));
  const unread = state.data?.filter((n) => !n.read_at).length ?? 0;
  return (
    <div className="p2-notifications">
      <button
        className="p2-button secondary"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={17} />
        {unread > 0 && <span>{unread}</span>}
      </button>
      {open && (
        <section className="p2-notification-popover" aria-label="Notifications">
          <div className="p2-card-top">
            <h2>Notifications</h2>
            <button
              className="p2-button secondary"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          {state.loading && <Loading />}
          {state.error && <Notice danger>Notifications could not load.</Notice>}
          {state.data?.length === 0 && (
            <p className="p2-muted">You’re up to date.</p>
          )}
          {state.data?.map((n) => (
            <article key={n.id}>
              <Link
                onClick={() => {
                  setOpen(false);
                  if (!n.read_at)
                    void command("read_notification", { id: n.id }).then(
                      state.reload,
                    );
                }}
                to={n.href.startsWith("/app") ? n.href : "/app"}
              >
                {n.title}
              </Link>
              <p className="p2-muted">
                {new Date(n.created_at).toLocaleString()} ·{" "}
                {n.read_at ? "Read" : "Unread"}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export function NotificationPreferences() {
  const state = useLoad(async () => {
    const result = await supabase
      .from("opportunity_notification_preferences")
      .select("*")
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }, "notification-preferences");
  if (state.loading) return <Loading />;
  return (
    <section className="p2-panel">
      <h2>Notification preferences</h2>
      <p className="p2-muted">
        Choose which research and learning updates appear in your inbox. Account
        security and collaboration notices remain available.
      </p>
      {state.error ? (
        <Notice danger>{state.error}</Notice>
      ) : (
        <ActionForm
          action={async (data) => {
            const result = await supabase.rpc(
              "opportunity_save_notifications",
              {
                p_research: data.research === "on",
                p_experiments: data.experiments === "on",
                p_evidence: data.evidence === "on",
                p_digest: false,
              },
            );
            if (result.error) throw result.error;
          }}
          onSuccess={state.reload}
        >
          {[
            ["research", "Research ready for review"],
            ["experiments", "Experiments due"],
            ["evidence", "Evidence conflicts"],
          ].map(([key, label]) => (
            <label className="p2-checkbox" key={key}>
              <input
                type="checkbox"
                name={key}
                defaultChecked={state.data?.[key] ?? true}
              />
              {label}
            </label>
          ))}
        </ActionForm>
      )}
    </section>
  );
}

export function TeamAccess({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const state = useLoad(async () => {
    const inbox = await teamInbox();
    if (!workspaceId)
      return {
        members: [],
        pending: { invitations: [], transfers: [] },
        inbox,
      } as { members: TeamMember[]; pending: TeamPending; inbox: TeamInbox };
    const memberResult = await supabase.rpc("opportunity_members", {
      p_workspace: workspaceId,
    });
    if (memberResult.error) throw memberResult.error;
    let pending: TeamPending = { invitations: [], transfers: [] };
    const pendingResult = await teamPending(workspaceId)
      .then((value) => ({ value }))
      .catch((error) => ({ error }));
    if ("value" in pendingResult) pending = pendingResult.value;
    return { members: memberResult.data as TeamMember[], pending, inbox };
  }, workspaceId);
  const respond = (action: string, id: string, confirmed = false) =>
    teamAction(action, { id, confirmed });
  return (
    <div className="p2-stack">
      {state.data?.inbox.invitations.length ||
      state.data?.inbox.transfers.length ? (
        <section className="p2-panel">
          <h2>Invitations waiting for you</h2>
          {state.data.inbox.invitations.map((invite) => (
            <article className="p2-card-top" key={invite.id}>
              <div>
                <strong>{invite.title}</strong>
                <p className="p2-muted">
                  Role: {invite.role} · Expires{" "}
                  {new Date(invite.expires_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p2-actions">
                <ActionButton
                  action={() => respond("accept", invite.id)}
                  onSuccess={state.reload}
                >
                  Accept
                </ActionButton>
                <ActionButton
                  action={() => respond("decline", invite.id)}
                  onSuccess={state.reload}
                >
                  Decline
                </ActionButton>
              </div>
            </article>
          ))}
          {state.data.inbox.transfers.map((transfer) => (
            <article className="p2-card-top" key={transfer.id}>
              <div>
                <strong>Become owner of {transfer.title}</strong>
                <p className="p2-muted">
                  The current owner remains an administrator after transfer.
                </p>
              </div>
              <ActionForm
                submit="Accept ownership"
                action={(data) =>
                  respond(
                    "accept_transfer",
                    transfer.id,
                    data.confirmed === "on",
                  )
                }
                onSuccess={state.reload}
              >
                <label className="p2-checkbox">
                  <input name="confirmed" type="checkbox" required />I accept
                  responsibility for this workspace.
                </label>
              </ActionForm>
            </article>
          ))}
        </section>
      ) : null}
      <section className="p2-panel">
        <h2>Current collaborators</h2>
        {state.loading && <Loading />}
        {state.error && <Notice danger>{state.error}</Notice>}
        {state.data?.members.map((member) => (
          <article className="p2-card-top" key={member.user_id}>
            <div>
              <span>{member.email}</span>
              {member.origin === "organization" && (
                <p className="p2-muted">
                  Access inherited from the organization
                </p>
              )}
            </div>
            <div className="p2-actions">
              <Badge>{member.role}</Badge>
              {member.role !== "owner" && member.origin === "workspace" && (
                <ActionForm
                  submit="Update access"
                  action={(data) =>
                    teamAction(data.role === "remove" ? "remove" : "role", {
                      workspace_id: workspaceId,
                      user_id: member.user_id,
                      role: data.role,
                    })
                  }
                  onSuccess={state.reload}
                >
                  <Field
                    label="Role"
                    name="role"
                    value={member.role}
                    options={[
                      "viewer",
                      "researcher",
                      "editor",
                      "admin",
                      "remove",
                    ]}
                  />
                </ActionForm>
              )}
              {member.role !== "owner" &&
                state.data?.members.some(
                  (person) =>
                    person.user_id === user?.id && person.role === "owner",
                ) && (
                  <ActionForm
                    submit="Offer ownership"
                    action={(data) =>
                      teamAction("transfer", {
                        workspace_id: workspaceId,
                        user_id: member.user_id,
                        confirmed: data.confirmed === "on",
                      })
                    }
                    onSuccess={state.reload}
                  >
                    <label className="p2-checkbox">
                      <input name="confirmed" type="checkbox" required />
                      Transfer only after this person accepts.
                    </label>
                  </ActionForm>
                )}
            </div>
          </article>
        ))}
      </section>
      {state.data?.pending.invitations.length ? (
        <section className="p2-panel">
          <h2>Pending invitations</h2>
          {state.data.pending.invitations.map((invite) => (
            <article className="p2-card-top" key={invite.id}>
              <div>
                <span>{invite.email}</span>
                <p className="p2-muted">
                  {invite.role} · Expires{" "}
                  {new Date(invite.expires_at).toLocaleDateString()}
                </p>
              </div>
              <ActionButton
                action={() => respond("revoke", invite.id)}
                onSuccess={state.reload}
              >
                Revoke
              </ActionButton>
            </article>
          ))}
        </section>
      ) : null}
      {state.data?.pending.transfers.length ? (
        <section className="p2-panel">
          <h2>Pending ownership transfer</h2>
          {state.data.pending.transfers.map((transfer) => (
            <article className="p2-card-top" key={transfer.id}>
              <span>{transfer.email}</span>
              <ActionButton
                action={() => respond("revoke_transfer", transfer.id)}
                onSuccess={state.reload}
              >
                Cancel transfer
              </ActionButton>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
// Compatibility for the existing settings composition while it transitions to
// the richer invitation and ownership interface above.
export const MembersList = TeamAccess;

export function PrivacyTools({
  workspaces,
}: {
  workspaces: { id: string; title: string }[];
}) {
  const state = useLoad(async () => {
    const result = await supabase
      .from("opportunity_privacy_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (result.error) throw result.error;
    return result.data;
  }, "privacy-requests");
  return (
    <div className="p2-stack">
      <section className="p2-panel">
        <h2>Export your opportunity data</h2>
        <p className="p2-muted">
          Download the opportunity workspaces you can access, evidence,
          decisions, artifacts and your learning progress.
        </p>
        <ActionButton
          action={async () => {
            const result = await supabase.rpc("opportunity_export_account");
            if (result.error) throw result.error;
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(result.data, null, 2)], {
                type: "application/json",
              }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "phoxta-opportunity-data.json";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download account data
        </ActionButton>
      </section>
      <section className="p2-panel">
        <h2>Request workspace deletion</h2>
        <ActionForm
          submit="Request deletion"
          action={(data) =>
            command("privacy", {
              ...data,
              request_type: "delete_workspace",
              confirmed: data.confirmed === "on",
            })
          }
          onSuccess={state.reload}
        >
          <Field
            label="Workspace you own"
            name="workspace_id"
            options={workspaces.map((w) => ({ value: w.id, label: w.title }))}
            required
          />
          <label className="p2-checkbox">
            <input type="checkbox" name="confirmed" required />I want this
            workspace and its research removed. The team will review this
            request before processing it.
          </label>
        </ActionForm>
      </section>
      <section className="p2-panel">
        <h2>Your requests</h2>
        {state.error && <Notice danger>{state.error}</Notice>}
        {state.data?.length === 0 && <p>No data requests yet.</p>}
        {state.data?.map((r) => (
          <div className="p2-card-top" key={r.id}>
            <span>
              {r.request_type.replaceAll("_", " ")} ·{" "}
              {new Date(r.created_at).toLocaleDateString()}
            </span>
            <Badge>{r.status.replaceAll("_", " ")}</Badge>
          </div>
        ))}
      </section>
    </div>
  );
}

export function LegacyMigration() {
  type Item = {
    id: string;
    title: string;
    already_migrated: boolean;
    mapping: string;
  };
  const state = useLoad(async () => {
    const result = await supabase.rpc("opportunity_legacy_preview");
    if (result.error) throw result.error;
    return result.data as Item[];
  }, "legacy-preview");
  if (!state.error && !state.data?.length) return null;
  return (
    <section className="p2-panel">
      <h2>Your earlier ideas</h2>
      <p className="p2-muted">
        Review each mapping before creating an opportunity. Original records
        stay intact. Generated analysis remains a labelled hypothesis.
      </p>
      {state.error && <Notice danger>{state.error}</Notice>}
      {state.data?.map((item) => (
        <article key={item.id} className="p2-uncertainty">
          <h3>{item.title}</h3>
          <p>{item.mapping}</p>
          {item.already_migrated ? (
            <Badge>Already migrated</Badge>
          ) : (
            <ActionForm
              submit="Migrate this idea"
              action={async (data) => {
                const result = await supabase.rpc("opportunity_import_legacy", {
                  p_idea: item.id,
                  p_confirmed: data.confirmed === "on",
                });
                if (result.error) throw result.error;
              }}
              onSuccess={state.reload}
            >
              <label className="p2-checkbox">
                <input type="checkbox" name="confirmed" required />I have
                reviewed this mapping. Unverified analysis will not count as
                evidence.
              </label>
            </ActionForm>
          )}
        </article>
      ))}
    </section>
  );
}
