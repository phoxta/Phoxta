import type { Capability, RepoContext } from "@/data/core";
import { uid } from "@/lib/format";
import { seedContext } from "@/data/coreSeed";
import { visibleTo } from "./derive";
import { DEMO_PIN, seed } from "./seed";
import type { AuditAction, AuditEntry, FamilyRepo, FamilySettings, FamilyState, GuestTag, NewShare, ShareLevel } from "./types";

/**
 * The Adeyemis' trust boundary, in this browser.
 *
 * Every write is real and lands in localStorage, and every write that changes
 * who-can-see-what writes an audit line at the same time — the demo has to be
 * able to prove acceptance criterion 3 by clicking, not by being told.
 *
 * `load()` runs the same `visibleTo()` filter the live repo runs, so switching
 * "view as" to Tobi genuinely hands this module a state with no audit log, no
 * meter and none of Mama Fọláké's shares in it.
 */

const KEY = "wafe:demo:family:v2";

/**
 * The PIN is stored as a salted hash, never in clear — a habit worth keeping
 * even in a demo blob. This is NOT a cryptographic KDF: the live repo keeps
 * the hash server-side (see sql/family.sql) and this one only guards a toy.
 */
export function hashPin(pin: string): string {
    let h = 2166136261;
    for (const c of `wafe:${pin.trim()}`) {
        h ^= c.charCodeAt(0);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
}

interface Blob extends FamilyState {
    pinHash: string | null;
}

function initial(): Blob {
    return { ...seed(seedContext()), pinHash: hashPin(DEMO_PIN) };
}

function isBlob(v: unknown): v is Blob {
    if (!v || typeof v !== "object") return false;
    const b = v as Partial<Blob>;
    return Array.isArray(b.values) && Array.isArray(b.shares) && Boolean(b.settings);
}

const now = (): string => new Date().toISOString();

export class LocalFamilyRepo implements FamilyRepo {
    private ctx: RepoContext;
    private cache: Blob | null = null;
    private listeners = new Set<() => void>();

    constructor(ctx: RepoContext) {
        this.ctx = ctx;
    }

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private get(): Blob {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            this.cache = isBlob(parsed) ? { ...initial(), ...parsed } : initial();
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

    /** Copy-on-write, so a rejected change never leaves half of itself behind. */
    private write(mutate: (b: Blob) => void): void {
        const next = structuredClone(this.get());
        mutate(next);
        this.set(next);
    }

    private parentOnly(): void {
        if (!this.ctx.can("family.manage")) throw new Error("Only a parent can change that");
    }

    /** Append one audit line. Called by every write that moves the boundary. */
    private log(b: Blob, action: AuditAction, targetType: string, targetId: string, summary: string, before: string | null = null, after: string | null = null): void {
        const entry: AuditEntry = { id: uid("aud"), at: now(), actorId: this.ctx.me.id, action, targetType, targetId, summary, before, after };
        b.audit.unshift(entry);
        b.audit = b.audit.slice(0, 300);
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<FamilyState> {
        const b = structuredClone(this.get());
        b.usage = rollMonth(b.usage, this.ctx.today);
        const { pinHash, ...state } = b;
        return visibleTo({ ...state, pinSet: Boolean(pinHash) }, this.ctx);
    }

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

    // -----------------------------------------------------------------------
    // Values and mission
    // -----------------------------------------------------------------------

    async addValue(name: string, meaning: string): Promise<void> {
        this.parentOnly();
        const clean = name.trim();
        if (!clean) throw new Error("A value needs a word");
        this.write((b) => {
            if (b.values.filter((v) => !v.archivedAt).length >= 7) throw new Error("Seven values is the most a family can hold in its head");
            if (b.values.some((v) => v.name.toLowerCase() === clean.toLowerCase() && !v.archivedAt)) throw new Error(`${clean} is already one of your values`);
            b.values.push({ id: uid("val"), name: clean, meaning: meaning.trim(), order: b.values.length, archivedAt: null });
            this.log(b, "values", "space", this.ctx.space.id, `Added the value “${clean}”`, null, clean);
        });
    }

    async updateValue(id: string, patch: { name?: string; meaning?: string }): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const v = b.values.find((x) => x.id === id);
            if (!v) throw new Error("That value is gone");
            const before = `${v.name} — ${v.meaning}`;
            if (patch.name !== undefined) v.name = patch.name.trim() || v.name;
            if (patch.meaning !== undefined) v.meaning = patch.meaning.trim();
            this.log(b, "values", "value", id, `Rewrote “${v.name}”`, before, `${v.name} — ${v.meaning}`);
        });
    }

    async setValueArchived(id: string, archived: boolean): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const v = b.values.find((x) => x.id === id);
            if (!v) throw new Error("That value is gone");
            v.archivedAt = archived ? now() : null;
            this.log(b, "values", "value", id, `${archived ? "Archived" : "Brought back"} the value “${v.name}”`, archived ? "active" : "archived", archived ? "archived" : "active");
        });
    }

    async deleteValue(id: string, references: number): Promise<void> {
        this.parentOnly();
        if (references > 0) throw new Error(`${references} record${references === 1 ? "" : "s"} still point at this value. Archive it instead — the records keep their meaning.`);
        this.write((b) => {
            const v = b.values.find((x) => x.id === id);
            if (!v) return;
            b.values = b.values.filter((x) => x.id !== id).map((x, i) => ({ ...x, order: i }));
            b.valueLinks = b.valueLinks.filter((l) => l.valueId !== id);
            this.log(b, "values", "value", id, `Deleted the value “${v.name}” (nothing referenced it)`, v.name, null);
        });
    }

    async moveValue(id: string, dir: -1 | 1): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const list = [...b.values].sort((a, c) => a.order - c.order);
            const i = list.findIndex((v) => v.id === id);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= list.length) return;
            [list[i], list[j]] = [list[j], list[i]];
            b.values = list.map((v, k) => ({ ...v, order: k }));
        });
    }

    async saveMission(input: { mission: string; vision: string; legacy: string }): Promise<void> {
        this.parentOnly();
        const mission = input.mission.trim();
        if (!mission) throw new Error("The mission cannot be empty");
        this.write((b) => {
            const prev = b.missions[0];
            if (prev && prev.mission === mission && prev.vision === input.vision.trim() && prev.legacy === input.legacy.trim()) return;
            b.missions.unshift({ id: uid("mis"), mission, vision: input.vision.trim(), legacy: input.legacy.trim(), authorId: this.ctx.me.id, createdAt: now() });
            b.missions = b.missions.slice(0, 40);
            this.log(b, "mission", "space", this.ctx.space.id, "Saved a new version of the mission", prev?.mission ?? null, mission);
        });
    }

    // -----------------------------------------------------------------------
    // Guests and shares
    // -----------------------------------------------------------------------

    async addShare(input: NewShare): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            if (b.shares.some((s) => s.memberId === input.memberId && s.objectId === input.objectId)) throw new Error("That is already shared with them");
            b.shares.push({ id: uid("shr"), ...input, grantedBy: this.ctx.me.id, grantedAt: now() });
            this.log(b, "share", input.objectType, input.objectId, `Shared “${input.label}” with ${this.nameOf(input.memberId)} (${input.level})`, null, input.level);
        });
    }

    async setShareLevel(id: string, level: ShareLevel): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const s = b.shares.find((x) => x.id === id);
            if (!s) throw new Error("That share is gone");
            const before = s.level;
            s.level = level;
            this.log(b, "share", s.objectType, s.objectId, `“${s.label}” for ${this.nameOf(s.memberId)} is now ${level === "contribute" ? "contribute" : "view only"}`, before, level);
        });
    }

    async revokeShare(id: string): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const s = b.shares.find((x) => x.id === id);
            if (!s) return;
            b.shares = b.shares.filter((x) => x.id !== id);
            this.log(b, "share", s.objectType, s.objectId, `Stopped sharing “${s.label}” with ${this.nameOf(s.memberId)}`, s.level, null);
        });
    }

    async setGuestTag(memberId: string, tag: GuestTag): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const before = b.guestTags[memberId] ?? null;
            b.guestTags[memberId] = tag;
            this.log(b, "member", "member", memberId, `${this.nameOf(memberId)} is a ${tag} guest`, before, tag);
        });
    }

    async retargetShares(fromId: string, toId: string): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            let n = 0;
            for (const s of b.shares) {
                if (s.memberId === fromId) {
                    s.memberId = toId;
                    n += 1;
                }
            }
            if (b.guestTags[fromId]) {
                b.guestTags[toId] = b.guestTags[fromId];
                delete b.guestTags[fromId];
            }
            if (n) this.log(b, "share", "member", toId, `${n} share${n === 1 ? "" : "s"} followed ${this.nameOf(toId)} into the family`, fromId, toId);
        });
    }

    // -----------------------------------------------------------------------
    // Permissions
    // -----------------------------------------------------------------------

    async setOverride(memberId: string, cap: Capability, value: boolean | null): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const current = { ...(b.overrides[memberId] ?? {}) };
            const before = current[cap] === undefined ? "default" : current[cap] ? "on" : "off";
            if (value === null) delete current[cap];
            else current[cap] = value;
            b.overrides[memberId] = current;
            const after = value === null ? "default" : value ? "on" : "off";
            this.log(b, "permission", "member", memberId, `${this.nameOf(memberId)} · ${cap} → ${after}`, before, after);
        });
    }

    async clearMember(memberId: string): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            delete b.overrides[memberId];
            delete b.childMode[memberId];
            delete b.guestTags[memberId];
            b.shares = b.shares.filter((s) => s.memberId !== memberId);
        });
    }

    // -----------------------------------------------------------------------
    // Child mode and the parent PIN
    // -----------------------------------------------------------------------

    async setChildMode(memberId: string, on: boolean): Promise<void> {
        // Turning child mode OFF is a parent's act; the screen asks for the PIN
        // first (that is what a child cannot do), and a parent may do either.
        this.parentOnly();
        this.write((b) => {
            const before = b.childMode[memberId] ? "on" : "off";
            b.childMode[memberId] = on;
            this.log(b, "childmode", "member", memberId, `Child mode ${on ? "on" : "off"} for ${this.nameOf(memberId)}`, before, on ? "on" : "off");
        });
    }

    /** A child leaving child mode: the PIN is the parent, standing here. */
    async exitChildMode(pin: string): Promise<boolean> {
        if (!(await this.checkPin(pin))) return false;
        this.write((b) => {
            b.childMode[this.ctx.me.id] = false;
            this.log(b, "childmode", "member", this.ctx.me.id, `Child mode unlocked on ${this.ctx.me.name.split(" ")[0]}'s device with the parent PIN`, "on", "off");
        });
        return true;
    }

    async setPin(pin: string): Promise<void> {
        this.parentOnly();
        if (!/^\d{4,8}$/.test(pin.trim())) throw new Error("A PIN is four to eight digits");
        this.write((b) => {
            b.pinHash = hashPin(pin);
            b.pinSet = true;
            this.log(b, "childmode", "space", this.ctx.space.id, "Changed the parent PIN", null, null);
        });
    }

    async checkPin(pin: string): Promise<boolean> {
        const b = this.get();
        return Boolean(b.pinHash) && b.pinHash === hashPin(pin);
    }

    // -----------------------------------------------------------------------
    // Settings, plan, meter
    // -----------------------------------------------------------------------

    async saveSettings(patch: Partial<FamilySettings>): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            const before = summarise(b.settings);
            b.settings = { ...b.settings, ...patch };
            const after = summarise(b.settings);
            if (before !== after) this.log(b, "settings", "space", this.ctx.space.id, describeSettings(patch), before, after);
        });
    }

    async noteAiCall(kind: "call" | "image" | "reel"): Promise<void> {
        this.write((b) => {
            b.usage = rollMonth(b.usage, this.ctx.today);
            if (kind === "call") b.usage.calls += 1;
            if (kind === "image") {
                b.usage.images += 1;
                b.usage.calls += 1;
            }
            if (kind === "reel") b.usage.reels += 1;
        });
    }

    // -----------------------------------------------------------------------
    // Records
    // -----------------------------------------------------------------------

    async audit(entry: { action: AuditAction; targetType: string; targetId: string; summary: string; before?: string | null; after?: string | null }): Promise<void> {
        this.parentOnly();
        this.write((b) => this.log(b, entry.action, entry.targetType, entry.targetId, entry.summary, entry.before ?? null, entry.after ?? null));
    }

    async recordHandover(input: { memberId: string; memberName: string; toMemberId: string; openTasks: number }): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            b.handovers.unshift({ id: uid("hand"), ...input, at: now() });
            this.log(
                b,
                "member",
                "member",
                input.memberId,
                `${input.memberName} left the family. Access ended at once; ${input.openTasks} open task${input.openTasks === 1 ? "" : "s"} passed to ${this.nameOf(input.toMemberId)}; everything they wrote was kept.`,
                "member",
                "removed",
            );
        });
    }

    async recordExport(bytes: number): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            b.exports.unshift({ id: uid("exp"), requestedBy: this.ctx.me.id, requestedAt: now(), status: "ready", readyAt: now(), bytes, note: "Downloaded in the browser." });
            b.exports = b.exports.slice(0, 20);
            this.log(b, "export", "space", this.ctx.space.id, "Exported the whole family archive", null, `${Math.round(bytes / 1024)} KB`);
        });
    }

    async reauth(secret: string): Promise<boolean> {
        // No accounts in the demo, so the parent PIN is the re-authentication.
        return this.checkPin(secret);
    }

    async deleteSpace(): Promise<void> {
        this.parentOnly();
        // The demo's "delete everything" is the demo reset: every wafe:demo:*
        // key, which is every row and every uploaded picture in this browser.
        try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i += 1) {
                const k = localStorage.key(i);
                if (k && k.startsWith("wafe:demo:")) keys.push(k);
            }
            keys.forEach((k) => localStorage.removeItem(k));
        } catch {
            /* nothing persisted, nothing to clear */
        }
        this.cache = null;
    }

    private nameOf(id: string): string {
        return this.ctx.members.find((m) => m.id === id)?.name ?? "someone new";
    }
}

