// Phoxta — provider-agnostic LLM client (keeps the historical filename so the
// ~10 callers don't change). Supports:
//   • xAI Grok  (OpenAI-compatible /v1/chat/completions)  ← default when XAI_API_KEY is set
//   • Anthropic (Messages API)
// Select with LLM_PROVIDER=xai|anthropic (auto-detects xai if XAI_API_KEY present).
// Exposes the same surface used everywhere: callMessages, callJson, runAgent.
//
// GATEWAY (audit 2026-08-18): a single provider outage previously killed every
// tenant's agent, inbox copilot and voice simultaneously. Every public entry
// point now walks an ordered provider list — primary, then the other provider
// when its key is configured — with a circuit breaker (5 failures opens the
// circuit for 60s) and same-tier model translation (translateModel). Retries
// happen only on retriable failures (429 / 5xx / network), never on 4xx.
import { translateModel } from "./models.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// deno-lint-ignore no-explicit-any
type Json = any;
export type Msg = { role: "user" | "assistant"; content: Json };
export type Tool = { name: string; description: string; input_schema: Json };
// cacheWriteTok / cacheReadTok: with prompt caching, `input_tokens` is only the
// UNCACHED remainder of the prompt. Total prompt size is
// input + cache_creation + cache_read, so these must be carried through to
// metering or every cached request under-reports cost and usage.
export type CallResult = { text: string; inTok: number; outTok: number; cacheWriteTok: number; cacheReadTok: number; model: string };

type Provider = "xai" | "anthropic";

function provider(): Provider {
  const p = Deno.env.get("LLM_PROVIDER");
  if (p === "xai" || p === "anthropic") return p;
  return Deno.env.get("XAI_API_KEY") ? "xai" : "anthropic";
}

function hasKey(p: Provider): boolean {
  return p === "xai" ? !!Deno.env.get("XAI_API_KEY") : !!Deno.env.get("ANTHROPIC_API_KEY");
}

// --- Circuit breaker (module-level; edge isolates reset it naturally) -------
const BREAK_AFTER = 5;
const COOLDOWN_MS = 60_000;
const breaker: Record<Provider, { fails: number; openUntil: number }> = {
  xai: { fails: 0, openUntil: 0 },
  anthropic: { fails: 0, openUntil: 0 },
};
function circuitOpen(p: Provider): boolean {
  return breaker[p].openUntil > Date.now();
}
function recordFail(p: Provider) {
  const b = breaker[p];
  b.fails += 1;
  if (b.fails >= BREAK_AFTER) {
    b.openUntil = Date.now() + COOLDOWN_MS;
    b.fails = 0;
  }
}
function recordOk(p: Provider) {
  breaker[p].fails = 0;
  breaker[p].openUntil = 0;
}

/** Retriable = provider-side trouble; a 4xx (bad request, auth, too-long) is ours. */
function retriable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (/\b(429|500|502|503|504|529)\b/.test(msg)) return true;
  if (e instanceof TypeError) return true; // network failure
  return /overloaded|timeout|timed out|connection/i.test(msg);
}

/** Ordered providers to try: primary first (unless its circuit is open and a
 *  fallback exists), then the other provider when configured. */
function orderedProviders(): Provider[] {
  const primary = provider();
  const other: Provider = primary === "xai" ? "anthropic" : "xai";
  const list: Provider[] = [];
  if (hasKey(primary)) list.push(primary);
  if (hasKey(other)) list.push(other);
  if (list.length === 2 && circuitOpen(list[0]) && !circuitOpen(list[1])) list.reverse();
  return list.length ? list : [primary];
}

/** Map the requested model onto the provider actually being used. */
function modelOn(p: Provider, model: string): string {
  const isXaiModel = model.startsWith("grok");
  if (p === "xai" && !isXaiModel) return translateModel(model, "xai");
  if (p === "anthropic" && isXaiModel) return translateModel(model, "anthropic");
  return model;
}

async function withFallback<T>(run: (p: Provider) => Promise<T>): Promise<T> {
  const providers = orderedProviders();
  let lastErr: unknown;
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    try {
      const out = await run(p);
      recordOk(p);
      return out;
    } catch (e) {
      lastErr = e;
      recordFail(p);
      if (i < providers.length - 1 && retriable(e)) continue;
      throw e;
    }
  }
  throw lastErr;
}

