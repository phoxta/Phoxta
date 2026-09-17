import type { Capability, Invite, Member, Notification, Space } from "@/data/core";
import type { CoreRepo, CoreState, NewInvite, NewMember, NewNotification } from "@/data/coreRepo";
import { demoCoreState } from "@/data/coreSeed";
import { hueFor, uid } from "@/lib/format";

/**
 * The Adeyemi family, persisted in this browser.
 *
 * Every write lands in localStorage so a visitor's exploration survives a
 * reload, and every read is synchronous underneath — the async surface exists
 * so the shell treats the demo exactly like the live backend. Nothing here
 * leaves the device.
 *
 * ONE blob holds the whole core (space, members, invites, notifications) plus
 * two things the CoreState does not carry: the nudge keys the follow-up engine
 * has already raised, and the point log a child's history screen shows.
 *
 * WHO AM I? — unlike the live repo, this one does not know the current member:
 * in the demo the member is chosen by the "view as" switcher AFTER load(). So
 * load() returns EVERY member's notifications and the shell filters them by
 * `me.id` (the Notifications page and the bell both do `n.memberId === me.id`).
 * That is the one place the demo and live states differ in shape, and it is
 * on purpose: switching "view as" must not need a reload.
 */

const KEY = "wafe:demo:core:v2";
const DEMO_PREFIX = "wafe:demo:";

/**
 * The demo lives in localStorage, so changing the seed does not reach anyone who
 * has already opened it — they keep the family they were given the first time.
 * The version in each key is what re-seeds them: bump it whenever the seeded
 * people or their facts change.
 *
 * This drops the blobs from older versions on the way past, so a browser does
 * not accumulate a copy of every demo family this product has ever had.
 */
const CURRENT_VERSION = "v2";

export function dropStaleDemoVersions(): void {
    try {
        const stale: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const k = localStorage.key(i);
            // Only versioned slices. Unversioned keys under this prefix are
            // preferences — `view-as` is one — and outlive a seed bump.
            const version = k?.startsWith(DEMO_PREFIX) ? /:(v\d+)$/.exec(k)?.[1] : undefined;
            if (k && version && version !== CURRENT_VERSION) stale.push(k);
        }
        stale.forEach((k) => localStorage.removeItem(k));
    } catch {
        /* nothing persisted, nothing to clear */
    }
}

export interface PointLogEntry {
    memberId: string;
    delta: number;
    reason: string;
    at: string;
}

interface Blob extends CoreState {
    nudges: string[];
    pointLog: PointLogEntry[];
}

function initial(): Blob {
    return { ...demoCoreState(), nudges: [], pointLog: [] };
}

/** True when the parsed value looks like our blob (a stale or foreign key must not crash the app). */
function isBlob(v: unknown): v is Blob {
    if (!v || typeof v !== "object") return false;
    const b = v as Partial<Blob>;
    return Boolean(b.space && Array.isArray(b.members) && b.members.length > 0);
}

const now = (): string => new Date().toISOString();

/** "WAFE-KEMI-2026": four letters from the name (padded with random ones), then the year. */
function inviteCode(name: string, taken: Set<string>): string {
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const fromName = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 20; attempt += 1) {
        let letters = attempt === 0 ? fromName : fromName.slice(0, 2);
        while (letters.length < 4) letters += alpha[Math.floor(Math.random() * alpha.length)];
        const code = `WAFE-${letters}-${year}`;
        if (!taken.has(code)) return code;
    }
    return `WAFE-${uid().slice(0, 4).toUpperCase()}-${year}`;
}

