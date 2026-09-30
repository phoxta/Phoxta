import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import {
  Badge,
  ButtonLink,
  Empty,
  Loading,
  Notice,
  PageHeading,
  useLoad,
} from "@/components/opportunities/UI";
import {
  aggregate,
  discoveryProfile,
  searchLibrary,
  workspaces,
} from "@/lib/opportunities/repository";
import {
  EMPTY_DISCOVERY_PROFILE,
  nextAction,
  recommendationReasons,
} from "@/lib/opportunities/domain";

export default function OpportunityHomePage() {
  const { user } = useAuth();
  const state = useLoad(async () => {
    const [all, matched, profile] = await Promise.all([
      workspaces(),
      searchLibrary({ mode: "for_you" }),
      discoveryProfile(),
    ]);
    const active = all.filter(
      (w) => !["paused", "rejected", "archived"].includes(w.lifecycle_state),
    );
    const details = await Promise.all(
      active.slice(0, 5).map((w) => aggregate(w.id)),
    );
    return {
      all,
      active,
      details,
      matched: matched.items.slice(0, 3),
      profile,
    };
  }, user?.id ?? "");
  if (state.loading) return <Loading />;
  const next = state.data?.details
    .map((d) => ({
      d,
      action: nextAction({ ...d, hasThesis: Boolean(d.workspace.thesis) }),
    }))
    .sort((a, b) => a.action.priority - b.action.priority)[0];
  return (
    <>
      <PageHeading
        eyebrow="Your opportunity workspace"
        title="A little more clarity. A useful next step."
        action={
          <ButtonLink to="/app/discover">Discover opportunities</ButtonLink>
        }
      >
        See what you’re working on, what changed, and what to investigate next.
      </PageHeading>
      {state.error && <Notice danger>{state.error}</Notice>}
      {!state.error && !state.data?.active.length && (
        <Empty
          title="You don’t need the perfect idea."
          action={
            <ButtonLink to="/app/discover">Find a place to start</ButtonLink>
          }
        >
          Start with an industry, a problem, your own idea, or let Phoxta
          explore for you. Your first opportunity begins with a question worth
          investigating.
        </Empty>
      )}
      {next && (
        <section className="p2-continue">
          <div>
            <span className="p2-eyebrow">
              Your next action · {next.d.workspace.title}
            </span>
            <h2>{next.action.title}</h2>
            <p>{next.action.reason}</p>
          </div>
          <ButtonLink
            to={
              next.action.tab === "school"
                ? "/app/school"
                : `/app/opportunities/${next.d.workspace.id}/${next.action.tab}`
            }
          >
            Continue
          </ButtonLink>
        </section>
      )}
      {Boolean(state.data?.active.length) && (
        <>
          <div className="p2-section-title">
            <h2>On your workbench</h2>
            <Link to="/app/opportunities">View all ↗</Link>
          </div>
          <div className="p2-grid">
            {state.data!.details.map((d) => (
              <article className="p2-card" key={d.workspace.id}>
                <Badge>{d.workspace.lifecycle_state}</Badge>
                <h2>{d.workspace.title}</h2>
                <p>
                  {d.workspace.thesis ||
                    "Your opportunity thesis is still taking shape."}
                </p>
                <div className="p2-uncertainty">
                  <strong>Next question</strong>
                  {
                    nextAction({ ...d, hasThesis: Boolean(d.workspace.thesis) })
                      .reason
                  }
                </div>
                <div className="p2-actions">
                  <ButtonLink
                    to={`/app/opportunities/${d.workspace.id}`}
                    secondary
                  >
                    Open workspace
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {Boolean(state.data?.all.length) && (
        <>
          <div className="p2-section-title">
            <h2>Your opportunity portfolio</h2>
          </div>
          <div className="p2-grid">
            {[
              "investigating",
              "testing",
              "shaping",
              "building",
              "launching",
            ].map((stage) => (
              <article className="p2-card" key={stage}>
                <span className="p2-eyebrow">{stage}</span>
                <h2>
                  {
                    state.data!.all.filter((w) => w.lifecycle_state === stage)
                      .length
                  }
                </h2>
                <p>opportunities at this stage</p>
              </article>
            ))}
          </div>
        </>
      )}
      {Boolean(state.data?.matched.length) && (
        <>
          <div className="p2-section-title">
            <h2>Matched to your preferences</h2>
            <Link to="/app/discover/for-you">See all matches ↗</Link>
          </div>
          <div className="p2-grid">
            {state.data!.matched.map((opportunity) => (
              <article className="p2-card" key={opportunity.id}>
                <Badge>{opportunity.evidence_strength}</Badge>
                <h2>{opportunity.title}</h2>
                <p>{opportunity.thesis}</p>
                <div className="p2-uncertainty">
                  <strong>Why it may fit</strong>
                  {recommendationReasons(
                    opportunity,
                    state.data!.profile ?? EMPTY_DISCOVERY_PROFILE,
                  ).join(" · ")}
                </div>
                <ButtonLink to={`/discover/${opportunity.slug}`} secondary>
                  Review opportunity
                </ButtonLink>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="p2-section-title">
        <h2>Learning that moves your work forward</h2>
      </div>
      <div className="p2-grid two">
        <article className="p2-card">
          <span className="p2-eyebrow">Phoxta Startup School</span>
          <h2>Learn by building something real.</h2>
          <p>
            Twelve modules connect opportunity thinking to evidence,
            experiments, business design and decisions.
          </p>
          <ButtonLink to="/app/school" secondary>
            Find your next lesson
          </ButtonLink>
        </article>
        <article className="p2-card">
          <span className="p2-eyebrow">Ready-to-Launch Businesses</span>
          <h2>Another way to start.</h2>
          <p>
            Inspect the opportunity, included systems, ongoing costs and what
            still needs testing.
          </p>
          <ButtonLink to="/app/businesses" secondary>
            Explore businesses
          </ButtonLink>
        </article>
      </div>
    </>
  );
}
