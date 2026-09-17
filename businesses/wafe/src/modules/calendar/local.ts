import type { RepoContext, SeedContext } from "@/data/core";
import { uid } from "@/lib/format";
import { canCreateEvent, canEditEvent, canRsvp, visibleTo, weekStartOf } from "./derive";
import { seed } from "./seed";
import type { CalEvent, CalendarRepo, CalendarState, EventPatch, IcsScope, IcsToken, NewEventInput, Rsvp, RsvpResponse } from "./types";

/**
 * The calendar in the browser.
 *
 * The blob holds the family's WHOLE diary; `load()` runs the same `visibleTo`
 * filter the live repo runs, so switching "view as" to Tobi genuinely removes
 * date night from the data the screens receive. Every write is real and
 * persisted, and every write checks the same rule the RLS policy checks — a
 * child may add their own event, and edit or delete that one, but not anyone
 * else's; a guest with no grant may only RSVP.
 */

const KEY = "wafe:demo:calendar:v2";
const now = (): string => new Date().toISOString();

function isState(v: unknown): v is CalendarState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<CalendarState>;
    return Array.isArray(s.events) && Array.isArray(s.rsvps) && Array.isArray(s.tokens);
}

export class LocalCalendarRepo implements CalendarRepo {
    private cache: CalendarState | null = null;

    constructor(private ctx: RepoContext) {}

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private seedCtx(): SeedContext {
        const { space, members, today } = this.ctx;
        const counters: Record<string, number> = {};
        const base = new Date(`${today}T00:00:00`);
        const at = (days: number, hhmm = "09:00"): string => {
            const d = new Date(base);
            d.setDate(d.getDate() + days);
            const [h, mi] = hhmm.split(":").map(Number);
            d.setHours(h, mi, 0, 0);
            return d.toISOString();
        };
        return {
            space,
            members,
            parents: members.filter((m) => m.role === "parent"),
            kids: members.filter((m) => m.role === "child"),
            guests: members.filter((m) => m.role === "guest"),
            today,
            at,
            day: (days: number) => at(days, "00:00").slice(0, 10),
            uid: (prefix: string) => `${prefix}-${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`,
            img: (name: string) => `/images/${name}.jpg`,
        };
    }

