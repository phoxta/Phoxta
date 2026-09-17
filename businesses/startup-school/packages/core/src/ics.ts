import type { Booking, Mentor } from "./types";

/**
 * A booking as a calendar file.
 *
 * This is the reminder system. It needs no email provider, no push
 * infrastructure and no calendar OAuth: the founder's own calendar does the
 * reminding, on whatever device they already trust to wake them up. Every
 * calendar client on every platform reads this format, and a `.ics` attachment
 * is what a booking confirmation has meant for twenty years.
 *
 * Three details are where naive implementations break:
 *
 * 1. CRLF, always. RFC 5545 mandates it and Outlook enforces it — a file with
 *    bare newlines imports as one malformed event or not at all.
 * 2. Lines fold at 75 OCTETS, not characters, and a fold must never split a
 *    UTF-8 sequence. An agenda with an em-dash in the wrong column otherwise
 *    arrives as mojibake.
 * 3. UID must be stable across re-sends. The same booking downloaded twice, or
 *    rescheduled, has to UPDATE the existing event rather than create a second
 *    one — which is what SEQUENCE and a stable UID are for.
 */

/** Escape the four characters that mean something inside a property value. */
const esc = (v: string): string =>
    v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** `20260915T143000Z` — the only form that needs no VTIMEZONE block. */
const stamp = (iso: string): string => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * Fold to 75 octets per line, continuation lines prefixed with one space.
 *
 * Counted in bytes because the limit is in bytes, and cut on a character
 * boundary because a split multi-byte sequence is not valid UTF-8.
 */
function fold(line: string): string {
    const bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;

    const out: string[] = [];
    let start = 0;
    let limit = 75;
    while (start < bytes.length) {
        let end = Math.min(start + limit, bytes.length);
        // Walk back off a continuation byte (10xxxxxx) so we never split a char.
        while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
        out.push(new TextDecoder().decode(bytes.slice(start, end)));
        start = end;
        limit = 74; // the leading space on a continuation line counts
    }
    return out.join("\r\n ");
}

export interface IcsInput {
    booking: Booking;
    mentor: Mentor | null;
    schoolName: string;
    /** Where to join. Absolute, so the calendar entry is useful on a phone. */
    url?: string;
}

/** One VEVENT, ready to be saved as a `.ics` file. */
export function bookingToIcs({ booking, mentor, schoolName, url }: IcsInput): string {
    const who = mentor?.name ?? "your mentor";
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Phoxta//Startup School//EN",
        "CALSCALE:GREGORIAN",
        // PUBLISH, not REQUEST: this is a file the founder saves, not an
        // invitation from an organiser mailbox. REQUEST would make some clients
        // try to send an RSVP to an address that does not exist.
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${booking.id}@startup-school.phoxta.com`,
        `DTSTAMP:${stamp(booking.createdAt)}`,
        `DTSTART:${stamp(booking.startsAt)}`,
        `DTEND:${stamp(booking.endsAt)}`,
        // A rescheduled booking is a new row with a new id, so this only ever
        // rises when a client re-downloads after a status change.
        `SEQUENCE:${booking.status === "cancelled" ? 1 : 0}`,
        `STATUS:${booking.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
        `SUMMARY:${esc(`${schoolName}: 1:1 with ${who}`)}`,
        `DESCRIPTION:${esc(
            [
                booking.agenda ? `What you said you wanted to talk about:\n${booking.agenda}` : "No agenda set — bring one specific thing you are stuck on.",
                url ? `\n\n${url}` : "",
            ].join(""),
        )}`,
        ...(url ? [`URL:${esc(url)}`] : []),
        ...(mentor?.name ? [`ORGANIZER;CN=${esc(mentor.name)}:mailto:noreply@phoxta.com`] : []),
        // Fifteen minutes is the interval a founder can actually act on — long
        // enough to find the agenda, short enough not to be dismissed and lost.
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:-PT15M",
        `DESCRIPTION:${esc(`1:1 with ${who} in 15 minutes`)}`,
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ];
    return lines.map(fold).join("\r\n") + "\r\n";
}

/** A filename a person can recognise in their downloads folder. */
export function icsFilename(booking: Booking, mentor: Mentor | null): string {
    const who = (mentor?.name ?? "mentor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `session-${who}-${booking.startsAt.slice(0, 10)}.ics`;
}
