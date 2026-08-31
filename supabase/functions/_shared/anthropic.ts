// Phoxta — provider-agnostic LLM client (keeps the historical filename so the
// ~20 callers don't change). Supports:
//   • Google Gemini (OpenAI-compatible /v1beta/openai/chat/completions)
//   • xAI Grok      (OpenAI-compatible /v1/chat/completions)
//   • Anthropic     (Messages API)
//   • local         (OpenAI-compatible — vLLM / llama.cpp / Ollama on your own
//                    box, at LOCAL_BASE_URL)
// Select with LLM_PROVIDER=gemini|xai|anthropic|local, or per tier with
// LLM_PROVIDER_CHEAP/_BALANCED/_COMPLEX; with it unset the first configured
// key wins, in that order.
// Exposes the same surface used everywhere: callMessages, callJson, runAgent.
//
// GEMINI GOES THROUGH THE OPENAI-COMPATIBLE LAYER rather than Google's native
// API, because that layer speaks the protocol this file already implements for
// xAI — one code path, already exercised, instead of a second message format
// to keep in step. The one thing not sent to it is response_format: Google
// documents that layer as still in beta and does not list JSON mode, and an
// unrecognised response_format is a 400 that would take down every feature
// that asks for JSON. callJson's parser tolerates fences and preamble anyway,
// which is exactly how the Anthropic path — which has no JSON mode either —
// has always worked.
//
// GATEWAY (audit 2026-08-18): a single provider outage previously killed every
// tenant's agent, inbox copilot and voice simultaneously. Every public entry
// point now walks an ordered provider list — primary, then the other provider
// when its key is configured — with a circuit breaker (5 failures opens the
// circuit for 60s) and same-tier model translation (translateModel). Retries
// happen only on retriable failures (429 / 5xx / network), never on 4xx.
//
// FAILOVER IS PER MODEL CALL, NOT PER LOOP (audit 2026-08-31). The agent loop
// used to be wrapped whole: a 503 on turn four re-ran turns one to three on the
// next provider, and with them every tool those turns had already executed.
// The comment that justified it claimed write tools were "idempotent-or-
// governed"; checked tool by tool, 20 of 36 were not — second invoice, second
// SMS, second booking, all audited ok. The loop now keeps ONE provider-neutral
// transcript and renders it into whichever provider's wire format each call
// needs, so a call that fails is retried on the next provider from exactly the
// same state and no tool ever runs twice.
import { configured, KEY_NAME, providerFor, providerOf, tierOf, translateModel, type Provider, type Tier } from "./models.ts";

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

/** What a streaming caller hears while runAgent works. `delta` is text as the
 *  model produces it (token-level on the OpenAI-compatible providers, one piece
 *  on Anthropic); `turn` fires before every model call, so a UI that shows
 *  provisional text resets it there — text emitted during a turn that ends in
 *  tool calls was the model thinking aloud, not the answer. `done.reply` in the
 *  caller's final event is always canonical. */
export type AgentEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string; ok: boolean }
  | { type: "turn"; n: number };

export type AgentResult = {
  text: string;
  inTok: number;
  outTok: number;
  cacheWriteTok: number;
  cacheReadTok: number;
  model: string;
  toolCalls: string[];
  /** True when maxTurns ran out before the model produced an answer. `text` is
   *  then "" — callers own the wording of what a person sees, because the old
   *  "I couldn't complete that request. Please try rephrasing." was being
   *  emailed to customers as the business's reply and marked handled. */
  exhausted: boolean;
  /** Provider attempts that failed and were retried elsewhere. Observability:
   *  a day of quiet failovers looks fine in every other metric. */
  failedAttempts: number;
};

/** The providers that speak OpenAI's /chat/completions. The code for them is
 *  identical apart from where it points and what it signs with — which is why
 *  a self-hosted server joins by name alone: vLLM, llama.cpp's server and
 *  Ollama all expose this same route. */
const OPENAI_LIKE: Provider[] = ["gemini", "xai", "local"];
const openAiLike = (p: Provider) => OPENAI_LIKE.includes(p);

/** One provider call may not hang the whole function. A provider that accepts
 *  the socket and never answers used to hold an edge isolate until the
 *  platform killed it — after the caller's own timeout, with nothing metered
 *  and no failover. Ninety seconds covers a long complex-tier generation;
 *  AbortSignal's "timed out" message is one the retriable() test recognises,
 *  so the next provider is tried. */
