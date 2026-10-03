import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Bot, ChartNoAxesCombined, ChevronDown, ChevronRight, CreditCard, Headphones, House, ImagePlus, LifeBuoy, Lightbulb, LogOut, Maximize2, Menu, Mic, Plus, Send, Settings, Sparkles, UserRound, Users, Workflow, X } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { listActions, listAudit, listToolPolicies, runOperatorStream, setToolPolicy, uploadOperatorFile, WRITE_TOOL_GROUPS, WRITE_TOOL_LABELS, type AgentAction, type AuditEntry, type OperatorAttachment, type OperatorMsg } from "@/lib/db/ops/operator";
import { listObjectives, listObjectiveRuns, updateObjective, type Objective, type ObjectiveRun } from "@/lib/db/ops/autopilot";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceContext";
import { CustomerWorkspace, LiveAppRoutes, LiveNotificationsRail } from "./LiveWorkspace";
import { emitAgentActivity, emitDataChanged, type AgentActivity } from "./agentActivity";
import { getBehaviorContext, recordUserAction, saveLearningSession, saveUserAction, USER_ACTION_EVENT, type UserActionDetail } from "./behaviorLearning";
import { getLearningSettings } from "@/lib/db/productWorkspace";
import AccountPanel, { type AccountView } from "./AccountPanel";
import "./phoxta-app.css";

const CONSOLE_ITEMS = [
  { label: "Today", to: "/app", icon: House },
  { label: "Customers", to: "/app/customers", icon: Users },
  { label: "Operations", to: "/app/operations", icon: Workflow },
  { label: "Growth", to: "/app/growth", icon: ChartNoAxesCombined },
  { label: "Intelligence", to: "/app/intelligence", icon: Lightbulb },
];

const AREA_POLICY_GROUPS: Record<string, string[]> = {
  Customers: ["CRM", "Inbox", "Helpdesk", "Reaching customers", "Call center"],
  Operations: ["Commerce", "Invoicing", "Bookings & reservations"],
  Growth: ["Content", "Marketing", "Google Workspace"],
  Intelligence: [],
};

function areaTools(label: string) {
  const groups = new Set(AREA_POLICY_GROUPS[label] ?? []);
  return WRITE_TOOL_GROUPS.filter((group) => groups.has(group.label)).flatMap((group) => group.tools);
}

const TAB_SETS = {
  today: [
    { label: "Overview", to: "/app", end: true },
    { label: "AI Operator", to: "/app/priorities" },
    { label: "Activity", to: "/app/activity" },
  ],
  customers: [
    { label: "Overview", to: "/app/customers", end: true },
    { label: "Conversations", to: "/app/customers/conversations" },
    { label: "Directory", to: "/app/customers/directory" },
  ],
  operations: [
    { label: "Run", to: "/app/operations", end: true },
    { label: "Approvals", to: "/app/operations/approvals" },
    { label: "Commerce", to: "/app/operations/commerce" },
    { label: "Invoices", to: "/app/operations/invoicing" },
    { label: "Bookings", to: "/app/operations/activity" },
    { label: "Reservations", to: "/app/operations/reservations" },
  ],
  growth: [
    { label: "Grow", to: "/app/growth", end: true },
    { label: "Customers", to: "/app/growth/pipeline" },
    { label: "Graphics", to: "/app/growth/calendar" },
  ],
  intelligence: [
    { label: "Performance", to: "/app/intelligence", end: true },
    { label: "Playbook", to: "/app/intelligence/opportunities" },
    { label: "Research", to: "/app/intelligence/research" },
    { label: "Knowledge", to: "/app/intelligence/knowledge" },
    { label: "Capabilities", to: "/app/intelligence/capabilities" },
  ],
  settings: [
    { label: "Profile", to: "/app/settings", end: true },
    { label: "Preferences", to: "/app/settings/preferences" },
    { label: "Team", to: "/app/settings/team" },
  ],
} as const;

type SectionKey = keyof typeof TAB_SETS;

function sectionFromPath(pathname: string): SectionKey {
  if (pathname.startsWith("/app/customers")) return "customers";
  if (pathname.startsWith("/app/operations")) return "operations";
  if (pathname.startsWith("/app/growth")) return "growth";
  if (pathname.startsWith("/app/intelligence")) return "intelligence";
  if (pathname.startsWith("/app/settings")) return "settings";
  return "today";
}

type WorkspaceMode = "ai-ops" | "opportunities" | "school";

function workspaceModeFromPath(pathname: string): WorkspaceMode {
  if (pathname.startsWith("/app/school")) return "school";
  if (/^\/app\/(opportunity|opportunities|discover|businesses|workspace)(\/|$)/.test(pathname)) return "opportunities";
  return "ai-ops";
}

const QUOTES = [
  "Build what customers return for, not what they merely applaud.",
  "A useful business improves through evidence, one decision at a time.",
  "Momentum comes from doing the next clear thing consistently.",
];

