// What actually goes out on each platform.
//
// This is the last piece of code between a stored value and a public post under
// a business's name, and the column it reads has held two shapes: finished text
// per platform (what the scheduler writes) and { caption, hashtags } objects
// (what the planner wrote before the column settled). Rows in BOTH shapes are
// in the production database right now, and social_posts is SELECT-only under
// RLS, so they cannot be normalised from the client — the reader has to cope.
//
// A plain String() on the object shape publishes the literal text
// "[object Object]".
//
// Run: npm run test:caption-for
import { captionFor } from "../../supabase/functions/_shared/social.ts";

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : ` — ${detail}`}`);
  if (!cond) failures++;
};

// ── the shape the scheduler writes ──────────────────────────────────────
{
  const post = { caption: "generic", captions: { instagram: "the instagram one", x: "the short one" } };
  check("per-platform text is used", captionFor(post, "instagram") === "the instagram one");
  check("each platform gets its own", captionFor(post, "x") === "the short one");
  check("a platform with none falls back", captionFor(post, "linkedin") === "generic");
}

// ── the shape the planner wrote ─────────────────────────────────────────
{
  const post = {
    caption: "generic",
    captions: { instagram: { caption: "Three left in the oat linen", hashtags: ["linen", "#slowfashion"] } },
  };
  const out = captionFor(post, "instagram");
  check("the object shape is read, not coerced", !out.includes("[object Object]"), out);
  check("its caption survives", out.startsWith("Three left in the oat linen"), out);
  check("a bare tag gets its hash", out.includes("#linen"), out);
  check("an already-hashed tag is not double-hashed", !out.includes("##"), out);
  check("tags follow a blank line", out === "Three left in the oat linen\n\n#linen #slowfashion", JSON.stringify(out));
}

// ── the object shape with nothing usable in it ──────────────────────────
{
  check(
    "an object with no caption falls back",
    captionFor({ caption: "generic", captions: { x: { hashtags: ["#a"] } } }, "x") === "generic",
  );
  check(
    "an empty caption falls back",
    captionFor({ caption: "generic", captions: { x: { caption: "   " } } }, "x") === "generic",
  );
  check(
    "an object with no tags is just the caption",
    captionFor({ caption: "g", captions: { x: { caption: "just this" } } }, "x") === "just this",
  );
}

// ── everything that came before this column existed ─────────────────────
{
  check("no captions at all", captionFor({ caption: "the only one" }, "instagram") === "the only one");
  check("a null captions column", captionFor({ caption: "the only one", captions: null }, "x") === "the only one");
  check("an empty captions object", captionFor({ caption: "the only one", captions: {} }, "x") === "the only one");
  check("an empty per-platform string falls back", captionFor({ caption: "fallback", captions: { x: "" } }, "x") === "fallback");
  check("a whitespace-only string falls back", captionFor({ caption: "fallback", captions: { x: "  " } }, "x") === "fallback");
}

// ── nothing at all must not throw ───────────────────────────────────────
{
  check("a null post yields empty", captionFor(null, "x") === "");
  check("an undefined post yields empty", captionFor(undefined, "x") === "");
  check("a post with no caption yields empty", captionFor({}, "x") === "");
  // A post whose caption is null must not publish the string "null".
  check("a null caption yields empty", captionFor({ caption: null }, "x") === "");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