const CALL_TIMEOUT_MS = Number(Deno.env.get("LLM_CALL_TIMEOUT_MS") || 90_000);

// --- Circuit breaker (module-level; edge isolates reset it naturally) -------
const BREAK_AFTER = 5;
const COOLDOWN_MS = 60_000;
const breaker: Record<Provider, { fails: number; openUntil: number }> = {
  gemini: { fails: 0, openUntil: 0 },
  xai: { fails: 0, openUntil: 0 },
  anthropic: { fails: 0, openUntil: 0 },
  local: { fails: 0, openUntil: 0 },
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

/**
 * Retriable = provider-side trouble. A 400 or a 422 is our own request and
 * would fail the same way anywhere, so it stops here.
 *
 * 401, 402 and 403 ARE retriable, which is not obvious. They were not, and
 * that is how the platform went dark the day the xAI credit ran out: xAI
 * answered 403 "your team has used all available credits", the gateway read a
 * 4xx as "our fault, do not fail over", and every agent, caption and copilot
 * stopped — with another provider configured and sitting idle the whole time.
 * A key that is unpaid, expired or revoked is a fact about that provider, not
 * about the request, and the next provider is exactly the right thing to try.
 */
function retriable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (/\b(401|402|403|429|500|502|503|504|529)\b/.test(msg)) return true;
  if (e instanceof TypeError) return true; // network failure
  if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) return true;
  return /overloaded|timeout|timed out|connection|credit|quota|billing/i.test(msg);
}

/** Ordered providers to try: primary first, then every other provider whose
 *  key is configured. A primary whose circuit is open goes to the back rather
 *  than being dropped — it is the one we would rather be using, and the
 *  cooldown may well have expired by the time the others have failed. */
function orderedProviders(model: string): Provider[] {
  // The primary comes from the MODEL the caller asked for, not from the global
  // setting. With per-tier routing those two disagree on purpose: a `cheap`
  // call carries a local model id while `providerFor()` still says gemini, and
  // starting it anywhere but local would quietly undo the routing.
  const primary = providerOf(model) ?? providerFor();
  // A CPU box is a fine PRIMARY for the cheap tier and a poor fallback for
  // anything else — a balanced agent turn that spills onto it takes a minute
  // and usually times out, which is worse than the outage it was covering. So
  // `local` is only reachable as a fallback when the operator asks for it.
  const allowLocal = Deno.env.get("LOCAL_FALLBACK") === "1";
  const rest = (Object.keys(KEY_NAME) as Provider[]).filter(
    (p) => p !== primary && (p !== "local" || allowLocal),
  );
  const list = [primary, ...rest].filter((p) => configured(p));
  if (list.length > 1 && circuitOpen(list[0])) {
    const open = list.shift()!;
    list.push(open);
  }
  return list.length ? list : [primary];
}

/** Map the requested model onto the provider actually being used. An id we do
 *  not recognise is an operator pin (AI_MODEL) and is passed through untouched
 *  rather than second-guessed. */
function modelOn(p: Provider, model: string): string {
  const owner = providerOf(model);
  if (!owner || owner === p) return model;
  return translateModel(model, p);
}

type FallbackStats = { failed: number };

