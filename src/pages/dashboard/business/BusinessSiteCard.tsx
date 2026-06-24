import { useEffect, useRef, useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
    addCustomDomain,
    checkDomainStatus,
    listDomains,
    removeDomain,
    searchDomain,
    setPrimaryDomain,
    startDomainPurchase,
    type Domain,
} from "@/lib/db/domains";
import { updateBusiness, type Organization } from "@/lib/db/organizations";

// "Site & domains" for a business — storefront app, deployed URL, and domains.
// Owners can LINK their own domain (we attach it — plus its www↔apex pair — to the
// storefront on Vercel and show the exact DNS records to add) or BUY one through
// Phoxta (auto-configured). While a linked domain is verifying we poll Vercel in the
// background so it flips to "live" on its own. All driven by the domain-manager edge
// function; the owner never touches Vercel.

const STATUS_BADGE: Record<Domain["status"], string> = {
    live: "bg-success-subtle text-success",
    verifying: "bg-warning-subtle text-warning",
    pending: "bg-neutral-100 neutral-700",
    error: "bg-danger-subtle text-danger",
};

const LIFECYCLE: Array<Organization["lifecycle_stage"]> = ["draft", "building", "operating", "archived"];

type Props = { org: Organization; canManage: boolean; onUpdated: (patch: Partial<Organization>) => void };

