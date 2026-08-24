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
import { Card, Chip } from "@/components/dash/Ui";

// "Site & domains" for a business — storefront app, deployed URL, and domains.
// Owners can LINK their own domain (we attach it — plus its www↔apex pair — to the
// storefront on Vercel and show the exact DNS records to add) or BUY one through
// Phoxta (auto-configured). While a linked domain is verifying we poll Vercel in the
// background so it flips to "live" on its own. All driven by the domain-manager edge
// function; the owner never touches Vercel.

const STATUS_TONE: Record<Domain["status"], "ok" | "warn" | "plain" | "danger"> = {
    live: "ok",
    verifying: "warn",
    pending: "plain",
    error: "danger",
};

const LIFECYCLE: Array<Organization["lifecycle_stage"]> = ["draft", "building", "operating", "archived"];

type Props = { org: Organization; canManage: boolean; onUpdated: (patch: Partial<Organization>) => void };

const CSS = `
.bzx-site-label { font-size: 13px; font-weight: 600; color: var(--hrx-muted); margin-bottom: 6px; }
.bzx-site-label .opt { font-weight: 400; }
.bzx-live-link { font-size: 15px; font-weight: 600; color: #15803d; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.bzx-live-link:hover { color: #15803d; text-decoration: underline; }
.bzx-domain { border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 12px 14px; background: #fff; }
.bzx-domain + .bzx-domain { margin-top: 8px; }
.bzx-linkbtn { background: none; border: 0; padding: 0; font-size: 13px; font-weight: 600; color: var(--hrx-blue); cursor: pointer; }
.bzx-linkbtn:hover { color: var(--hrx-blue-deep); }
.bzx-linkbtn.mut { color: var(--hrx-muted); font-weight: 500; }
.bzx-linkbtn.mut:hover { color: var(--hrx-ink); }
.bzx-dns { background: var(--hrx-soft); border-radius: 10px; padding: 8px 10px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; word-break: break-all; font-size: 13px; }
.bzx-buybox { border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 12px 14px; margin-top: 8px; background: var(--hrx-soft); }
.bzx-note { font-size: 13px; color: var(--hrx-muted); }
`;

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
        <Card
            title="Site & domains"
            right={
                <label className="d-flex align-items-center gap-2 mb-0">
                    <span className="bzx-note">Stage</span>
                    {canManage ? (
                        <select
                            className="form-select form-select-sm text-capitalize"
                            style={{ width: "auto" }}
                            value={org.lifecycle_stage ?? "draft"}
                            onChange={(e) => onLifecycle(e.target.value as Organization["lifecycle_stage"])}
                        >
                            {LIFECYCLE.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    ) : (
                        <Chip tone="line">{org.lifecycle_stage ?? "draft"}</Chip>
                    )}
                </label>
            }
        >
            <style>{CSS}</style>

            {/* Live address — the canonical primary domain */}
            <div className="mb-4">
                <div className="bzx-site-label">Live at</div>
                {primary ? (
                    <a className="bzx-live-link" href={`https://${primary.hostname}`} target="_blank" rel="noreferrer">
                        {primary.hostname} <span aria-hidden>↗</span>
                    </a>
                ) : (
                    <div className="bzx-note" style={{ fontSize: 14 }}>Not live yet — add or buy a domain below.</div>
                )}
            </div>

            {/* Storefront app */}
            <div className="mb-4">
                <div className="bzx-site-label">Storefront app</div>
                <div className="mb-3" style={{ fontSize: 14 }}>
                    {org.app_path ? <code>{org.app_path}</code> : <span className="bzx-note" style={{ fontSize: 14 }}>Not linked to a storefront app</span>}
                </div>
                <label className="hrx-field mb-0">
                    <span>External site URL <span className="opt">(optional override)</span></span>
                    <span className="d-flex gap-2">
                        <input
                            className="form-control"
                            placeholder="https://your-business.example.com"
                            value={siteUrl}
                            onChange={(e) => setSiteUrl(e.target.value)}
                            disabled={!canManage}
                        />
                        {canManage && (
                            <button type="button" className="hrx-pill dark flex-shrink-0" onClick={onSaveSite} disabled={busy}>
                                Save
                            </button>
                        )}
                    </span>
                </label>
            </div>

            {/* Domains */}
            <div className="bzx-site-label mb-2">Domains</div>
            {loading ? (
                <div className="bzx-note" style={{ fontSize: 14 }}>Loading…</div>
            ) : (
                <div>
                    {domains.length === 0 && <div className="bzx-note" style={{ fontSize: 14 }}>No domains yet.</div>}
                    {domains.map((d) => (
                        <div key={d.id} className="bzx-domain">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="d-flex align-items-center gap-2 flex-wrap">
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{d.hostname}</span>
                                    {d.is_primary && <Chip tone="solid">Primary</Chip>}
                                    <Chip tone={STATUS_TONE[d.status]}>{d.status === "verifying" ? "verifying…" : d.status}</Chip>
                                    {d.kind === "subdomain" && <Chip tone="line">Phoxta subdomain</Chip>}
                                    {d.source === "purchased" && <Chip tone="blue">Purchased</Chip>}
                                </span>
                                {canManage && (
                                    <span className="d-flex align-items-center gap-3">
                                        {d.kind === "custom" && d.status !== "live" && (
                                            <button type="button" className="bzx-linkbtn" onClick={() => onVerify(d)} disabled={busy}>
                                                Verify
                                            </button>
                                        )}
                                        {d.kind === "custom" && d.dns_records?.length > 0 && (
                                            <button type="button" className="bzx-linkbtn mut" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                                                DNS records
                                            </button>
                                        )}
                                        {d.status === "live" && !d.is_primary && (
                                            <button type="button" className="bzx-linkbtn mut" onClick={() => onPrimary(d)}>
                                                Set primary
                                            </button>
                                        )}
                                        {d.kind === "custom" && (
                                            <button type="button" className="bzx-linkbtn mut" onClick={() => onRemove(d)}>
                                                Remove
                                            </button>
                                        )}
                                    </span>
                                )}
                            </div>
                            {expanded === d.id && d.kind === "custom" && (
                                <div className="mt-3">
                                    <div className="bzx-note mb-2">Add these at your domain's DNS provider. We check automatically — it goes live once DNS propagates (usually a few minutes):</div>
                                    {(d.dns_records ?? []).map((r, i) => (
                                        <div key={i} className="bzx-dns">
                                            <span>
                                                <span style={{ fontWeight: 600 }}>{r.type}</span> &nbsp;<code>{r.name}</code> → <code>{r.value}</code>
                                            </span>
                                            <button
                                                type="button"
                                                className="bzx-linkbtn mut text-nowrap"
                                                onClick={() => copy(r.value, `${d.id}-${i}`)}
                                            >
                                                {copied === `${d.id}-${i}` ? "Copied ✓" : "Copy"}
                                            </button>
                                        </div>
                                    ))}
                                    {(!d.dns_records || d.dns_records.length === 0) && (
                                        <div className="bzx-note">No records needed.</div>
                                    )}
                                </div>
                            )}
                            {d.expires_at && (
                                <div className="bzx-note mt-2">Renews {new Date(d.expires_at).toLocaleDateString()}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canManage && (
                <>
                    {/* Link your own domain */}
                    <form onSubmit={onAdd} className="d-flex gap-2 mt-3">
                        <input className="form-control" placeholder="yourbrand.com — link a domain you own" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Domain to link" />
                        <button type="submit" className="hrx-pill flex-shrink-0" disabled={busy}>
                            Link domain
                        </button>
                    </form>
                    <div className="bzx-note mt-1">Linking a root domain (yourbrand.com) also connects www automatically.</div>

                    {/* Buy a domain */}
                    <button type="button" className="bzx-linkbtn mt-2" onClick={() => setShowBuy((v) => !v)}>
                        {showBuy ? "− Hide" : "+ Buy a new domain"}
                    </button>
                    {showBuy && (
                        <div className="bzx-buybox">
                            <form onSubmit={onSearch} className="d-flex gap-2">
                                <input className="form-control" placeholder="yourbrand.com" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Domain to check" />
                                <button type="submit" className="hrx-pill dark flex-shrink-0" disabled={searching}>
                                    {searching ? "…" : "Check"}
                                </button>
                            </form>
                            {result && (
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                                    <span style={{ fontSize: 14 }}>
                                        <code>{result.host}</code>{" "}
                                        {result.available
                                            ? <span style={{ color: "#15803d", fontWeight: 600 }}>available{result.price != null ? ` · $${result.price}/yr` : ""}</span>
                                            : <span className="bzx-note" style={{ fontSize: 14 }}>not available</span>}
                                    </span>
                                    {result.available && result.price != null && (
                                        <button type="button" className="hrx-pill primary" onClick={onBuy} disabled={busy}>
                                            Buy &amp; connect
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="bzx-note mt-2">Purchased domains (and their www) are configured and secured automatically — no DNS setup needed.</div>
                        </div>
                    )}
                </>
            )}

            {msg && <div className="mt-3" style={{ fontSize: 14 }} role="status">{msg}</div>}
        </Card>
    );
}
