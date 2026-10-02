export type AgentActivityStatus = "working" | "approval" | "completed" | "failed" | "idle";

export type AgentActivity = {
  id: string;
  title: string;
  body: string;
  status: AgentActivityStatus;
  createdAt: string;
  tool?: string | null;
  source: "operator" | "autopilot";
};

export const AGENT_ACTIVITY_EVENT = "phoxta:agent-activity";
export const DATA_CHANGED_EVENT = "phoxta:data-changed";

export function emitAgentActivity(activity: AgentActivity) {
  window.dispatchEvent(new CustomEvent<AgentActivity>(AGENT_ACTIVITY_EVENT, { detail: activity }));
}

export function emitDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

