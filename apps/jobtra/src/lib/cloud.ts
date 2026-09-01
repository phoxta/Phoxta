// Cloud sync for Jobtra — Supabase (Postgres + Realtime), replacing the original
// Firestore layer. The exported function names are kept as-is so the rest of the
// app is untouched; only the storage engine changed.
//
// Data model: one row per record, { id text PK, data jsonb }, in three tables:
//   jobtra_applications · jobtra_connected_accounts · jobtra_base_cvs
// Realtime mirrors Firestore's onSnapshot: on any change we refetch the whole
// table and re-emit the list.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { JobApplication, ConnectedAccount, BaseCV } from "../types";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
});

const T_APPS = "jobtra_applications";
const T_ACCOUNTS = "jobtra_connected_accounts";
const T_CVS = "jobtra_base_cvs";

// deno-lint-ignore no-explicit-any
type Row = { id: string; data: any };

async function upsertRow(table: string, id: string, data: unknown): Promise<void> {
    const clean = JSON.parse(JSON.stringify(data));
    const { error } = await supabase.from(table).upsert({ id, data: clean, updated_at: new Date().toISOString() });
    if (error) {
        console.error(`[jobtra] upsert ${table}/${id} failed:`, error.message);
        throw new Error(error.message);
    }
}

async function deleteRow(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
        console.error(`[jobtra] delete ${table}/${id} failed:`, error.message);
        throw new Error(error.message);
    }
}

async function fetchAll<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select("id, data");
    if (error) {
        console.warn(`[jobtra] fetch ${table} failed:`, error.message);
        return [];
    }
    return (data as Row[] | null ?? []).map((r) => r.data as T);
}

// Realtime subscription: initial load + live refetch on any row change.
function subscribe<T>(table: string, onData: (rows: T[]) => void, onError?: (err: unknown) => void) {
    let cancelled = false;
    const load = () => {
        fetchAll<T>(table).then((rows) => { if (!cancelled) onData(rows); }).catch((e) => onError?.(e));
    };
    load();
    const channel = supabase
        .channel(`jobtra:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
        .subscribe();
    return () => {
        cancelled = true;
        supabase.removeChannel(channel);
    };
}

// ── Applications ────────────────────────────────────────────────────────────
export async function saveApplicationToFirestore(app: JobApplication): Promise<void> {
    await upsertRow(T_APPS, app.id, app);
}
export async function deleteApplicationFromFirestore(id: string): Promise<void> {
    await deleteRow(T_APPS, id);
}
export async function saveAllApplicationsToFirestore(apps: JobApplication[]): Promise<void> {
    for (const app of apps) await saveApplicationToFirestore(app);
}
export function subscribeToApplications(onData: (apps: JobApplication[]) => void, onError?: (err: unknown) => void) {
    return subscribe<JobApplication>(T_APPS, onData, onError);
}
export async function clearAllApplicationsFromFirestore(): Promise<void> {
    const { error } = await supabase.from(T_APPS).delete().neq("id", "");
    if (error) console.warn("[jobtra] clear applications failed:", error.message);
}

// ── Connected accounts ──────────────────────────────────────────────────────
export async function saveConnectedAccountToFirestore(account: ConnectedAccount): Promise<void> {
    await upsertRow(T_ACCOUNTS, account.id, account);
}
export async function deleteConnectedAccountFromFirestore(id: string): Promise<void> {
    await deleteRow(T_ACCOUNTS, id);
}
export function subscribeToConnectedAccounts(onData: (accounts: ConnectedAccount[]) => void, onError?: (err: unknown) => void) {
    return subscribe<ConnectedAccount>(T_ACCOUNTS, onData, onError);
}

// ── Base CVs ────────────────────────────────────────────────────────────────
export async function saveBaseCVToFirestore(cv: BaseCV): Promise<void> {
    await upsertRow(T_CVS, cv.id, cv);
}
export async function deleteBaseCVFromFirestore(id: string): Promise<void> {
    await deleteRow(T_CVS, id);
}
export async function saveAllBaseCVsToFirestore(cvs: BaseCV[]): Promise<void> {
    for (const cv of cvs) await saveBaseCVToFirestore(cv);
}
export function subscribeToBaseCVs(onData: (cvs: BaseCV[]) => void, onError?: (err: unknown) => void) {
    return subscribe<BaseCV>(T_CVS, onData, onError);
}

// ── Misc (kept for API compatibility with the old Firestore module) ─────────
export async function testFirestoreConnection(): Promise<boolean> {
    if (!SUPABASE_URL) return false;
    try {
        const { error } = await supabase.from(T_APPS).select("id").limit(1);
        return !error;
    } catch {
        return false;
    }
}

export async function purgeLegacyDemoData(): Promise<void> {
    const legacyAppIds = ["app-1", "app-2", "app-3", "app-4", "app-5", "app-6"];
    const legacyAccIds = ["acc-1", "acc-2"];
    try { await supabase.from(T_APPS).delete().in("id", legacyAppIds); } catch { /* ignore */ }
    try { await supabase.from(T_ACCOUNTS).delete().in("id", legacyAccIds); } catch { /* ignore */ }
}
