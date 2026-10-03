import { listRecentEvents, logEvent, type AnalyticsEvent } from "@/lib/db/ops/analytics";
import { listActions, listAudit } from "@/lib/db/ops/operator";
import { SCHOOL_MODULES } from "@/lib/opportunities/school";
import { getLearningSettings } from "@/lib/db/productWorkspace";

export const USER_ACTION_EVENT = "phoxta:user-action";

export type UserActionDetail = {
  action: string;
  area: string;
  outcome: "success" | "failed" | "cancelled";
  detail?: Record<string, unknown>;
};

export type PerformanceRecommendation = { id: string; title: string; reason: string; url: string };
export type PerformanceAudit = {
  periodDays: number;
  generatedAt: string;
  evidenceCount: number;
  scores: { focus: number; execution: number; customerCare: number; learning: number };
  metrics: { activeMinutes: number; sessions: number; actions: number; completionRate: number; customerReplies: number; averageComposeSeconds: number; routeChanges: number };
  strengths: string[];
  improvements: string[];
  recommendations: PerformanceRecommendation[];
  recentActions: Array<{ title: string; detail: string; status: string; at: string }>;
};

export function recordUserAction(detail: UserActionDetail) {
  window.dispatchEvent(new CustomEvent<UserActionDetail>(USER_ACTION_EVENT, { detail }));
}