async function withFallback<T>(model: string, run: (p: Provider) => Promise<T>, stats?: FallbackStats): Promise<T> {
  const providers = orderedProviders(model);
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
      if (stats) stats.failed += 1;
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
function bearerHeaders(p: Provider) {
  // A box you run yourself normally has no key at all — vLLM only checks one
  // when started with --api-key — so `local` sends a placeholder rather than
  // refusing to make the call. Every other provider must present a real key.
  if (p === "local") {
    const key = Deno.env.get("LOCAL_API_KEY") || "no-key";
    return { Authorization: `Bearer ${key}`, "content-type": "application/json" };
  }
  const key = Deno.env.get(KEY_NAME[p]);
  if (!key) throw new Error(`${KEY_NAME[p]} not set`);
  return { Authorization: `Bearer ${key}`, "content-type": "application/json" };
}
function apiBase(p: Provider): string {
  if (p === "local") {
    // Trailing slash trimmed because every call below appends "/chat/completions"
    // and "…/v1//chat/completions" is a 404 on vLLM — a one-character typo in an
    // env var that would otherwise look like the box being down.
    const base = Deno.env.get("LOCAL_BASE_URL") || "";
    if (!base) throw new Error("LOCAL_BASE_URL not set");
    return base.replace(/\/+$/, "");
  }
  return p === "gemini"
    ? Deno.env.get("GEMINI_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta/openai"
    : Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
}

// --- Thinking control -------------------------------------------------------
//
// Nothing on the platform ever set a reasoning budget, so every call — a
// 100-token inbound classification included — ran at the provider's default,
// which for Gemini means thinking ON. Two costs: seconds of dead time before
// the first output token on every turn, and the thinking tokens are charged
// against max_tokens, so a 1024-token budget could be spent entirely on
// reasoning and return EMPTY text. That is the "couldn't produce a reply" in
// ai-gateway and the "composed no reply" in gmail-sync and agent-catchup: not
// rare edge cases, the thinking budget — and emails went unanswered for it.
//
// Gemini only. xAI accepts reasoning_effort on some Grok models and returns
// 400 on others, and a 400 is (correctly) not failed over; the local box runs
// an Instruct model that does not think. Per tier, overridable per tier, and
// LLM_REASONING_EFFORT=off restores the provider default for everything.
const DEFAULT_EFFORT: Record<Tier, string> = { cheap: "low", balanced: "low", complex: "high" };

function reasoningFor(p: Provider, model: string): Json {
  if (p !== "gemini") return {};
  const global = (Deno.env.get("LLM_REASONING_EFFORT") || "").trim().toLowerCase();
  if (global === "off") return {};
  const tier = tierOf(model) ?? "balanced";
  const perTier = (Deno.env.get(`LLM_REASONING_EFFORT_${tier.toUpperCase()}`) || "").trim().toLowerCase();
  const effort = perTier || global || DEFAULT_EFFORT[tier];
  return { reasoning_effort: effort };
}

/** Gemini counts thinking tokens against max_tokens. The caller's number is
 *  the ANSWER budget it wants; the headroom is what the model may spend
 *  thinking on top, so the answer cannot be crowded out. */
const THINKING_HEADROOM = Number(Deno.env.get("LLM_THINKING_HEADROOM") || 1024);
function maxTokensFor(p: Provider, model: string, requested: number): number {
  if (p !== "gemini") return requested;
  return Object.keys(reasoningFor(p, model)).length ? requested + THINKING_HEADROOM : requested;
}

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(CALL_TIMEOUT_MS);
}

function anthropicText(content: Json): string {
  return (content ?? []).filter((b: Json) => b.type === "text").map((b: Json) => b.text).join("").trim();
}

function toOpenAITools(tools: Tool[]): Json[] {
  return tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
}

/** Anthropic prompt caching: the system prompt was already a cache breakpoint;
 *  the tool schemas — 22 of them on the owner assistant, re-sent every turn —
 *  were not. A breakpoint on the last tool caches the whole tools block. */
function toAnthropicTools(tools: Tool[]): Json[] {
  if (!tools.length) return [];
  return tools.map((t, i) => (i === tools.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t));
}

// --- Single completion -----------------------------------------------------
async function callMessagesVia(p: Provider, opts: { model: string; system: string; messages: Msg[]; maxTokens?: number }): Promise<CallResult> {
  const model = modelOn(p, opts.model);
  const requested = opts.maxTokens ?? 1024;
  if (openAiLike(p)) {
    const body = {
      model,
      max_tokens: maxTokensFor(p, model, requested),
      ...reasoningFor(p, model),
      messages: [{ role: "system", content: opts.system }, ...opts.messages.map((m) => ({ role: m.role, content: m.content }))],
    };
    const res = await fetch(`${apiBase(p)}/chat/completions`, { method: "POST", headers: bearerHeaders(p), body: JSON.stringify(body), signal: timeoutSignal() });
    if (!res.ok) throw new Error(`${p} ${res.status} ${await res.text().catch(() => "")}`);
    const data = await res.json();
    return { text: (data.choices?.[0]?.message?.content ?? "").trim(), inTok: data.usage?.prompt_tokens ?? 0, outTok: data.usage?.completion_tokens ?? 0, cacheWriteTok: 0, cacheReadTok: 0, model: data.model ?? model };
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model,
      max_tokens: requested,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
    }),
    signal: timeoutSignal(),
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
  return withFallback(opts.model, (p) => callMessagesVia(p, opts));
}