export class LocalCoreRepo implements CoreRepo {
    readonly kind = "demo" as const;
    private cache: Blob | null = null;
    private listeners = new Set<() => void>();

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private get(): Blob {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            this.cache = isBlob(parsed) ? { ...initial(), ...parsed, nudges: parsed.nudges ?? [], pointLog: parsed.pointLog ?? [] } : initial();
        } catch {
            this.cache = initial();
        }
        return this.cache;
    }

    private set(next: Blob): void {
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode: the session still works, it just won't persist */
        }
        this.listeners.forEach((fn) => fn());
    }

    /** Copy-on-write so a failed mutation never leaves a half-applied blob behind. */
    private write(mutate: (b: Blob) => void): void {
        const next = structuredClone(this.get());
        mutate(next);
        this.set(next);
    }

    private member(b: Blob, id: string): Member {
        const m = b.members.find((x) => x.id === id);
        if (!m) throw new Error("That person is no longer in the family");
        return m;
    }

    // -----------------------------------------------------------------------
    // CoreRepo
    // -----------------------------------------------------------------------

    async load(): Promise<CoreState> {
        const b = structuredClone(this.get());
        // Newest first, for every member — see the header comment.
        const notifications = [...b.notifications].sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
        return { space: b.space, members: b.members, invites: b.invites, notifications };
    }

    /** Fires after every write here, and when another tab writes the same blob. */
    subscribe(onChange: () => void): () => void {
        this.listeners.add(onChange);
        const onStorage = (e: StorageEvent) => {
            if (e.key === KEY) {
                this.cache = null;
                onChange();
            }
        };
        try {
            window.addEventListener("storage", onStorage);
        } catch {
            /* no window (tests) */
        }
        return () => {
            this.listeners.delete(onChange);
            try {
                window.removeEventListener("storage", onStorage);
            } catch {
                /* fine */
            }
        };
    }

    async updateSpace(patch: Partial<Omit<Space, "id" | "createdAt">>): Promise<void> {
        this.write((b) => {
            const { id, createdAt } = b.space;
            b.space = { ...b.space, ...patch, id, createdAt };
        });
    }

    async addMember(input: NewMember): Promise<Member> {
        const member: Member = {
            id: uid("mem"),
            spaceId: this.get().space.id,
            userId: null,
            name: input.name.trim(),
            relation: input.relation.trim(),
            role: input.role,
            ageBand: input.ageBand,
            birthday: input.birthday || undefined,
            avatarUrl: input.avatarUrl || undefined,
            hue: hueFor(input.name.trim()),
            points: 0,
            grants: {},
            email: input.email?.trim() || undefined,
            joinedAt: now(),
        };
        this.write((b) => {
            b.members.push(member);
        });
        return member;
    }

    async updateMember(id: string, patch: Partial<Omit<Member, "id" | "spaceId" | "joinedAt">>): Promise<void> {
        this.write((b) => {
            const m = this.member(b, id);
            Object.assign(m, patch, { id: m.id, spaceId: m.spaceId, joinedAt: m.joinedAt });
            if (patch.name) m.name = patch.name.trim();
        });
    }

    async removeMember(id: string): Promise<void> {
        this.write((b) => {
            const m = this.member(b, id);
            // A family with no parent has nobody who can manage it — the last one stays.
            if (m.role === "parent" && b.members.filter((x) => x.role === "parent").length <= 1) {
                throw new Error("A family needs at least one parent");
            }
            b.members = b.members.filter((x) => x.id !== id);
            b.notifications = b.notifications.filter((x) => x.memberId !== id);
            b.pointLog = b.pointLog.filter((x) => x.memberId !== id);
        });
    }

    async setGrant(memberId: string, cap: Capability, on: boolean): Promise<void> {
        this.write((b) => {
            const m = this.member(b, memberId);
            // Parents hold everything already; a grant can neither widen nor narrow them.
            if (m.role === "parent") throw new Error("Parents already have every permission");
            const grants = { ...m.grants };
            if (on) grants[cap] = true;
            else delete grants[cap];
            m.grants = grants;
        });
    }

    async addPoints(memberId: string, delta: number, reason: string): Promise<void> {
        if (!Number.isFinite(delta) || delta === 0) return;
        this.write((b) => {
            const m = this.member(b, memberId);
            m.points = Math.max(0, m.points + Math.round(delta));
            b.pointLog.push({ memberId, delta: Math.round(delta), reason: reason.trim(), at: now() });
        });
    }

    /** A member's points history, newest first (the child's "how I earned it" list). */
    async pointLog(memberId: string): Promise<Array<{ delta: number; reason: string; at: string }>> {
        return this.get()
            .pointLog.filter((x) => x.memberId === memberId)
            .map(({ delta, reason, at }) => ({ delta, reason, at }))
            .reverse();
    }

    async invite(input: NewInvite): Promise<Invite> {
        const b = this.get();
        const inviter = b.members.find((x) => x.role === "parent") ?? b.members[0];
        const invite: Invite = {
            id: uid("inv"),
            spaceId: b.space.id,
            email: input.email.trim().toLowerCase(),
            name: input.name.trim(),
            role: input.role,
            relation: input.relation.trim(),
            code: inviteCode(input.name, new Set(b.invites.map((x) => x.code))),
            status: "pending",
            invitedBy: inviter.id,
            createdAt: now(),
        };
        this.write((x) => {
            x.invites.unshift(invite);
        });
        return invite;
    }

    async revokeInvite(id: string): Promise<void> {
        this.write((b) => {
            b.invites = b.invites.filter((x) => x.id !== id);
        });
    }

    async notify(n: NewNotification): Promise<void> {
        this.write((b) => {
            this.member(b, n.memberId);
            const row: Notification = { id: uid("ntf"), spaceId: b.space.id, memberId: n.memberId, kind: n.kind, title: n.title, body: n.body, href: n.href, readAt: null, createdAt: now() };
            b.notifications.unshift(row);
        });
    }

    /**
     * Mark notifications read. With ids, just those; without, every unread one
     * in the blob — the shell passes the current member's ids so "mark all read"
     * as Tobi never clears Dad's bell.
     */
    async markRead(ids?: string[]): Promise<void> {
        const only = ids ? new Set(ids) : null;
        this.write((b) => {
            const at = now();
            for (const x of b.notifications) {
                if (x.readAt) continue;
                if (only && !only.has(x.id)) continue;
                x.readAt = at;
            }
        });
    }

    async raisedNudgeKeys(): Promise<string[]> {
        return [...this.get().nudges];
    }

    async recordNudge(key: string): Promise<void> {
        this.write((b) => {
            if (!b.nudges.includes(key)) b.nudges.push(key);
        });
    }

    /** Clear this blob and every module's demo slice, then start over from the seed. */
    async resetDemo(): Promise<void> {
        this.cache = null;
        try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i += 1) {
                const k = localStorage.key(i);
                if (k && k.startsWith(DEMO_PREFIX)) keys.push(k);
            }
            keys.forEach((k) => localStorage.removeItem(k));
        } catch {
            /* nothing persisted, nothing to clear */
        }
        try {
            window.location.reload();
        } catch {
            /* no window (tests): the next get() re-seeds anyway */
        }
    }
}