function anthropicHeaders() {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return { "x-api-key": key, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json" };
}
function xaiHeaders() {
  const key = Deno.env.get("XAI_API_KEY");
  if (!key) throw new Error("XAI_API_KEY not set");
  return { Authorization: `Bearer ${key}`, "content-type": "application/json" };
}
function xaiBase(): string {
  return Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
}

function anthropicText(content: Json): string {
  return (content ?? []).filter((b: Json) => b.type === "text").map((b: Json) => b.text).join("").trim();
}

function toOpenAITools(tools: Tool[]): Json[] {
  return tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
}

// --- Single completion -----------------------------------------------------
async function callMessagesVia(p: Provider, opts: { model: string; system: string; messages: Msg[]; maxTokens?: number }): Promise<CallResult> {
  const model = modelOn(p, opts.model);
  if (p === "xai") {
    const body = {
      model,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [{ role: "system", content: opts.system }, ...opts.messages.map((m) => ({ role: m.role, content: m.content }))],
    };
    const res = await fetch(`${xaiBase()}/chat/completions`, { method: "POST", headers: xaiHeaders(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`xai ${res.status} ${await res.text().catch(() => "")}`);
    const data = await res.json();
    return { text: (data.choices?.[0]?.message?.content ?? "").trim(), inTok: data.usage?.prompt_tokens ?? 0, outTok: data.usage?.completion_tokens ?? 0, cacheWriteTok: 0, cacheReadTok: 0, model: data.model ?? model };
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1024,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return {
    text: anthropicText(data.content),
    inTok: data.usage?.input_tokens ?? 0,
    outTok: data.usage?.output_tokens ?? 0,
    cacheWriteTok: data.usage?.cache_creation_input_tokens ?? 0,
    cacheReadTok: data.usage?.cache_read_input_tokens ?? 0,
    model: data.model ?? model,
  };
}

export function callMessages(opts: { model: string; system: string; messages: Msg[]; maxTokens?: number }): Promise<CallResult> {
  return withFallback((p) => callMessagesVia(p, opts));
}

// --- JSON-structured completion -------------------------------------------
export async function callJson<T = Json>(opts: { model: string; system: string; user: string; maxTokens?: number }): Promise<{ data: T; inTok: number; outTok: number; cacheWriteTok: number; cacheReadTok: number; model: string }> {
  const system = opts.system + "\n\nRespond with ONLY valid JSON — no prose, no markdown fences.";
  const r = await withFallback(async (p) => {
    if (p === "xai") {
      const res = await fetch(`${xaiBase()}/chat/completions`, {
        method: "POST",
        headers: xaiHeaders(),
        body: JSON.stringify({
          model: modelOn(p, opts.model),
          max_tokens: opts.maxTokens ?? 1024,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: opts.user }],
        }),
      });
      if (!res.ok) throw new Error(`xai ${res.status} ${await res.text().catch(() => "")}`);
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content ?? "",
        inTok: data.usage?.prompt_tokens ?? 0,
        outTok: data.usage?.completion_tokens ?? 0,
        cacheWriteTok: 0,
        cacheReadTok: 0,
        model: data.model ?? opts.model,
      } as CallResult;
    }
    return await callMessagesVia(p, { model: opts.model, system, messages: [{ role: "user", content: opts.user }], maxTokens: opts.maxTokens ?? 1024 });
  });

  let raw = r.text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.search(/[[{]/);
  if (start > 0) raw = raw.slice(start);
  let parsed: T;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("model did not return valid JSON");
  }
  return { data: parsed, inTok: r.inTok, outTok: r.outTok, cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, model: r.model };
}

// --- Tool-using agent loop -------------------------------------------------
async function runAgentVia(p: Provider, opts: {
  model: string;
  system: string;
  userMessage: string;
  history?: Msg[];
  tools: Tool[];
  toolRunner: (name: string, input: Json) => Promise<string>;
  maxTurns?: number;
  maxTokens?: number;
}): Promise<{ text: string; inTok: number; outTok: number; cacheWriteTok: number; cacheReadTok: number; model: string; toolCalls: string[] }> {
  const maxTurns = opts.maxTurns ?? 6;
  const chosenModel = modelOn(p, opts.model);
  let inTok = 0;
  let outTok = 0;
  // Anthropic prompt-caching counters; stay 0 on providers without caching.
  let cacheWriteTok = 0;
  let cacheReadTok = 0;
  let model = chosenModel;
  const toolCalls: string[] = [];

  if (p === "xai") {
    const messages: Json[] = [
      { role: "system", content: opts.system },
      ...(opts.history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: opts.userMessage },
    ];
    const tools = toOpenAITools(opts.tools);
    for (let turn = 0; turn < maxTurns; turn++) {
      const res = await fetch(`${xaiBase()}/chat/completions`, {
        method: "POST",
        headers: xaiHeaders(),
        body: JSON.stringify({ model: chosenModel, max_tokens: opts.maxTokens ?? 1024, messages, tools, tool_choice: "auto" }),
      });
      if (!res.ok) throw new Error(`xai ${res.status} ${await res.text().catch(() => "")}`);
      const data = await res.json();
      inTok += data.usage?.prompt_tokens ?? 0;
      outTok += data.usage?.completion_tokens ?? 0;
      model = data.model ?? model;
      const m = data.choices?.[0]?.message ?? {};
      const calls = m.tool_calls ?? [];
      if (calls.length === 0) {
        return { text: (m.content ?? "").trim(), inTok, outTok, cacheWriteTok, cacheReadTok, model, toolCalls };
      }
      messages.push({ role: "assistant", content: m.content ?? "", tool_calls: calls });
      for (const tc of calls) {
        toolCalls.push(tc.function?.name);
        let args: Json = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? "{}");
        } catch { /* leave {} */ }
        let out: string;
        try {
          out = await opts.toolRunner(tc.function?.name, args);
        } catch (e) {
          out = `Error: ${e instanceof Error ? e.message : String(e)}`;
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: out.slice(0, 12000) });
      }
    }
    return { text: "I couldn't complete that request. Please try rephrasing.", inTok, outTok, cacheWriteTok, cacheReadTok, model, toolCalls };
  }

  // Anthropic tool-use loop
  const messages: Msg[] = [...(opts.history ?? []), { role: "user", content: opts.userMessage }];
  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: anthropicHeaders(),
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: opts.maxTokens ?? 1024,
        system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
        messages,
        tools: opts.tools,
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status} ${await res.text().catch(() => "")}`);
    const data = await res.json();
    inTok += data.usage?.input_tokens ?? 0;
    outTok += data.usage?.output_tokens ?? 0;
    cacheWriteTok += data.usage?.cache_creation_input_tokens ?? 0;
    cacheReadTok += data.usage?.cache_read_input_tokens ?? 0;
    model = data.model ?? model;
    messages.push({ role: "assistant", content: data.content });
    if (data.stop_reason !== "tool_use") {
      return { text: anthropicText(data.content), inTok, outTok, cacheWriteTok, cacheReadTok, model, toolCalls };
    }
    const toolUses = (data.content ?? []).filter((b: Json) => b.type === "tool_use");
    const results: Json[] = [];
    for (const tu of toolUses) {
      toolCalls.push(tu.name);
      let out: string;
      try {
        out = await opts.toolRunner(tu.name, tu.input);
      } catch (e) {
        out = `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out.slice(0, 12000) });
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "I couldn't complete that request. Please try rephrasing.", inTok, outTok, cacheWriteTok, cacheReadTok, model, toolCalls };
}

export function runAgent(opts: {
  model: string;
  system: string;
  userMessage: string;
  history?: Msg[];
  tools: Tool[];
  toolRunner: (name: string, input: Json) => Promise<string>;
  maxTurns?: number;
  maxTokens?: number;
}): Promise<{ text: string; inTok: number; outTok: number; cacheWriteTok: number; cacheReadTok: number; model: string; toolCalls: string[] }> {
  // Fallback at loop granularity: a mid-loop failure re-runs the whole loop on
  // the other provider (message formats aren't cross-compatible mid-flight).
  // Tool side effects are the callers' tools — reads are safe to repeat, and
  // write tools are idempotent-or-governed (approval queue) by design.
  return withFallback((p) => runAgentVia(p, opts));
}