function numberProp(event: AnalyticsEvent, key: string) {
  const value = event.props[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function moduleRecommendation(id: string, reason: string): PerformanceRecommendation {
  const module = SCHOOL_MODULES.find((item) => item.id === id);
  return { id, title: module?.title ?? id, reason, url: "https://learn.phoxta.com" };
}

export async function getBehaviorContext(orgId: string, userId?: string | null) {
  if (!userId) return "Behaviour learning is unavailable without a signed-in user.";
  const settings = await getLearningSettings(orgId, userId);
  if (!settings.data.enabled) return "Behaviour learning is paused by the user. Use only the current screen context.";
  const result = await listRecentEvents(orgId, 120);
  const events = result.data.filter((event) => !userId || event.props.user_id === userId);
  const sessions = events.filter((event) => event.name === "workspace_learning_session");
  const actions = events.filter((event) => event.name === "workspace_user_action");
  const replies = actions.filter((event) => event.props.action === "customer_reply");
  const topAreas = new Map<string, number>();
  for (const event of sessions) {
    const areas = event.props.areas;
    if (!areas || typeof areas !== "object" || Array.isArray(areas)) continue;
    for (const [area, count] of Object.entries(areas as Record<string, unknown>)) topAreas.set(area, (topAreas.get(area) ?? 0) + (typeof count === "number" ? count : 0));
  }
  return [
    `Observed workspace sessions: ${sessions.length}.`,
    `Completed user actions: ${actions.filter((event) => event.props.outcome === "success").length} of ${actions.length}.`,
    `Customer replies composed: ${replies.length}.`,
    `Most worked-in areas: ${[...topAreas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area, count]) => `${area} (${count})`).join(", ") || "not enough evidence yet"}.`,
    "Use this behaviour only to adapt assistance and coaching. Do not infer personal traits or sensitive characteristics.",
  ].join("\n");
}

export async function getPerformanceAudit(orgId: string, userId?: string | null): Promise<{ data: PerformanceAudit; error: string | null }> {
  const [eventResult, actionResult, auditResult] = await Promise.all([listRecentEvents(orgId, 500), listActions(orgId), listAudit(orgId, 80)]);
  const events = eventResult.data.filter((event) => !userId || event.props.user_id === userId);
  const sessions = events.filter((event) => event.name === "workspace_learning_session");
  const userActions = events.filter((event) => event.name === "workspace_user_action");
  const replies = userActions.filter((event) => event.props.action === "customer_reply");
  const successful = userActions.filter((event) => event.props.outcome === "success");
  const activeMinutes = Math.round(sessions.reduce((sum, event) => sum + numberProp(event, "active_ms"), 0) / 60_000);
  const routeChanges = new Set(sessions.map((event) => String(event.props.route ?? ""))).size;
  const pointerDistance = sessions.reduce((sum, event) => sum + numberProp(event, "pointer_distance"), 0);
  const clicks = sessions.reduce((sum, event) => sum + numberProp(event, "clicks"), 0);
  const fieldEdits = sessions.reduce((sum, event) => sum + numberProp(event, "field_edits"), 0);
  const averageComposeSeconds = replies.length ? Math.round(replies.reduce((sum, event) => sum + numberProp(event, "compose_ms"), 0) / replies.length / 1000) : 0;
  const averageReplyWords = replies.length ? replies.reduce((sum, event) => sum + numberProp(event, "word_count"), 0) / replies.length : 0;
  const completionRate = userActions.length ? Math.round(successful.length / userActions.length * 100) : 0;
  const focus = clampScore(58 + Math.min(25, activeMinutes * 1.4) + Math.min(12, clicks / Math.max(1, routeChanges)) - Math.min(18, routeChanges > 1 ? routeChanges * 1.8 : 0));
  const execution = clampScore(userActions.length ? 35 + completionRate * .65 : 48);
  const customerCare = clampScore(replies.length ? 45 + Math.min(22, averageReplyWords) + Math.min(18, replies.length * 3) - (averageComposeSeconds > 600 ? 12 : 0) : 45);
  const learning = clampScore(48 + Math.min(22, fieldEdits * 1.5) + Math.min(16, new Set(sessions.map((event) => event.props.route)).size * 2) + Math.min(12, pointerDistance / 50_000));
  const strengths: string[] = [];
  const improvements: string[] = [];
  if (completionRate >= 75 && userActions.length) strengths.push(`You completed ${completionRate}% of recorded actions successfully.`);
  if (replies.length >= 3) strengths.push(`You handled ${replies.length} customer replies with an average of ${Math.round(averageReplyWords)} words.`);
  if (activeMinutes >= 20) strengths.push(`You spent ${activeMinutes} active minutes working across the business.`);
  if (!strengths.length) strengths.push("Phoxta is building a baseline from your recent work. More completed actions will make this report more specific.");
  if (completionRate < 75 && userActions.length) improvements.push("Close the loop on failed or abandoned actions before starting more work.");
  if (replies.length && averageReplyWords < 12) improvements.push("Customer replies are often brief. Confirm the request, answer it directly, and state the next step.");
  if (averageComposeSeconds > 600) improvements.push("Response composition is taking over ten minutes on average. Use saved context and the area AI assistant for a first draft.");
  if (routeChanges > 7 && activeMinutes < 30) improvements.push("Frequent switching is reducing focused work time. Group similar customer and operations tasks into short batches.");
  if (!replies.length) improvements.push("No customer replies are in this learning period. Review the inbox regularly so response quality can be measured.");
  if (!improvements.length) improvements.push("Keep reviewing outcomes after each action and record what changed, rather than treating completion as the end of the work.");
  const recommendations: PerformanceRecommendation[] = [];
  if (customerCare < 70) recommendations.push(moduleRecommendation("customers-context", "Strengthen how you identify the customer, their situation, and the right response."));
  if (execution < 75) recommendations.push(moduleRecommendation("mvp-delivery", "Improve task boundaries, delivery steps, exception handling, and acceptance criteria."));
  if (focus < 70) recommendations.push(moduleRecommendation("critical-assumptions", "Prioritise the few assumptions and actions that most affect the result."));
  if (learning < 75) recommendations.push(moduleRecommendation("validation", "Turn day-to-day work into clearer evidence and reviewable learning."));
  if (recommendations.length < 3) recommendations.push(moduleRecommendation("decision-iteration", "Build a consistent habit of reviewing evidence, decisions, and the next action."));
  const recentActions = [
    ...userActions.slice(0, 8).map((event) => ({ title: String(event.props.action ?? "Workspace action").replaceAll("_", " "), detail: String(event.props.area ?? "Workspace"), status: String(event.props.outcome ?? "recorded"), at: event.created_at })),
    ...actionResult.data.slice(0, 5).map((item) => ({ title: item.title, detail: item.result || item.error || item.tool, status: item.status, at: item.created_at })),
    ...auditResult.data.slice(0, 5).map((item) => ({ title: item.summary || item.tool, detail: item.actor, status: item.status, at: item.created_at })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 10);
  return {
    data: { periodDays: 30, generatedAt: new Date().toISOString(), evidenceCount: events.length + actionResult.data.length + auditResult.data.length, scores: { focus, execution, customerCare, learning }, metrics: { activeMinutes, sessions: sessions.length, actions: userActions.length, completionRate, customerReplies: replies.length, averageComposeSeconds, routeChanges }, strengths, improvements, recommendations: recommendations.slice(0, 3), recentActions },
    error: eventResult.error || actionResult.error || auditResult.error,
  };
}

export async function saveLearningSession(orgId: string, userId: string | null | undefined, props: Record<string, unknown>) {
  if (!props.active_ms || Number(props.active_ms) < 1_000) return;
  await logEvent(orgId, "workspace_learning_session", { ...props, user_id: userId ?? null, schema: 1 });
}

export async function saveUserAction(orgId: string, userId: string | null | undefined, action: UserActionDetail) {
  await logEvent(orgId, "workspace_user_action", { action: action.action, area: action.area, outcome: action.outcome, ...action.detail, user_id: userId ?? null, schema: 1 });
}