// --- JSON-structured completion -------------------------------------------
export async function callJson<T = Json>(opts: { model: string; system: string; user: string; maxTokens?: number }): Promise<{ data: T; inTok: number; outTok: number; cacheWriteTok: number; cacheReadTok: number; model: string }> {
  const system = opts.system + "\n\nRespond with ONLY valid JSON — no prose, no markdown fences.";
  const r = await withFallback(opts.model, async (p) => {
    if (openAiLike(p)) {
      const model = modelOn(p, opts.model);
      const res = await fetch(`${apiBase(p)}/chat/completions`, {
        method: "POST",
        headers: bearerHeaders(p),
        body: JSON.stringify({
          model,
          max_tokens: maxTokensFor(p, model, opts.maxTokens ?? 1024),
          ...reasoningFor(p, model),
          // vLLM and llama.cpp both implement response_format via guided
          // decoding, and a 4B model needs that help far more than a frontier
          // one does. Opt-in because Ollama does NOT accept the field, and an
          // unrecognised response_format is a 400 — which `retriable` correctly
          // refuses to fail over, so every JSON feature would stop at once.
          ...(p === "xai" || (p === "local" && Deno.env.get("LOCAL_JSON_MODE") === "1")
            ? { response_format: { type: "json_object" } }
            : {}),
          messages: [{ role: "system", content: system }, { role: "user", content: opts.user }],
        }),
        signal: timeoutSignal(),
      });
      if (!res.ok) throw new Error(`${p} ${res.status} ${await res.text().catch(() => "")}`);
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
//
// The transcript is kept in ONE neutral shape and rendered per provider on
// every call. That is what makes failover per call possible: the state a
// retry needs is not "the OpenAI messages array" or "the Anthropic content
// blocks", it is the sequence of what the model said, what tools it asked for
// and what those tools returned — which reads the same everywhere.

type ToolCall = { id: string; name: string; args: Json };
type Step =
  | { kind: "assistant"; text: string; calls: ToolCall[] }
  | { kind: "tools"; results: { id: string; name: string; output: string }[] };

type AgentOpts = {
  model: string;
  system: string;
  userMessage: string;
  history?: Msg[];
  tools: Tool[];
  toolRunner: (name: string, input: Json) => Promise<string>;
  maxTurns?: number;
  maxTokens?: number;
  onEvent?: (e: AgentEvent) => void;
};

/** What one model call produces, before any tool runs. */
type StepOut = {
  text: string;
  calls: ToolCall[];
  inTok: number;
  outTok: number;
  cacheWriteTok: number;
  cacheReadTok: number;
  model: string;
};

const TOOL_OUTPUT_MAX = 12_000;

/**
 * Tool output goes into the context, and 60 CRM rows at ~400 bytes each is
 * 24 KB. The old cut was `slice(0, 12000)` — mid-row, mid-string — so the
 * model received a JSON array with no closing bracket and a half-written
 * email address, and either guessed or asked again. Cut at a row boundary
 * when the output is a JSON array, at a line boundary otherwise, and say how
 * much is missing so the model can ask for a narrower query instead.
 */
function truncateToolOutput(out: string, max = TOOL_OUTPUT_MAX): string {
  if (out.length <= max) return out;
  if (out.trimStart().startsWith("[")) {
    try {
      const arr = JSON.parse(out);
      if (Array.isArray(arr)) {
        const total = arr.length;
        while (arr.length && JSON.stringify(arr).length > max - 80) arr.pop();
        return JSON.stringify([...arr, { _truncated: true, omitted: total - arr.length, hint: "Narrow the query or ask for a page (offset/limit)." }]);
      }
    } catch { /* not JSON after all — fall through to the line cut */ }
  }
  const cut = out.lastIndexOf("\n", max);
  return out.slice(0, cut > max / 2 ? cut : max) + `\n…[truncated ${out.length - max} characters — narrow the query]`;
}

function openAiMessages(opts: AgentOpts, steps: Step[]): Json[] {
  const out: Json[] = [
    { role: "system", content: opts.system },
    ...(opts.history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.userMessage },
  ];
  for (const s of steps) {
    if (s.kind === "assistant") {
      out.push({
        role: "assistant",
        content: s.text || "",
        ...(s.calls.length
          ? { tool_calls: s.calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) } })) }
          : {}),
      });
    } else {
      for (const r of s.results) out.push({ role: "tool", tool_call_id: r.id, content: r.output });
    }
  }
  return out;
}

