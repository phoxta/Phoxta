// Phoxta — the rules the voice must satisfy, checked in code.
//
// Every rule here is also stated in brand-voice's prompt. These are the same
// rules again as code, because the ones worth having are the ones that hold on
// the run where the model ignores the prompt — and each was broken on a real
// run before it was checked here.
//
// Kept out of index.ts so a test can import them without starting a server.

// deno-lint-ignore no-explicit-any
type Json = any;

/**
 * WHICH SIDE OF THE CONVERSATION IS WHICH.
 *
 * Not a small detail: the first real run classified all 183 inbound customer
 * messages as the business's own writing, because the filter was `role !==
 * "user"` and this inbox uses `customer`. The described "voice" was therefore
 * partly its customers' and partly a vendor's marketing mail.
 *
 * Listed explicitly rather than by negation, so a role nobody anticipated
 * belongs to NEITHER side rather than silently joining whichever side the
 * comparison happened to fall on.
 */
export const OURS = ["agent", "assistant", "human", "staff", "owner", "operator"];
export const THEIRS = ["customer", "user", "contact", "lead"];

/** Tool names, columns, slugs: `list_blueprints`, `social_posts`, `orderItems`. */
export const isIdentifier = (w: string) =>
  /^[a-z0-9]+([_.][a-z0-9]+)+$/i.test(w.trim()) || /^[a-z]+[A-Z]/.test(w.trim());

/**
 * Does this text carry something that was never meant to be published?
 *
 * THE LEAK THIS EXISTS FOR. Asked for an example of good copy, the model
 * returned a verbatim slab of the owner's own system prompt — "You are the
 * first person a prospect meets… Always call list_blueprints before pricing
 * anything". Stored as an example, that is a sentence the writing stages are
 * told to imitate, and would eventually publish.
 *
 * The instructions a business gives its assistant are not its public voice, and
 * the two are similar enough that a model will not reliably tell them apart. So
 * the test is on the text rather than on the model's intent: a snake_case token
 * or a second-person instruction to an assistant is not copy, whatever it is
 * labelled as.
 */
export const looksInternal = (s: unknown): boolean => {
  const t = String(s ?? "");
  if (!t.trim()) return false;
  if (t.split(/[\s,.;:()"']+/).some((w) => w.length > 3 && isIdentifier(w))) return true;
  return /\b(you are the|always call|never call|reply with json|do not invent|return json|system prompt|WHAT WE SELL)\b/i.test(t);
};

/**
 * Apply every rule, and say what was removed.
 *
 * `reviews` and `customerMessages` are counts of what was actually read, not
 * what the model claims to have read — a claim backed by nothing is exactly
 * what these rules exist to catch.
 */
export function enforce(
  spec: Json,
  read: { reviews: number; customerMessages: number },
): { spec: Json; leaks: string[] } {
  const leaks: string[] = [];
  if (!spec || typeof spec !== "object") return { spec: {}, leaks };

  // A claim with no reviews behind it is not this business's to make.
  if (!read.reviews) {
    if (Array.isArray(spec.proof) && spec.proof.length) leaks.push("claims about itself, with no reviews to support them");
    spec.proof = [];
  }

  // Nothing to lift from means nothing lifted. Without this the model fills the
  // field with plausible-sounding phrases nobody actually said — the exact
  // opposite of what the field is for.
  if (spec.lexicon && !read.customerMessages && !read.reviews) {
    if (Array.isArray(spec.lexicon.customerWords) && spec.lexicon.customerWords.length) {
      leaks.push("customer phrases, with no customer messages to lift them from");
    }
    spec.lexicon.customerWords = [];
  }

  if (Array.isArray(spec?.lexicon?.weSay)) {
    spec.lexicon.weSay = spec.lexicon.weSay
      .filter((w: unknown) => typeof w === "string" && !isIdentifier(w));
  }
  if (Array.isArray(spec?.lexicon?.customerWords)) {
    spec.lexicon.customerWords = spec.lexicon.customerWords
      .filter((c: Json) => !looksInternal(c?.phrase));
  }

  // Dropped rather than cleaned: a half-scrubbed instruction still reads as an
  // instruction, and this is the field the writing stages imitate most closely.
  if (Array.isArray(spec.examples)) {
    spec.examples = spec.examples.filter((e: Json) => {
      const bad = looksInternal(e?.good) || looksInternal(e?.bad);
      if (bad) leaks.push(String(e?.context ?? "an example"));
      return !bad;
    });
  }
  if (Array.isArray(spec.personality)) {
    spec.personality = spec.personality.filter((p: Json) => !looksInternal(p?.meansInCopy));
  }

  return { spec, leaks };
}
