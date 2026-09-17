import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Capability, Member, Role, Space } from "@/data/core";
import type { CoreRepo, CoreState, SpaceSummary } from "@/data/coreRepo";
import { DEMO_MEMBERS, DEMO_SPACE } from "@/data/coreSeed";
import { LocalCoreRepo } from "@/data/localCore";
import { SupabaseCoreRepo, listMySpaces } from "@/data/supabaseCore";
import { can as canFor } from "@/lib/perms";
import { isoDate } from "@/lib/format";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";

/**
 * Which family, and who am I in it.
 *
 * Demo: the Adeyemi family, and a "view as" switcher so a prospect can see the
 * product as Dad, Mum, Tobi (9) or Grandma — the role model is the product's
 * spine, so the demo lets you feel it. Live: the spaces this account belongs
 * to; the member row bound to the account decides the role.
 */

const VIEW_KEY = "wafe:demo:view-as";
const SPACE_KEY = "wafe:space";

export type SpaceCtx = {
    /** Core is loading (first paint shows a splash). */
    ready: boolean;
    kind: "demo" | "live";
    /** Live only: no space yet → onboarding. */
    noSpace: boolean;
    spaces: SpaceSummary[];
    space: Space;
    members: Member[];
    me: Member;
    role: Role;
    can: (c: Capability) => boolean;
    core: CoreRepo;
    coreState: CoreState;
    /** Demo only: preview the product as another member. */
    viewAs: (memberId: string) => void;
    switchSpace: (spaceId: string) => void;
    /** Reload core after a write (members, invites, notifications). */
    refreshCore: () => Promise<void>;
    mutateCore: (fn: (r: CoreRepo) => Promise<unknown>) => Promise<void>;
    /** Today in the space's timezone, YYYY-MM-DD. */
    today: string;
};

const Ctx = createContext<SpaceCtx | null>(null);

export function SpaceProvider({ children }: { children: ReactNode }) {
    const { session, demo } = useAuth();
    const { tenant } = useTenant();
    const live = Boolean(session?.user && tenant);
    const userId = session?.user?.id ?? null;

    const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
    const [spaceId, setSpaceId] = useState<string | null>(() => {
        try {
            return localStorage.getItem(SPACE_KEY);
        } catch {
            return null;
        }
    });
    const [viewAsId, setViewAsId] = useState<string>(() => {
        try {
            return localStorage.getItem(VIEW_KEY) || "mem-femi";
        } catch {
            return "mem-femi";
        }
    });
    const [coreState, setCoreState] = useState<CoreState | null>(null);
    const [ready, setReady] = useState(false);
    const [noSpace, setNoSpace] = useState(false);
    const gen = useRef(0);

    // Live: which spaces does this account belong to?
    useEffect(() => {
        if (!live || !userId || !tenant) {
            setSpaces([]);
            return;
        }
        let active = true;
        listMySpaces(tenant.id, userId).then((list) => {
            if (!active) return;
            setSpaces(list);
            if (!list.length) {
                setNoSpace(true);
                setReady(true);
                return;
            }
            setNoSpace(false);
            const chosen = list.find((s) => s.id === spaceId) ?? list[0];
            if (chosen.id !== spaceId) setSpaceId(chosen.id);
        });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live, userId, tenant?.id]);

    // The core repo for this mode/space.
    const core = useMemo<CoreRepo>(() => {
        if (live && tenant && spaceId && spaces.some((s) => s.id === spaceId)) {
            const s = spaces.find((x) => x.id === spaceId)!;
            return new SupabaseCoreRepo(tenant.id, spaceId, s.memberId);
        }
        return new LocalCoreRepo();
    }, [live, tenant, spaceId, spaces]);

    const refreshCore = useCallback(async () => {
        const my = ++gen.current;
        try {
            const s = await core.load();
            if (my === gen.current) setCoreState(s);
        } catch (e) {
            console.error("[wafe] core load failed", e);
        }
    }, [core]);

    useEffect(() => {
        if (live && (noSpace || !spaces.length)) return;
        let active = true;
        setReady(false);
        core.load()
            .then((s) => {
                if (!active) return;
                setCoreState(s);
            })
            .finally(() => active && setReady(true));
        const unsub = core.subscribe?.(() => void refreshCore());
        return () => {
            active = false;
            unsub?.();
        };
    }, [core, live, noSpace, spaces.length, refreshCore]);

    const mutateCore = useCallback(
        async (fn: (r: CoreRepo) => Promise<unknown>) => {
            await fn(core);
            await refreshCore();
        },
        [core, refreshCore],
    );

    const viewAs = useCallback((memberId: string) => {
        try {
            localStorage.setItem(VIEW_KEY, memberId);
        } catch {
            /* fine */
        }
        setViewAsId(memberId);
    }, []);

    const switchSpace = useCallback((id: string) => {
        try {
            localStorage.setItem(SPACE_KEY, id);
        } catch {
            /* fine */
        }
        setSpaceId(id);
    }, []);

    const value = useMemo<SpaceCtx>(() => {
        const state = coreState ?? { space: DEMO_SPACE, members: DEMO_MEMBERS, invites: [], notifications: [] };
        const members = state.members;
        let me: Member | undefined;
        if (live) {
            const s = spaces.find((x) => x.id === spaceId);
            me = members.find((x) => x.id === s?.memberId) ?? members.find((x) => x.userId === userId);
        } else {
            me = members.find((x) => x.id === viewAsId);
        }
        me = me ?? members.find((x) => x.role === "parent") ?? members[0];
        const role: Role = me?.role ?? "parent";
        const can = (c: Capability) => (me ? canFor(me, c) : false);
        return {
            ready: ready && Boolean(me),
            kind: live ? "live" : "demo",
            noSpace: live && noSpace,
            spaces,
            space: state.space,
            members,
            me: me as Member,
            role,
            can,
            core,
            coreState: state,
            viewAs,
            switchSpace,
            refreshCore,
            mutateCore,
            today: live ? isoDate() : isoDate(),
        };
    }, [coreState, live, spaces, spaceId, userId, viewAsId, ready, noSpace, core, viewAs, switchSpace, refreshCore, mutateCore]);

    // Demo mode is the Adeyemi family; the picker can't ever land on a member
    // that isn't there.
    useEffect(() => {
        if (demo && coreState && !coreState.members.some((x) => x.id === viewAsId)) viewAs("mem-femi");
    }, [demo, coreState, viewAsId, viewAs]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpace(): SpaceCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useSpace outside SpaceProvider");
    return ctx;
}
