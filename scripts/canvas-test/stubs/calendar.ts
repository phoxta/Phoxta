/* A month with enough on it to show the failure modes: a busy day that has to
   truncate, items of all three kinds, and things already out. */
export const kindLabel = (k: string) => ({ social: "Post", email: "Email", blog: "Article" }[k] ?? k);
export const kindHome = (k: string) => k;

const D = (day: number, h = 9, m = 0) => new Date(2026, 7, day, h, m).toISOString();

export async function listCalendar() {
  return { data: [
    { id: "1", kind: "social", title: "Three left in the oat linen", at: D(3, 9, 30), status: "queued", done: false, detail: "instagram, linkedin" },
    { id: "2", kind: "email", title: "August newsletter", at: D(5, 8), status: "sent", done: true, detail: "email · 412 recipients" },
    { id: "3", kind: "blog", title: "Caring for cashmere", at: D(5, 12), status: "published", done: true, detail: "The Team" },
    { id: "4", kind: "social", title: "Behind the counter this week", at: D(12, 17), status: "queued", done: false, detail: "instagram" },
    { id: "5", kind: "social", title: "New season edit is live", at: D(18, 10), status: "published", done: true, detail: "instagram, x" },
    { id: "6", kind: "email", title: "Bank holiday hours", at: D(18, 11), status: "scheduled", done: false, detail: "email" },
    { id: "7", kind: "blog", title: "Building a capsule wardrobe", at: D(18, 14), status: "draft", done: false, detail: "The Team" },
    { id: "8", kind: "social", title: "A fourth thing on a busy day", at: D(18, 16), status: "queued", done: false, detail: "linkedin" },
    { id: "9", kind: "social", title: "A fifth, to force the +more", at: D(18, 18), status: "queued", done: false, detail: "x" },
    { id: "10", kind: "email", title: "September preview", at: D(27, 7), status: "scheduled", done: false, detail: "email" },
  ], error: null };
}
export async function reschedule() { return { error: null }; }
