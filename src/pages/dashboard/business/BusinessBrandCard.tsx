import { useEffect, useRef, useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
    aiRebrand,
    EMPTY_BRANDING,
    FONT_CHOICES,
    getBranding,
    saveBranding,
    uploadBrandImage,
    type Branding,
} from "@/lib/db/branding";
import type { Organization } from "@/lib/db/organizations";

// "Brand & theme" — the per-tenant look. Owners set a logo, palette, font pairing
// and corner radius (or generate the whole thing from a one-line AI prompt), preview
// it live, and save. The storefront reads this via app_resolve_domain and themes
// itself, so every buyer of the same blueprint gets their own brand.

type Props = { org: Organization; canManage: boolean };

const fontHref = (families: string[]) =>
    `https://fonts.googleapis.com/css2?${families
        .filter(Boolean)
        .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
        .join("&")}&display=swap`;

export default function BusinessBrandCard({ org, canManage }: Props) {
    const { data: branding, loading } = useCachedData(
        `branding:${org.id}`,
        async () => (await getBranding(org.id)).data,
        { ttl: DASHBOARD_TTL },
    );
    const [b, setB] = useState<Branding>({ ...EMPTY_BRANDING });
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const [aiBusy, setAiBusy] = useState(false);
    const [up, setUp] = useState<string | null>(null);

    async function onUpload(key: "logo_url" | "logo_light" | "favicon_url", e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUp(key);
        setMsg(null);
        const { url, error } = await uploadBrandImage(org.id, file);
        setUp(null);
        if (error) return setMsg(error);
        if (url) setB((p) => ({ ...p, [key]: url }));
    }

    // Seed the editable branding once from cache (guard avoids clobbering edits).
    const seededRef = useRef(false);
    useEffect(() => {
        if (!branding || seededRef.current) return;
        seededRef.current = true;
        setB({ ...EMPTY_BRANDING, ...branding, colors: { ...EMPTY_BRANDING.colors, ...branding.colors }, fonts: { ...EMPTY_BRANDING.fonts, ...branding.fonts } });
    }, [branding]);

    // Load the chosen Google Fonts so the preview renders in them.
    useEffect(() => {
        const heading = b.fonts?.heading || "Poppins";
        const body = b.fonts?.body || "Inter";
        const id = "brand-preview-fonts";
        let link = document.getElementById(id) as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        link.href = fontHref([heading, body]);
    }, [b.fonts?.heading, b.fonts?.body]);

    const colors = { ...EMPTY_BRANDING.colors, ...b.colors };
    const fonts = { ...EMPTY_BRANDING.fonts, ...b.fonts };
    const setColor = (k: keyof NonNullable<Branding["colors"]>, v: string) => setB((p) => ({ ...p, colors: { ...p.colors, [k]: v } }));
    const setFont = (k: keyof NonNullable<Branding["fonts"]>, v: string) => setB((p) => ({ ...p, fonts: { ...p.fonts, [k]: v } }));

    async function onSave() {
        setBusy(true);
        setMsg(null);
        const { error } = await saveBranding(org.id, b);
        setBusy(false);
        setMsg(error ?? "Brand saved — your storefront now uses it.");
    }

    async function onAi() {
        if (!prompt.trim()) return;
        setAiBusy(true);
        setMsg(null);
        const { data, error } = await aiRebrand(org.id, prompt.trim());
        setAiBusy(false);
        if (error) return setMsg(error);
        if (data) {
            setB((p) => ({ ...p, ...data, colors: { ...p.colors, ...data.colors }, fonts: { ...p.fonts, ...data.fonts } }));
            setMsg("AI generated your brand, description & SEO — tweak anything, then Save.");
        }
    }

    if (loading) return <div className="bg-neutral-0 rounded-4 p-4 border-100 neutral-500 fz-font-md">Loading brand…</div>;

    const radius = b.radius || "12px";
    const displayName = b.name?.trim() || org.name;

    return (
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <h6 className="fw-600 mb-3">Brand &amp; theme</h6>

            {/* Live preview */}
            <div className="mb-4" style={{ background: colors.bg, color: colors.text, borderRadius: radius, padding: "1.5rem", border: "1px solid rgba(0,0,0,.08)" }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                    {b.logo_url
                        ? <img src={b.logo_url} alt="" height={28} style={{ maxHeight: 28 }} />
                        : <span style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary, display: "inline-block" }} />}
                    <span style={{ fontFamily: `'${fonts.heading}', sans-serif`, fontWeight: 700, fontSize: 20, color: colors.text }}>{displayName}</span>
                </div>
                <div style={{ fontFamily: `'${fonts.heading}', sans-serif`, fontWeight: 700, fontSize: 26, lineHeight: 1.15, marginBottom: 6, color: colors.text }}>
                    {b.tagline?.trim() || "Your headline, your brand."}
                </div>
                <p style={{ fontFamily: `'${fonts.body}', sans-serif`, fontSize: 14, opacity: 0.8, marginBottom: 14 }}>
                    This is how body copy looks on your storefront — set the palette, fonts and shape to make it yours.
                </p>
                <div className="d-flex gap-2 flex-wrap">
                    <span style={{ background: colors.primary, color: "#fff", fontFamily: `'${fonts.body}', sans-serif`, fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: radius }}>Primary action</span>
                    <span style={{ border: `1px solid ${colors.accent}`, color: colors.accent, fontFamily: `'${fonts.body}', sans-serif`, fontWeight: 600, fontSize: 13, padding: "8px 16px", borderRadius: radius }}>Accent</span>
                </div>
            </div>

            {!canManage ? (
                <div className="neutral-500 fz-font-md">You don't have permission to edit the brand.</div>
            ) : (
                <>
                    {/* AI rebrand */}
                    <div className="border-100 rounded-3 p-3 mb-3">
                        <div className="fz-font-sm fw-600 neutral-700 mb-2">✨ AI brand &amp; SEO — describe your business and the look you want</div>
                        <div className="d-flex gap-2">
                            <input
                                className="form-control form-control-sm rounded-3"
                                placeholder="e.g. modern luxury travel, deep navy & warm gold, elegant serif headings"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") onAi(); }}
                            />
                            <button type="button" className="btn btn-dark btn-sm rounded-3 px-3 flex-shrink-0" onClick={onAi} disabled={aiBusy || !prompt.trim()}>
                                {aiBusy ? "Generating…" : "Generate"}
                            </button>
                        </div>
                    </div>

                    {/* Manual controls */}
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Brand name</label>
                            <input className="form-control form-control-sm rounded-3" placeholder={org.name} value={b.name ?? ""} onChange={(e) => setB((p) => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="col-sm-6">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Tagline</label>
                            <input className="form-control form-control-sm rounded-3" placeholder="Short and memorable" value={b.tagline ?? ""} onChange={(e) => setB((p) => ({ ...p, tagline: e.target.value }))} />
                        </div>
                        <div className="col-12">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-2">Logos &amp; favicon</label>
                            <div className="d-flex flex-wrap gap-3">
                                {([
                                    { key: "logo_url" as const, label: "Logo (dark)", w: 120, bg: "#ffffff" },
                                    { key: "logo_light" as const, label: "Logo (light)", w: 120, bg: "#111111" },
                                    { key: "favicon_url" as const, label: "Favicon", w: 56, bg: "#ffffff" },
                                ]).map(({ key, label, w, bg }) => (
                                    <div key={key}>
                                        <div className="fz-font-sm neutral-500 mb-1">{label}</div>
                                        <div className="rounded-3 border-100 d-flex align-items-center justify-content-center overflow-hidden mb-1" style={{ width: w, height: 56, background: bg }}>
                                            {b[key] ? <img src={b[key] as string} alt="" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} /> : <span className="neutral-400 fz-font-sm">none</span>}
                                        </div>
                                        <label className="btn btn-outline-dark btn-sm rounded-3 mb-0 w-100" style={{ cursor: "pointer" }}>
                                            {up === key ? "Uploading…" : b[key] ? "Replace" : "Upload"}
                                            <input type="file" accept="image/*" hidden onChange={(e) => onUpload(key, e)} disabled={up === key} />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {(["primary", "accent", "bg", "text"] as const).map((k) => (
                            <div className="col-6 col-md-3" key={k}>
                                <label className="fz-font-sm fw-600 neutral-500 d-block mb-1 text-capitalize">{k === "bg" ? "Background" : k}</label>
                                <div className="d-flex align-items-center gap-2">
                                    <input type="color" className="form-control form-control-sm form-control-color rounded-3 p-1" style={{ width: 44 }} value={colors[k]} onChange={(e) => setColor(k, e.target.value)} />
                                    <input className="form-control form-control-sm rounded-3" value={colors[k]} onChange={(e) => setColor(k, e.target.value)} />
                                </div>
                            </div>
                        ))}

                        <div className="col-sm-5">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Heading font</label>
                            <select className="form-select form-select-sm rounded-3" value={fonts.heading} onChange={(e) => setFont("heading", e.target.value)}>
                                {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="col-sm-5">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Body font</label>
                            <select className="form-select form-select-sm rounded-3" value={fonts.body} onChange={(e) => setFont("body", e.target.value)}>
                                {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="col-sm-2">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Radius</label>
                            <input className="form-control form-control-sm rounded-3" value={radius} onChange={(e) => setB((p) => ({ ...p, radius: e.target.value }))} />
                        </div>

                        <div className="col-12">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Business description <span className="fw-400 neutral-400">(shows in the browser)</span></label>
                            <textarea className="form-control form-control-sm rounded-3" rows={2} placeholder="What your business does, in a sentence or two." value={b.description ?? ""} onChange={(e) => setB((p) => ({ ...p, description: e.target.value }))} />
                        </div>

                        <div className="col-12"><div className="fz-font-sm fw-600 neutral-700 mt-1">Search engine (SEO)</div></div>
                        <div className="col-12">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">SEO title <span className="fw-400 neutral-400">(≤ 60 chars)</span></label>
                            <input className="form-control form-control-sm rounded-3" value={b.seo?.title ?? ""} onChange={(e) => setB((p) => ({ ...p, seo: { ...p.seo, title: e.target.value } }))} />
                        </div>
                        <div className="col-12">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Meta description <span className="fw-400 neutral-400">(≤ 155 chars)</span></label>
                            <textarea className="form-control form-control-sm rounded-3" rows={2} value={b.seo?.description ?? ""} onChange={(e) => setB((p) => ({ ...p, seo: { ...p.seo, description: e.target.value } }))} />
                        </div>
                        <div className="col-12">
                            <label className="fz-font-sm fw-600 neutral-500 d-block mb-1">Keywords</label>
                            <input className="form-control form-control-sm rounded-3" placeholder="comma, separated, terms" value={b.seo?.keywords ?? ""} onChange={(e) => setB((p) => ({ ...p, seo: { ...p.seo, keywords: e.target.value } }))} />
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-3 mt-3">
                        <button type="button" className="btn btn-dark btn-sm rounded-3 px-4" onClick={onSave} disabled={busy}>
                            {busy ? "Saving…" : "Save brand"}
                        </button>
                        {msg && <span className="fz-font-md neutral-700">{msg}</span>}
                    </div>
                </>
            )}
        </div>
    );
}
