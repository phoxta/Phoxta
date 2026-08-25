// Phoxta — the AI & technology editorial set, surfaced on /ai-tech and /blog.
//
// These four pieces back the article cards on the /ai-tech page (index-4
// Section8) with real, readable content. They follow the same house voice as
// src/data/articles.ts: calm, concrete, operator-focused — written for people
// who run businesses on this stack, not for researchers.
//
// Type-only import: the aggregate file (src/data/articles.ts) imports this
// file's value, so a value import here would be circular.

import type { Article } from "@/data/articles";

export const AI_ARTICLES: Article[] = [
    {
        slug: "what-agentic-ai-can-do-in-production",
        title: "What agentic AI can actually do in production",
        excerpt:
            "The gap between an agent demo and an agent in production is the gap between talking and doing. An honest inventory of what holds up when real money and real customers are on the line.",
        category: "tear-downs",
        img: "/assets/imgs/pages/img-97.webp",
        hero: "/assets/imgs/pages/img-101.webp",
        author: "Phoxta",
        date: "July 3, 2026",
        iso: "2026-07-03",
        readMinutes: 9,
        body: [
            {
                kind: "lead",
                text: "Every agent demo looks the same: a model plans, calls a few tools, and finishes a task while the audience applauds. Production looks different, because production has customers, money and consequences. This is an inventory of what agentic AI genuinely does well in live businesses in 2026 — and the machinery that has to surround it before it is safe to leave running.",
            },
            {
                kind: "p",
                text: "\"Agentic\" means one specific thing worth holding onto: the model does not just answer, it acts — it reads state, calls tools, and changes something in the world. That single step from talking to doing is where all the value and all the risk live, so it is where the engineering effort belongs.",
            },
            { kind: "h", text: "Reading is solved; writing is where it gets serious" },
            {
                kind: "p",
                text: "Give an agent read access to real state — orders, bookings, stock, a customer's own history — and it becomes reliably useful almost immediately. \"Where is my order\" answered with the actual tracking status, at any hour, on whatever channel the customer used, is the workhorse of agentic AI in commerce. It is unglamorous, high-volume, and it works because the agent is reporting facts it can see rather than generating plausible ones.",
            },
            {
                kind: "duo",
                left: {
                    h: "Read tools",
                    p: "Look up an order, check availability, quote a policy as written, summarise a conversation. Low blast radius: the worst outcome of a bad read is a wrong sentence, which the next message can correct.",
                },
                right: {
                    h: "Write tools",
                    p: "Issue a refund, move a booking, change an address, cancel an order. High blast radius: a wrong write moves money or breaks a promise, and no follow-up message un-moves it.",
                },
            },
            {
                kind: "p",
                text: "The systems that survive contact with production treat those two categories completely differently. Reads are given freely. Writes are governed: each kind of action is individually set to off, approve-first, or automatic, and the setting is a business decision made by the owner, not a default made by the vendor.",
            },
            { kind: "h", text: "The approval gate is the technology" },
            {
                kind: "p",
                text: "The most important component in a production agent is not the model. It is the queue between the agent's intention and the action's execution. When an overnight customer asks for a refund, the agent should be able to gather the order, check the policy, draft the resolution — and then park it in an approval queue with the full conversation attached, for a human to release with one tap in the morning. That pattern gets you most of the labour saving with almost none of the risk, and it is how trust is earned before any action graduates to automatic.",
            },
            {
                kind: "table",
                caption: "A sensible starting policy for agent write-actions. Loosen with evidence, not optimism.",
                head: ["Action", "Sensible default", "When to graduate to automatic"],
                rows: [
                    ["Answer from real order or booking state", "Automatic", "Day one — it is a read"],
                    ["Send a reply on the customer's channel", "Automatic", "Day one, with escalation rules"],
                    ["Move or amend a booking", "Approve-first", "After weeks of clean approvals"],
                    ["Issue a refund under a set amount", "Approve-first", "Small amounts, clear policy, audited"],
                    ["Change prices or delete records", "Off", "Rarely, if ever"],
                ],
            },
            { kind: "h", text: "How production agents actually fail" },
            {
                kind: "p",
                text: "The failure modes are by now well-catalogued, and none of them are exotic. An agent calls the right tool with the wrong argument — the correct customer, the wrong order. It answers from stale context because the underlying record changed mid-conversation. It loops, retrying a failing tool with growing confidence. Or it does the most human thing of all: states something false, fluently, because nothing in its context contradicted it.",
            },
            {
                kind: "list",
                items: [
                    "Wrong-argument tool calls — caught by validation on the tool side, never by trusting the model's formatting.",
                    "Stale reads — caught by fetching state at answer time rather than conversation start.",
                    "Loops and runaway sessions — caught by hard caps on steps, spend and time per conversation.",
                    "Confident wrongness — caught by grounding answers in retrieved records and policies, and escalating when nothing grounds.",
                ],
            },
            {
                kind: "p",
                text: "Notice that every one of those catches is boring infrastructure: validation, caps, logging, escalation. Production agentic AI is roughly one part model and three parts plumbing, and teams that resent the plumbing ship the incidents.",
            },
            {
                kind: "quote",
                text: "An agent you cannot audit is not an employee. It is a liability with an API key.",
            },
            { kind: "h", text: "What this looks like when you buy it rather than build it" },
            {
                kind: "p",
                text: "This is the architecture every Phoxta business ships with, because it is the only shape we trust in production. The customer-facing agent answers on web chat, SMS, WhatsApp and email with the real order and booking state behind it. The owner's Operator agent can act — but only through governed write-tools, with per-action policies, an approval queue, and an audit trail that records what was done and why. The exciting part of agentic AI is the acting. The trustworthy part is everything wrapped around it.",
            },
            {
                kind: "p",
                text: "If you are evaluating any agent product, ask three questions: what can it write to, who approves, and where is the log. Vendors with good answers will show you screens. Vendors without them will show you demos.",
            },
        ],
    },
    {
        slug: "building-reliable-rag-on-your-own-data",
        title: "Building reliable RAG systems on your own data",
        excerpt:
            "Retrieval-augmented generation fails quietly: the model answers fluently from the wrong context. The reliability work is almost entirely on the retrieval side — here is where it actually goes.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-98.webp",
        hero: "/assets/imgs/pages/img-104.webp",
        author: "Phoxta",
        date: "July 8, 2026",
        iso: "2026-07-08",
        readMinutes: 10,
        body: [
            {
                kind: "lead",
                text: "RAG — retrieving your own documents and handing the relevant pieces to a model at answer time — remains the workhorse technique for making AI answer from your business rather than from the internet's average opinion. It is also the technique with the widest gap between a demo and a dependable system, because RAG fails politely: the model answers fluently either way, and only the customer knows the answer came from the wrong paragraph.",
            },
            {
                kind: "p",
                text: "The uncomfortable rule of thumb: in a struggling RAG system, the model is almost never the problem. Retrieval is. If the right passage is in the context, current models will use it well; if the wrong passage is retrieved, no amount of prompting rescues the answer. So the reliability budget belongs upstream.",
            },
            { kind: "h", text: "Your data is worse than you think" },
            {
                kind: "p",
                text: "Every RAG project begins with the discovery that the business's knowledge is not a tidy corpus. It is a returns policy in three versions, a price list that contradicts the website, an FAQ written before the product changed, and tribal knowledge that was never written down at all. Indexing that pile faithfully gives you a system that faithfully retrieves contradictions.",
            },
            {
                kind: "list",
                items: [
                    "Nominate one canonical source per topic — one returns policy, one shipping table, one allergen list — and index only the canonical version.",
                    "Delete or exclude superseded documents rather than hoping retrieval ranks the new one higher. Hope is not a ranking function.",
                    "Write down the unwritten answers. The questions customers actually ask are in your inbox; the top twenty deserve a canonical paragraph each.",
                    "Date-stamp everything, so freshness can be a retrieval signal rather than a mystery.",
                ],
            },
            { kind: "h", text: "Chunk by meaning, not by size" },
            {
                kind: "p",
                text: "Documents are indexed in chunks, and chunking is where retrieval quality is quietly decided. Split a refund policy mid-clause and the retrieved fragment says \"within 30 days\" without saying of what; the model then completes the thought on its own. The rule: a chunk should be a self-contained answer to some question — a whole policy clause, a whole product description, a whole FAQ pair — with enough header context attached that it still makes sense when it arrives alone.",
            },
            {
                kind: "duo",
                left: {
                    h: "Retrieval evals, run separately",
                    p: "Build a set of golden questions — real customer phrasing, not tidy test phrasing — each mapped to the passage that should be retrieved. Score retrieval on its own: was the right chunk in the top results? This isolates the layer that is actually failing.",
                },
                right: {
                    h: "Answer evals, run end-to-end",
                    p: "Then score final answers against what the business would say — correct, grounded, and honest about gaps. An answer eval without a retrieval eval tells you something is wrong; the pair tells you where.",
                },
            },
            {
                kind: "p",
                text: "Fifty golden questions maintained honestly beat five thousand generated ones. Run them on every change — new documents, new chunking, new embedding model — because RAG regressions are silent by nature, and the eval set is the only smoke alarm you get.",
            },
            { kind: "h", text: "Freshness is a feature, staleness is an incident" },
            {
                kind: "p",
                text: "A RAG system is a cache of your business, and caches go stale. The product sold out this morning; the delivery cutoff moved for the holiday; the price changed at noon. An agent quoting yesterday's truth with today's confidence is worse than one that says it does not know, because the customer has no way to tell the difference.",
            },
            {
                kind: "p",
                text: "Two practices cover most of it. First, re-embed on change: when a document, product or policy is edited, its chunks are re-indexed then, not on a weekly schedule. Second, split facts from prose: volatile state — stock, prices, order status, availability — should never live in the document index at all. It belongs behind live lookups, fetched at answer time, so the document layer only ever holds the slow-moving truth.",
            },
            {
                kind: "quote",
                text: "Retrieval-augmented generation is a supply chain. The model is the last mile, and the last mile cannot fix what the warehouse shipped.",
            },
            { kind: "h", text: "How this ships in a Phoxta business" },
            {
                kind: "p",
                text: "Every Phoxta storefront runs this architecture per tenant. Each business's agent retrieves from that business's own knowledge — its policies, its product catalogue, its written answers — and never from a neighbouring tenant's. Volatile state comes from live reads of the actual order, booking and inventory records rather than from the index. Editing knowledge in the console re-indexes it, so the agent's answers move when the business moves.",
            },
            {
                kind: "p",
                text: "And one honest limit to end on: RAG makes a model answer from your documents. It cannot make your documents agree with each other, and it cannot answer questions your business has never written down. The systems that feel intelligent are the ones sitting on knowledge someone curated — which is a job for an owner, not a model.",
            },
        ],
    },
    {
        slug: "agentops-monitoring-and-guardrails",
        title: "AgentOps: monitoring and guardrails for AI in production",
        excerpt:
            "Shipping an agent is the easy half. Knowing what it did, what it spent, and what it almost did wrong is the discipline that makes it safe to keep running — a practical tour of AgentOps for operators.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-99.webp",
        hero: "/assets/imgs/pages/img-107.webp",
        author: "Phoxta",
        date: "July 12, 2026",
        iso: "2026-07-12",
        readMinutes: 9,
        body: [
            {
                kind: "lead",
                text: "There is a moment in every AI deployment when the demo is over, the agent is live, and someone asks a very ordinary question: what did it do yesterday? If the honest answer is \"we are not entirely sure\", you do not have an operations problem — you have an operations absence. AgentOps is the unglamorous discipline of being sure.",
            },
            {
                kind: "p",
                text: "The good news for business operators: this is not research. The practices are settled, they are mostly borrowed from twenty years of running ordinary software, and the right time to adopt them is before the first incident rather than after it.",
            },
            { kind: "h", text: "Tracing: every conversation is a flight recorder" },
            {
                kind: "p",
                text: "The unit of observability for an agent is the trace: the full record of one conversation — what the customer said, what the agent retrieved, which tools it called with which arguments, what came back, and what it finally did or said. When a customer disputes an outcome, the trace is the difference between an answer and an argument. When behaviour drifts after a model or prompt change, traces are how you see it before your customers describe it to you.",
            },
            {
                kind: "list",
                items: [
                    "Log every tool call with its arguments and result — the actions matter more than the words.",
                    "Keep traces reviewable by a human in one screen; a trace nobody reads is storage, not observability.",
                    "Sample and review a handful of ordinary conversations weekly, not just the escalations — drift starts in the ordinary ones.",
                    "Record why an action was allowed: which policy setting, whose approval. Auditors and refund disputes both ask this question.",
                ],
            },
            { kind: "h", text: "Guardrails live at three layers" },
            {
                kind: "p",
                text: "Input guardrails decide what reaches the agent: rate limits, spam filtering, and treating retrieved or customer-supplied text as data rather than instructions — the standing defence against prompt injection. Output guardrails decide what leaves: no invented discounts, no promises the policy does not make, escalate when ungrounded. Action guardrails are the layer that matters most and is skipped most: per-action write policies, amount thresholds, and an approval queue between intention and execution.",
            },
            {
                kind: "duo",
                left: {
                    h: "Cost budgets",
                    p: "Token spend is a real line item and an early-warning signal at once. Meter usage per conversation and per tenant, cap the runaway cases, and alert on the trend — a cost spike is usually a loop, a prompt regression or an attack, discovered by the finance graph.",
                },
                right: {
                    h: "Latency budgets",
                    p: "A brilliant answer in ninety seconds is an abandoned chat. Set a budget per reply, measure the slowest tenth rather than the average, and spend the budget deliberately — retrieval, tool calls and drafting all bill against the same clock.",
                },
            },
            { kind: "h", text: "Red-team your own agent before someone else does" },
            {
                kind: "p",
                text: "Every public-facing agent gets probed — for free merchandise, for other customers' data, for a jailbreak that makes a screenshot. Run the attacks yourself first, calmly and on a schedule: ask it to reveal another customer's order, instruct it to ignore its rules inside a pasted \"policy\", talk it toward a refund it should not grant. Each attempt that fails is a regression test; each one that succeeds is a fix you got to make privately.",
            },
            {
                kind: "table",
                caption: "A minimum viable AgentOps dashboard — the numbers that catch trouble early.",
                head: ["Signal", "Watch for", "What it usually means"],
                rows: [
                    ["First-response time, whole clock", "Creeping upward", "Tool or retrieval latency, not the model"],
                    ["Resolution without human handoff", "Sudden drops", "A knowledge gap or a broken tool"],
                    ["Escalations and approvals per day", "Spikes", "New question pattern, or a policy set too tight"],
                    ["Cost per conversation", "Outliers and trend", "Loops, prompt bloat, or abuse"],
                    ["Actions taken, by type", "Anything unexpected", "The report you read before it becomes an incident"],
                ],
            },
            {
                kind: "quote",
                text: "You would not employ a person whose work you never reviewed, whose spending you never saw, and whose decisions left no record. An agent deserves the same management, minus the awkward conversations.",
            },
            { kind: "h", text: "What this looks like on a Phoxta business" },
            {
                kind: "p",
                text: "We ship this discipline as standard equipment because operators should not have to assemble it. Every agent conversation on a Phoxta storefront is a reviewable record; every write-action goes through the governed policy layer — off, approve-first, or automatic, per action — with the approval queue and audit trail attached; token usage is metered per business, so the cost of the agent is a number on a page rather than a surprise on an invoice.",
            },
            {
                kind: "p",
                text: "The pattern to hold onto: autonomy is not a switch, it is a dial, and observability is what earns each turn of it. Agents graduate from approve-first to automatic on evidence — weeks of clean traces, not weeks of good luck.",
            },
        ],
    },
    {
        slug: "choosing-the-right-llm-for-your-use-case",
        title: "Choosing the right LLM for your use case",
        excerpt:
            "Model choice is not one decision — it is a routing policy. How capability tiers, latency, context and cost actually trade off in 2026, and why small models win more jobs than their reputation suggests.",
        category: "tear-downs",
        img: "/assets/imgs/pages/img-100.webp",
        hero: "/assets/imgs/pages/img-113.webp",
        author: "Phoxta",
        date: "July 17, 2026",
        iso: "2026-07-17",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "The question \"which LLM should we use\" contains a wrong assumption: that a business uses one. In practice a production system is a set of jobs — routing, extraction, drafting, reasoning — and the honest answer is a routing policy: which tier of model handles which job, and what evidence would change the assignment. Framed that way, most of the decision makes itself.",
            },
            {
                kind: "p",
                text: "The market in 2026 has settled into recognisable tiers, whatever the logos on them. What follows deliberately avoids naming models — the leaderboard changes quarterly, but the shape of the trade-off has been stable for years and is the part worth learning.",
            },
            { kind: "h", text: "The tiers, and what they are actually for" },
            {
                kind: "table",
                caption: "Capability tiers as they trade off in practice. Costs are relative, not quoted — the ratios are the stable part.",
                head: ["Tier", "Best at", "Latency", "Relative cost", "Typical jobs"],
                rows: [
                    ["Small / fast", "Classification, routing, extraction", "Sub-second", "1×", "Intent detection, tagging, form-filling"],
                    ["Mid-tier", "Grounded drafting and conversation", "1–3 s", "5–15×", "Customer replies, summaries, RAG answers"],
                    ["Frontier", "Multi-step reasoning, tool orchestration", "3–10 s+", "30–100×", "Agent planning, hard escalations, analysis"],
                ],
            },
            {
                kind: "p",
                text: "The instinct to reach for the frontier tier for everything is the most expensive habit in applied AI. Frontier models are remarkable at the hardest step of a workflow — and indistinguishable from mid-tier models on the easy steps, except on the invoice and the stopwatch.",
            },
            { kind: "h", text: "When small models win" },
            {
                kind: "p",
                text: "A surprising share of real workload is not generation at all. It is deciding: which mailbox does this message belong in, is this a refund request, what is the order number in this sentence, is this conversation angry. These are classification and extraction jobs, they run thousands of times a day, and a small model does them in a few hundred milliseconds at a fraction of the cost — often more consistently than a large model, which is tempted to editorialise.",
            },
            {
                kind: "list",
                items: [
                    "High-volume, low-ambiguity, checkable output — the small-model sweet spot.",
                    "Anything on the critical latency path, where the customer is watching a typing indicator.",
                    "Structured output jobs, where the schema does the thinking and the model does the filling.",
                    "First-pass triage, with the genuinely hard cases routed up a tier — the cascade pattern.",
                ],
            },
            {
                kind: "duo",
                left: {
                    h: "Latency is a product feature",
                    p: "Chat feels broken beyond a few seconds; voice is unusable beyond one. Latency budgets, not benchmark scores, disqualify most models for most interactive jobs — which is a reason to route, not a reason to compromise on the hard steps.",
                },
                right: {
                    h: "Context is not memory",
                    p: "Million-token windows tempt you to shovel everything in. Retrieval that selects the right two thousand tokens beats a full window on cost, speed and, frequently, accuracy — attention is not evenly spread across a haystack.",
                },
            },
            { kind: "h", text: "Switching is cheap if you built for it" },
            {
                kind: "p",
                text: "Model choice is a decision you will make repeatedly, because the market moves under you. Two practices keep it cheap. Keep the plumbing model-agnostic, so a model is a configuration entry rather than an architecture. And keep an eval set — your own questions, your own tone, your own edge cases — so that when a new model ships, the evaluation is an afternoon against your yardstick rather than a fortnight against a press release.",
            },
            {
                kind: "quote",
                text: "Benchmarks tell you what a model can do. Only your own evals tell you what it will do with your customers, your policies and your worst Tuesday.",
            },
            { kind: "h", text: "How Phoxta routes, and why you mostly should not care" },
            {
                kind: "p",
                text: "Phoxta businesses run exactly this portfolio pattern under the hood: fast models on classification and routing, stronger models on customer-facing answers and on the Operator agent's multi-step work, with retrieval keeping context small and token usage metered per business so cost stays a visible number. Owners never pick a model, and that is the point — model selection is an operations decision that should be made once, measured continuously, and revised quietly.",
            },
            {
                kind: "p",
                text: "If you are making the choice for your own stack, resist ending the meeting with a model name. End it with a routing table, a latency budget and an eval set. The name in each row will change; the rows will not.",
            },
        ],
    },
];
