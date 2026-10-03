import { useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  account,
  command,
  discoveryProfile,
  workspaces,
} from "@/lib/opportunities/repository";
import {
  ActionButton,
  ActionForm,
  Badge,
  ButtonLink,
  Empty,
  Field,
  Loading,
  Notice,
  PageHeading,
  useLoad,
} from "@/components/opportunities/UI";
import { safeSourceUrl } from "@/lib/opportunities/domain";
import {
  NotificationPreferences,
  TeamAccess,
  PrivacyTools,
  LegacyMigration,
} from "@/components/opportunities/AccountWorkflows";
import { OpportunityPricingPage } from "./AppPricing";

type Listing = {
  id: string;
  slug: string;
  title: string;
  thesis: string;
  industry: string;
  model: string;
  complexity: string;
  price_display: string;
  package_type: string;
  demo_url: string | null;
  availability: string;
  disclosures: Record<string, string>;
  terms: Record<string, string>;
};
export function BusinessesCataloguePage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const state = useLoad(async () => {
    const result = await supabase
      .from("business_listings")
      .select("*")
      .eq("status", "published");
    if (result.error) throw new Error(result.error.message);
    return result.data as Listing[];
  }, "businesses");
  const listing = state.data?.find((l) => l.slug === slug);
  async function enquiry(action: string, item: Listing, message = "") {
    if (!user) {
      navigate(
        `/signup?redirect=${encodeURIComponent(`/businesses/${item.slug}`)}`,
      );
      return;
    }
    const result = await supabase.rpc("opportunity_business_action", {
      p_action: action,
      p_listing: item.id,
      p_message: message,
    });
    if (result.error) throw new Error(result.error.message);
  }
  return (
    <>
      <PageHeading
        eyebrow="Ready-to-Launch Businesses"
        title={listing?.title ?? "Skip the blank page."}
      >
        {listing?.thesis ??
          "Start with a business designed around a researched opportunity. Review its systems, evidence, dependencies and terms before you commit."}
      </PageHeading>
      {state.loading && <Loading />}
      {state.error && <Notice danger>{state.error}</Notice>}
      {slug && !listing && !state.loading && !state.error && (
        <Empty title="Business unavailable.">
          This package has not been published or is no longer available.
        </Empty>
      )}
      {listing ? (
        <div className="p2-grid two">
          <section className="p2-panel p2-detail-list">
            <div>
              <h3>Package</h3>
              <p>
                {listing.package_type.replaceAll("_", " ")} ·{" "}
                {listing.price_display}
              </p>
            </div>
            {Object.entries(listing.disclosures).map(([key, value]) => (
              <div key={key}>
                <h3>{key.replaceAll("_", " ")}</h3>
                <p className="p2-readable">{value}</p>
              </div>
            ))}
          </section>
          <div className="p2-stack">
            <section className="p2-panel">
              <Badge>{listing.availability}</Badge>
              <h2 style={{ marginTop: 20 }}>Review the package</h2>
              <Notice>
                Developed infrastructure is not a guaranteed income stream.
                Inspect what is tested and what remains an assumption.
              </Notice>
              {Object.entries(listing.terms).map(([key, value]) => (
                <p
                  key={key}
                  className="p2-readable"
                  style={{ marginBottom: 15 }}
                >
                  <strong>{key.replaceAll("_", " ")}:</strong> {value}
                </p>
              ))}
              {listing.demo_url && safeSourceUrl(listing.demo_url) && (
                <a
                  className="p2-button secondary"
                  href={safeSourceUrl(listing.demo_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open demo ↗
                </a>
              )}
            </section>
            <section className="p2-panel">
              <h2>Request details</h2>
              <ActionForm
                submit="Send enquiry"
                action={(data) => enquiry("enquire", listing, data.message)}
              >
                <Field
                  label="What would you like to know?"
                  name="message"
                  type="textarea"
                  required
                />
                <label className="p2-checkbox">
                  <input type="checkbox" required />I have reviewed the
                  disclosures. An enquiry does not purchase or reserve this
                  business.
                </label>
              </ActionForm>
              <div style={{ marginTop: 20 }}>
                <ActionButton action={() => enquiry("save", listing)}>
                  Save this business
                </ActionButton>
              </div>
            </section>
          </div>
        </div>
      ) : (
        !slug && (
          <>
            <div className="p2-filter">
              <label className="p2-field">
                <span>Filter by industry, model or complexity</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search business packages"
                />
              </label>
            </div>
            <div className="p2-grid">
              {state.data
                ?.filter((l) =>
                  `${l.title} ${l.industry} ${l.model} ${l.complexity}`
                    .toLowerCase()
                    .includes(q.toLowerCase()),
                )
                .map((l) => (
                  <article className="p2-card" key={l.id}>
                    <div className="p2-card-top">
                      <span className="p2-eyebrow">{l.industry}</span>
                      <Badge>{l.availability}</Badge>
                    </div>
                    <h2>{l.title}</h2>
                    <p>{l.thesis}</p>
                    <p>
                      {l.price_display} · {l.package_type.replaceAll("_", " ")}
                    </p>
                    <ButtonLink to={`/businesses/${l.slug}`} secondary>
                      Review business
                    </ButtonLink>
                  </article>
                ))}
            </div>
            {state.data?.length === 0 && (
              <Empty
                title="The next collection is being reviewed."
                action={
                  <ButtonLink to="/marketplace" secondary>
                    View existing business packages
                  </ButtonLink>
                }
              >
                New Ready-to-Launch listings appear after their assets, costs,
                evidence and handover terms have been reviewed.
              </Empty>
            )}
          </>
        )
      )}
    </>
  );
}
export function OpportunitySettingsPage() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const section = pathname.split("/")[3] || "profile";
  const [memberWorkspace, setMemberWorkspace] = useState("");
  const state = useLoad(async () => {
    const [summary, profile, all] = await Promise.all([
      account(),
      discoveryProfile(),
      workspaces(),
    ]);
    return { summary, profile, all };
  }, user?.id ?? "");
  return (
    <>
      <PageHeading eyebrow="Your account" title="Make Phoxta work for you." />
      <nav className="p2-tabs" aria-label="Settings">
        {[
          ["", "Profile"],
          ["/preferences", "Discovery preferences"],
          ["/team", "Team"],
          ["/integrations", "Integrations"],
          ["/billing", "Billing"],
          ["/privacy", "Data & privacy"],
          ["/notifications", "Notifications"],
          ["/migration", "Earlier ideas"],
        ].map(([path, label]) => (
          <NavLink end to={`/app/settings${path}`} key={path}>
            {label}
          </NavLink>
        ))}
      </nav>
      {state.loading && <Loading />}
      {state.error && <Notice danger>{state.error}</Notice>}
      {section === "profile" && (
        <section className="p2-panel">
          <h2>Profile</h2>
          <p className="p2-muted" style={{ marginBottom: 20 }}>
            {user?.email}
          </p>
          <ActionForm
            action={async (data) => {
              const result = await supabase.auth.updateUser({
                data: { full_name: data.full_name, timezone: data.timezone },
              });
              if (result.error) throw result.error;
            }}
          >
            <Field
              label="Display name"
              name="full_name"
              value={user?.user_metadata?.full_name ?? ""}
            />
            <Field
              label="Timezone"
              name="timezone"
              value={
                user?.user_metadata?.timezone ??
                Intl.DateTimeFormat().resolvedOptions().timeZone
              }
            />
          </ActionForm>
        </section>
      )}
      {section === "preferences" && (
        <section className="p2-panel">
          <h2>Discovery preferences</h2>
          <p style={{ marginBottom: 20 }}>
            Your goals, experience, interests and constraints help explain why
            an opportunity may fit.
          </p>
          <ButtonLink to="/onboarding/intent">Edit preferences</ButtonLink>
        </section>
      )}
      {section === "billing" && (
        <>
          <section className="p2-panel" style={{ marginBottom: 30 }}>
            <h2>
              Current plan: {state.data?.summary.account.plan_key ?? "Loading"}
            </h2>
            <p>Status: {state.data?.summary.account.billing_status}</p>
            {state.data?.summary.usage.map((u) => (
              <p key={u.feature} className="p2-muted">
                {u.feature}: {u.quantity} used · Period started {u.period_start}
              </p>
            ))}
            <ActionButton
              action={async () => {
                const result = await supabase.functions.invoke(
                  "opportunity-billing",
                  { body: { action: "portal" } },
                );
                if (result.error || result.data?.error)
                  throw new Error(result.data?.error ?? result.error?.message);
                const url = new URL(result.data.url);
                if (
                  url.protocol !== "https:" ||
                  url.hostname !== "billing.stripe.com"
                )
                  throw new Error("Invalid billing portal.");
                window.location.assign(url.href);
              }}
            >
              Manage subscription
            </ActionButton>
          </section>
          <OpportunityPricingPage />
        </>
      )}
      {section === "team" && (
        <>
          <section className="p2-panel">
            <h2>Share an opportunity workspace</h2>
            <label className="p2-field">
              <span>Workspace</span>
              <select
                value={memberWorkspace || state.data?.all[0]?.id || ""}
                onChange={(event) => setMemberWorkspace(event.target.value)}
              >
                {state.data?.all.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="p2-muted" style={{ marginBottom: 20 }}>
              Invitations expire after seven days and do not grant access until
              the recipient accepts with the invited email.
            </p>
            <ActionForm
              submit="Send invitation"
              action={(data) => command("member", data)}
            >
              <Field
                label="Workspace"
                name="workspace_id"
                options={
                  state.data?.all.map((w) => ({
                    value: w.id,
                    label: w.title,
                  })) ?? []
                }
                required
              />
              <Field
                label="Collaborator email"
                name="email"
                type="email"
                required
              />
              <Field
                label="Role or access change"
                name="role"
                options={["viewer", "researcher", "editor", "admin", "remove"]}
              />
            </ActionForm>
          </section>
          <TeamAccess
            workspaceId={memberWorkspace || state.data?.all[0]?.id || ""}
          />
        </>
      )}
      {section === "integrations" && (
        <section className="p2-panel">
          <h2>Business integrations</h2>
          <p style={{ marginBottom: 20 }}>
            Connect business email, channels and operational tools in the
            operating workspace for the business that owns them.
          </p>
          <ButtonLink to="/app" secondary>
            Open business integrations
          </ButtonLink>
        </section>
      )}
      {section === "notifications" && <NotificationPreferences />}
      {section === "migration" && <LegacyMigration />}
      {section === "privacy" && (
        <div className="p2-stack">
          <PrivacyTools
            workspaces={
              state.data?.all.filter((w) => w.owner_user_id === user?.id) ?? []
            }
          />
          <section className="p2-panel">
            <h2>Your data and privacy</h2>
            <p className="p2-muted" style={{ marginBottom: 20 }}>
              Export an individual Brief from its workspace. Account-wide
              exports and deletion requests are tracked for processing; billing
              records may need retention review.
            </p>
            <ActionForm
              submit="Submit data request"
              action={(data) =>
                command("privacy", {
                  ...data,
                  confirmed: data.confirmed === "on",
                })
              }
            >
              <Field
                label="Request"
                name="request_type"
                options={["export", "delete_account"]}
              />
              <label className="p2-checkbox">
                <input type="checkbox" name="confirmed" required />I want to
                submit this request for my account.
              </label>
            </ActionForm>
          </section>
        </div>
      )}
    </>
  );
}
export function VentureWorkspaceHub() {
  const { user } = useAuth();
  const state = useLoad(workspaces, user?.id ?? "");
  return (
    <>
      <PageHeading eyebrow="Workspace" title="Bring the opportunity to life.">
        Shape an offer, build the operating assets and prepare a deliberate
        launch.
      </PageHeading>
      {state.loading && <Loading />}
      {state.error && <Notice danger>{state.error}</Notice>}
      <div className="p2-grid">
        {state.data?.map((w) => (
          <article className="p2-card" key={w.id}>
            <Badge>{w.lifecycle_state}</Badge>
            <h2>{w.title}</h2>
            <div className="p2-actions">
              <ButtonLink to={`/app/opportunities/${w.id}/shape`} secondary>
                Shape
              </ButtonLink>
              <ButtonLink to={`/app/opportunities/${w.id}/build`} secondary>
                Build
              </ButtonLink>
              <ButtonLink to={`/app/opportunities/${w.id}/launch`} secondary>
                Launch
              </ButtonLink>
            </div>
          </article>
        ))}
      </div>
      <section className="p2-panel" style={{ marginTop: 30 }}>
        <h2>Operating businesses</h2>
        <p style={{ marginBottom: 20 }}>
          Continue managing your existing businesses, CRM, campaigns, websites
          and customer support.
        </p>
        <ButtonLink to="/app">Open operating console</ButtonLink>
      </section>
    </>
  );
}