export default function BusinessSiteCard({ org, canManage, onUpdated }: Props) {
    const { data: cachedDomains, loading } = useCachedData(
        `domains:${org.id}`,
        async () => (await listDomains(org.id)).data,
        { ttl: DASHBOARD_TTL },
    );
    const [domains, setDomains] = useState<Domain[]>([]);
    const [host, setHost] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [siteUrl, setSiteUrl] = useState(org.site_url ?? "");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    // Buy-a-domain state
    const [showBuy, setShowBuy] = useState(false);
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [result, setResult] = useState<{ host: string; available: boolean; price: number | null } | null>(null);

    async function reload() {
        const { data } = await listDomains(org.id);
        setDomains(data);
    }
    // Seed the domains list from cache once; reload() refreshes it after changes.
    const seededRef = useRef(false);
    useEffect(() => {
        if (!cachedDomains || seededRef.current) return;
        seededRef.current = true;
        setDomains(cachedDomains);
    }, [cachedDomains]);

    // The canonical address a visitor would type: the primary live domain, else any
    // live domain (prefer the custom one over the Phoxta subdomain).
    const liveDomains = domains.filter((d) => d.status === "live");
    const primary =
        liveDomains.find((d) => d.is_primary) ??
        liveDomains.find((d) => d.kind === "custom") ??
        liveDomains[0] ??
        null;

    // Background auto-verify: while any linked domain is verifying, re-check it every
    // 20s (up to ~5 min) so it goes live without the owner clicking Verify.
    const verifyingKey = domains.map((d) => `${d.id}:${d.status}`).join(",");
    useEffect(() => {
        const verifyingIds = domains.filter((d) => d.kind === "custom" && d.status === "verifying").map((d) => d.id);
        if (verifyingIds.length === 0) return;
        let tries = 0;
        const iv = window.setInterval(async () => {
            tries += 1;
            let changed = false;
            for (const id of verifyingIds) {
                const { status } = await checkDomainStatus(id);
                if (status === "live") changed = true;
            }
            if (changed || tries >= 15) {
                window.clearInterval(iv);
                reload();
            }
        }, 20000);
        return () => window.clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verifyingKey]);

    // Handle return from Stripe Checkout (?domain=success|cancel).
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const r = p.get("domain");
        if (r === "success") {
            setMsg(`Payment received — ${p.get("host") || "your domain"} is being set up and will be live in a moment.`);
            window.history.replaceState({}, "", window.location.pathname);
            setTimeout(reload, 2500);
        } else if (r === "cancel") {
            setMsg("Checkout cancelled — no charge was made.");
            window.history.replaceState({}, "", window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function copy(text: string, key: string) {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
        } catch {
            /* clipboard blocked — ignore */
        }
    }

    async function onAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!host.trim()) return;
        setBusy(true);
        setMsg(null);
        const { domainId, error } = await addCustomDomain(org.id, host);
        setBusy(false);
        if (error) return setMsg(error);
        setHost("");
        await reload();
        if (domainId) setExpanded(domainId); // show the DNS records to add
        setMsg("Domain linked — add the DNS records below. We'll keep checking and it'll go live automatically once DNS propagates.");
    }

    async function onVerify(d: Domain) {
        setBusy(true);
        setMsg(null);
        const { status, verified, misconfigured, error } = await checkDomainStatus(d.id);
        setBusy(false);
        if (error) return setMsg(error);
        if (status === "live") setMsg(`${d.hostname} is verified and live 🎉`);
        else if (!verified) setMsg(`${d.hostname}: ownership not confirmed yet — make sure the records below are saved exactly. DNS can take a few minutes.`);
        else if (misconfigured) setMsg(`${d.hostname}: DNS records not detected yet — they're propagating. We'll keep checking.`);
        else setMsg(`${d.hostname} isn't ready yet — checking again shortly.`);
        reload();
    }

    async function onPrimary(d: Domain) {
        await setPrimaryDomain(org.id, d.id);
        reload();
    }
    async function onRemove(d: Domain) {
        if (!confirm(`Remove ${d.hostname}? Traffic to it will stop resolving.`)) return;
        await removeDomain(d.id);
        reload();
    }

    async function onSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;
        setSearching(true);
        setMsg(null);
        setResult(null);
        const { host: h, available, price, error } = await searchDomain(org.id, query);
        setSearching(false);
        if (error) return setMsg(error);
        setResult({ host: h, available, price });
    }

    async function onBuy() {
        if (!result) return;
        setBusy(true);
        setMsg(null);
        const { url, error } = await startDomainPurchase(org.id, result.host, window.location.href);
        setBusy(false);
        if (error) return setMsg(error);
        if (url) window.location.href = url; // → Stripe Checkout; webhook finalizes on payment
    }

    async function onSaveSite() {
        setBusy(true);
        setMsg(null);
        const { error } = await updateBusiness(org.id, { site_url: siteUrl.trim() || null });
        setBusy(false);
        if (error) return setMsg(error);
        onUpdated({ site_url: siteUrl.trim() || null });
        setMsg("Saved.");
    }

    async function onLifecycle(stage: Organization["lifecycle_stage"]) {
        const { error } = await updateBusiness(org.id, { lifecycle_stage: stage });
        if (error) return setMsg(error);
        onUpdated({ lifecycle_stage: stage });
    }

    return (
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <h6 className="fw-600 mb-0">Site &amp; domains</h6>
                <div className="d-flex align-items-center gap-2">
                    <span className="fz-font-sm neutral-500">Stage</span>
                    {canManage ? (
                        <select
                            className="form-select form-select-sm rounded-3 text-capitalize"
                            style={{ width: "auto" }}
                            value={org.lifecycle_stage ?? "draft"}
                            onChange={(e) => onLifecycle(e.target.value as Organization["lifecycle_stage"])}
                        >
                            {LIFECYCLE.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{org.lifecycle_stage ?? "draft"}</span>
                    )}
                </div>
            </div>

            {/* Live address — the canonical primary domain */}
            <div className="mb-4">
                <div className="fz-font-sm fw-600 neutral-500 mb-1">Live at</div>
                {primary ? (
                    <a className="fz-font-md fw-600 text-success text-decoration-none d-inline-flex align-items-center gap-1" href={`https://${primary.hostname}`} target="_blank" rel="noreferrer">
                        {primary.hostname} <span aria-hidden>↗</span>
                    </a>
                ) : (
                    <div className="fz-font-md neutral-500">Not live yet — add or buy a domain below.</div>
                )}
            </div>

            {/* Storefront app */}
            <div className="mb-4">
                <div className="fz-font-sm fw-600 neutral-500 mb-1">Storefront app</div>
                <div className="fz-font-md neutral-700 mb-3">
                    {org.app_path ? <code>{org.app_path}</code> : <span className="neutral-500">Not linked to a storefront app</span>}
                </div>
                <div className="fz-font-sm fw-600 neutral-500 mb-1">External site URL <span className="fw-400 neutral-400">(optional override)</span></div>
                <div className="d-flex gap-2">
                    <input
                        className="form-control form-control-sm rounded-3"
                        placeholder="https://your-business.example.com"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        disabled={!canManage}
                    />
                    {canManage && (
                        <button type="button" className="btn btn-dark btn-sm rounded-3 px-3 flex-shrink-0" onClick={onSaveSite} disabled={busy}>
                            Save
                        </button>
                    )}
                </div>
            </div>

            {/* Domains */}
            <div className="fz-font-sm fw-600 neutral-500 mb-2">Domains</div>
            {loading ? (
                <div className="neutral-500 fz-font-md">Loading…</div>
            ) : (
                <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                    {domains.length === 0 && <li className="neutral-500 fz-font-md">No domains yet.</li>}
                    {domains.map((d) => (
                        <li key={d.id} className="border-100 rounded-3 p-3">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="d-flex align-items-center gap-2 flex-wrap">
                                    <span className="fw-500 neutral-900">{d.hostname}</span>
                                    {d.is_primary && <span className="badge bg-neutral-900 text-white fw-500">Primary</span>}
                                    <span className={`badge fw-500 text-capitalize ${STATUS_BADGE[d.status]}`}>
                                        {d.status === "verifying" ? "verifying…" : d.status}
                                    </span>
                                    {d.kind === "subdomain" && <span className="badge bg-neutral-100 neutral-700 fw-500">Phoxta subdomain</span>}
                                    {d.source === "purchased" && <span className="badge bg-info-subtle text-info fw-500">Purchased</span>}
                                </span>
                                {canManage && (
                                    <span className="d-flex align-items-center gap-2">
                                        {d.kind === "custom" && d.status !== "live" && (
                                            <button type="button" className="btn btn-link btn-sm p-0 fw-600 text-decoration-none" onClick={() => onVerify(d)} disabled={busy}>
                                                Verify
                                            </button>
                                        )}
                                        {d.kind === "custom" && d.dns_records?.length > 0 && (
                                            <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                                                DNS records
                                            </button>
                                        )}
                                        {d.status === "live" && !d.is_primary && (
                                            <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => onPrimary(d)}>
                                                Set primary
                                            </button>
                                        )}
                                        {d.kind === "custom" && (
                                            <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => onRemove(d)}>
                                                Remove
                                            </button>
                                        )}
                                    </span>
                                )}
                            </div>
                            {expanded === d.id && d.kind === "custom" && (
                                <div className="mt-3 fz-font-sm neutral-700">
                                    <div className="neutral-500 mb-2">Add these at your domain's DNS provider. We check automatically — it goes live once DNS propagates (usually a few minutes):</div>
                                    {(d.dns_records ?? []).map((r, i) => (
                                        <div key={i} className="bg-neutral-50 rounded-3 p-2 mb-2 d-flex align-items-center justify-content-between gap-2 text-break">
                                            <span>
                                                <span className="fw-600">{r.type}</span> &nbsp;<code>{r.name}</code> → <code>{r.value}</code>
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none text-nowrap"
                                                onClick={() => copy(r.value, `${d.id}-${i}`)}
                                            >
                                                {copied === `${d.id}-${i}` ? "Copied ✓" : "Copy"}
                                            </button>
                                        </div>
                                    ))}
                                    {(!d.dns_records || d.dns_records.length === 0) && (
                                        <div className="neutral-500">No records needed.</div>
                                    )}
                                </div>
                            )}
                            {d.expires_at && (
                                <div className="fz-font-sm neutral-500 mt-2">Renews {new Date(d.expires_at).toLocaleDateString()}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canManage && (
                <>
                    {/* Link your own domain */}
                    <form onSubmit={onAdd} className="d-flex gap-2 mt-3">
                        <input className="form-control form-control-sm rounded-3" placeholder="yourbrand.com — link a domain you own" value={host} onChange={(e) => setHost(e.target.value)} />
                        <button type="submit" className="btn btn-outline-dark btn-sm rounded-3 px-3 flex-shrink-0" disabled={busy}>
                            Link domain
                        </button>
                    </form>
                    <div className="fz-font-sm neutral-500 mt-1">Linking a root domain (yourbrand.com) also connects www automatically.</div>

                    {/* Buy a domain */}
                    <button type="button" className="btn btn-link btn-sm p-0 mt-2 fw-600 text-decoration-none" onClick={() => setShowBuy((v) => !v)}>
                        {showBuy ? "− Hide" : "+ Buy a new domain"}
                    </button>
                    {showBuy && (
                        <div className="border-100 rounded-3 p-3 mt-2">
                            <form onSubmit={onSearch} className="d-flex gap-2">
                                <input className="form-control form-control-sm rounded-3" placeholder="yourbrand.com" value={query} onChange={(e) => setQuery(e.target.value)} />
                                <button type="submit" className="btn btn-dark btn-sm rounded-3 px-3 flex-shrink-0" disabled={searching}>
                                    {searching ? "…" : "Check"}
                                </button>
                            </form>
                            {result && (
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                                    <span className="fz-font-md">
                                        <code>{result.host}</code>{" "}
                                        {result.available
                                            ? <span className="text-success fw-600">available{result.price != null ? ` · $${result.price}/yr` : ""}</span>
                                            : <span className="neutral-500">not available</span>}
                                    </span>
                                    {result.available && result.price != null && (
                                        <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={onBuy} disabled={busy}>
                                            Buy &amp; connect
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="fz-font-sm neutral-500 mt-2">Purchased domains (and their www) are configured and secured automatically — no DNS setup needed.</div>
                        </div>
                    )}
                </>
            )}

            {msg && <div className="fz-font-md neutral-700 mt-3">{msg}</div>}
        </div>
    );
}