    private get(): CalendarState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            this.cache = isState(parsed) ? { events: parsed.events, rsvps: parsed.rsvps, tokens: parsed.tokens, weeks: parsed.weeks ?? [] } : seed(this.seedCtx());
        } catch {
            this.cache = seed(this.seedCtx());
        }
        return this.cache;
    }

    private set(next: CalendarState): void {
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode: it still works, it just won't persist */
        }
    }

    private write(mutate: (s: CalendarState) => void): void {
        const next = structuredClone(this.get());
        mutate(next);
        this.set(next);
    }

    private event(s: CalendarState, id: string): CalEvent {
        const ev = s.events.find((e) => e.id === id);
        if (!ev) throw new Error("That event is no longer in the calendar");
        return ev;
    }

    private assertEdit(ev: CalEvent): void {
        if (!canEditEvent(ev, this.ctx)) throw new Error("Not allowed");
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<CalendarState> {
        return visibleTo(structuredClone(this.get()), this.ctx);
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    async createEvent(input: NewEventInput): Promise<CalEvent> {
        const ctx = this.ctx;
        if (!canCreateEvent(ctx)) throw new Error("Not allowed");
        const start = new Date(input.startAt);
        const end = input.endAt ? new Date(input.endAt) : new Date(start.getTime() + 3600000);
        if (end < start) throw new Error("It can't finish before it starts");

        // A child keeps their own diary and nobody else's: their event is for
        // them, visible to the family, and safe for the children's screens.
        const child = ctx.role === "child" && !ctx.can("calendar.manage");
        const attendees = child ? [{ memberId: ctx.me.id, required: true }] : (input.attendees ?? []);

        const row: CalEvent = {
            id: uid("event"),
            spaceId: ctx.space.id,
            title: input.title.trim() || "Untitled",
            notes: input.notes ?? "",
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            allDay: input.allDay ?? false,
            location: input.location ?? "",
            kind: input.kind ?? "event",
            attendees,
            colourMemberId: input.colourMemberId ?? (child ? ctx.me.id : null),
            rrule: input.rrule ?? null,
            reminderMinutes: input.reminderMinutes ?? null,
            communityId: input.communityId ?? null,
            tripId: input.tripId ?? null,
            coverUrl: input.coverUrl ?? null,
            visibility: child ? "family" : (input.visibility ?? "family"),
            sharedWith: child ? [] : (input.sharedWith ?? []),
            childSafe: child ? true : (input.childSafe ?? true),
            createdBy: ctx.me.id,
            createdAt: now(),
            updatedAt: now(),
        };
        this.write((s) => {
            s.events.push(row);
        });
        return row;
    }

    async updateEvent(id: string, patch: EventPatch): Promise<void> {
        this.assertEdit(this.event(this.get(), id));
        this.write((s) => {
            const ev = this.event(s, id);
            Object.assign(ev, patch, { updatedAt: now() });
            if (new Date(ev.endAt) < new Date(ev.startAt)) ev.endAt = new Date(new Date(ev.startAt).getTime() + 3600000).toISOString();
        });
    }

    async removeEvent(id: string): Promise<void> {
        this.assertEdit(this.event(this.get(), id));
        this.write((s) => {
            s.events = s.events.filter((e) => e.id !== id);
            s.rsvps = s.rsvps.filter((r) => r.eventId !== id);
        });
    }

    async moveEvent(id: string, startAt: string): Promise<void> {
        const before = this.event(this.get(), id);
        this.assertEdit(before);
        const durMs = new Date(before.endAt).getTime() - new Date(before.startAt).getTime();
        this.write((s) => {
            const ev = this.event(s, id);
            ev.startAt = new Date(startAt).toISOString();
            ev.endAt = new Date(new Date(startAt).getTime() + durMs).toISOString();
            ev.updatedAt = now();
        });
    }

    // -----------------------------------------------------------------------
    // RSVP — the guest's one write
    // -----------------------------------------------------------------------

    async setRsvp(eventId: string, response: RsvpResponse, memberId?: string, note?: string): Promise<Rsvp> {
        const who = memberId ?? this.ctx.me.id;
        const ev = this.event(this.get(), eventId);
        if (!canRsvp(ev, this.ctx, who)) throw new Error("Not allowed");
        const row: Rsvp = { id: uid("rsvp"), eventId, memberId: who, response, note: note ?? "", at: now() };
        this.write((s) => {
            const existing = s.rsvps.find((r) => r.eventId === eventId && r.memberId === who);
            if (existing) {
                existing.response = response;
                existing.note = note ?? existing.note;
                existing.at = row.at;
                row.id = existing.id;
            } else {
                s.rsvps.push(row);
            }
        });
        return row;
    }

    async clearRsvp(eventId: string, memberId?: string): Promise<void> {
        const who = memberId ?? this.ctx.me.id;
        const ev = this.event(this.get(), eventId);
        if (!canRsvp(ev, this.ctx, who)) throw new Error("Not allowed");
        this.write((s) => {
            s.rsvps = s.rsvps.filter((r) => !(r.eventId === eventId && r.memberId === who));
        });
    }

    // -----------------------------------------------------------------------
    // ICS feeds
    // -----------------------------------------------------------------------

    async createToken(scope: IcsScope, memberId: string | null, label?: string): Promise<IcsToken> {
        const ctx = this.ctx;
        const mine = scope === "member" && memberId === ctx.me.id;
        if (ctx.role !== "parent" && !mine) throw new Error("Not allowed");
        const name = label ?? (scope === "space" ? "The whole family" : (ctx.members.find((m) => m.id === memberId)?.name ?? "A member"));
        const row: IcsToken = {
            id: uid("ics"),
            spaceId: ctx.space.id,
            memberId: scope === "space" ? null : memberId,
            token: `wf-${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}`,
            scope,
            label: name,
            createdAt: now(),
            revokedAt: null,
            lastSyncedAt: null,
        };
        this.write((s) => {
            s.tokens.push(row);
        });
        return row;
    }

    /** AC 7 — the feed stops here and now; nothing is served from the link again. */
    async revokeToken(id: string): Promise<void> {
        const ctx = this.ctx;
        const token = this.get().tokens.find((t) => t.id === id);
        if (!token) throw new Error("That link is already gone");
        if (ctx.role !== "parent" && token.memberId !== ctx.me.id) throw new Error("Not allowed");
        this.write((s) => {
            const t = s.tokens.find((x) => x.id === id);
            if (t) t.revokedAt = now();
        });
    }

    async touchToken(id: string): Promise<void> {
        this.write((s) => {
            const t = s.tokens.find((x) => x.id === id);
            if (t && !t.revokedAt) t.lastSyncedAt = now();
        });
    }

    // -----------------------------------------------------------------------
    // Sunday planning
    // -----------------------------------------------------------------------

    async confirmWeek(weekStart: string, note?: string): Promise<void> {
        if (!this.ctx.can("calendar.manage")) throw new Error("Not allowed");
        const key = weekStartOf(weekStart);
        this.write((s) => {
            s.weeks = [...s.weeks.filter((w) => w.weekStart !== key), { weekStart: key, confirmedBy: this.ctx.me.id, confirmedAt: now(), note: note ?? "" }];
        });
    }

    async unconfirmWeek(weekStart: string): Promise<void> {
        if (!this.ctx.can("calendar.manage")) throw new Error("Not allowed");
        const key = weekStartOf(weekStart);
        this.write((s) => {
            s.weeks = s.weeks.filter((w) => w.weekStart !== key);
        });
    }
}
