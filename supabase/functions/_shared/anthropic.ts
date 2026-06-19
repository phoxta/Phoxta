// Phoxta — provider-agnostic LLM client (keeps the historical filename so the
// ~10 callers don't change). Supports:
//   • xAI Grok  (OpenAI-compatible /v1/chat/completions)  ← default when XAI_API_KEY is set
//   • Anthropic (Messages API)
// Select with LLM_PROVIDER=xai|anthropic (auto-detects xai if XAI_API_KEY present).
// Exposes the same surface used everywhere: callMessages, callJson, runAgent.
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// deno-lint-ignore no-explicit-any
type Json = any;
export type Msg = { role: "user" | "assistant"; content: Json };
export type Tool = { name: string; description: string; input_schema: Json };
export type CallResult = { text: string; inTok: number; outTok: number; model: string };

function provider(): "xai" | "anthropic" {
  const p = Deno.env.get("LLM_PROVIDER");
  if (p === "xai" || p === "anthropic") return p;
  return Deno.env.get("XAI_API_KEY") ? "xai" : "anthropic";
}

function xaiBase(): string {
  return Deno.env.get("XAI_BASE_URL") || "https://api.x.ai/v1";
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

function anthropicText(content: Json): string {
  return (content ?? []).filter((b: Json) => b.type === "text").map((b: Json) => b.text).join("").trim();
}

function toOpenAITools(tools: Tool[]): Json[] {
  return tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
}

// --- Single completion -----------------------------------------------------
export async function callMessages(opts: { model: string; system: string; messages: Msg[]; maxTokens?: number }): Promise<CallResult> {
  if (provider() === "xai") {
    const body = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [{ role: "system", content: opts.system }, ...opts.messages.map((m) => ({ role: m.role, content: m.content }))],
    };
    const res = await fetch(`${xaiBase()}/chat/completions`, { method: "POST", headers: xaiHeaders(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`xai ${res.status} ${await res.text().catch(() => "")}`);
    const data = await res.json();
    return { text: (data.choices?.[0]?.message?.content ?? "").trim(), inTok: data.usage?.prompt_tokens ?? 0, outTok: data.usage?.completion_tokens ?? 0, model: data.model ?? opts.model };
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return { text: anthropicText(data.content), inTok: data.usage?.input_tokens ?? 0, outTok: data.usage?.output_tokens ?? 0, model: data.model ?? opts.model };
}

// --- JSON-structured completion -------------------------------------------
export async function callJson<T = Json>(opts: { model: string; system: string; user: string; maxTokens?: number }): Promise<{ data: T; inTok: number; outTok: number; model: string }> {
  const system = opts.system + "\n\nRespond with ONLY valid JSON — no prose, no markdown fences.";
  let text: string;
  let inTok: number;
  let outTok: number;
  let model: string;

  if (provider() === "xai") {
    const res = await fetch(`${xaiBase()}/chat/completions`, {
      method: "POST",
      headers: xaiHeaders(),
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: opts.user }],
      }),
    });
    if (!res.ok) throw new Error(`xai ${res.status} ${await res.text().catch(() => "")}`);
    const data = await res.json();
    text = data.choices?.[0]?.message?.content ?? "";
    inTok = data.usage?.prompt_tokens ?? 0;
    outTok = data.usage?.completion_tokens ?? 0;
    model = data.model ?? opts.model;
  } else {
    const r = await callMessages({ model: opts.model, system, messages: [{ role: "user", content: opts.user }], maxTokens: opts.maxTokens ?? 1024 });
    text = r.text;
    inTok = r.inTok;
    outTok = r.outTok;
    model = r.model;
  }

  let raw = text.trim();
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
  return { data: parsed, inTok, outTok, model };
}

// --- Tool-using agent loop -------------------------------------------------
export async function runAgent(opts: {
  model: string;
  system: string;
  userMessage: string;
  history?: Msg[];
  tools: Tool[];
  toolRunner: (name: string, input: Json) => Promise<string>;
  maxTurns?: number;
  maxTokens?: number;
}): Promise<{ text: string; inTok: number; outTok: number; model: string; toolCalls: string[] }> {
  const maxTurns = opts.maxTurns ?? 6;
  let inTok = 0;
  let outTok = 0;
  let model = opts.model;
  const toolCalls: string[] = [];

  if (provider() === "xai") {
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
        body: JSON.stringify({ model: opts.model, max_tokens: opts.maxTokens ?? 1024, messages, tools, tool_choice: "auto" }),
      });
      if (!res.ok) throw new Error(`xai ${res.status} ${await res.text().catch(() => "")}`);
      const data = await res.json();
      inTok += data.usage?.prompt_tokens ?? 0;
      outTok += data.usage?.completion_tokens ?? 0;
      model = data.model ?? model;
      const m = data.choices?.[0]?.message ?? {};
      const calls = m.tool_calls ?? [];
      if (calls.length === 0) {
        return { text: (m.content ?? "").trim(), inTok, outTok, model, toolCalls };
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
    return { text: "I couldn't complete that request. Please try rephrasing.", inTok, outTok, model, toolCalls };
  }

  // Anthropic tool-use loop
  const messages: Msg[] = [...(opts.history ?? []), { role: "user", content: opts.userMessage }];
  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: anthropicHeaders(),
      body: JSON.stringify({
        model: opts.model,
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
    model = data.model ?? model;
    messages.push({ role: "assistant", content: data.content });
    if (data.stop_reason !== "tool_use") {
      return { text: anthropicText(data.content), inTok, outTok, model, toolCalls };
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
  return { text: "I couldn't complete that request. Please try rephrasing.", inTok, outTok, model, toolCalls };
}
