// Phoxta — provider-agnostic LLM client (keeps the historical filename so the
// ~10 callers don't change). Supports:
//   • Google Gemini (OpenAI-compatible /v1beta/openai/chat/completions)
//   • xAI Grok      (OpenAI-compatible /v1/chat/completions)
//   • Anthropic     (Messages API)
// Select with LLM_PROVIDER=gemini|xai|anthropic; with it unset the first
// configured key wins, in that order.
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
import { providerFor, providerOf, translateModel, type Provider } from "./models.ts";

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

/** The providers that speak OpenAI's /chat/completions. The code for them is
 *  identical apart from where it points and what it signs with. */
const OPENAI_LIKE: Provider[] = ["gemini", "xai"];
const openAiLike = (p: Provider) => OPENAI_LIKE.includes(p);

const KEY_NAME: Record<Provider, string> = {
  gemini: "GEMINI_API_KEY",
  xai: "XAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

function hasKey(p: Provider): boolean {
  return !!Deno.env.get(KEY_NAME[p]);
}

// --- Circuit breaker (module-level; edge isolates reset it naturally) -------
const BREAK_AFTER = 5;
const COOLDOWN_MS = 60_000;
const breaker: Record<Provider, { fails: number; openUntil: number }> = {
  gemini: { fails: 0, openUntil: 0 },
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
  return /overloaded|timeout|timed out|connection|credit|quota|billing/i.test(msg);
}

/** Ordered providers to try: primary first, then every other provider whose
 *  key is configured. A primary whose circuit is open goes to the back rather
 *  than being dropped — it is the one we would rather be using, and the
 *  cooldown may well have expired by the time the others have failed. */
function orderedProviders(): Provider[] {
  const primary = providerFor();
  const rest = (Object.keys(KEY_NAME) as Provider[]).filter((p) => p !== primary);
  const list = [primary, ...rest].filter(hasKey);
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
function bearerHeaders(p: Provider) {
  const key = Deno.env.get(KEY_NAME[p]);
  if (!key) throw new Error(`${KEY_NAME[p]} not set`);
  return { Authorization: `Bearer ${key}`, "content-type": "application/json" };
}
function apiBase(p: Provider): string {
  return p === "gemini"
    ? Deno.env.get("GEMINI_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta/openai"
    : Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
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
  if (openAiLike(p)) {
    const body = {
      model,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [{ role: "system", content: opts.system }, ...opts.messages.map((m) => ({ role: m.role, content: m.content }))],
    };
    const res = await fetch(`${apiBase(p)}/chat/completions`, { method: "POST", headers: bearerHeaders(p), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${p} ${res.status} ${await res.text().catch(() => "")}`);
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
    if (openAiLike(p)) {
      const res = await fetch(`${apiBase(p)}/chat/completions`, {
        method: "POST",
        headers: bearerHeaders(p),
        body: JSON.stringify({
          model: modelOn(p, opts.model),
          max_tokens: opts.maxTokens ?? 1024,
          ...(p === "xai" ? { response_format: { type: "json_object" } } : {}),
          messages: [{ role: "system", content: system }, { role: "user", content: opts.user }],
        }),
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

  if (openAiLike(p)) {
    const messages: Json[] = [
      { role: "system", content: opts.system },
      ...(opts.history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: opts.userMessage },
    ];
    const tools = toOpenAITools(opts.tools);
    for (let turn = 0; turn < maxTurns; turn++) {
      const res = await fetch(`${apiBase(p)}/chat/completions`, {
        method: "POST",
        headers: bearerHeaders(p),
        body: JSON.stringify({ model: chosenModel, max_tokens: opts.maxTokens ?? 1024, messages, tools, tool_choice: "auto" }),
      });
      if (!res.ok) throw new Error(`${p} ${res.status} ${await res.text().catch(() => "")}`);
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