function initials(value: string) {
  const parts = value.split(/[@\s._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PX";
}

type ContextAnchor = { label: string; detail: string; suggestions: string[]; x: number; y: number };
type ContextMessage = { id: number; role: "user" | "phoxta"; text: string };
type SpeechResultEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechRecognizer = { lang: string; interimResults: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onend: (() => void) | null; start: () => void };

function contextualSuggestions(label: string, detail = "") {
  const value = `${label} ${detail}`.toLowerCase();
  if (/email|whatsapp|message|conversation/.test(value)) return ["Draft a reply", "Summarise this conversation", "Create a follow-up task"];
  if (/notification|activity/.test(value)) return ["Explain what happened", "Open the related work", "Plan the next action"];
  if (/task|calendar|booking|operation/.test(value)) return ["Create a task", "Update the status", "Plan the next steps"];
  if (/growth|campaign|graphic|marketing/.test(value)) return ["Generate content", "Create variations", "Plan a campaign"];
  if (/customer/.test(value)) return ["Summarise this customer", "Add a follow-up", "Recommend the next action"];
  if (/intelligence|research/.test(value)) return ["Analyse the evidence", "Find the key signal", "Create an action plan"];
  return ["Create variations", "Generate content", "Plan the next action"];
}

function pathContext(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).slice(1).join(" · ");
  return segment ? segment.replaceAll("-", " ") : "Today";
}

function compactText(value: string | null | undefined, limit = 700) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function resolveAiContext(target: Element, businessName: string, pathname: string): Omit<ContextAnchor, "x" | "y"> | null {
  const selectors = [
    ".pxc-task-card", ".pxc-notification-item", ".pxc-calendar-agenda article", ".pxc-design-grid article",
    ".pxc-booking-list article", ".pxc-customer-table>button", ".pxc-cx-rows article", ".pxc-conversation",
    "[data-ai-context]", ".pxc-live-view", ".pxc-live-module", ".pxc-main-card", ".pxc-console-sidebar",
    ".pxc-notifications", ".pxc-task-rail", ".pxc-calendar-rail",
  ];
  const area = selectors.map((selector) => target.closest<HTMLElement>(selector)).find(Boolean);
  if (!area) return null;
  const explicit = compactText(area.dataset.aiContext);
  const heading = compactText(area.querySelector("h1,h2,h3,strong,.pxc-inbox-channel,.pxc-notification-head")?.textContent);
  const label = explicit || heading || pathContext(pathname);
  const explicitDetail = compactText(area.dataset.aiDetail);
  const content = compactText(area.textContent);
  const detail = explicitDetail || content || `${businessName} · ${pathContext(pathname)}`;
  return { label, detail, suggestions: contextualSuggestions(label, detail) };
}

function activityLabel(tool: string) {
  return WRITE_TOOL_LABELS[tool] ?? tool.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

function ContextualAssistant({ businessId, businessName, pathname, userId }: { businessId: string; businessName: string; pathname: string; userId?: string | null }) {
  const [anchor, setAnchor] = useState<ContextAnchor | null>(null);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ContextMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [toolStatus, setToolStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [attachments, setAttachments] = useState<OperatorAttachment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  const positionRef = useRef({ x: 32, y: 180 });
  const targetRef = useRef({ x: 32, y: 180 });

  useEffect(() => {
    setOpen(false);
    setMessages([]);
    setAttachments([]);
  }, [pathname]);

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    let frame = 0;
    let lastContextAt = 0;
    let lastSignature = "";
    const clamp = (value: number, max: number) => Math.max(12, Math.min(max, value));
    const place = (target: Element, x: number, y: number) => {
      const context = resolveAiContext(target, businessName, pathname);
      if (!context) return;
      const nextX = clamp(x + 17, window.innerWidth - 52);
      const nextY = clamp(y + 17, window.innerHeight - 52);
      targetRef.current = { x: nextX, y: nextY };
      const signature = `${context.label}|${context.detail}`;
      if (signature !== lastSignature) {
        lastSignature = signature;
        setAnchor({ ...context, x: nextX, y: nextY });
      }
    };
    const pointer = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest(".pxc-context-ai") || openRef.current) return;
      const x = clamp(event.clientX + 17, window.innerWidth - 52);
      const y = clamp(event.clientY + 17, window.innerHeight - 52);
      targetRef.current = { x, y };
      const now = performance.now();
      if (now - lastContextAt > 80) { lastContextAt = now; place(event.target, event.clientX, event.clientY); }
    };
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || event.target.closest(".pxc-context-ai")) return;
      const rect = event.target.getBoundingClientRect();
      place(event.target, rect.right, rect.top);
    };
    const animate = () => {
      const current = positionRef.current;
      const target = targetRef.current;
      current.x += (target.x - current.x) * .22;
      current.y += (target.y - current.y) * .22;
      if (triggerRef.current) {
        triggerRef.current.style.left = `${current.x}px`;
        triggerRef.current.style.top = `${current.y}px`;
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    document.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("focusin", focus);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("pointermove", pointer); document.removeEventListener("focusin", focus); };
  }, [businessName, pathname]);

  async function submit(textOverride?: string) {
    const text = (textOverride ?? prompt).trim();
    if (!text || busy || !anchor) return;
    const now = Date.now();
    const prior = messages;
    setMessages((current) => [...current, { id: now, role: "user", text }, { id: now + 1, role: "phoxta", text: "" }]);
    setPrompt("");
    setBusy(true);
    setToolStatus("Understanding this area…");
    const learnedBehavior = await getBehaviorContext(businessId, userId);
    const context = [`Business: ${businessName}`, `Current area: ${anchor.label}`, `Area context: ${anchor.detail}`, `Current route: ${pathname}`, `Recent working pattern:\n${learnedBehavior}`, attachments.length ? `Attached files: ${attachments.map((item) => item.name).join(", ")}` : ""].filter(Boolean).join("\n");
    const history: OperatorMsg[] = prior.map((message) => ({ role: message.role === "user" ? "user" : "assistant", content: message.text }));
    const activeTools = new Map<string, string[]>();
    const result = await runOperatorStream(businessId, `${context}\n\nUser instruction: ${text}\nAct in the current area when requested. Use Phoxta's governed tools for real work, respect human approvals, and report the exact result.`, history, {
      onTurn: () => setMessages((current) => current.map((message) => message.id === now + 1 ? { ...message, text: "" } : message)),
      onDelta: (delta) => setMessages((current) => current.map((message) => message.id === now + 1 ? { ...message, text: `${message.text}${delta}` } : message)),
      onToolStart: (tool) => {
        const title = activityLabel(tool);
        const id = `operator:${now}:${tool}:${(activeTools.get(tool)?.length ?? 0) + 1}`;
        activeTools.set(tool, [...(activeTools.get(tool) ?? []), id]);
        setToolStatus(`${title}…`);
        emitAgentActivity({ id, title, body: `Phoxta AI is working in ${anchor.label}.`, status: "working", createdAt: new Date().toISOString(), tool, source: "operator" });
      },
      onToolEnd: (tool, ok) => {
        const ids = activeTools.get(tool) ?? [];
        const id = ids.shift() ?? `operator:${now}:${tool}`;
        activeTools.set(tool, ids);
        const title = activityLabel(tool);
        setToolStatus(ok ? `${title} completed` : `${title} needs attention`);
        emitAgentActivity({ id, title, body: ok ? `Completed in ${anchor.label}.` : `Could not complete this action in ${anchor.label}.`, status: ok ? "completed" : "failed", createdAt: new Date().toISOString(), tool, source: "operator" });
        emitDataChanged();
      },
    }, attachments);
    const reply = result.reply || result.error || "Phoxta could not complete that request. Please try again.";
    recordUserAction({ action: "ai_instruction", area: anchor.label, outcome: result.error ? "failed" : "success", detail: { instruction_length: text.length, tool_calls: result.toolCalls, error_code: result.error ? "operator_failed" : null } });
    setMessages((current) => current.map((message) => message.id === now + 1 ? { ...message, text: reply } : message));
    setToolStatus("");
    setBusy(false);
  }

  function startVoice() {
    const Speech = (window as unknown as { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognizer }).webkitSpeechRecognition;
    if (!Speech) { inputRef.current?.focus(); return; }
    const recognition = new Speech();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.onresult = (event) => { const text = event.results[0]?.[0]?.transcript ?? ""; setPrompt((current) => `${current}${current ? " " : ""}${text}`); };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  async function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    setToolStatus("Uploading context…");
    const uploaded = await Promise.all(Array.from(files).slice(0, 5).map((file) => uploadOperatorFile(businessId, file)));
    const added = uploaded.flatMap((result) => result.attachment ? [result.attachment] : []);
    setAttachments((current) => [...current, ...added].slice(0, 5));
    setToolStatus(uploaded.find((result) => result.error)?.error ?? "");
  }

  if (!anchor) return null;
  const popupLeft = Math.max(12, Math.min(window.innerWidth - 372, anchor.x > window.innerWidth - 390 ? anchor.x - 340 : anchor.x));
  const popupTop = Math.max(12, Math.min(window.innerHeight - 390, anchor.y + 44));
  return <div className="pxc-context-ai"><button ref={triggerRef} className={`pxc-context-ai-trigger${open ? " is-open" : ""}`} style={{ left: anchor.x, top: anchor.y }} onClick={() => { setAnchor((current) => current ? { ...current, ...positionRef.current } : current); setOpen((value) => !value); window.setTimeout(() => inputRef.current?.focus(), 0); }} aria-label={`Ask Phoxta AI about ${anchor.label}`} title={`Ask AI about ${anchor.label}`}><Sparkles size={18} /></button>{open && <section className="pxc-context-ai-popup" style={{ left: popupLeft, top: popupTop }} role="dialog" aria-label={`Phoxta AI for ${anchor.label}`}><header><span><Sparkles size={14} /><b>{anchor.label}</b></span><button onClick={() => setOpen(false)} aria-label="Close AI assistant"><X size={16} /></button></header>{messages.length > 0 && <div className="pxc-context-ai-thread">{messages.map((message) => <article className={message.role === "user" ? "is-user" : "is-ai"} key={message.id}><strong>{message.role === "user" ? "You" : "Phoxta AI"}</strong><p>{message.text || (busy ? toolStatus : "")}</p></article>)}</div>}<form onSubmit={(event) => { event.preventDefault(); void submit(); }}><button type="button" onClick={() => uploadRef.current?.click()} aria-label="Attach context"><Plus size={18} /></button><input ref={inputRef} data-learning-content="true" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={busy ? toolStatus || "Phoxta is working…" : "Ask for changes or an action"} disabled={busy} /><button type="button" title="Attached context" aria-label="Add image or file context" onClick={() => uploadRef.current?.click()}><ImagePlus size={15} /></button><button type="button" className={listening ? "is-listening" : ""} onClick={startVoice} aria-label="Use microphone"><Mic size={17} /></button><button className="pxc-context-ai-send" disabled={busy || !prompt.trim()} aria-label="Send instruction"><Send size={14} /></button><input ref={uploadRef} type="file" multiple hidden onChange={(event) => void addAttachments(event.target.files)} /></form>{attachments.length > 0 && <small className="pxc-context-ai-files">{attachments.map((item) => item.name).join(", ")}</small>}<div className="pxc-context-ai-suggestions">{anchor.suggestions.map((suggestion, index) => <button key={suggestion} onClick={() => void submit(suggestion)}>{index === 0 ? <Maximize2 size={14} /> : index === 1 ? <Sparkles size={14} /> : <Workflow size={14} />}<span>{suggestion}</span></button>)}</div></section>}</div>;
}

