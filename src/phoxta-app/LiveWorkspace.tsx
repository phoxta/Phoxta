import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Letter } from "react-letter";
import {
  Bell, Bot, CalendarCheck2, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, ChevronLeft, ChevronRight, ContactRound,
  Download, File, ListChecks, Mail, Megaphone, MessageCircle, MoreVertical, Palette, PhoneCall, Plus,
  RadioTower, Search, Send, UserRound, Users, Workflow, X,
} from "lucide-react";
import {
  listConversations, listContactTimeline, sendConversationReply,
  placeCall, getAgentConfig, saveAgentConfig, type Conversation, type TimelineMessage,
  listMembers, type AgentConfig, type OrgMember,
} from "@/lib/db/ops/agent";
import { listContacts, createContact, type Contact } from "@/lib/db/ops/crm";
import { listRecentCalls, summarizeCalls, type CallRow } from "@/lib/db/ops/calls";
import { listBookings, setBookingStatus, type Booking } from "@/lib/db/ops/bookings";
import {
  listCampaigns, createCampaign, listSegments, listAutomations, toggleAutomation,
  type Campaign, type Segment, type Automation,
} from "@/lib/db/ops/marketing";
import { getChannelSnapshot, listEngageFlows, listEngageTouches, type ChannelSnapshot, type EngageFlow } from "@/lib/db/ops/engageAreas";
import { listAssets, uploadAsset, type DesignAsset } from "@/lib/db/ops/designAssets";
import { listSocialPosts, sendSocialPostNow, type SocialPost } from "@/lib/db/ops/social";
import { getOpsWindow, getWorkBoard, moveWorkCard, type OpsWindow, type WorkBoard, type WorkCard, type WorkColumn } from "@/lib/cache/dashboardQueries";
import { listNotifications, markNotificationRead, type Notification } from "@/lib/db/collaboration";
import { gmailBackfillHtml } from "@/lib/db/ops/google";
import { useWorkspace } from "./WorkspaceContext";
import { NotificationTemplate, type AgentNotification } from "./NotificationTemplate";
import { AGENT_ACTIVITY_EVENT, DATA_CHANGED_EVENT, type AgentActivity } from "./agentActivity";
import { getPerformanceAudit, recordUserAction, type PerformanceAudit } from "./behaviorLearning";
import { useAuth } from "@/auth/AuthProvider";
import { createWorkspaceTask, listWorkspaceTasks, updateWorkspaceTask, type WorkspaceTask } from "@/lib/db/productWorkspace";
import ProductView, { PRODUCT_ROUTES } from "./ProductViews";
import "@/styles/opportunity.css";

const OpportunityHomePage = lazy(() => import("@/pages/opportunities/HomePage"));
const DiscoveryPage = lazy(() => import("@/pages/opportunities/DiscoveryPage"));
const OpportunityWorkspacePage = lazy(() => import("@/pages/opportunities/WorkspacePage"));
const OpportunitySchoolPage = lazy(() => import("@/pages/opportunities/SchoolPage"));
const BusinessesCataloguePage = lazy(() => import("@/pages/opportunities/SupportingPages").then((module) => ({ default: module.BusinessesCataloguePage })));
const OpportunitiesPage = lazy(() => import("@/pages/opportunities/WorkspacePage").then((module) => ({ default: module.OpportunitiesPage })));

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="#111"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.693.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.3-1.654a11.882 11.882 0 0 0 5.69 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.481-8.413Z" /></svg>;
}

const CUSTOMER_AREAS = [
  { id: "messages", label: "Messages", hint: "Unified inbox", group: "Daily work", icon: MessageCircle, path: "" },
  { id: "email", label: "Email", hint: "Email conversations", group: "Daily work", icon: Mail, path: "email" },
  { id: "whatsapp", label: "WhatsApp", hint: "WhatsApp conversations", group: "Daily work", icon: WhatsAppIcon, path: "whatsapp" },
  { id: "calls", label: "Calls", hint: "Voice and call history", group: "Daily work", icon: PhoneCall, path: "calls" },
  { id: "bookings", label: "Bookings", hint: "Bookings and reservations", group: "Daily work", icon: CalendarCheck2, path: "bookings" },
  { id: "customers", label: "Customers", hint: "Contacts and activity", group: "Customer data", icon: Users, path: "directory" },
  { id: "audience", label: "Audience", hint: "Segments and targeting", group: "Customer data", icon: ContactRound, path: "audience" },
  { id: "automations", label: "Automations", hint: "Reviewable follow-up", group: "Engagement", icon: Workflow, path: "automations" },
  { id: "campaigns", label: "Campaigns", hint: "One-off broadcasts", group: "Engagement", icon: Megaphone, path: "campaigns" },
  { id: "graphics", label: "Graphics", hint: "Design and social publishing", group: "Engagement", icon: Palette, path: "graphics" },
  { id: "channels", label: "Channels", hint: "Connected touchpoints", group: "Control", icon: RadioTower, path: "channels" },
  { id: "assistant", label: "AI assistant", hint: "Job and boundaries", group: "Control", icon: Bot, path: "assistant" },
  { id: "insights", label: "Insights", hint: "Customer performance", group: "Control", icon: ChartNoAxesCombined, path: "insights" },
] as const;
type CustomerArea = (typeof CUSTOMER_AREAS)[number];

function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PX";
}

function money(cents: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function useResource<T>(load: () => Promise<{ data: T; error: string | null }>, deps: React.DependencyList, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    const result = await load();
    setData(result.data);
    setError(result.error);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { void reload(); }, [reload]);
  return { data, setData, loading, error, reload };
}

function AreaSwitcher({ current, onChoose }: { current: CustomerArea; onChoose: (area: CustomerArea) => void }) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(CUSTOMER_AREAS.map((area) => area.group))];
  return <div className="pxc-live-switcher"><button className="pxc-live-switcher-trigger" onClick={() => setOpen((value) => !value)}><current.icon size={14} /><strong>{current.label}</strong><ChevronDown size={12} /></button>{open && <div className="pxc-live-menu">{groups.map((group) => <section key={group}><small>{group}</small>{CUSTOMER_AREAS.filter((area) => area.group === group).map((area) => <button key={area.id} className={current.id === area.id ? "active" : ""} onClick={() => { onChoose(area); setOpen(false); }}><area.icon size={15} /><span><strong>{area.label}</strong><small>{area.hint}</small></span>{current.id === area.id && <Check size={12} />}</button>)}</section>)}</div>}</div>;
}

function EmptyState({ loading, error, label }: { loading: boolean; error: string | null; label: string }) {
  if (loading) return <div className="pxc-live-empty">Loading {label}…</div>;
  if (error) return <div className="pxc-live-empty is-error">{error}</div>;
  return <div className="pxc-live-empty">No {label} yet.</div>;
}

