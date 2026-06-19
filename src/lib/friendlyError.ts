/**
 * Map raw Supabase/Postgres/network errors to safe, human messages.
 * The UI should always display friendlyError(rawMessage), never the raw text.
 */
export function friendlyError(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.toLowerCase();

  // Stale / invalid session (e.g. user id not present in this project's auth.users).
  // Match session phrases precisely so unrelated errors aren't mislabeled.
  if (
    m.includes("foreign key") ||
    m.includes("fkey") ||
    m.includes("jwt") ||
    m.includes("invalid token") ||
    m.includes("auth session") ||
    m.includes("session missing") ||
    m.includes("session expired") ||
    m.includes("session not found")
  ) {
    return "Your session has expired. Please sign in again.";
  }
  // Auth specifics worth keeping helpful
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox.";
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with that email already exists. Try signing in.";
  }
  if (m.includes("password should be") || m.includes("at least")) return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  // Permissions
  if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized")) {
    return "You don't have permission to do that.";
  }
  if (m.includes("duplicate key") || m.includes("already exists")) return "That already exists.";
  // Connectivity / setup
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (m.includes("does not exist") || m.includes("schema cache") || m.includes("relation")) {
    return "We're getting things ready. Please try again shortly.";
  }
  // Default — never leak internals
  return "Something went wrong. Please try again.";
}
