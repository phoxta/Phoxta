/** Formatting and small pure helpers shared across pages. */

export const initials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");

export type Hue = "lilac" | "sky" | "peach" | "rose" | "mint" | "plum";
const HUES: Hue[] = ["lilac", "sky", "peach", "rose", "mint", "plum"];

/** A stable tint for a name — the design system's "chosen deterministically". */
export function hueFor(name: string): Hue {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return HUES[h % HUES.length];
}

export function greeting(d = new Date()): string {
    const h = d.getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Night owl";
}

/** 4700 → "1h 18m", 540 → "9m", 42 → "42s". */
export function duration(sec: number): string {
    if (sec < 60) return `${Math.round(sec)}s`;
    const m = Math.round(sec / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
}

/** 125 → "2:05", 3725 → "1:02:05" — the player clock. */
export function clock(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const mm = h ? String(m).padStart(2, "0") : String(m);
    return `${h ? h + ":" : ""}${mm}:${String(r).padStart(2, "0")}`;
}

export const shortDate = (iso: string | Date): string =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const longDate = (iso: string | Date): string =>
    new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const time = (iso: string | Date): string =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** "2m ago", "3h ago", "yesterday", "12 Aug". */
export function relative(iso: string | Date, now = Date.now()): string {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, now - t);
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return "yesterday";
    if (d < 7) return `${d}d ago`;
    return shortDate(iso);
}

/** Due-date wording for tasks: "Due today", "Due tomorrow", "Overdue · 2d", "Due 14 Sep". */
export function dueLabel(iso: string, now = new Date()): { text: string; tone: "danger" | "warn" | "muted" } {
    const due = new Date(iso);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const days = Math.round((startDue - startToday) / 86400000);
    if (days < 0) return { text: `Overdue · ${-days}d`, tone: "danger" };
    if (days === 0) return { text: "Due today", tone: "warn" };
    if (days === 1) return { text: "Due tomorrow", tone: "warn" };
    if (days < 7) return { text: `Due in ${days}d`, tone: "muted" };
    return { text: `Due ${shortDate(iso)}`, tone: "muted" };
}

/** Local calendar day key, e.g. "2026-09-06". */
export function dayKey(d: Date | string | number): string {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export const pct = (done: number, total: number): number => (total <= 0 ? 0 : Math.round((done / total) * 100));

export function uid(prefix = ""): string {
    const r =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return prefix ? `${prefix}-${r}` : r;
}

export function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