function EmailHtml({ body }: { body: string }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const frame = host.current?.querySelector("iframe");
    if (!frame) return;
    let observer: ResizeObserver | null = null;
    let animation = 0;
    const fit = () => {
      const document = frame.contentDocument;
      if (!document?.documentElement || !document.body) return;
      if (!document.getElementById("phoxta-email-fit")) {
        const style = document.createElement("style");
        style.id = "phoxta-email-fit";
        style.textContent = `html,body{width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;overflow:hidden!important;background:#fff}body{box-sizing:border-box!important;padding:12px!important;overflow-wrap:anywhere!important}*,*::before,*::after{box-sizing:border-box!important;max-width:100%!important;min-width:0!important}table{width:100%!important;max-width:100%!important;table-layout:auto!important;border-collapse:collapse}td,th{max-width:100%!important;overflow-wrap:anywhere!important;word-break:break-word}img,video,svg,canvas{max-width:100%!important;height:auto!important;object-fit:contain}pre{white-space:pre-wrap!important;overflow-wrap:anywhere!important}`;
        document.head.appendChild(style);
      }
      frame.setAttribute("scrolling", "no");
      animation = window.requestAnimationFrame(() => {
        const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 80);
        frame.style.height = `${height}px`;
      });
      observer?.disconnect();
      observer = new ResizeObserver(fit);
      observer.observe(document.body);
    };
    frame.addEventListener("load", fit);
    fit();
    return () => { frame.removeEventListener("load", fit); observer?.disconnect(); window.cancelAnimationFrame(animation); };
  }, [body]);
  return <div ref={host} className="pxc-email-html"><Letter className="pxc-email-letter" html={body} useIframe iframeTitle="Email message" /></div>;
}

function emailContent(message: TimelineMessage, fallbackChannel: string) {
  if ((message.channel_type || fallbackChannel) !== "email") return null;
  const metaHtml = typeof message.meta?.html === "string" && message.meta.html.trim() ? message.meta.html : null;
  return metaHtml ?? (/<\/?[a-z][\s\S]*>/i.test(message.body) ? message.body : null);
}

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "outlook.com", "hotmail.com",
  "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "mail.com",
  "gmx.com", "gmx.co.uk", "msn.com", "yandex.com", "zoho.com",
]);

function emailDomain(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : "";
}