type LearningSession = {
  startedAt: number;
  lastActiveAt: number;
  activeMs: number;
  pointerMoves: number;
  pointerDistance: number;
  lastPointer: { x: number; y: number } | null;
  clicks: number;
  keys: number;
  fieldEdits: number;
  scrollDistance: number;
  areas: Record<string, number>;
  targets: Record<string, number>;
  typedFields: Record<string, { edits: number; length: number }>;
};

function newLearningSession(): LearningSession {
  const now = Date.now();
  return { startedAt: now, lastActiveAt: now, activeMs: 0, pointerMoves: 0, pointerDistance: 0, lastPointer: null, clicks: 0, keys: 0, fieldEdits: 0, scrollDistance: 0, areas: {}, targets: {}, typedFields: {} };
}

function BehaviorLearner({ businessId, userId, pathname }: { businessId: string; userId?: string | null; pathname: string }) {
  const session = useRef<LearningSession>(newLearningSession());
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId) { setEnabled(false); return; }
    const refresh = () => void getLearningSettings(businessId, userId).then((result) => { if (active) setEnabled(result.data.enabled); });
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string; userId?: string; enabled?: boolean }>).detail;
      if (detail?.businessId === businessId && detail?.userId === userId) setEnabled(Boolean(detail.enabled));
    };
    refresh();
    window.addEventListener("phoxta:learning-settings-changed", changed);
    return () => { active = false; window.removeEventListener("phoxta:learning-settings-changed", changed); };
  }, [businessId, userId]);

  useEffect(() => {
    if (!enabled) return;
    session.current = newLearningSession();
    let lastPointerSample = 0;
    let lastScrollY = window.scrollY;
    const touch = () => {
      const now = Date.now();
      session.current.activeMs += Math.min(30_000, Math.max(0, now - session.current.lastActiveAt));
      session.current.lastActiveAt = now;
    };
    const areaName = (element: Element) => compactText(element.closest<HTMLElement>("[data-ai-context]")?.dataset.aiContext || pathContext(pathname), 80);
    const targetName = (element: Element) => {
      const named = element.closest<HTMLElement>("button,a,input,textarea,select,[role='button']");
      return compactText(named?.getAttribute("aria-label") || named?.getAttribute("placeholder") || named?.textContent || named?.tagName || "workspace", 90);
    };
    const pointer = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".pxc-shell")) return;
      const now = performance.now();
      if (now - lastPointerSample < 60) return;
      lastPointerSample = now;
      touch();
      const previous = session.current.lastPointer;
      if (previous) session.current.pointerDistance += Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
      session.current.lastPointer = { x: event.clientX, y: event.clientY };
      session.current.pointerMoves += 1;
    };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".pxc-shell")) return;
      touch();
      const area = areaName(event.target); const target = targetName(event.target);
      session.current.clicks += 1;
      session.current.areas[area] = (session.current.areas[area] ?? 0) + 1;
      session.current.targets[target] = (session.current.targets[target] ?? 0) + 1;
    };
    const input = (event: Event) => {
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) || !event.target.closest(".pxc-shell")) return;
      const element = event.target;
      if (element instanceof HTMLInputElement && (element.type === "password" || /cc-|password|token|secret/i.test(`${element.name} ${element.autocomplete}`))) return;
      touch();
      const field = compactText(element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.name || "field", 60);
      const value = element.value ?? "";
      const current = session.current.typedFields[field] ?? { edits: 0, length: 0 };
      session.current.typedFields[field] = { edits: current.edits + 1, length: value.length };
      session.current.fieldEdits += 1;
    };
    const key = (event: KeyboardEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".pxc-shell")) return;
      touch(); session.current.keys += 1;
    };
    const scroll = () => { touch(); session.current.scrollDistance += Math.abs(window.scrollY - lastScrollY); lastScrollY = window.scrollY; };
    const action = (event: Event) => { const detail = (event as CustomEvent<UserActionDetail>).detail; if (detail) void saveUserAction(businessId, userId, detail); };
    const flush = () => {
      const current = session.current;
      const props = { route: pathname, started_at: new Date(current.startedAt).toISOString(), active_ms: current.activeMs, pointer_moves: current.pointerMoves, pointer_distance: Math.round(current.pointerDistance), clicks: current.clicks, keys: current.keys, field_edits: current.fieldEdits, scroll_distance: Math.round(current.scrollDistance), areas: current.areas, targets: current.targets, typed_fields: current.typedFields };
      session.current = newLearningSession();
      void saveLearningSession(businessId, userId, props);
    };
    document.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("click", click, true);
    document.addEventListener("input", input, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener(USER_ACTION_EVENT, action);
    const timer = window.setInterval(flush, 15_000);
    return () => { flush(); window.clearInterval(timer); document.removeEventListener("pointermove", pointer); document.removeEventListener("click", click, true); document.removeEventListener("input", input, true); document.removeEventListener("keydown", key, true); window.removeEventListener("scroll", scroll); window.removeEventListener(USER_ACTION_EVENT, action); };
  }, [businessId, enabled, pathname, userId]);

  return null;
}

