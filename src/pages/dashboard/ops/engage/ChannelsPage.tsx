import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { useEngageOps, getChannelSnapshot, type ChannelSnapshot } from "@/lib/db/ops/engageAreas";
import { getEmailIngressHealth, ingressVerdict, type EmailIngressHealth } from "@/lib/db/ops/emailHealth";
import { Chip } from "@/components/dash/Ui";

/**
 * Engage → Channels: the map of where customers can reach this business and
 * where each channel is managed. Read-only by design — credentials live in
 * Settings / Agent / Google, and every card links into the surface that owns
 * them. Connected-state is inferred from what's cheaply readable client-side:
 * the agent's webchat key + voice config, the Google connection, and real
 * conversation traffic per channel.
 */

const CSS = `
.chx-head { display: flex; align-items: center; justify-content: space-between; gap: 10px 12px; flex-wrap: wrap; margin-bottom: 14px; }
.chx-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.chx-sub { font-size: 13.5px; color: var(--hrx-muted); }
.chx-card { background: var(--hrx-card); border: 1px solid var(--hrx-border); border-radius: 16px; padding: 16px 18px; height: 100%; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.chx-card.soon { background: var(--hrx-soft); border-style: dashed; }
.chx-card .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.chx-card .n { font-size: 15.5px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
.chx-card .b { font-size: 13.5px; color: var(--hrx-muted); margin: 0; flex-grow: 1; }
.chx-card .foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.chx-card .detail { font-size: 13px; color: var(--hrx-muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chx-note { font-size: 13px; color: var(--hrx-muted); margin: 14px 0 0; }
`;

type Tone = "ok" | "warn" | "danger" | "line" | "plain" | "blue";
type ChannelDef = {
  key: string;
  name: string;
  blurb: string;
  state: { label: string; tone: Tone };
  detail: string;
  manage: { to: string; label: string } | null;
  soon?: boolean;
};

/**
 * The Email card's state, from the connection's real health rather than the mere
 * existence of a row.
 *
 * This card used to read "Connected" whenever google_connections held a row for
 * the business — so a revoked grant, a mailbox that had never once been synced,
 * and a working connection were the same green chip. It is the map of where
 * customers can reach a business; a channel that has silently stopped receiving
 * is exactly what it exists to show.
 */
function emailCard(
  health: EmailIngressHealth | null,
  snapshot: ChannelSnapshot | undefined,
  traffic: (ch: string) => string,
  count: (ch: string) => number,
  base: string,
): ChannelDef {
  const verdict = health ? ingressVerdict(health) : null;
  const manageEmail = { to: `${base}/google?tab=email`, label: "Email delivery" };

  // No mailbox connected, but mail is arriving anyway — the inbound webhook, or
  // history from a connection since removed. Saying "Not connected" there would
  // be its own lie.
  if (health && !health.connected) {
    return {
      key: "email",
      name: "Email",
      blurb: "Broadcast campaigns, Inbox replies and receipts. Connect Google Workspace to send from your own address.",
      state: count("email") > 0 ? { label: "No mailbox", tone: "warn" } : { label: "Not connected", tone: "warn" },
      detail: count("email") > 0 ? `${traffic("email")}, but no mailbox is connected` : "No mailbox is connected",
      manage: manageEmail,
    };
  }
  // Straight through, danger included. This used to collapse danger into warn,
  // so on the map of where customers can reach a business "Reconnect needed" and
  // "Failing" read with exactly the urgency of "Stale" — the label carried the
  // meaning and the colour contradicted it.
  const tone: Tone = verdict ? verdict.tone : "line";
  return {
    key: "email",
    name: "Email",
    blurb: "Broadcast campaigns, Inbox replies and receipts. Connect Google Workspace to send from your own address.",
    state: verdict ? { label: verdict.label, tone } : { label: "Checking…", tone: "line" },
    // The verdict's own sentence, not just an address: a card reading
    // "femi@phoxta.com" beside an amber chip says nothing about what is wrong.
    detail: verdict && !verdict.healthy ? verdict.title : health?.mailbox || snapshot?.googleEmail || traffic("email"),
    manage: manageEmail,
  };
}

