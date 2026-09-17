# The companion — how Wàfè's AI works

Wàfè has one AI surface: the **companion**. It is not a chatbot bolted on the
side; it is the same voice everywhere in the app — the morning briefing, the
"ask" box, the lesson plan drawn from a video, the meal plan inside the budget,
the packing list, the song, the storyboard. Every one of those is a single
call to the `wafe-ai` edge function (`supabase/functions/wafe-ai/index.ts`)
with an `action`, made through `useAi()` in `src/lib/ai.ts`.

## What it does

| action          | tier     | returns                                                                                   |
| --------------- | -------- | ----------------------------------------------------------------------------------------- |
| `ask`           | balanced | a plain-text answer to a question about the family, from the grounding only               |
| `briefing`      | balanced | a 120–180 word morning/evening briefing for the asking member                             |
| `reflect`       | balanced | `{ questions[3], summary }` — an evening reflection                                       |
| `summarize`     | balanced | `{ takeaways[5–7], actions[3], discussion[3], forKids? }` for a video, article or chapter |
| `learning-plan` | balanced | `{ title, objective, steps[{title, minutes, activity}], checkQuestions[] }`               |
| `book-course`   | complex  | a 4-week course: `{ title, weeks[{week, theme, chapters, assignment, discussion, quiz}] }` |
| `suggest-tasks` | balanced | `{ tasks[{title, memberId|null, dueInDays, points?, note}] }` — 5–8, chores with points    |
| `meal-plan`     | balanced | `{ days[], grocery[{item, qty, estCents}], totalCents, note }` inside the budget           |
| `packing`       | cheap    | `{ lists[{memberName, items[]}], checklist[] }` per travelling member                      |
| `outfit`        | cheap    | `{ itemIds[], why }` — only ids that exist in the closet                                   |
| `song`          | balanced | `{ title, key, tempo, structure[{section, chords, lyrics}] }`; `text` is the full lyrics   |
| `storyboard`    | balanced | `{ title, scenes[{n, caption, visual, narration}] }` — six scenes by default               |
| `image`         | complex  | `{ url }` of a generated picture, or `unavailable` when the plan does not allow it        |

Tiers map to models through `_shared/models.ts`, so the companion never names
a model; the operator's provider choice and failover apply to it like every
other feature. Text actions use `callMessages`; every structured action uses
`callJson` with a strict shape in the system prompt, and the result is
**clamped before it leaves the function** — arrays cut to their documented
length, strings trimmed, integers bounded, ids checked against what the screen
sent (an outfit can only reference closet items; a task can only be assigned
to a member in the payload). A reply that cannot be parsed is a `502` with
"The companion couldn't produce that. Try again." — never a stack trace.

The UI contract (`AiResult`): `{ text, data?, model?, unavailable? }`. A `429`
or `402` becomes `unavailable` on the client and is shown inline; nothing
throws at the person.

## How grounding stays role-safe

The companion **knows only what it is told**, and what it is told is assembled
on the client by `useData().aiGrounding()`: one compact summary per module
(`aiContext(state, ctx)`, ≤ 1,500 chars each) on top of the space's name,
values, mission and members. Each module writes its summary from a state that
was already filtered for the asking member, so a child's grounding simply does
not contain the budget, and a guest's does not contain the goals. The function
caps the grounding at 12,000 characters and any `extraContext` at 3,000.

Three further guards live in the function itself:

1. **The role is never trusted from the body for a signed-in caller.** The
   function verifies the JWT, finds the caller's `wf_members` row for
   `spaceId`, and takes the role (and billing organisation) from that row.
   Only the demo — which has no account and nothing private — honours
   `body.role`, and even there a role that says child gets child semantics and
   an unknown role gets guest.
2. **Role rules in the system prompt.** Parents may hear everything. A child
   gets short, encouraging, age-appropriate wording and is never told about
   money or private matters even when asked ("a parent can help with that").
   A guest hears only about the shared calendar, travel and the prayer wall.
   The briefing's budget note is only requested for parents.
3. **Role gates on the actions.** A guest may use `ask`, `briefing`,
   `reflect`, `packing`, `song`, `storyboard` and `image` only; a child cannot
   run `meal-plan` (it is a budget exercise). Anything else is a `403`, so the
   rules cannot be bypassed by hand-crafting a request the UI would never make.

The shared persona is warm, concrete, brief, British English, and
faith-friendly — the family may keep Bible study and prayer, and the companion
speaks of it naturally, never preaches.

## Metering and the monthly cap

Every call is metered into `ai_usage` with feature `wafe-<action>`, the
tier, the model actually used, tokens in/out (plus cache tokens), latency and a
status (`ok`, `failed` for an unparseable reply, `unavailable` for a blocked
image). Before the model is called, `assertWithinCap` checks the billing
organisation's monthly allowance; over the cap the function answers `429`
`{ error, limitReached: true }` with the platform's shared wording, and the
client shows it as `unavailable`.

Who is billed:

- a signed-in member → the `organization_id` on their `wf_members` row;
- the demo → the organisation with slug `wafe-demo`. If that does not exist
  yet the function falls back to slug `phoxta`, then to the oldest
  organisation, and logs a warning each time — a fallback that runs for months
  is a misconfiguration nobody noticed.

## The demo allowance

The demo (`body.demo === true`, no session) runs the Adeyemi family in the
browser and still reaches the real companion, so a stranger touring the demo
can feel it. To keep that from becoming a free API, demo calls are limited to
**40 per hour per address**, keyed on `hashIp(req)` (a salted hash — the
function never stores an address). The ledger is a tiny table,
`wf_ai_demo_calls (id, ip_hash, action, at)`, with RLS on and no policies (the
service role only). It is created lazily over `SUPABASE_DB_URL` the first time
the count fails on a missing relation, the same way `demo-access` bootstraps
its schema, because `supabase db push` is not available in this environment.
The row is written **before** the model call so a failing call still counts.
Over the limit the demo gets a friendly `429` inviting them to sign up.

## The image path

`image` is the one action that does not go through the shared text client.
It calls Gemini's image model directly over REST
(`gemini-2.5-flash-image:generateContent` with
`responseModalities: ["IMAGE","TEXT"]`, using `GEMINI_API_KEY`), decodes the
`inlineData` part, uploads it with the admin client to the public `catalog`
bucket at `wafe/<spaceId>/<uuid>.<ext>`, and returns the public URL.

Any failure on the model side — no key, a `429` because the key's prepaid
credits are depleted (the state at the time of writing), a `5xx`, a response
with no image — is **not** an error: the function returns `200`
`{ text: "", unavailable: "Image generation isn't available on this plan yet." }`
and the screen shows that line. The call is still metered (tier `complex`,
zero tokens, the latency) so the attempt is visible. Only a failed upload to
storage is a real `500`, because at that point the picture exists and losing
it is our fault. A child's prompt is prefixed with a gentle, child-friendly
illustration guide.

## Deploying

The function is a plain Supabase edge function; `verify_jwt` must be **false**
for it in `supabase/config.toml` (the demo calls it with the anon key, and
the function verifies members itself with `requireUser`). Deploy with
`supabase functions deploy wafe-ai` — and never pass `--no-verify-jwt`
(see the memory note on `verify_jwt`). Required secrets: the usual provider
keys (`GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `XAI_API_KEY`, per
`_shared/models.ts`), `SUPABASE_DB_URL` for the demo ledger bootstrap, and
`CRON_SECRET` as the salt for `hashIp`.
