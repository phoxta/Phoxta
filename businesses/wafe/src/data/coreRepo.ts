import type { AgeBand, Capability, Invite, Member, Notification, NotificationKind, Role, Space } from "@/data/core";

/**
 * The core repo: the space, its members, invitations and notifications —
 * everything that is not a module. Two implementations, like every module:
 * `LocalCoreRepo` (demo, in the browser) and `SupabaseCoreRepo` (live, RLS).
 */

export interface CoreState {
    space: Space;
    members: Member[];
    invites: Invite[];
    /** The current member's notifications, newest first. */
    notifications: Notification[];
}

export interface NewMember {
    name: string;
    relation: string;
    role: Role;
    ageBand: AgeBand;
    birthday?: string;
    email?: string;
    avatarUrl?: string;
}

export interface NewInvite {
    email: string;
    name: string;
    role: Role;
    relation: string;
}

export interface NewNotification {
    memberId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string | null;
}

export interface CoreRepo {
    readonly kind: "demo" | "live";
    load(): Promise<CoreState>;
    subscribe?(onChange: () => void): () => void;

    updateSpace(patch: Partial<Omit<Space, "id" | "createdAt">>): Promise<void>;

    addMember(input: NewMember): Promise<Member>;
    updateMember(id: string, patch: Partial<Omit<Member, "id" | "spaceId" | "joinedAt">>): Promise<void>;
    removeMember(id: string): Promise<void>;
    /** Widen (or withdraw) one capability for one non-parent member. */
    setGrant(memberId: string, cap: Capability, on: boolean): Promise<void>;
    /** Chore/learning points; `reason` is shown in the child's history. */
    addPoints(memberId: string, delta: number, reason: string): Promise<void>;

    invite(input: NewInvite): Promise<Invite>;
    revokeInvite(id: string): Promise<void>;

    notify(n: NewNotification): Promise<void>;
    markRead(ids?: string[]): Promise<void>;
    /** Nudge keys already raised in this space (so the engine raises each once). */
    raisedNudgeKeys(): Promise<string[]>;
    recordNudge(key: string): Promise<void>;

    /** Demo only: put the Adeyemi family back the way the brief left them. */
    resetDemo?(): Promise<void>;
}

/** A space the signed-in user belongs to (the space switcher). */
export interface SpaceSummary {
    id: string;
    name: string;
    role: Role;
    memberId: string;
}

export interface NewSpace {
    name: string;
    tagline: string;
    /** The creator's display name and relation ("Dad", "Mum", "Me"). */
    myName: string;
    myRelation: string;
    values: string[];
    mission: string;
    currency: string;
    timezone: string;
}
