import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { canCreateEvent, canEditEvent, canRsvp, visibleTo, weekStartOf } from "./derive";
import type { CalEvent, CalendarRepo, CalendarState, EventAttendee, EventKind, EventPatch, IcsScope, IcsToken, NewEventInput, RecurRule, Rsvp, RsvpResponse, WeekPlan } from "./types";

/**
 * The calendar, live, under row-level security.
 *
 * The privacy rules are the database's: `wf_events` is readable through
 * `wf_can_see(space_id, created_by, visibility, shared_with)` plus a child /
 * guest clause that requires an invitation (see sql/calendar.sql), and
 * `wf_ics_tokens` is parent-or-mine. `visibleTo` runs again on the way out so
 * the demo and the live app compute identical screens.
 *
 * snake_case ↔ camelCase mapping lives in this file and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d: number | null = null): number | null => (typeof v === "number" ? v : v === null || v === undefined ? d : Number(v));
const b = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

function mapRrule(v: unknown): RecurRule | null {
    if (!v || typeof v !== "object") return null;
    const r = v as Row;
    const freq = s(r.freq);
    if (freq !== "weekly" && freq !== "fortnightly" && freq !== "monthly") return null;
    return { freq, weekday: n(r.weekday), monthDay: n(r.monthDay), until: nul(r.until) };
}

const mapEvent = (r: Row, attendees: EventAttendee[]): CalEvent => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    notes: s(r.notes),
    startAt: iso(r.start_at),
    endAt: iso(r.end_at ?? r.start_at),
    allDay: b(r.all_day),
    location: s(r.location),
    kind: s(r.kind, "event") as EventKind,
    attendees,
    colourMemberId: nul(r.colour_member_id),
    rrule: mapRrule(r.rrule),
    reminderMinutes: n(r.reminder_minutes),
    communityId: nul(r.community_id),
    tripId: nul(r.trip_id),
    coverUrl: nul(r.cover_url),
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
    childSafe: b(r.child_safe, true),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at ?? r.created_at),
});

const mapRsvp = (r: Row): Rsvp => ({
    id: s(r.id),
    eventId: s(r.event_id),
    memberId: s(r.member_id),
    response: s(r.response, "maybe") as RsvpResponse,
    note: s(r.note),
    at: iso(r.at),
});

const mapToken = (r: Row): IcsToken => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: nul(r.member_id),
    token: s(r.token),
    scope: s(r.scope, "member") as IcsScope,
    label: s(r.label),
    createdAt: iso(r.created_at),
    revokedAt: r.revoked_at ? iso(r.revoked_at) : null,
    lastSyncedAt: r.last_synced_at ? iso(r.last_synced_at) : null,
});

const mapWeek = (r: Row): WeekPlan => ({
    weekStart: s(r.week_start).slice(0, 10),
    confirmedBy: s(r.confirmed_by),
    confirmedAt: iso(r.confirmed_at),
    note: s(r.note),
});

export class SupabaseCalendarRepo implements CalendarRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<CalendarState> {
        const spaceId = this.ctx.space.id;
        const [events, members, rsvps, tokens, weeks] = await Promise.all([
            supabase.from("wf_events").select("*").eq("space_id", spaceId).order("start_at", { ascending: true }),
            supabase.from("wf_event_members").select("*").eq("space_id", spaceId),
            supabase.from("wf_event_rsvps").select("*").eq("space_id", spaceId),
            supabase.from("wf_ics_tokens").select("*").eq("space_id", spaceId).order("created_at", { ascending: false }),
            supabase.from("wf_calendar_weeks").select("*").eq("space_id", spaceId).order("week_start", { ascending: false }),
        ]);
        fail("events", events.error);
        fail("event members", members.error);
        fail("rsvps", rsvps.error);
        fail("feeds", tokens.error);
        fail("weeks", weeks.error);

        const byEvent = new Map<string, EventAttendee[]>();
        for (const row of (members.data ?? []) as Row[]) {
            const id = s(row.event_id);
            const list = byEvent.get(id) ?? [];
            list.push({ memberId: s(row.member_id), required: b(row.required, true) });
            byEvent.set(id, list);
        }

        const state: CalendarState = {
            events: ((events.data ?? []) as Row[]).map((r) => mapEvent(r, byEvent.get(s(r.id)) ?? [])),
            rsvps: ((rsvps.data ?? []) as Row[]).map(mapRsvp),
            tokens: ((tokens.data ?? []) as Row[]).map(mapToken),
            weeks: ((weeks.data ?? []) as Row[]).map(mapWeek),
        };
        return visibleTo(state, this.ctx);
    }

    subscribe(onChange: () => void): () => void {
        const channel = supabase
            .channel(`wf-calendar-${this.ctx.space.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "wf_events", filter: `space_id=eq.${this.ctx.space.id}` }, onChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "wf_event_rsvps", filter: `space_id=eq.${this.ctx.space.id}` }, onChange)
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    private async fetchEvent(id: string): Promise<CalEvent> {
        const { data, error } = await supabase.from("wf_events").select("*").eq("id", id).single();
        fail("event", error);
        if (!data) throw new Error("That event is no longer in the calendar");
        return mapEvent(data as Row, []);
    }

    private async writeAttendees(eventId: string, attendees: EventAttendee[]): Promise<void> {
        const del = await supabase.from("wf_event_members").delete().eq("event_id", eventId);
        fail("attendees", del.error);
        if (!attendees.length) return;
        const ins = await supabase.from("wf_event_members").insert(attendees.map((a) => ({ ...this.scope, event_id: eventId, member_id: a.memberId, required: a.required })));
        fail("attendees", ins.error);
    }

    async createEvent(input: NewEventInput): Promise<CalEvent> {
        const ctx = this.ctx;
        if (!canCreateEvent(ctx)) throw new Error("Not allowed");
        const start = new Date(input.startAt);
        const end = input.endAt ? new Date(input.endAt) : new Date(start.getTime() + 3600000);
        const child = ctx.role === "child" && !ctx.can("calendar.manage");
        const attendees = child ? [{ memberId: ctx.me.id, required: true }] : (input.attendees ?? []);

        const { data, error } = await supabase
            .from("wf_events")
            .insert({
                ...this.scope,
                title: input.title.trim() || "Untitled",
                notes: input.notes ?? "",
                start_at: start.toISOString(),
                end_at: end.toISOString(),
                all_day: input.allDay ?? false,
                location: input.location ?? "",
                kind: input.kind ?? "event",
                colour_member_id: input.colourMemberId ?? (child ? ctx.me.id : null),
                rrule: input.rrule ?? null,
                reminder_minutes: input.reminderMinutes ?? null,
                community_id: input.communityId ?? null,
                trip_id: input.tripId ?? null,
                cover_url: input.coverUrl ?? null,
                visibility: child ? "family" : (input.visibility ?? "family"),
                shared_with: child ? [] : (input.sharedWith ?? []),
                child_safe: child ? true : (input.childSafe ?? true),
                created_by: ctx.me.id,
            })
            .select("*")
            .single();
        fail("create event", error);
        const row = mapEvent((data ?? {}) as Row, attendees);
        await this.writeAttendees(row.id, attendees);
        return row;
    }

    async updateEvent(id: string, patch: EventPatch): Promise<void> {
        const before = await this.fetchEvent(id);
        if (!canEditEvent(before, this.ctx)) throw new Error("Not allowed");
        const row: Row = { updated_at: new Date().toISOString() };
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.startAt !== undefined) row.start_at = patch.startAt;
        if (patch.endAt !== undefined) row.end_at = patch.endAt;
        if (patch.allDay !== undefined) row.all_day = patch.allDay;
        if (patch.location !== undefined) row.location = patch.location;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.colourMemberId !== undefined) row.colour_member_id = patch.colourMemberId;
        if (patch.rrule !== undefined) row.rrule = patch.rrule;
        if (patch.reminderMinutes !== undefined) row.reminder_minutes = patch.reminderMinutes;
        if (patch.communityId !== undefined) row.community_id = patch.communityId;
        if (patch.tripId !== undefined) row.trip_id = patch.tripId;
        if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        const { error } = await supabase.from("wf_events").update(row).eq("id", id);
        fail("update event", error);
        if (patch.attendees) await this.writeAttendees(id, patch.attendees);
    }

    async removeEvent(id: string): Promise<void> {
        const before = await this.fetchEvent(id);
        if (!canEditEvent(before, this.ctx)) throw new Error("Not allowed");
        const { error } = await supabase.from("wf_events").delete().eq("id", id);
        fail("delete event", error);
    }

    async moveEvent(id: string, startAt: string): Promise<void> {
        const before = await this.fetchEvent(id);
        if (!canEditEvent(before, this.ctx)) throw new Error("Not allowed");
        const durMs = new Date(before.endAt).getTime() - new Date(before.startAt).getTime();
        const start = new Date(startAt);
        const { error } = await supabase
            .from("wf_events")
            .update({ start_at: start.toISOString(), end_at: new Date(start.getTime() + durMs).toISOString(), updated_at: new Date().toISOString() })
            .eq("id", id);
        fail("move event", error);
    }

    // -----------------------------------------------------------------------
    // RSVP
    // -----------------------------------------------------------------------

    async setRsvp(eventId: string, response: RsvpResponse, memberId?: string, note?: string): Promise<Rsvp> {
        const who = memberId ?? this.ctx.me.id;
        const { data: attendeeRow, error: attendeeErr } = await supabase.from("wf_event_members").select("member_id,required").eq("event_id", eventId);
        fail("rsvp", attendeeErr);
        const attendees: EventAttendee[] = ((attendeeRow ?? []) as Row[]).map((r) => ({ memberId: s(r.member_id), required: b(r.required, true) }));
        const ev = { ...(await this.fetchEvent(eventId)), attendees };
        if (!canRsvp(ev, this.ctx, who)) throw new Error("Not allowed");
        const { data, error } = await supabase
            .from("wf_event_rsvps")
            .upsert({ ...this.scope, event_id: eventId, member_id: who, response, note: note ?? "", at: new Date().toISOString() }, { onConflict: "event_id,member_id" })
            .select("*")
            .single();
        fail("rsvp", error);
        return mapRsvp((data ?? {}) as Row);
    }

    async clearRsvp(eventId: string, memberId?: string): Promise<void> {
        const who = memberId ?? this.ctx.me.id;
        if (who !== this.ctx.me.id && this.ctx.role !== "parent") throw new Error("Not allowed");
        const { error } = await supabase.from("wf_event_rsvps").delete().eq("event_id", eventId).eq("member_id", who);
        fail("rsvp", error);
    }

    // -----------------------------------------------------------------------
    // ICS feeds
    // -----------------------------------------------------------------------

    async createToken(scope: IcsScope, memberId: string | null, label?: string): Promise<IcsToken> {
        const ctx = this.ctx;
        const mine = scope === "member" && memberId === ctx.me.id;
        if (ctx.role !== "parent" && !mine) throw new Error("Not allowed");
        const token = `wf-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
        const { data, error } = await supabase
            .from("wf_ics_tokens")
            .insert({
                ...this.scope,
                member_id: scope === "space" ? null : memberId,
                token,
                scope,
                label: label ?? (scope === "space" ? "The whole family" : (ctx.members.find((m) => m.id === memberId)?.name ?? "A member")),
            })
            .select("*")
            .single();
        fail("create feed", error);
        return mapToken((data ?? {}) as Row);
    }

    async revokeToken(id: string): Promise<void> {
        const { error } = await supabase.from("wf_ics_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
        fail("revoke feed", error);
    }

    async touchToken(id: string): Promise<void> {
        const { error } = await supabase.from("wf_ics_tokens").update({ last_synced_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
        fail("feed", error);
    }

    // -----------------------------------------------------------------------
    // Sunday planning
    // -----------------------------------------------------------------------

    async confirmWeek(weekStart: string, note?: string): Promise<void> {
        if (!this.ctx.can("calendar.manage")) throw new Error("Not allowed");
        const { error } = await supabase.from("wf_calendar_weeks").upsert(
            {
                ...this.scope,
                week_start: weekStartOf(weekStart),
                confirmed_by: this.ctx.me.id,
                confirmed_at: new Date().toISOString(),
                note: note ?? "",
            },
            { onConflict: "space_id,week_start" },
        );
        fail("confirm week", error);
    }

    async unconfirmWeek(weekStart: string): Promise<void> {
        if (!this.ctx.can("calendar.manage")) throw new Error("Not allowed");
        const { error } = await supabase.from("wf_calendar_weeks").delete().eq("space_id", this.ctx.space.id).eq("week_start", weekStartOf(weekStart));
        fail("confirm week", error);
    }
}