function anthropicMessages(opts: AgentOpts, steps: Step[]): Msg[] {
  const out: Msg[] = [...(opts.history ?? []), { role: "user", content: opts.userMessage }];
  for (const s of steps) {
    if (s.kind === "assistant") {
      // Anthropic rejects an empty text block, so text is only included when
      // there is some; a tool-only turn is a content array of tool_use blocks.
      const blocks: Json[] = [];
      if (s.text) blocks.push({ type: "text", text: s.text });
      for (const c of s.calls) blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.args ?? {} });
      out.push({ role: "assistant", content: blocks.length ? blocks : [{ type: "text", text: "…" }] });
    } else {
      out.push({ role: "user", content: s.results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: r.output })) });
    }
  }
  return out;
}

/** Tool-call ids cross providers with the transcript. Anthropic requires
 *  `^[a-zA-Z0-9_-]+$` and a non-empty value; a provider that returns none gets
 *  a stable synthetic one. */
function safeId(raw: unknown, turn: number, i: number): string {
  const s = String(raw ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  return s || `call_${turn}_${i}`;
}

/** Read an OpenAI-style SSE stream, forwarding text deltas as they arrive and
 *  assembling tool calls (which arrive as fragments keyed by index). */
async function readOpenAiStream(res: Response, turn: number, onDelta?: (t: string) => void): Promise<{ text: string; calls: ToolCall[]; usage: Json; model?: string }> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let usage: Json = null;
  let model: string | undefined;
  const partial = new Map<number, { id: string; name: string; args: string }>();

  const handleLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    let j: Json;
    try {
      j = JSON.parse(payload);
    } catch {
      return;
    }
    if (j.usage) usage = j.usage;
    if (j.model) model = j.model;
    const d = j.choices?.[0]?.delta;
    if (!d) return;
    if (typeof d.content === "string" && d.content) {
      text += d.content;
      onDelta?.(d.content);
    }
    for (const tc of d.tool_calls ?? []) {
      const i = tc.index ?? 0;
      const cur = partial.get(i) ?? { id: "", name: "", args: "" };
      if (tc.id) cur.id = tc.id;
      if (tc.function?.name) cur.name += tc.function.name;
      if (tc.function?.arguments) cur.args += tc.function.arguments;
      partial.set(i, cur);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      handleLine(buf.slice(0, nl).replace(/\r$/, ""));
      buf = buf.slice(nl + 1);
    }
  }
  if (buf.trim()) handleLine(buf.trim());

  const calls: ToolCall[] = [...partial.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, c]) => {
      let args: Json = {};
      try {
        args = JSON.parse(c.args || "{}");
      } catch { /* leave {} */ }
      return { id: safeId(c.id, turn, i), name: c.name, args };
    });
  return { text, calls, usage, model };
}

/** ONE model call on ONE provider. Everything the loop needs from it comes
 *  back in the neutral shape; nothing here touches a tool. */