/** A new month starts the meter again — the cap is monthly, not lifetime. */
function rollMonth(usage: FamilyState["usage"], today: string): FamilyState["usage"] {
    const month = today.slice(0, 7);
    return usage.month === month ? usage : { month, calls: 0, images: 0, mediaMb: usage.mediaMb, reels: 0 };
}

const summarise = (s: FamilySettings): string =>
    `week ${s.weekStart} · briefing ${s.briefingHour} · check-in ${s.checkinHour} · grace ${s.graceDays.join("/") || "none"} · approve over ${s.purchaseApprovalCents} · ${s.plan} · quiet ${s.quietFrom}-${s.quietTo} · digest ${s.digestAbove}`;

function describeSettings(patch: Partial<FamilySettings>): string {
    const keys = Object.keys(patch);
    if (keys.includes("plan")) return `Changed the plan to ${patch.plan}`;
    if (keys.includes("graceDays")) return "Changed the grace days";
    if (keys.includes("purchaseApprovalCents")) return "Changed the purchase-approval threshold";
    if (keys.includes("briefingHour") || keys.includes("checkinHour")) return "Changed the family's rhythms";
    if (keys.includes("quietFrom") || keys.includes("quietTo") || keys.includes("digestAbove") || keys.includes("notifyPush") || keys.includes("notifyEmail")) return "Changed the notification defaults";
    return "Changed the family settings";
}
