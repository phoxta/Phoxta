/**
 * The bridge between the public homepage validator and the signed-in workflow.
 *
 * A visitor validates an idea on the marketing site without an account. That
 * sentence is the most valuable thing the public site produces, and it lives
 * only in their browser until they sign up — so it is parked here and read back
 * once they land in the dashboard, where it becomes a real idea seeded with what
 * they already wrote.
 *
 * Ported from the earlier Phoxta unchanged, including the storage key: anyone
 * who validated an idea before this rebuild and has not signed up yet still has
 * it sitting in localStorage, and renaming the key would throw that away.
 */

const STORAGE_KEY = "phoxta_pending_validated_idea";
const MIN_LENGTH = 10;
/** A week. Long enough to come back after thinking; short enough that a seed
 *  does not resurface months later attached to something forgotten. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export interface PendingValidatedIdea {
  ideaSeed: string;
  source: "homepage-validator";
  createdAt: string;
}

export function savePendingValidatedIdea(ideaSeed: string): void {
  const trimmed = ideaSeed.trim();
  if (trimmed.length < MIN_LENGTH) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ideaSeed: trimmed, source: "homepage-validator", createdAt: new Date().toISOString() }),
    );
  } catch {
    /* private browsing, or storage disabled — the validator still worked */
  }
}

export function readPendingValidatedIdea(): PendingValidatedIdea | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingValidatedIdea>;
    const ideaSeed = typeof parsed?.ideaSeed === "string" ? parsed.ideaSeed.trim() : "";
    if (ideaSeed.length < MIN_LENGTH) return null;

    const createdAt = typeof parsed.createdAt === "string" ? parsed.createdAt : "";
    const ts = createdAt ? Date.parse(createdAt) : NaN;
    if (!Number.isNaN(ts) && Date.now() - ts > MAX_AGE_MS) return null;

    return { ideaSeed, source: "homepage-validator", createdAt: createdAt || new Date().toISOString() };
  } catch {
    return null;
  }
}

export function clearPendingValidatedIdea(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