function activityTarget(tool = "") {
  const value = tool.toLowerCase();
  if (/reply|message|email|conversation|ticket|call/.test(value)) return ".pxc-conversation,.pxc-live-module.is-messages,.pxc-live-module.is-email,.pxc-live-module.is-whatsapp";
  if (/campaign|social|design|blog|content/.test(value)) return ".pxc-live-module.is-graphics,.pxc-live-module.is-campaigns,[data-ai-context*='growth']";
  if (/booking|reservation|service/.test(value)) return ".pxc-live-module.is-bookings,[data-ai-context*='operation']";
  if (/contact|customer/.test(value)) return ".pxc-live-module.is-customers,[data-ai-context*='customer']";
  return ".pxc-stage";
}

function actionActivity(item: AgentAction): AgentActivity {
  const status = item.status === "pending" ? "approval" : /fail|reject/.test(item.status) ? "failed" : /execut|complete|approved/.test(item.status) ? "completed" : "working";
  return { id: `action:${item.id}`, title: item.title || activityLabel(item.tool), body: item.error || item.result || `Status: ${item.status}`, status, createdAt: item.created_at, tool: item.tool, source: "autopilot" };
}

function runActivity(item: ObjectiveRun): AgentActivity {
  const status = item.outcome === "queued" ? "approval" : item.outcome === "failed" || item.outcome === "halted" ? "failed" : item.outcome === "noop" ? "idle" : "completed";
  return { id: `run:${item.id}`, title: item.tool ? activityLabel(item.tool) : "Autopilot review", body: item.reason || item.result || "Autopilot checked this objective.", status, createdAt: item.created_at, tool: item.tool, source: "autopilot" };
}

