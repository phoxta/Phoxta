import { useEffect, useRef, useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getBusinessProfile, saveBusinessProfile, DEFAULT_HOURS, type BusinessProfile, type Hours } from "@/lib/db/businessProfile";
import type { Organization } from "@/lib/db/organizations";
import { Card } from "@/components/dash/Ui";

// "Hours & location" — opening hours, address, contact and map location for a
// business. Saved to organizations.profile; the storefront reads it via
// app_resolve_domain and shows it (e.g. on the contact page + a map).

type Props = { org: Organization; canManage: boolean };

const CSS = `
.bzx-prof-grid { display: grid; gap: 0 14px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 768px) { .bzx-prof-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.bzx-hours-title { font-size: 13px; font-weight: 600; color: var(--hrx-muted); margin: 4px 0 8px; }
.bzx-hour-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 0; border-top: 1px solid var(--hrx-border-soft); }
.bzx-hour-row:first-of-type { border-top: 0; }
.bzx-hour-row .day { width: 96px; font-size: 14px; font-weight: 500; }
.bzx-hour-row .closed { width: 84px; font-size: 13px; color: var(--hrx-muted); margin: 0; display: inline-flex; align-items: center; gap: 5px; }
.bzx-hour-row .to { color: var(--hrx-muted); font-size: 13px; }
`;

export default function BusinessProfileCard({ org, canManage }: Props) {
    const { data: profile, loading } = useCachedData(
        `bizProfile:${org.id}`,
        async () => (await getBusinessProfile(org.id)).data,
        { ttl: DASHBOARD_TTL },
    );
    const [p, setP] = useState<BusinessProfile>({});
    const [hours, setHours] = useState<Hours[]>(DEFAULT_HOURS);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    // Seed the editable form once from the cached profile (guard avoids clobbering edits).
    const seededRef = useRef(false);
    useEffect(() => {
        if (!profile || seededRef.current) return;
        seededRef.current = true;
        setP(profile);
        setHours(profile.hours?.length === 7 ? profile.hours : DEFAULT_HOURS);
    }, [profile]);

    const setHour = (i: number, patch: Partial<Hours>) => setHours((h) => h.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

    async function save() {
        setBusy(true);
        setMsg(null);
        const { error } = await saveBusinessProfile(org.id, { ...p, hours });
        setBusy(false);
        setMsg(error ?? "Saved — your storefront now shows this.");
    }

    if (loading)
        return (
            <Card title="Hours & location">
                <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>Loading profile…</p>
            </Card>
        );

    return (
        <Card title="Hours & location">
            <style>{CSS}</style>
            {!canManage ? (
                <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>You don&rsquo;t have permission to edit this.</p>
            ) : (
                <>
                    <div className="bzx-prof-grid">
                        <label className="hrx-field">
                            <span>Address</span>
                            <input className="form-control" placeholder="12 Rue de Rivoli, Paris" value={p.address ?? ""} onChange={(e) => setP({ ...p, address: e.target.value })} />
                        </label>
                        <label className="hrx-field">
                            <span>Map location (address or place name)</span>
                            <input className="form-control" placeholder="defaults to the address" value={p.mapQuery ?? ""} onChange={(e) => setP({ ...p, mapQuery: e.target.value })} />
                        </label>
                        <label className="hrx-field">
                            <span>Phone</span>
                            <input className="form-control" placeholder="+1 (555) 123-4567" value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} />
                        </label>
                        <label className="hrx-field">
                            <span>Email</span>
                            <input className="form-control" placeholder="hello@yourbusiness.com" value={p.email ?? ""} onChange={(e) => setP({ ...p, email: e.target.value })} />
                        </label>
                    </div>

                    <div className="bzx-hours-title">Opening hours</div>
                    {hours.map((h, i) => (
                        <div key={h.day} className="bzx-hour-row">
                            <div className="day">{h.day}</div>
                            <label className="closed">
                                <input type="checkbox" checked={h.closed} onChange={(e) => setHour(i, { closed: e.target.checked })} />
                                Closed
                            </label>
                            {!h.closed && (
                                <>
                                    <input type="time" className="form-control form-control-sm" style={{ width: 130 }} value={h.open} onChange={(e) => setHour(i, { open: e.target.value })} aria-label={`${h.day} opens at`} />
                                    <span className="to">to</span>
                                    <input type="time" className="form-control form-control-sm" style={{ width: 130 }} value={h.close} onChange={(e) => setHour(i, { close: e.target.value })} aria-label={`${h.day} closes at`} />
                                </>
                            )}
                        </div>
                    ))}

                    <div className="d-flex align-items-center gap-3 mt-3">
                        <button type="button" className="hrx-pill dark" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                        {msg && <span style={{ fontSize: 14 }} role="status">{msg}</span>}
                    </div>
                </>
            )}
        </Card>
    );
}
