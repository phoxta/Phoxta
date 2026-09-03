// Does the voice refuse to publish things the business never said?
//
// Every case below is a defect a real run actually produced, in this order:
//   1. all 183 inbound customer messages read as the business's own writing
//   2. `list_blueprints` listed as "a word this business uses"
//   3. the owner's system prompt returned verbatim as an example of good copy
//   4. customer phrases invented for a business with no customer messages
//
// Run: npm run test:voice-guards
import { enforce, isIdentifier, looksInternal, OURS, THEIRS } from "../../supabase/functions/brand-voice/guards.ts";

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : ` — ${detail}`}`);
  if (!cond) failures++;
};

// ── which side is which ─────────────────────────────────────────────────
{
  check("the business's own roles are ours", OURS.includes("agent") && OURS.includes("human"));
  check("a customer is theirs", THEIRS.includes("customer"));
  // The original bug: `role !== "user"` swept `customer` onto the business's
  // side. The two lists must not overlap, or the same rows land on both.
  check("the sides do not overlap", !OURS.some((r) => THEIRS.includes(r)));
  check("an unknown role belongs to neither", !OURS.includes("bot") && !THEIRS.includes("bot"));
}

// ── identifiers ─────────────────────────────────────────────────────────
{
  check("snake_case is an identifier", isIdentifier("list_blueprints"));
  check("dotted names are identifiers", isIdentifier("social_posts.caption"));
  check("camelCase is an identifier", isIdentifier("orderItems"));
  check("an ordinary word is not", !isIdentifier("storefront"));
  check("an ordinary phrase is not", !isIdentifier("working demo"));
  check("a capitalised name is not", !isIdentifier("Phoxta"));
}

// ── prompt text posing as copy ──────────────────────────────────────────
{
  check(
    "a slab of system prompt is internal",
    looksInternal("You are the first person a prospect meets at Phoxta. Always call list_blueprints before pricing."),
  );
  check("an instruction is internal", looksInternal("Always call the tool before naming a price."));
  check("a real sentence is not", !looksInternal("Take orders on day one — the storefront is live the moment you buy."));
  check("empty text is not internal", !looksInternal(""));
}

// ── the whole sweep ─────────────────────────────────────────────────────
{
  const { spec, leaks } = enforce({
    proof: ["Trusted by thousands of happy customers"],
    lexicon: {
      weSay: ["working demo", "list_blueprints", "take orders on day one"],
      customerWords: [{ phrase: "Which businesses are for sale?", seenIn: "conversations" }],
    },
    personality: [
      { trait: "warm", meansInCopy: "Opens with a greeting and a real answer." },
      { trait: "rule-bound", meansInCopy: "You are the first person a prospect meets." },
    ],
    examples: [
      { context: "pricing", good: "Here's what's available now, with live demos you can explore.", bad: "Buy now!" },
      { context: "catalogue", good: "You are the first person a prospect meets. Always call list_blueprints.", bad: "x" },
    ],
  }, { reviews: 0, customerMessages: 12 });

  check("an unbacked claim is emptied", spec.proof.length === 0, JSON.stringify(spec.proof));
  check("the unbacked claim is reported", leaks.some((l) => l.includes("no reviews")), JSON.stringify(leaks));
  check("a tool name is not a word they use", !spec.lexicon.weSay.includes("list_blueprints"), JSON.stringify(spec.lexicon.weSay));
  check("real phrases survive", spec.lexicon.weSay.length === 2, JSON.stringify(spec.lexicon.weSay));
  check("a real customer phrase survives", spec.lexicon.customerWords.length === 1);
  check("a prompt-slab example is dropped", spec.examples.length === 1, JSON.stringify(spec.examples.map((e: {context: string}) => e.context)));
  check("the surviving example is the real one", spec.examples[0].context === "pricing");
  check("the dropped example is reported", leaks.includes("catalogue"), JSON.stringify(leaks));
  check("a trait quoting the prompt is dropped", spec.personality.length === 1, JSON.stringify(spec.personality));
}

// ── nothing to lift from means nothing lifted ───────────────────────────
{
  const { spec, leaks } = enforce({
    lexicon: { customerWords: [{ phrase: "Best service in town!", seenIn: "reviews" }] },
    proof: [],
  }, { reviews: 0, customerMessages: 0 });
  check("invented customer phrases are removed", spec.lexicon.customerWords.length === 0, JSON.stringify(spec.lexicon.customerWords));
  check("the invention is reported", leaks.some((l) => l.includes("no customer messages")), JSON.stringify(leaks));
}

// ── a business WITH reviews keeps its claims ────────────────────────────
{
  const { spec, leaks } = enforce({
    proof: ["Customers describe the fitting service as patient and unhurried"],
    lexicon: { customerWords: [{ phrase: "she never once rushed me", seenIn: "reviews" }] },
  }, { reviews: 18, customerMessages: 40 });
  check("a backed claim survives", spec.proof.length === 1, JSON.stringify(spec.proof));
  check("a real review phrase survives", spec.lexicon.customerWords.length === 1);
  check("nothing is reported when nothing was wrong", leaks.length === 0, JSON.stringify(leaks));
}

// ── a spec with nothing in it must not throw ────────────────────────────
{
  const { spec, leaks } = enforce({}, { reviews: 0, customerMessages: 0 });
  check("an empty spec survives", typeof spec === "object" && leaks.length === 0);
  const nulled = enforce(null, { reviews: 0, customerMessages: 0 });
  check("a null spec survives", typeof nulled.spec === "object");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
