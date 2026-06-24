import { useEffect, useRef, useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getBusinessProfile, saveBusinessProfile, DEFAULT_HOURS, type BusinessProfile, type Hours } from "@/lib/db/businessProfile";
import type { Organization } from "@/lib/db/organizations";

// "Hours & location" — opening hours, address, contact and map location for a
// business. Saved to organizations.profile; the storefront reads it via
// app_resolve_domain and shows it (e.g. on the contact page + a map).

type Props = { org: Organization; canManage: boolean };

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

    if (loading) return <div className="bg-neutral-0 rounded-4 p-4 border-100 neutral-500 fz-font-md">Loading profile…</div>;

    return (
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <h6 className="fw-600 mb-3">Hours &amp; location</h6>
            {!canManage ? (
                <div className="neutral-500 fz-font-md">You don't have permission to edit this.</div>
            ) : (
                <>
                    <div className="row g-3 mb-3">
                        <div className="col-md-6"><label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Address</label><input className="form-control form-control-sm rounded-3" placeholder="12 Rue de Rivoli, Paris" value={p.address ?? ""} onChange={(e) => setP({ ...p, address: e.target.value })} /></div>
                        <div className="col-md-6"><label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Map location <span className="fw-400 neutral-400">(address or place name)</span></label><input className="form-control form-control-sm rounded-3" placeholder="defaults to the address" value={p.mapQuery ?? ""} onChange={(e) => setP({ ...p, mapQuery: e.target.value })} /></div>
                        <div className="col-md-6"><label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Phone</label><input className="form-control form-control-sm rounded-3" placeholder="+1 (555) 123-4567" value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
                        <div className="col-md-6"><label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Email</label><input className="form-control form-control-sm rounded-3" placeholder="hello@yourbusiness.com" value={p.email ?? ""} onChange={(e) => setP({ ...p, email: e.target.value })} /></div>
                    </div>

                    <div className="fz-font-sm fw-600 neutral-500 mb-2">Opening hours</div>
                    {hours.map((h, i) => (
                        <div key={h.day} className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <div style={{ width: 96 }} className="fz-font-md neutral-700">{h.day}</div>
                            <label className="fz-font-sm neutral-600 mb-0" style={{ width: 78 }}><input type="checkbox" checked={h.closed} onChange={(e) => setHour(i, { closed: e.target.checked })} className="me-1" />Closed</label>
                            {!h.closed && (
                                <>
                                    <input type="time" className="form-control form-control-sm rounded-3" style={{ width: 130 }} value={h.open} onChange={(e) => setHour(i, { open: e.target.value })} />
                                    <span className="neutral-400">to</span>
                                    <input type="time" className="form-control form-control-sm rounded-3" style={{ width: 130 }} value={h.close} onChange={(e) => setHour(i, { close: e.target.value })} />
                                </>
                            )}
                        </div>
                    ))}

                    <div className="d-flex align-items-center gap-3 mt-3">
                        <button type="button" className="btn btn-dark btn-sm rounded-3 px-4" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                        {msg && <span className="fz-font-md neutral-700">{msg}</span>}
                    </div>
                </>
            )}
        </div>
    );
}