function suppliedAvatar(meta?: Record<string, unknown>) {
  if (!meta) return "";
  for (const key of ["avatar_url", "avatarUrl", "profile_image", "profile_picture", "picture"]) {
    const value = meta[key];
    if (typeof value === "string" && /^https:\/\//i.test(value)) return value;
  }
  return "";
}

function EmailAvatar({ email, name, meta }: { email: string; name: string; meta?: Record<string, unknown> }) {
  const domain = emailDomain(email);
  const source = suppliedAvatar(meta) || (domain && !PERSONAL_EMAIL_DOMAINS.has(domain) ? `https://${domain}/favicon.ico` : "");
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  if (source && !failed) return <img className="pxc-email-avatar" src={source} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  return <i className="pxc-email-avatar is-generic" title={name || email}><UserRound size={15} /></i>;
}

function MessagesView({ channel }: { channel?: "email" | "whatsapp" }) {
  const { business } = useWorkspace();
  const navigate = useNavigate();
  const [channelMenu, setChannelMenu] = useState(false);
  const conversations = useResource(() => listConversations(business.id, { limit: 100, channel }), [business.id, channel], [] as Conversation[]);
  const members = useResource(() => listMembers(business.id), [business.id], [] as OrgMember[]);
  const assets = useResource(() => listAssets(business.id), [business.id], [] as DesignAsset[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = conversations.data.find((row) => row.id === selectedId) ?? conversations.data[0] ?? null;
  const timeline = useResource(async () => selected ? listContactTimeline(business.id, selected.contact_id, selected.id) : { data: [] as TimelineMessage[], error: null }, [business.id, selected?.id], [] as TimelineMessage[]);
  const reloadTimeline = timeline.reload;
  const [draft, setDraft] = useState("");
  const composeStartedRef = useRef<number | null>(null);
  const [sending, setSending] = useState(false);
  const [htmlBackfillAttempted, setHtmlBackfillAttempted] = useState("");
  const [query, setQuery] = useState("");
  const filtered = conversations.data.filter((row) => `${row.customer_name} ${row.customer_email} ${row.summary}`.toLowerCase().includes(query.toLowerCase()));
  const isEmailView = selected?.channel_type === "email";
  const isWideMessageView = isEmailView || channel === "whatsapp";
  const selectedEmailMessages = isEmailView ? timeline.data.filter((message) => message.conversation_id === selected.id) : [];
  const selectedEmailId = selected?.id ?? "";
  const hasStoredEmailHtml = selectedEmailMessages.some((message) => !!emailContent(message, "email"));
  const selectedRichEmail = isEmailView
    ? [...selectedEmailMessages].reverse().find((message) => message.role === "customer" && emailContent(message, "email"))
      ?? [...selectedEmailMessages].reverse().find((message) => emailContent(message, "email"))
      ?? selectedEmailMessages.at(-1)
    : undefined;
  const threadMessages = isEmailView ? (selectedRichEmail ? [selectedRichEmail] : []) : timeline.data;
  const recentConversationContext = timeline.data.slice(-8).map((message) => `${message.role}: ${message.body}`).join(" | ").slice(0, 1800);
  const emailAvatarMeta = selectedRichEmail?.meta;

  useEffect(() => {
    if (!selectedEmailId || !isEmailView || timeline.loading || htmlBackfillAttempted === selectedEmailId || hasStoredEmailHtml) return;
    setHtmlBackfillAttempted(selectedEmailId);
    void gmailBackfillHtml(business.id, 100).then((report) => {
      if (!report.error && report.filled > 0) void reloadTimeline();
    });
  }, [business.id, hasStoredEmailHtml, htmlBackfillAttempted, isEmailView, reloadTimeline, selectedEmailId, timeline.loading]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!selected || !body || sending) return;
    setSending(true);
    const result = await sendConversationReply(business.id, selected.id, body, selected.channel_type);
    recordUserAction({ action: "customer_reply", area: "Customers", outcome: result.error ? "failed" : "success", detail: { channel: selected.channel_type, conversation_id: selected.id, word_count: body.split(/\s+/).filter(Boolean).length, question_count: (body.match(/\?/g) ?? []).length, compose_ms: composeStartedRef.current ? Date.now() - composeStartedRef.current : 0, error_code: result.error ? "delivery_failed" : null } });
    if (!result.error) { setDraft(""); composeStartedRef.current = null; await timeline.reload(); await conversations.reload(); }
    setSending(false);
  }

  return <div className={`pxc-live-message-grid${isWideMessageView ? " is-email-view" : ""}`} data-ai-context={`${channel === "email" ? "Email" : channel === "whatsapp" ? "WhatsApp" : "Message"} conversation`} data-ai-detail={selected ? `Customer: ${selected.customer_name || selected.customer_email || selected.customer_phone || "Unknown"}. Channel: ${selected.channel_type}. Status: ${selected.status}. Conversation summary: ${selected.summary || selected.intent || "No summary yet"}.` : "Select a customer conversation to draft, summarise or perform an action."}>
    <aside className="pxc-inbox"><header><button className="pxc-inbox-channel" onClick={() => setChannelMenu((value) => !value)}>{channel === "email" ? "Email" : channel === "whatsapp" ? "WhatsApp" : "Messages"}<ChevronDown size={10} /></button><span>{conversations.data.filter((row) => row.unread).length}</span><button aria-label="New conversation"><Plus size={12} /></button>{channelMenu && <div className="pxc-inbox-channel-menu"><button onClick={() => navigate("/app/customers")}>All messages<small>Web chat, email and WhatsApp</small></button><button onClick={() => navigate("/app/customers/email")}>Email<small>Connected email conversations</small></button><button onClick={() => navigate("/app/customers/whatsapp")}>WhatsApp<small>WhatsApp conversations</small></button></div>}</header><label><Search size={11} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" /></label><div className="pxc-contact-list">{filtered.length ? filtered.map((row) => <button className={row.id === selected?.id ? "active" : ""} key={row.id} onClick={() => setSelectedId(row.id)}>{row.channel_type === "email" ? <EmailAvatar email={row.customer_email} name={row.customer_name} /> : <i className="pxc-real-avatar">{initials(row.customer_name)}</i>}<span><strong>{row.customer_name || row.customer_email || row.customer_phone || "Customer"}</strong><small>{row.summary || row.intent || row.channel_type}</small><em><i>{row.channel_type}</i>{row.tags.slice(0, 1).map((tag) => <i key={tag}>{tag}</i>)}</em></span><time>{relativeTime(row.last_message_at)}</time></button>) : <EmptyState loading={conversations.loading} error={conversations.error} label="conversations" />}</div></aside>
    <section className="pxc-conversation" data-ai-context={selected ? `${selected.channel_type === "email" ? "Email" : selected.channel_type === "whatsapp" ? "WhatsApp" : "Message"} with ${selected.customer_name || selected.customer_email || selected.customer_phone || "customer"}` : "Customer conversations"} data-ai-detail={selected ? `Customer: ${selected.customer_name || selected.customer_email || selected.customer_phone || "Unknown"}. Status: ${selected.status}. Summary: ${selected.summary || selected.intent || "No summary yet"}. Recent conversation: ${recentConversationContext || "No messages loaded"}. Current draft: ${draft || "Empty"}.` : "Select a conversation to draft, summarise or perform an action."}>{selected ? <><header><div>{isEmailView ? <EmailAvatar email={selected.customer_email} name={selected.customer_name} meta={emailAvatarMeta} /> : <i className="pxc-real-avatar">{initials(selected.customer_name)}</i>}<span><strong>{selected.customer_name || "Customer"}</strong><small><i /> {selected.channel_type} · {selected.status}</small></span></div><button onClick={() => placeCall(business.id, selected.customer_phone, { conversationId: selected.id })}><PhoneCall size={14} /> Call</button></header><div className={`pxc-message-thread${isEmailView ? " is-email-reader" : ""}`}>{threadMessages.map((message) => { const isEmail = (message.channel_type || selected.channel_type) === "email"; const html = emailContent(message, selected.channel_type); const subject = typeof message.meta?.subject === "string" ? message.meta.subject.trim() : ""; const side = message.role === "customer" ? "is-in" : "is-out"; return <div className={`${side}${isEmail ? " is-email" : ""}`} key={message.id}>{isEmail ? <>{subject && <strong className="pxc-email-subject">{subject}</strong>}{html ? <EmailHtml body={html} /> : <div className="pxc-email-html"><p>{message.body}</p></div>}</> : <span>{message.body}</span>}</div>; })}{threadMessages.length === 0 && <EmptyState loading={timeline.loading} error={timeline.error} label="messages" />}</div><form onSubmit={send}><input data-learning-content="true" value={draft} onChange={(event) => { if (!composeStartedRef.current && event.target.value) composeStartedRef.current = Date.now(); setDraft(event.target.value); }} placeholder={selected.channel_type === "email" ? "Reply by email" : "Type a message"} disabled={sending} /><button aria-label="Send message"><Send size={14} /></button></form></> : <EmptyState loading={conversations.loading} error={conversations.error} label="conversations" />}</section>
    {!isWideMessageView && <aside className="pxc-directory"><header><strong>Directory</strong><button aria-label="Directory options"><MoreVertical size={15} /></button></header><section><div className="pxc-directory-title"><strong>Team Members</strong><span>{members.data.length}</span></div>{members.data.slice(0, 6).map((member) => <button className="pxc-team-person" key={member.user_id}><i className="pxc-real-avatar">{initials(member.full_name)}</i><span><strong>{member.full_name || "Team member"}</strong><small>{member.role}</small></span></button>)}{members.data.length === 0 && <EmptyState loading={members.loading} error={members.error} label="team members" />}</section><section className="pxc-files"><div className="pxc-directory-title"><strong>Files</strong><span>{assets.data.length}</span></div>{assets.data.slice(0, 6).map((asset) => <a href={asset.url} target="_blank" rel="noreferrer" key={asset.path}><span><File size={13} /></span><span><strong>{asset.name}</strong><small>{Math.max(1, Math.round(asset.size / 1024))} KB</small></span><Download size={12} /></a>)}{assets.data.length === 0 && <EmptyState loading={assets.loading} error={assets.error} label="files" />}</section></aside>}
  </div>;
}

function CallsView() {
  const { business } = useWorkspace();
  const calls = useResource(() => listRecentCalls(business.id, { limit: 100 }), [business.id], [] as CallRow[]);
  const stats = summarizeCalls(calls.data);
  const [phone, setPhone] = useState(""); const [mode, setMode] = useState<"ai" | "bridge">("ai"); const [notice, setNotice] = useState("");
  async function call() { const result = await placeCall(business.id, phone, { mode }); setNotice(result.error ?? `Call ${result.status ?? "started"}`); recordUserAction({ action: "customer_call", area: "Customers", outcome: result.error ? "failed" : "success", detail: { mode, status: result.status, error: result.error } }); }
  return <ViewShell eyebrow="Voice workspace" title="Call customers with the right handoff." notice={notice}><div className="pxc-live-metrics"><span><strong>{stats.total}</strong><small>Total calls</small></span><span><strong>{stats.inbound}</strong><small>Inbound</small></span><span><strong>{stats.booked}</strong><small>Booked</small></span><span><strong>{stats.escalated}</strong><small>Escalated</small></span></div><div className="pxc-call-controls"><div><button className={mode === "ai" ? "active" : ""} onClick={() => setMode("ai")}>AI agent</button><button className={mode === "bridge" ? "active" : ""} onClick={() => setMode("bridge")}>Phone bridge</button></div><label><PhoneCall size={14} /><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Customer phone" /><button onClick={call}>Start call</button></label></div><Rows rows={calls.data.map((row) => [row.to_number || row.from_number || "Customer", `${row.direction} · ${Math.round(row.duration_sec / 60)} min`, row.outcome])} empty={<EmptyState loading={calls.loading} error={calls.error} label="calls" />} /></ViewShell>;
}

function CustomersView() {
  const { business } = useWorkspace(); const contacts = useResource(() => listContacts(business.id), [business.id], [] as Contact[]); const [query, setQuery] = useState(""); const [adding, setAdding] = useState(false); const [name, setName] = useState(""); const [email, setEmail] = useState("");
  async function add(event: React.FormEvent) { event.preventDefault(); const result = await createContact(business.id, { name, email }); recordUserAction({ action: "customer_created", area: "Customers", outcome: result.error ? "failed" : "success", detail: { has_email: Boolean(email), error: result.error } }); if (!result.error) { setName(""); setEmail(""); setAdding(false); await contacts.reload(); } }
  const rows = contacts.data.filter((row) => `${row.name} ${row.email} ${row.company}`.toLowerCase().includes(query.toLowerCase()));
  return <ViewShell eyebrow="Customer records" title="Every customer and lead in one place."><div className="pxc-cx-toolbar"><label><Search size={13} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers" /></label><button onClick={() => setAdding((value) => !value)}><Plus size={13} /> Add customer</button></div>{adding && <form className="pxc-live-inline-form" onSubmit={add}><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><button>Add</button></form>}<Rows rows={rows.map((row) => [row.name || "Unnamed", `${row.company || row.email || row.phone} · ${row.stage}`, money(row.value_cents, business.currency)])} empty={<EmptyState loading={contacts.loading} error={contacts.error} label="customers" />} /></ViewShell>;
}

function BookingsView() {
  const { business } = useWorkspace(); const bookings = useResource(() => listBookings(business.id), [business.id], [] as Booking[]); const [notice, setNotice] = useState("");
  async function confirm(row: Booking) { const nextStatus = row.status === "confirmed" ? "completed" : "confirmed"; const result = await setBookingStatus(row.id, nextStatus); setNotice(result.error ?? "Booking updated"); recordUserAction({ action: "booking_status_changed", area: "Operations", outcome: result.error ? "failed" : "success", detail: { from: row.status, to: nextStatus, error: result.error } }); if (!result.error) await bookings.reload(); }
  return <ViewShell eyebrow="Bookings" title="Availability, appointments and fulfilment." notice={notice}><Rows rows={bookings.data.map((row) => [row.customer_name, `${row.services?.name ?? "Booking"} · ${new Date(row.start_at).toLocaleString()}`, row.status])} action="Update" onAction={(index) => void confirm(bookings.data[index])} empty={<EmptyState loading={bookings.loading} error={bookings.error} label="bookings" />} /></ViewShell>;
}

function AudienceView() {
  const { business } = useWorkspace(); const segments = useResource(() => listSegments(business.id), [business.id], [] as Segment[]); return <ViewShell eyebrow="Audience" title="Useful groups built from real customer records."><div className="pxc-segment-grid">{segments.data.map((row) => <button key={row.id}><ContactRound size={17} /><strong>{row.name}</strong><span>{row.contact_ids.length} people</span><small>{row.criteria || "Saved segment"}</small></button>)}{segments.data.length === 0 && <EmptyState loading={segments.loading} error={segments.error} label="segments" />}</div></ViewShell>;
}

function AutomationsView() {
  const { business } = useWorkspace(); const automations = useResource(() => listAutomations(business.id), [business.id], [] as Automation[]); const [notice, setNotice] = useState(""); async function toggle(row: Automation) { const result = await toggleAutomation(row.id, !row.active); setNotice(result.error ?? "Automation updated"); recordUserAction({ action: "automation_toggled", area: "Customers", outcome: result.error ? "failed" : "success", detail: { enabled: !row.active, error: result.error } }); if (!result.error) await automations.reload(); }
  return <ViewShell eyebrow="Automations" title="Small, reviewable follow-up flows." notice={notice}><div className="pxc-toggle-list">{automations.data.map((row) => <article key={row.id}><span><Workflow size={15} /></span><div><strong>{row.name}</strong><small>{row.trigger.replaceAll("_", " ")} → {row.action.replaceAll("_", " ")} · {row.runs} runs</small></div><em>{row.active ? "Running" : "Paused"}</em><button className={row.active ? "on" : ""} onClick={() => void toggle(row)}><i /></button></article>)}{automations.data.length === 0 && <EmptyState loading={automations.loading} error={automations.error} label="automations" />}</div></ViewShell>;
}

function CampaignsView() {
  const { business } = useWorkspace(); const campaigns = useResource(() => listCampaigns(business.id), [business.id], [] as Campaign[]); const [creating, setCreating] = useState(false); const [name, setName] = useState("");
  async function create(event: React.FormEvent) { event.preventDefault(); const result = await createCampaign(business.id, { name }); recordUserAction({ action: "campaign_created", area: "Growth", outcome: result.error ? "failed" : "success", detail: { error: result.error } }); if (!result.error) { setCreating(false); setName(""); await campaigns.reload(); } }
  return <ViewShell eyebrow="Campaigns" title="Create demand without losing customer context."><div className="pxc-cx-toolbar"><span /><button onClick={() => setCreating((value) => !value)}><Plus size={13} /> New campaign</button></div>{creating && <form className="pxc-live-inline-form" onSubmit={create}><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" /><button>Create draft</button></form>}<Rows rows={campaigns.data.map((row) => [row.name, `${row.channel} · ${row.recipients} recipients`, row.status])} empty={<EmptyState loading={campaigns.loading} error={campaigns.error} label="campaigns" />} /></ViewShell>;
}

function GraphicsView() {
  const { business } = useWorkspace(); const assets = useResource(() => listAssets(business.id), [business.id], [] as DesignAsset[]); const posts = useResource(async () => { const result = await listSocialPosts(business.id); return { data: result.data?.posts ?? [], error: result.error }; }, [business.id], [] as SocialPost[]); const [tab, setTab] = useState<"assets" | "posts">("assets"); const [notice, setNotice] = useState("");
  async function upload(file?: File) { if (!file) return; const result = await uploadAsset(business.id, file); setNotice(result.error ?? "Image uploaded"); recordUserAction({ action: "design_uploaded", area: "Growth", outcome: result.error ? "failed" : "success", detail: { mime: file.type, size: file.size, error: result.error } }); if (!result.error) await assets.reload(); }
  async function publish(post: SocialPost) { const result = await sendSocialPostNow(business.id, post.id); setNotice(result.error ?? result.data?.note ?? "Post sent"); recordUserAction({ action: "social_post_published", area: "Growth", outcome: result.error ? "failed" : "success", detail: { status: post.status, error: result.error } }); await posts.reload(); }
  return <ViewShell eyebrow="Graphics" title="Design assets and social publishing." notice={notice}><div className="pxc-graphics-tabs"><button className={tab === "assets" ? "active" : ""} onClick={() => setTab("assets")}>Assets</button><button className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}>Social queue</button><label className="pxc-live-upload"><Plus size={12} /> Upload<input type="file" accept="image/*" onChange={(e) => void upload(e.target.files?.[0])} /></label></div>{tab === "assets" ? <div className="pxc-design-grid">{assets.data.map((asset) => <article key={asset.path}><img className="pxc-design-preview" src={asset.url} alt={asset.name} /><div><span><strong>{asset.name}</strong><small>{asset.source}</small></span></div></article>)}{assets.data.length === 0 && <EmptyState loading={assets.loading} error={assets.error} label="design assets" />}</div> : <Rows rows={posts.data.map((row) => [row.caption || "Untitled post", new Date(row.scheduled_at).toLocaleString(), row.status])} action="Send now" onAction={(index) => void publish(posts.data[index])} empty={<EmptyState loading={posts.loading} error={posts.error} label="social posts" />} />}</ViewShell>;
}

function ChannelsView() {
  const { business } = useWorkspace();
  const channels = useResource(() => getChannelSnapshot(business.id), [business.id], { publicKey: null, voiceConfigured: false, googleEmail: null, counts: {}, capped: false } as ChannelSnapshot);
  const entries = [
    ["Web chat", channels.data.publicKey ? "Connected" : "Not configured"],
    ["Voice", channels.data.voiceConfigured ? "Connected" : "Not configured"],
    ["Email", channels.data.googleEmail || "Not connected"],
    ...Object.entries(channels.data.counts).map(([name, count]) => [name, `${channels.data.capped ? "At least " : ""}${count} conversations`]),
  ];
  return <ViewShell eyebrow="Channels" title="Connected customer touchpoints."><div className="pxc-channel-grid">{entries.map(([name, detail], index) => <article key={`${name}-${index}`}><span><RadioTower size={15} /></span><div><strong>{name}</strong><small>{detail}</small></div><i className="pxc-live-status" /></article>)}{entries.length === 0 && <EmptyState loading={channels.loading} error={channels.error} label="connected channels" />}</div></ViewShell>;
}

function AssistantView() {
  const { business } = useWorkspace(); const config = useResource(() => getAgentConfig(business.id), [business.id], null as AgentConfig | null); const [draft, setDraft] = useState<AgentConfig | null>(null); const [notice, setNotice] = useState(""); useEffect(() => { setDraft(config.data); }, [config.data]);
  async function save(event: React.FormEvent) { event.preventDefault(); if (!draft) return; const result = await saveAgentConfig(draft.id, { display_name: draft.display_name, persona: draft.persona, greeting: draft.greeting, tone: draft.tone }); setNotice(result.error ?? "AI assistant saved"); if (!result.error) await config.reload(); }
  if (!draft) return <EmptyState loading={config.loading} error={config.error} label="AI assistant configuration" />;
  return <ViewShell eyebrow="AI assistant" title="Set its role, tone and customer boundaries." notice={notice}><form className="pxc-live-settings" onSubmit={save}><label>Name<input value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} /></label><label>Tone<input value={draft.tone} onChange={(e) => setDraft({ ...draft, tone: e.target.value })} /></label><label>Greeting<textarea value={draft.greeting} onChange={(e) => setDraft({ ...draft, greeting: e.target.value })} /></label><label>Job and persona<textarea value={draft.persona} onChange={(e) => setDraft({ ...draft, persona: e.target.value })} /></label><button>Save assistant</button></form></ViewShell>;
}

function InsightsView() {
  const { business } = useWorkspace(); const flows = useResource(async () => { const result = await listEngageFlows(business.id); return { data: result.data, error: result.error }; }, [business.id], [] as EngageFlow[]); const touches = useResource(async () => { const since = new Date(Date.now() - 30 * 864e5).toISOString(); const result = await listEngageTouches(business.id, since); return { data: result.data, error: result.error }; }, [business.id], []);
  return <ViewShell eyebrow="Customer intelligence" title="Signals from real customer activity."><div className="pxc-live-metrics"><span><strong>{flows.data.length}</strong><small>Flows</small></span><span><strong>{flows.data.filter((row) => row.status === "live").length}</strong><small>Live</small></span><span><strong>{touches.data.length}</strong><small>Touches</small></span><span><strong>{new Set(touches.data.map((row) => row.contact_id)).size}</strong><small>People reached</small></span></div><Rows rows={flows.data.map((row) => [row.name, row.kind, row.status])} empty={<EmptyState loading={flows.loading} error={flows.error || touches.error} label="insights" />} /></ViewShell>;
}

function ViewShell({ eyebrow, title, notice, children }: { eyebrow: string; title: string; notice?: string; children: React.ReactNode }) { return <section className="pxc-live-view"><header><div><small>{eyebrow}</small><h2>{title}</h2></div>{notice && <em>{notice}</em>}</header>{children}</section>; }
function Rows({ rows, action, onAction, empty }: { rows: string[][]; action?: string; onAction?: (index: number) => void; empty?: React.ReactNode }) { return <div className="pxc-cx-rows">{rows.length ? rows.map((row, index) => <article key={`${row[0]}-${index}`}><span className="pxc-real-avatar">{initials(row[0])}</span><div><strong>{row[0]}</strong><small>{row[1]}</small></div><em>{row[2]}</em>{action && <button onClick={() => onAction?.(index)}>{action}</button>}</article>) : empty}</div>; }

function areaFromPath(pathname: string) { const segment = pathname.replace(/^\/app\/customers\/?/, "").split("/")[0]; return CUSTOMER_AREAS.find((area) => area.path === segment) ?? CUSTOMER_AREAS[0]; }

export function CustomerWorkspace() {
  const location = useLocation(); const navigate = useNavigate(); const { business } = useWorkspace(); const current = areaFromPath(location.pathname); const choose = (area: CustomerArea) => navigate(`/app/customers${area.path ? `/${area.path}` : ""}`);
  const content: Record<string, React.ReactNode> = { messages: <MessagesView />, email: <MessagesView channel="email" />, whatsapp: <MessagesView channel="whatsapp" />, calls: <CallsView />, bookings: <BookingsView />, customers: <CustomersView />, audience: <AudienceView />, automations: <AutomationsView />, campaigns: <CampaignsView />, graphics: <GraphicsView />, channels: <ChannelsView />, assistant: <AssistantView />, insights: <InsightsView /> };
  const inboxLayout = current.id === "messages" || current.id === "email" || current.id === "whatsapp";
  return <section className="pxc-live-customer"><aside className="pxc-live-tools">{CUSTOMER_AREAS.slice(0, 6).map((area) => <button key={area.id} className={current.id === area.id ? "active" : ""} onClick={() => choose(area)} title={area.label}><area.icon size={15} /></button>)}</aside><div className={`pxc-live-surface${inboxLayout ? " is-inbox" : ""}`}><header><AreaSwitcher current={current} onChoose={choose} /><span>{business.name}</span></header><div className={`pxc-live-module is-${current.id}`}>{content[current.id]}</div></div></section>;
}

function PerformanceAuditView() {
  const { business } = useWorkspace();
  const { user } = useAuth();
  const report = useResource(() => getPerformanceAudit(business.id, user?.id), [business.id, user?.id], null as PerformanceAudit | null);
  const data = report.data;
  if (!data) return <ViewShell eyebrow="Performance audit" title="How you work, where you are strong, and what to improve."><EmptyState loading={report.loading} error={report.error} label="performance evidence" /></ViewShell>;
  const scores = [{ label: "Focus", value: data.scores.focus }, { label: "Execution", value: data.scores.execution }, { label: "Customer care", value: data.scores.customerCare }, { label: "Learning", value: data.scores.learning }];
  return <ViewShell eyebrow="Performance audit" title="How you handled work across this business." notice={`${data.evidenceCount} evidence points · last ${data.periodDays} days`}>
    <div className="pxc-performance-scores">{scores.map((score) => <article key={score.label}><span className="pxc-performance-ring" style={{ "--score": `${score.value * 3.6}deg` } as React.CSSProperties}><b>{score.value}</b></span><div><strong>{score.label}</strong><small>{score.value >= 80 ? "Strong" : score.value >= 65 ? "Developing well" : "Needs attention"}</small></div></article>)}</div>
    <div className="pxc-performance-metrics"><span><strong>{data.metrics.activeMinutes}m</strong><small>Active work</small></span><span><strong>{data.metrics.completionRate}%</strong><small>Action completion</small></span><span><strong>{data.metrics.customerReplies}</strong><small>Customer replies</small></span><span><strong>{data.metrics.averageComposeSeconds}s</strong><small>Average compose time</small></span></div>
    <p className="pxc-performance-privacy">This report learns from activity inside this workspace. Passwords, payment fields, authentication forms, and file contents are excluded.</p>
    <div className="pxc-performance-grid"><section><header><strong>What is working</strong><small>Based on observed actions and outcomes</small></header>{data.strengths.map((item) => <p key={item}><Check size={13} />{item}</p>)}</section><section><header><strong>Improvement advice</strong><small>Practical changes for the next work session</small></header>{data.improvements.map((item) => <p key={item}><ChevronRight size={13} />{item}</p>)}</section></div>
    <section className="pxc-course-recommendations"><header><div><strong>Recommended Startup School courses</strong><small>Chosen from your current working patterns</small></div><a href="https://learn.phoxta.com" target="_blank" rel="noreferrer">Open Startup School <ChevronRight size={12} /></a></header><div>{data.recommendations.map((course) => <a href={course.url} target="_blank" rel="noreferrer" key={course.id}><span>Course</span><strong>{course.title}</strong><p>{course.reason}</p><em>Start course <ChevronRight size={11} /></em></a>)}</div></section>
    <section className="pxc-performance-activity"><header><strong>Recent evidence</strong><button onClick={() => void report.reload()}>Refresh audit</button></header>{data.recentActions.map((item, index) => <article key={`${item.title}-${item.at}-${index}`}><i className={item.status} /><div><strong>{item.title}</strong><small>{item.detail}</small></div><span>{item.status}<small>{relativeTime(item.at)}</small></span></article>)}{!data.recentActions.length && <p>Phoxta is collecting the first evidence from your work.</p>}</section>
  </ViewShell>;
}

function DashboardView({ kind }: { kind: "today" | "operations" | "growth" | "intelligence" }) {
  const { business } = useWorkspace(); const metrics = useResource(async () => { try { return { data: await getOpsWindow(business.id), error: null }; } catch (error) { return { data: null, error: String(error) }; } }, [business.id], null as OpsWindow | null); const board = useResource(async () => { try { return { data: await getWorkBoard(business.id, 12), error: null }; } catch (error) { return { data: null, error: String(error) }; } }, [business.id], null as WorkBoard | null); const campaigns = useResource(() => listCampaigns(business.id), [business.id], [] as Campaign[]);
  const titles = { today: ["Today", `What needs attention across ${business.name}.`], operations: ["Operations", "Live work, fulfilment and approvals."], growth: ["Growth", "Campaigns and customer demand in motion."], intelligence: ["Intelligence", "Evidence from customers and automated work."] } as const;
  const [eyebrow, title] = titles[kind]; const m = metrics.data;
  if (kind === "growth") return <ViewShell eyebrow={eyebrow} title={title}><div className="pxc-live-metrics"><span><strong>{campaigns.data.length}</strong><small>Campaigns</small></span><span><strong>{campaigns.data.filter((row) => row.status === "scheduled").length}</strong><small>Scheduled</small></span><span><strong>{campaigns.data.reduce((sum, row) => sum + row.sent_count, 0)}</strong><small>Sent</small></span><span><strong>{campaigns.data.reduce((sum, row) => sum + row.failed_count, 0)}</strong><small>Failed</small></span></div><Rows rows={campaigns.data.map((row) => [row.name, `${row.channel} · ${row.recipients} recipients`, row.status])} empty={<EmptyState loading={campaigns.loading} error={campaigns.error} label="campaigns" />} /></ViewShell>;
  if (kind === "intelligence") return <PerformanceAuditView />;
  return <ViewShell eyebrow={eyebrow} title={title}><div className="pxc-live-metrics"><span><strong>{m?.orders ?? 0}</strong><small>Orders</small></span><span><strong>{m?.unread ?? 0}</strong><small>Unread</small></span><span><strong>{m?.approvals ?? 0}</strong><small>Approvals</small></span><span><strong>{m?.revenue ? money(m.revenue, m.currency) : "—"}</strong><small>Revenue</small></span></div><Rows rows={(board.data?.cards ?? []).map((row) => [row.title, row.detail, row.col.replace("todo", "To do")])} empty={<EmptyState loading={metrics.loading || board.loading} error={metrics.error || board.error} label="active work" />} /></ViewShell>;
}

export function LiveAppRoutes() {
  const path = useLocation().pathname;
  const opportunityView = path === "/app/opportunity" ? <OpportunityHomePage />
    : path.startsWith("/app/discover") ? <DiscoveryPage />
      : path === "/app/opportunities" ? <OpportunitiesPage />
        : path.startsWith("/app/opportunities/") ? <OpportunityWorkspacePage />
          : path.startsWith("/app/school") ? <OpportunitySchoolPage />
            : path === "/app/businesses" ? <BusinessesCataloguePage /> : null;
  if (opportunityView) return <Suspense fallback={<div className="pxc-live-empty">Loading workspace…</div>}><div className="p2-root pxc-opportunity-mode">{opportunityView}</div></Suspense>;
  if (PRODUCT_ROUTES.has(path)) return <ProductView path={path} />;
  if (path === "/app/priorities") return <AssistantView />;
  if (path === "/app/operations/activity") return <BookingsView />;
  if (path === "/app/growth/pipeline") return <CustomersView />;
  if (path === "/app/growth/calendar") return <GraphicsView />;
  if (path === "/app/intelligence/opportunities" || path === "/app/intelligence/research") return <InsightsView />;
  const kind = path.startsWith("/app/operations") ? "operations" : path.startsWith("/app/growth") ? "growth" : path.startsWith("/app/intelligence") ? "intelligence" : "today";
  return <DashboardView kind={kind} />;
}

const TASK_STATES = [
  { key: "todo", label: "Todo" },
  { key: "doing", label: "In progress" },
  { key: "review", label: "Approval" },
  { key: "ready", label: "Completed" },
] as const;

function TasksRail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { business } = useWorkspace();
  const board = useResource(async () => { try { return { data: await getWorkBoard(business.id, 40), error: null }; } catch (error) { return { data: null, error: String(error) }; } }, [business.id], null as WorkBoard | null);
  const members = useResource(() => listMembers(business.id), [business.id], [] as OrgMember[]);
  const durableTasks = useResource(() => listWorkspaceTasks(business.id), [business.id], [] as WorkspaceTask[]);
  const [filter, setFilter] = useState<WorkColumn>("doing");
  const [selected, setSelected] = useState<WorkCard | null>(null);
  const [title, setTitle] = useState(""); const [detail, setDetail] = useState(""); const [status, setStatus] = useState<WorkColumn>("doing"); const [notice, setNotice] = useState(""); const [saving, setSaving] = useState(false);
  const [agentCards, setAgentCards] = useState<WorkCard[]>([]);
  const taskCards: WorkCard[] = durableTasks.data.map((task) => ({ id: `workspace_task:${task.id}`, col: task.status, module: "Tasks", tags: [task.source, task.status], title: task.title, detail: task.detail, media: [], who: task.source === "agent" ? "Phoxta AI" : "You", who_role: task.source, occurred_at: task.due_at ?? task.updated_at, amount_cents: null, comments: 0, links: 0, progress: null, to_path: "/app/operations", urgent: task.status === "review" }));
  const cards = [...agentCards, ...(board.data?.cards ?? []), ...taskCards].filter((card, index, rows) => rows.findIndex((item) => item.id === card.id) === index).filter((card) => card.col === filter);
  useEffect(() => {
    const activity = (event: Event) => {
      const item = (event as CustomEvent<AgentActivity>).detail;
      if (!item) return;
      const col: WorkColumn = item.status === "approval" || item.status === "failed" ? "review" : item.status === "completed" ? "ready" : item.status === "idle" ? "todo" : "doing";
      const card: WorkCard = { id: `live:${item.id}`, col, module: "AI Operator", tags: ["AI", item.status], title: item.title, detail: item.body, media: [], who: "Phoxta AI", who_role: item.source === "autopilot" ? "Autopilot" : "Operator", occurred_at: item.createdAt, amount_cents: null, comments: 0, links: 0, progress: item.status === "completed" ? 100 : item.status === "approval" ? 85 : item.status === "working" ? 50 : null, to_path: "/app/activity", urgent: item.status === "failed" };
      setAgentCards((current) => [card, ...current.filter((existing) => existing.id !== card.id)].slice(0, 24));
    };
    const reload = () => { void board.reload(); void durableTasks.reload(); };
    window.addEventListener(AGENT_ACTIVITY_EVENT, activity);
    window.addEventListener(DATA_CHANGED_EVENT, reload);
    return () => { window.removeEventListener(AGENT_ACTIVITY_EVENT, activity); window.removeEventListener(DATA_CHANGED_EVENT, reload); };
  }, [board, durableTasks]);
  function openTask(card: WorkCard) { setSelected(card); setTitle(card.title); setDetail(card.detail); setStatus(card.col); setNotice(""); }
  function newTask() { const card: WorkCard = { id: "workspace_task:new", col: filter, module: "Tasks", tags: ["Task"], title: "", detail: "", media: [], who: "You", who_role: "Owner", occurred_at: new Date().toISOString(), amount_cents: null, comments: 0, links: 0, progress: null, to_path: "", urgent: false }; setSelected(card); setTitle(""); setDetail(""); setStatus(filter); setNotice(""); }
  async function saveTask() {
    if (!selected) return;
    setSaving(true); setNotice("");
    const current = selected.col;
    if (selected.id.startsWith("workspace_task:")) {
      const taskId = selected.id.slice("workspace_task:".length);
      const result = taskId === "new"
        ? await createWorkspaceTask(business.id, { title: title.trim() || "Untitled task", detail: detail.trim(), status, source: "human" })
        : await updateWorkspaceTask(taskId, { title: title.trim() || selected.title, detail: detail.trim(), status });
      if (result.error) { setNotice(result.error); setSaving(false); return; }
    } else if (!selected.id.startsWith("live:") && status !== current) {
      const moved = await moveWorkCard(business.id, selected.id, status);
      if (!moved.ok) { setNotice(moved.reason ?? "This task cannot move to that status yet."); recordUserAction({ action: "task_status_changed", area: "Operations", outcome: "failed", detail: { from: current, to: status, reason: moved.reason } }); setSaving(false); return; }
    }
    recordUserAction({ action: selected.id === "workspace_task:new" ? "task_created" : "task_status_changed", area: "Operations", outcome: "success", detail: { from: current, to: status } });
    setFilter(status); setSaving(false); setSelected(null); await Promise.all([board.reload(), durableTasks.reload()]);
  }
  return <><aside className={`pxc-task-rail${open ? " is-open" : ""}`} aria-label="Tasks" data-ai-context="Tasks" data-ai-detail={`${cards.length} tasks in ${TASK_STATES.find((item) => item.key === filter)?.label ?? filter}.`}><button className="pxc-live-notification-close" onClick={onClose} aria-label="Close tasks"><X size={15} /></button><nav className="pxc-task-status">{TASK_STATES.map((item) => <button className={filter === item.key ? "active" : ""} key={item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}</nav><div className="pxc-task-list">{cards.map((card, index) => { const progress = card.progress ?? ({ todo: 0, doing: 50, review: 85, ready: 100 } as Record<WorkColumn, number>)[card.col]; return <button className={`pxc-task-card tone-${index % 3}`} key={card.id} data-ai-context={`Task: ${card.title}`} data-ai-detail={`${card.detail}. Status: ${TASK_STATES.find((item) => item.key === card.col)?.label}. Owner: ${card.who}.`} onClick={() => openTask(card)}><i /><div><strong>{card.title}</strong><p>{card.detail}</p><section><span><small>Team</small><b>{members.data.slice(0, 3).map((member, memberIndex) => <em key={member.user_id} title={member.full_name}><img src={`/assets/imgs/template/avatar/avatar-${memberIndex + 1}.webp`} alt="" /></em>)}{members.data.length > 3 && <em>+{members.data.length - 3}</em>}</b></span><span><small>Due date</small><b><CalendarDays size={11} />{card.occurred_at ? new Date(card.occurred_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No date"}</b></span></section></div><span className="pxc-task-progress" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><b>{progress}%</b></span></button>; })}{cards.length === 0 && <EmptyState loading={board.loading || durableTasks.loading} error={board.error || durableTasks.error} label="tasks in this status" />}</div><button className="pxc-task-add" onClick={newTask} aria-label="Add task"><Plus size={18} /></button></aside>{selected && <><button className="pxc-account-scrim" aria-label="Close task" onClick={() => setSelected(null)} /><section className="pxc-task-popup" role="dialog" aria-modal="true" aria-label={selected.title || "New task"}><header><div><span><ListChecks size={17} /></span><div><strong>{selected.id === "workspace_task:new" ? "New task" : "Task details"}</strong><small>{selected.module}</small></div></div><button onClick={() => setSelected(null)}><X size={17} /></button></header><div><label>Task<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Details<textarea value={detail} onChange={(event) => setDetail(event.target.value)} /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as WorkColumn)}>{TASK_STATES.map((item) => <option key={item.key} value={item.key}>{item.label === "Approval" ? "Awaiting approval" : item.label}</option>)}</select></label>{notice && <p>{notice}</p>}<button disabled={saving} onClick={() => void saveTask()}>{saving ? "Saving…" : "Save changes"}</button></div></section></>}</>;
}

type CalendarEvent = { id: string; title: string; detail: string; at: string; kind: "booking" | "task"; path: string };

function CalendarRail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { business } = useWorkspace();
  const bookings = useResource(() => listBookings(business.id), [business.id], [] as Booking[]);
  const board = useResource(async () => { try { return { data: await getWorkBoard(business.id, 60), error: null }; } catch (error) { return { data: null, error: String(error) }; } }, [business.id], null as WorkBoard | null);
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const monthNames = Array.from({ length: 12 }, (_, index) => new Date(2025, index, 1).toLocaleDateString(undefined, { month: "short" }));
  const years = Array.from({ length: 7 }, (_, index) => today.getFullYear() - 3 + index);
  const startOffset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const dates = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - startOffset + 1));
  const allEvents: CalendarEvent[] = [
    ...bookings.data.map((booking) => ({ id: `booking:${booking.id}`, title: booking.services?.name || "Customer booking", detail: booking.customer_name || booking.notes || "Customer appointment", at: booking.start_at, kind: "booking" as const, path: "/app/customers/bookings" })),
    ...(board.data?.cards ?? []).filter((card) => Boolean(card.occurred_at)).map((card) => ({ id: `task:${card.id}`, title: card.title, detail: card.detail || card.module, at: card.occurred_at!, kind: "task" as const, path: card.to_path || "/app/operations" })),
  ];
  const sameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  const selectedEvents = allEvents.filter((item) => sameDay(new Date(item.at), selectedDate)).sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
  function chooseMonth(next: Date) { setMonth(new Date(next.getFullYear(), next.getMonth(), 1)); setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1)); }
  return <><aside className={`pxc-calendar-rail${open ? " is-open" : ""}`} aria-label="Calendar" data-ai-context="Calendar" data-ai-detail={`${allEvents.length} scheduled items. Selected date: ${selectedDate.toLocaleDateString()}.`}><button className="pxc-live-notification-close" onClick={onClose} aria-label="Close calendar"><X size={15} /></button><section className="pxc-calendar-month"><header><button onClick={() => chooseMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button><select aria-label="Month" value={month.getMonth()} onChange={(event) => chooseMonth(new Date(month.getFullYear(), Number(event.target.value), 1))}>{monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}</select><select aria-label="Year" value={month.getFullYear()} onChange={(event) => chooseMonth(new Date(Number(event.target.value), month.getMonth(), 1))}>{years.map((year) => <option key={year}>{year}</option>)}</select><button onClick={() => chooseMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button></header><div className="pxc-calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div><div className="pxc-calendar-grid">{dates.map((date) => { const hasEvent = allEvents.some((item) => sameDay(new Date(item.at), date)); return <button className={`${date.getMonth() !== month.getMonth() ? "muted " : ""}${sameDay(date, selectedDate) ? "selected " : ""}${hasEvent ? "has-event" : ""}`} key={date.toISOString()} onClick={() => setSelectedDate(date)}>{date.getDate()}</button>; })}</div></section><div className="pxc-calendar-divider" /><div className="pxc-calendar-agenda">{selectedEvents.map((event, index) => <article className={`tone-${index % 3}`} key={event.id}><time>{new Date(event.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time><button onClick={() => setSelectedEvent(event)}><strong>{event.title}</strong><p>{event.detail}</p><span><i><img src="/assets/imgs/template/avatar/avatar-1.webp" alt="" /><img src="/assets/imgs/template/avatar/avatar-2.webp" alt="" /></i><Plus size={14} /></span></button></article>)}{selectedEvents.length === 0 && <p className="pxc-calendar-empty">No scheduled work for {selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</p>}</div></aside>{selectedEvent && <><button className="pxc-account-scrim" aria-label="Close event details" onClick={() => setSelectedEvent(null)} /><section className="pxc-calendar-event-popup" role="dialog" aria-modal="true" aria-label={selectedEvent.title}><header><div><span><CalendarDays size={18} /></span><div><strong>{selectedEvent.title}</strong><small>{selectedEvent.kind === "booking" ? "Customer booking" : "Scheduled task"}</small></div></div><button onClick={() => setSelectedEvent(null)} aria-label="Close"><X size={17} /></button></header><div><time>{new Date(selectedEvent.at).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</time><p>{selectedEvent.detail || "No additional details have been added."}</p><button onClick={() => { setSelectedEvent(null); navigate(selectedEvent.path); }}>Open related workspace</button></div></section></>}</>;
}

function notificationView(item: Notification): AgentNotification {
  const text = `${item.title} ${item.body}`.toLowerCase();
  const media = /video|reel/.test(text) ? "video" : /design|image|graphic|social/.test(text) ? "design" : "none";
  const channels = ["Email", "WhatsApp", "Instagram", "LinkedIn", "Facebook", "Website"].filter((channel) => text.includes(channel.toLowerCase()));
  const area = /customer|message|call|booking|email/.test(text) ? "Customers" : /campaign|social|growth|design/.test(text) ? "Growth" : /insight|research|opportun/.test(text) ? "Intelligence" : "Operations";
  return { id: item.id, title: item.title, agent: item.kind === "ai" ? "Phoxta AI Agent" : `${area} update`, area, time: relativeTime(item.created_at), detail: item.body, result: "Recorded in your Phoxta workspace", media, channels };
}

export function LiveNotificationsRail({ open, autopilot = false, onOpen, onClose }: { open: boolean; autopilot?: boolean; onOpen: () => void; onClose: () => void }) {
  const navigate = useNavigate(); const [mode, setMode] = useState<"notifications" | "tasks" | "calendar">("notifications"); const [items, setItems] = useState<Notification[]>([]); const [liveItems, setLiveItems] = useState<AgentNotification[]>([]); const [incoming, setIncoming] = useState<string | number | null>(null); const known = useRef<Set<string> | null>(null);
  useEffect(() => { let active = true; let clearAnimation: number | undefined; const load = () => listNotifications(30).then(({ data }) => { if (!active) return; if (known.current) { const fresh = data.find((item) => !known.current?.has(item.id)); if (fresh) { setIncoming(fresh.id); clearAnimation = window.setTimeout(() => setIncoming(null), 1800); } } known.current = new Set(data.map((item) => item.id)); setItems(data); }); load(); const timer = window.setInterval(load, autopilot ? 5_000 : 30_000); return () => { active = false; window.clearInterval(timer); if (clearAnimation) window.clearTimeout(clearAnimation); }; }, [autopilot]);
  useEffect(() => {
    let clearAnimation: number | undefined;
    const activity = (event: Event) => {
      const item = (event as CustomEvent<AgentActivity>).detail;
      if (!item) return;
      const text = `${item.title} ${item.body} ${item.tool ?? ""}`.toLowerCase();
      const area = /reply|message|email|conversation|contact|customer|call/.test(text) ? "Customers" : /campaign|social|design|content/.test(text) ? "Growth" : /research|insight|opportun/.test(text) ? "Intelligence" : "Operations";
      const view: AgentNotification = { id: item.id, title: item.title, agent: item.source === "autopilot" ? "Phoxta Autopilot" : "Phoxta AI Operator", area, time: "Just now", detail: item.body, result: item.status === "approval" ? "Awaiting human approval" : item.status === "failed" ? "Action needs attention" : item.status === "working" ? "In progress" : "Action completed", media: /video/.test(text) ? "video" : /design|image|graphic|social/.test(text) ? "design" : "none", channels: ["Email", "WhatsApp", "Instagram", "LinkedIn", "Facebook"].filter((channel) => text.includes(channel.toLowerCase())) };
      setLiveItems((current) => [view, ...current.filter((existing) => existing.id !== view.id)].slice(0, 30));
      setIncoming(view.id);
      if (clearAnimation) window.clearTimeout(clearAnimation);
      clearAnimation = window.setTimeout(() => setIncoming(null), 1800);
    };
    window.addEventListener(AGENT_ACTIVITY_EVENT, activity);
    return () => { window.removeEventListener(AGENT_ACTIVITY_EVENT, activity); if (clearAnimation) window.clearTimeout(clearAnimation); };
  }, []);
  async function openItem(view: AgentNotification) { const item = items.find((row) => row.id === view.id); if (item && !item.read) { setItems((current) => current.map((row) => row.id === item.id ? { ...row, read: true } : row)); await markNotificationRead(item.id); } }
  function relatedPath(item: Notification) { const value = `${item.title} ${item.body} ${item.kind}`.toLowerCase(); if (/customer|message|call|booking|email/.test(value)) return "/app/customers"; if (/campaign|social|growth|design/.test(value)) return "/app/growth"; if (/insight|research|opportun/.test(value)) return "/app/intelligence"; return "/app/operations"; }
  function choose(next: "notifications" | "tasks" | "calendar") { setMode(next); onOpen(); }
  const views = [...liveItems, ...items.map(notificationView).filter((item) => !liveItems.some((live) => live.id === item.id))]; const unreadIds = new Set<string | number>([...liveItems.map((item) => item.id), ...items.filter((item) => !item.read).map((item) => item.id)]);
  return <>{mode === "notifications" ? <NotificationTemplate open={open} items={views} incomingId={incoming} unreadIds={unreadIds} onSelect={(item) => void openItem(item)} onClose={onClose} onOpenRelated={(view) => { const item = items.find((row) => row.id === view.id); if (item) { navigate(relatedPath(item)); return; } const path = view.area === "Customers" ? "/app/customers" : view.area === "Growth" ? "/app/growth" : view.area === "Intelligence" ? "/app/intelligence" : "/app/operations"; navigate(path); }} /> : mode === "tasks" ? <TasksRail open={open} onClose={onClose} /> : <CalendarRail open={open} onClose={onClose} />}<div className="pxc-rail-actions"><button className={mode === "notifications" ? "active" : ""} onClick={() => choose("notifications")} aria-label="Show notifications"><Bell size={17} />{unreadIds.size > 0 && <i />}</button><button className={mode === "tasks" ? "active" : ""} onClick={() => choose("tasks")} aria-label="Show tasks"><ListChecks size={17} /></button><button className={mode === "calendar" ? "active" : ""} onClick={() => choose("calendar")} aria-label="Show calendar"><CalendarDays size={17} /></button></div></>;
}