function auditActivity(item: AuditEntry): AgentActivity {
  const status = /fail|reject/.test(item.status) ? "failed" : /pending|approval/.test(item.status) ? "approval" : "completed";
  return { id: `audit:${item.id}`, title: activityLabel(item.tool), body: item.summary || `Status: ${item.status}`, status, createdAt: item.created_at, tool: item.tool, source: "autopilot" };
}

function activitySignature(item: AgentActivity) {
  return `${item.id}|${item.status}|${item.body}`;
}

function AutopilotPresence({ businessId, enabled, objectiveCount }: { businessId: string; enabled: boolean; objectiveCount: number }) {
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: 110 });
  const knownRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled) { knownRef.current = null; setActivity(null); return; }
    let active = true;
    const moveTo = (next: AgentActivity) => {
      const target = document.querySelector<HTMLElement>(activityTarget(next.tool ?? "")) ?? document.querySelector<HTMLElement>(".pxc-stage");
      const rect = target?.getBoundingClientRect();
      setPosition({ x: Math.max(18, Math.min(window.innerWidth - 54, (rect?.left ?? window.innerWidth / 2) + Math.min(rect?.width ?? 0, 120))), y: Math.max(88, Math.min(window.innerHeight - 70, (rect?.top ?? 110) + 48)) });
      setActivity(next);
    };
    const receive = (next: AgentActivity) => {
      const signature = activitySignature(next);
      if (!knownRef.current || knownRef.current.has(signature)) return;
      knownRef.current.add(signature);
      emitAgentActivity(next);
      moveTo(next);
      emitDataChanged();
    };
    const load = async () => {
      const [actions, runs, audit] = await Promise.all([listActions(businessId), listObjectiveRuns(businessId, undefined, 25), listAudit(businessId, 25)]);
      if (!active) return;
      const current = [...actions.data.map(actionActivity), ...runs.data.map(runActivity), ...audit.data.map(auditActivity)].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      const ids = new Set(current.map(activitySignature));
      if (knownRef.current === null) {
        knownRef.current = ids;
        if (current[0]) moveTo(current[0]);
        else setActivity({ id: "autopilot:idle", title: objectiveCount ? "Autopilot is monitoring" : "Autopilot needs an objective", body: objectiveCount ? `${objectiveCount} active objective${objectiveCount === 1 ? "" : "s"}.` : "Create an objective in AI Operator to start autonomous work.", status: "idle", createdAt: new Date().toISOString(), source: "autopilot" });
        return;
      }
      const fresh = current.filter((item) => !knownRef.current?.has(activitySignature(item))).reverse();
      knownRef.current = ids;
      fresh.forEach(emitAgentActivity);
      if (fresh.length) { moveTo(fresh[fresh.length - 1]); emitDataChanged(); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 4_000);
    const channel = supabase.channel(`phoxta-autopilot-presence:${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_actions", filter: `organization_id=eq.${businessId}` }, (payload) => { if (payload.new && "id" in payload.new) receive(actionActivity(payload.new as unknown as AgentAction)); })
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_objective_runs", filter: `organization_id=eq.${businessId}` }, (payload) => { if (payload.new && "id" in payload.new) receive(runActivity(payload.new as unknown as ObjectiveRun)); })
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_audit_log", filter: `organization_id=eq.${businessId}` }, (payload) => { if (payload.new && "id" in payload.new) receive(auditActivity(payload.new as unknown as AuditEntry)); })
      .subscribe();
    return () => { active = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [businessId, enabled, objectiveCount]);

  if (!enabled || !activity) return null;
  return <div className={`pxc-autopilot-presence is-${activity.status}`} style={{ transform: `translate3d(${position.x}px,${position.y}px,0)` }} aria-live="polite"><span className="pxc-autopilot-cursor"><Sparkles size={15} /></span><div><strong>{activity.title}</strong><small>{activity.body}</small></div></div>;
}

function AppShell() {
  const { user, signOut } = useAuth();
  const { business, businesses, selectBusiness } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const section = sectionFromPath(location.pathname);
  const workspaceMode = workspaceModeFromPath(location.pathname);
  const tabs = TAB_SETS[section];
  const [autopilot, setAutopilot] = useState(false);
  const [autopilotBusy, setAutopilotBusy] = useState(false);
  const [autopilotNotice, setAutopilotNotice] = useState("");
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [featureModes, setFeatureModes] = useState<Record<string, "ai" | "human">>({ Customers: "human", Operations: "ai", Growth: "human", Intelligence: "ai" });
  const [humanPopup, setHumanPopup] = useState<{ label: string; top: number; left: number } | null>(null);
  const [accountPopup, setAccountPopup] = useState<AccountView | null>(null);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const identity = user?.email ?? "Phoxta owner";
  const remoteAvatarUrl = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";
  const [avatarPreview, setAvatarPreview] = useState(remoteAvatarUrl);
  const quote = QUOTES[business.id.length % QUOTES.length];
  const isCustomerWorkspace = location.pathname.startsWith("/app/customers");
  const isVentureWorkspace = workspaceMode !== "ai-ops";

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileNav(false); setHumanPopup(null); setAccountPopup(null); setNotificationOpen(false); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    let active = true;
    void listObjectives(business.id).then((result) => {
      if (!active) return;
      setObjectives(result.data);
      setAutopilot(result.data.some((objective) => objective.status === "active"));
      setAutopilotNotice(result.error ?? "");
    });
    return () => { active = false; };
  }, [business.id]);

  useEffect(() => {
    let active = true;
    void listToolPolicies(business.id).then((result) => {
      if (!active || result.error) return;
      const modes = new Map(result.data.map((policy) => [policy.tool, policy.mode]));
      setFeatureModes((current) => Object.fromEntries(Object.keys(current).map((label) => {
        const tools = areaTools(label);
        return [label, tools.length && tools.every((tool) => modes.get(tool) === "auto") ? "ai" : "human"];
      })));
    });
    return () => { active = false; };
  }, [business.id]);

  async function toggleAutopilot(next: boolean) {
    if (autopilotBusy) return;
    setAutopilotBusy(true);
    setAutopilotNotice("");
    const listed = await listObjectives(business.id);
    if (listed.error) { setAutopilotNotice(listed.error); setAutopilotBusy(false); return; }
    setObjectives(listed.data);
    if (next && listed.data.length === 0) {
      setAutopilot(true);
      setAutopilotNotice("Add an objective in AI Operator to begin autonomous work.");
      setAutopilotBusy(false);
      return;
    }
    const targets = listed.data.filter((objective) => next ? objective.status !== "active" && objective.status !== "stopped" : objective.status === "active");
    const results = await Promise.all(targets.map((objective) => updateObjective(objective.id, { status: next ? "active" : "paused" })));
    const error = results.find((result) => result.error)?.error ?? null;
    if (error) { setAutopilotNotice(error); setAutopilotBusy(false); return; }
    const updated = listed.data.map((objective) => targets.some((target) => target.id === objective.id) ? { ...objective, status: next ? "active" as const : "paused" as const } : objective);
    setObjectives(updated);
    setAutopilot(next);
    setAutopilotNotice(next ? `${updated.filter((objective) => objective.status === "active").length} objective${updated.filter((objective) => objective.status === "active").length === 1 ? "" : "s"} active` : "Autopilot paused");
    setAutopilotBusy(false);
  }

  async function persistAreaMode(label: string, mode: "ai" | "human") {
    const tools = areaTools(label);
    if (!tools.length) return;
    const results = await Promise.all(tools.map((tool) => setToolPolicy(business.id, tool, mode === "ai" ? "auto" : "approve")));
    const error = results.find((result) => result.error)?.error;
    if (error) setAutopilotNotice(error);
  }

  function chooseAi(label: string, to: string) {
    setFeatureModes((current) => ({ ...current, [label]: "ai" }));
    void persistAreaMode(label, "ai");
    setHumanPopup(null);
    navigate(to);
  }

  function openHumanLoop(label: string, to: string, target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect();
    const left = Math.min(rect.right + 12, window.innerWidth - 300);
    const top = Math.min(rect.top - 10, window.innerHeight - 230);
    setHumanPopup({ label, left: Math.max(12, left), top: Math.max(12, top) });
    navigate(to);
  }

  function openAccount(view: AccountView) {
    setHumanPopup(null);
    setAccountExpanded(false);
    setAccountPopup(view);
  }

  async function chooseAvatar(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (!user?.id) return;
    const extension = (file.name.split(".").pop() || "webp").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const path = `${user.id}/avatar.${extension}`;
    const uploaded = await supabase.storage.from("phoxta-avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploaded.error) { setAutopilotNotice(uploaded.error.message); return; }
    const { data } = supabase.storage.from("phoxta-avatars").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const updated = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    if (updated.error) { setAutopilotNotice(updated.error.message); return; }
    setAvatarPreview(avatarUrl);
  }

  return <div className="pxc-shell">
    <BehaviorLearner businessId={business.id} userId={user?.id} pathname={location.pathname} />
    <header className="pxc-header">
      <button className="pxc-mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
      <label className={`pxc-autopilot${autopilotBusy ? " is-busy" : ""}`} title={autopilotNotice || "Run active objectives autonomously"}><input type="checkbox" checked={autopilot} disabled={autopilotBusy} onChange={(event) => void toggleAutopilot(event.target.checked)} /><span /><b>Autopilot mode</b>{autopilotNotice && <em>{autopilotNotice}</em>}</label>
      <button className="pxc-logo" onClick={() => navigate("/app")}><strong>Phoxta</strong><span>AI-Ops</span></button>
      <button className="pxc-mobile-alerts" onClick={() => setNotificationOpen((value) => !value)} aria-label="Open notifications"><Bell size={17} /></button>
      <div className="pxc-account">
        <button className="pxc-avatar" aria-label="Open my account">{avatarPreview ? <img src={avatarPreview} alt="" /> : initials(identity)}</button>
        <input ref={avatarInputRef} className="pxc-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseAvatar(event.target.files?.[0])} />
        <div className="pxc-account-menu"><strong>My Account</strong><button onClick={() => openAccount("profile")}><UserRound size={15} />Profile<ChevronRight size={15} /></button><button onClick={() => openAccount("billing")}><CreditCard size={15} />Billing<ChevronRight size={15} /></button><button onClick={() => openAccount("settings")}><Settings size={15} />Settings<ChevronRight size={15} /></button><hr /><button onClick={() => openAccount("team")}><Users size={15} />Team<ChevronRight size={15} /></button><button onClick={() => openAccount("invite")}><LifeBuoy size={15} />Invite users<ChevronRight size={15} /></button><button onClick={() => openAccount("support")}><Headphones size={15} />Support<ChevronRight size={15} /></button><hr /><button onClick={() => openAccount("logout")}><LogOut size={15} />Log out<ChevronRight size={15} /></button></div>
      </div>
    </header>

    {mobileNav && <button className="pxc-mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <div className="pxc-layout">
      <aside className={`pxc-console-sidebar ${mobileNav ? "is-open" : ""}`} data-ai-context="Agentic Console" data-ai-detail={`Business: ${business.name}. Configure AI and human approval modes for each operating area.`}>
        <button className="pxc-mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
        <div className="pxc-console-head"><strong>Agentic Console</strong><label><select value={business.id} onChange={(event) => selectBusiness(event.target.value)}>{businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={11} /></label></div>
        <nav>{CONSOLE_ITEMS.map((item) => { const itemSection = sectionFromPath(item.to); const itemMode = featureModes[item.label] ?? "ai"; return <div className={`pxc-console-row${item.to === "/app" ? " is-today" : ""}`} key={item.label}><NavLink className={`pxc-console-label${section === itemSection ? " active" : ""}`} end={item.to === "/app"} to={item.to} onClick={() => { setMobileNav(false); setHumanPopup(null); }}><item.icon size={15} /><span>{item.label}</span></NavLink>{item.to !== "/app" && <><div className="pxc-compact-actions"><button className={itemMode === "ai" ? "is-selected" : ""} onClick={() => chooseAi(item.label, item.to)} aria-label={`Use AI for ${item.label}`} title="AI mode"><Bot size={14} /></button><button className={itemMode === "human" ? "is-selected" : ""} onClick={(event) => openHumanLoop(item.label, item.to, event.currentTarget)} aria-label={`Configure human loop for ${item.label}`} title="Human loop"><UserRound size={14} /></button></div><div className="pxc-expanded-actions"><button className={itemMode === "ai" ? "is-selected" : ""} onClick={() => chooseAi(item.label, item.to)}>AI Bot</button><button className={itemMode === "human" ? "is-selected" : ""} onClick={(event) => openHumanLoop(item.label, item.to, event.currentTarget)}>Human loop</button></div></>}</div>; })}</nav>
      </aside>

      {humanPopup && <section className="pxc-human-popup" role="dialog" aria-label={`${humanPopup.label} human loop`} style={{ top: humanPopup.top, left: humanPopup.left }}><header><div><span><UserRound size={15} /></span><div><strong>{humanPopup.label}</strong><small>Human loop</small></div></div><button onClick={() => setHumanPopup(null)} aria-label="Close human loop settings"><X size={16} /></button></header><label className="pxc-human-toggle"><span><strong>Require human approval</strong><small>Phoxta pauses at important decisions.</small></span><input type="checkbox" checked={featureModes[humanPopup.label] === "human"} onChange={(event) => { const mode = event.target.checked ? "human" : "ai"; setFeatureModes((current) => ({ ...current, [humanPopup.label]: mode })); void persistAreaMode(humanPopup.label, mode); }} /><i /></label><p>Approval is required before external messages, publishing, customer commitments, pricing or payments. This setting is saved for every governed tool in this area.</p><button className="pxc-human-done" onClick={() => setHumanPopup(null)}>Done</button></section>}

      <section className={`pxc-stage${isCustomerWorkspace ? " is-today" : ""}${isVentureWorkspace ? " is-venture" : ""}`} data-ai-context={`${workspaceMode} workspace`} data-ai-detail={`Current route: ${location.pathname}. Business: ${business.name}.`}>
        {isCustomerWorkspace ? <CustomerWorkspace /> : <>{isVentureWorkspace ? <nav className="pxc-tabs" aria-label={`${workspaceMode} views`}>{workspaceMode === "school" ? <><NavLink to="/app/school" end>Modules</NavLink><a href="https://learn.phoxta.com">Cohort &amp; mentoring</a></> : <><NavLink to="/app/opportunity" end>Overview</NavLink><NavLink to="/app/discover">Discover</NavLink><NavLink to="/app/opportunities">Workspaces</NavLink><NavLink to="/app/businesses">Ready-to-Launch</NavLink></>}</nav> : <nav className="pxc-tabs" aria-label={`${section} views`}>{tabs.map((tab) => <NavLink className={({ isActive }) => isActive ? "active" : undefined} key={tab.to} end={"end" in tab && tab.end} to={tab.to}>{tab.label} <ChevronDown size={12} /></NavLink>)}</nav>}<div className="pxc-main-card"><main className="pxc-card-scroll pxc-live-app" id="main-content"><LiveAppRoutes /></main></div></>}
      </section>
      <LiveNotificationsRail open={notificationOpen} autopilot={autopilot} onOpen={() => setNotificationOpen(true)} onClose={() => setNotificationOpen(false)} />
    </div>

    <fieldset className="pxc-models"><legend>Workspace</legend><label><input type="radio" name="model" checked={workspaceMode === "ai-ops"} onChange={() => navigate("/app")} />Phoxta AI-Ops</label><label><input type="radio" name="model" checked={workspaceMode === "opportunities"} onChange={() => navigate("/app/opportunity")} />Opportunities</label><label><input type="radio" name="model" checked={workspaceMode === "school"} onChange={() => navigate("/app/school")} />Startup School</label></fieldset>
    <ContextualAssistant businessId={business.id} businessName={business.name} pathname={location.pathname} userId={user?.id} />
    <AutopilotPresence businessId={business.id} enabled={autopilot} objectiveCount={objectives.filter((objective) => objective.status === "active").length} />
    <figure className="pxc-quote"><blockquote>“{quote}”</blockquote><figcaption>▣ &nbsp; {business.name} · Quote of the day</figcaption></figure>
    {accountPopup && <AccountPanel view={accountPopup} expanded={accountExpanded} avatar={avatarPreview} identity={identity} business={business.name} businessId={business.id} userId={user?.id ?? ""} onClose={() => setAccountPopup(null)} onExpand={() => setAccountExpanded((value) => !value)} onUpload={() => avatarInputRef.current?.click()} onSignOut={() => void signOut()} />}
  </div>;
}

export default function PhoxtaApp() {
  return <WorkspaceProvider><AppShell /></WorkspaceProvider>;
}