async function agentStep(p: Provider, opts: AgentOpts, steps: Step[], turn: number): Promise<StepOut> {
  const model = modelOn(p, opts.model);
  const requested = opts.maxTokens ?? 1024;

  if (openAiLike(p)) {
    const stream = !!opts.onEvent;
    const res = await fetch(`${apiBase(p)}/chat/completions`, {
      method: "POST",
      headers: bearerHeaders(p),
      body: JSON.stringify({
        model,
        max_tokens: maxTokensFor(p, model, requested),
        ...reasoningFor(p, model),
        messages: openAiMessages(opts, steps),
        tools: toOpenAITools(opts.tools),
        tool_choice: "auto",
        ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
      }),
      signal: timeoutSignal(),
    });
    if (!res.ok) throw new Error(`${p} ${res.status} ${await res.text().catch(() => "")}`);

    if (stream) {
      const s = await readOpenAiStream(res, turn, (t) => opts.onEvent?.({ type: "delta", text: t }));
      return {
        text: s.text.trim(),
        calls: s.calls,
        inTok: s.usage?.prompt_tokens ?? 0,
        outTok: s.usage?.completion_tokens ?? 0,
        cacheWriteTok: 0,
        cacheReadTok: 0,
        model: s.model ?? model,
      };
    }

    const data = await res.json();
    const m = data.choices?.[0]?.message ?? {};
    const calls: ToolCall[] = (m.tool_calls ?? []).map((tc: Json, i: number) => {
      let args: Json = {};
      try {
        args = JSON.parse(tc.function?.arguments ?? "{}");
      } catch { /* leave {} */ }
      return { id: safeId(tc.id, turn, i), name: tc.function?.name ?? "", args };
    });
    return {
      text: (m.content ?? "").trim(),
      calls,
      inTok: data.usage?.prompt_tokens ?? 0,
      outTok: data.usage?.completion_tokens ?? 0,
      cacheWriteTok: 0,
      cacheReadTok: 0,
      model: data.model ?? model,
    };
  }

  // Anthropic — not streamed; the whole text is emitted as one delta so a
  // streaming caller still gets its answer through the same channel.
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model,
      max_tokens: requested,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: anthropicMessages(opts, steps),
      tools: toAnthropicTools(opts.tools),
    }),
    signal: timeoutSignal(),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const text = anthropicText(data.content);
  const calls: ToolCall[] = (data.content ?? [])
    .filter((b: Json) => b.type === "tool_use")
    .map((b: Json, i: number) => ({ id: safeId(b.id, turn, i), name: b.name, args: b.input ?? {} }));
  if (text && calls.length === 0) opts.onEvent?.({ type: "delta", text });
  return {
    text,
    calls,
    inTok: data.usage?.input_tokens ?? 0,
    outTok: data.usage?.output_tokens ?? 0,
    cacheWriteTok: data.usage?.cache_creation_input_tokens ?? 0,
    cacheReadTok: data.usage?.cache_read_input_tokens ?? 0,
    model: data.model ?? model,
  };
}

export async function runAgent(opts: AgentOpts): Promise<AgentResult> {
  const maxTurns = opts.maxTurns ?? 6;
  const steps: Step[] = [];
  const stats: FallbackStats = { failed: 0 };
  const toolCalls: string[] = [];
  let inTok = 0, outTok = 0, cacheWriteTok = 0, cacheReadTok = 0;
  let model = opts.model;

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      opts.onEvent?.({ type: "turn", n: turn });

      // Failover is HERE, around one call, with the transcript so far. A
      // provider that dies on this call is replaced for this call only; the
      // tools that already ran stay ran.
      const r = await withFallback(opts.model, (p) => agentStep(p, opts, steps, turn), stats);
      inTok += r.inTok;
      outTok += r.outTok;
      cacheWriteTok += r.cacheWriteTok;
      cacheReadTok += r.cacheReadTok;
      model = r.model;

      if (r.calls.length === 0) {
        return { text: r.text, inTok, outTok, cacheWriteTok, cacheReadTok, model, toolCalls, exhausted: false, failedAttempts: stats.failed };
      }

      steps.push({ kind: "assistant", text: r.text, calls: r.calls });

      // Tools run IN PARALLEL. They used to run one after another, so three
      // independent reads were three sequential round trips. Results keep
      // the model's order regardless of which finished first, because the
      // provider matches them to calls by id, not by position.
      const results = await Promise.all(
        r.calls.map(async (c) => {
          toolCalls.push(c.name);
          opts.onEvent?.({ type: "tool_start", name: c.name });
          let output: string;
          let ok = true;
          try {
            output = await opts.toolRunner(c.name, c.args);
          } catch (e) {
            ok = false;
            output = `Error: ${e instanceof Error ? e.message : String(e)}`;
          }
          opts.onEvent?.({ type: "tool_end", name: c.name, ok });
          return { id: c.id, name: c.name, output: truncateToolOutput(output) };
        }),
      );
      steps.push({ kind: "tools", results });
    }
    return { text: "", inTok, outTok, cacheWriteTok, cacheReadTok, model, toolCalls, exhausted: true, failedAttempts: stats.failed };
  } catch (e) {
    // The tokens spent before the failure are real and billed. Hand them to
    // the caller on the error so they can be metered with status "failed"
    // instead of vanishing — a day of provider trouble used to look CHEAP.
    const err = e instanceof Error ? e : new Error(String(e));
    (err as Error & { usage?: { inTok: number; outTok: number } }).usage = { inTok, outTok };
    throw err;
  }
}