function buildCards(snapshot: ChannelSnapshot | undefined, orgId: string, health: EmailIngressHealth | null): ChannelDef[] {
  const base = `/dashboard/businesses/${orgId}/ops`;
  const s = snapshot;
  const count = (ch: string) => s?.counts[ch] ?? 0;
  const traffic = (ch: string): string => {
    const n = count(ch);
    if (n === 0) return "No conversations yet";
    return `${n}${s?.capped ? "+" : ""} conversation${n === 1 ? "" : "s"}`;
  };
  const activeOrReady = (ch: string, readyLabel: string): { label: string; tone: Tone } =>
    count(ch) > 0 ? { label: "Active", tone: "ok" } : { label: readyLabel, tone: "line" };

  return [
    {
      key: "sms",
      name: "SMS",
      blurb: "Two-way texting in the Inbox, plus campaign sends and booking reminders — delivered over the platform's phone numbers.",
      state: activeOrReady("sms", "Ready"),
      detail: traffic("sms"),
      manage: { to: `${base}/settings`, label: "Manage in Settings" },
    },
    {
      key: "whatsapp",
      name: "WhatsApp",
      blurb: "Conversations land in the Inbox; approved templates keep you reachable outside the 24-hour reply window.",
      state: activeOrReady("whatsapp", "Ready"),
      detail: traffic("whatsapp"),
      manage: { to: `${base}/settings`, label: "Manage in Settings" },
    },
    emailCard(health, s, traffic, count, base),
    {
      key: "web",
      name: "Web chat",
      blurb: "Your AI agent on your website — one script tag, and it answers from your knowledge on every page.",
      state: s?.publicKey ? { label: "Ready", tone: "ok" } : { label: "Not set up", tone: "warn" },
      detail: s?.publicKey ? `Embed key ${s.publicKey.slice(0, 8)}… · ${traffic("web")}` : "Get the embed snippet from the Agent area",
      manage: { to: "../agent", label: "Manage in Agent" },
    },
    {
      key: "voice",
      name: "Phone",
      blurb: "AI answering, instant callbacks and outbound calls, routed by location and business hours.",
      state: count("voice") > 0 ? { label: "Active", tone: "ok" } : s?.voiceConfigured ? { label: "Ready", tone: "line" } : { label: "Not set up", tone: "warn" },
      detail: traffic("voice"),
      manage: { to: "../agent", label: "Manage in Agent" },
    },
    {
      key: "instagram",
      name: "Instagram",
      blurb: "DMs from your Instagram profile, answered in the same Inbox by the same agent.",
      state: { label: "Coming soon", tone: "plain" },
      detail: "",
      manage: null,
      soon: true,
    },
    {
      key: "messenger",
      name: "Messenger",
      blurb: "Facebook Messenger conversations, unified with everything else your customers send.",
      state: { label: "Coming soon", tone: "plain" },
      detail: "",
      manage: null,
      soon: true,
    },
  ];
}

export default function ChannelsPage() {
  const { orgId } = useEngageOps();

  const { data: snapshot, loading, error } = useCachedData(
    `ops:engage:channels:${orgId}`,
    async () => {
      const { data, error } = await getChannelSnapshot(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  // Real health, not row existence — see emailCard. Fail-soft: the map still
  // draws if this read cannot complete, and a FAILED read is never mistaken for
  // "no mailbox is connected" — the health module returns its empty value
  // alongside the error, and that value says connected:false.
  const { data: emailHealth } = useCachedData(
    `ops:engage:email-health:${orgId}`,
    async () => {
      const { data, error } = await getEmailIngressHealth(orgId);
      if (error) return null;
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  const cards = useMemo(() => buildCards(snapshot, orgId, emailHealth ?? null), [snapshot, orgId, emailHealth]);
  // Email counts as in use on the VERDICT, not on the chip's wording — otherwise
  // a business whose mail is arriving fine drops out of the count the moment
  // Phoxta is mid-setup and the chip stops reading exactly "Working".
  const emailVerdict = useMemo(() => (emailHealth ? ingressVerdict(emailHealth) : null), [emailHealth]);
  const inUse = cards.filter((c) =>
    !c.soon && (
      c.key === "email"
        ? Boolean(emailVerdict?.healthy)
        : c.state.label === "Active" || (c.key === "web" && c.state.label === "Ready")
    ),
  ).length;

  if (loading) return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</div>;

  return (
    <div>
      <style>{CSS}</style>

      <div className="chx-head">
        <h2 className="chx-title">Channels</h2>
        <span className="chx-sub">{inUse} of {cards.filter((c) => !c.soon).length} channels in use</span>
      </div>

      {error && <div className="alert alert-warning py-2 px-3 mb-3" style={{ borderRadius: 12, fontSize: 14 }} role="alert">{error}</div>}

      <div className="row g-3">
        {cards.map((c) => (
          <div key={c.key} className="col-md-6 col-xxl-4">
            <div className={`chx-card${c.soon ? " soon" : ""}`}>
              <div className="top">
                <h3 className="n">{c.name}</h3>
                <Chip tone={c.state.tone}>{c.state.label}</Chip>
              </div>
              <p className="b">{c.blurb}</p>
              <div className="foot">
                <span className="detail">{c.detail}</span>
                {c.manage && <Link to={c.manage.to} className="hrx-seeall flex-shrink-0">{c.manage.label} →</Link>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="chx-note">
        This page is the map, not the vault — credentials are never edited here. Each &quot;Manage&quot; link opens the surface that owns that channel.
      </p>
    </div>
  );
}
