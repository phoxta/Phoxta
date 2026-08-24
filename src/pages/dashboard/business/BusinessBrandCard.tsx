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
import { Card } from "@/components/dash/Ui";

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

const CSS = `
.bzx-brand-grid { display: grid; gap: 0 14px; grid-template-columns: repeat(12, minmax(0, 1fr)); }
.bzx-brand-grid > * { grid-column: span 12; }
@media (min-width: 576px) {
  .bzx-brand-grid > .c6 { grid-column: span 6; }
  .bzx-brand-grid > .c5 { grid-column: span 5; }
  .bzx-brand-grid > .c3 { grid-column: span 3; }
  .bzx-brand-grid > .c2 { grid-column: span 2; }
}
.bzx-ai { border: 1px solid var(--hrx-border-soft); background: var(--hrx-soft); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; }
.bzx-ai .t { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.bzx-logo-tile { border: 1px solid var(--hrx-border-soft); border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 6px; height: 56px; }
.bzx-logo-tile .none { font-size: 13px; color: var(--hrx-muted); }
.bzx-upload { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 34px; padding: 0 12px; border-radius: 50px; border: 1px solid var(--hrx-ink); background: #fff; color: var(--hrx-ink); font-size: 13px; font-weight: 500; cursor: pointer; margin-bottom: 0; white-space: nowrap; }
.bzx-upload:hover { background: var(--hrx-ink); color: #fff; }
.bzx-sec { font-size: 13px; font-weight: 600; color: var(--hrx-muted); margin: 4px 0 10px; }
.bzx-field-note { font-weight: 400; }
`;

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

    if (loading)
        return (
            <Card title="Brand & theme">
                <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>Loading brand…</p>
            </Card>
        );

    const radius = b.radius || "12px";
    const displayName = b.name?.trim() || org.name;

    return (
        <Card title="Brand & theme">
            <style>{CSS}</style>

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
                <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>You don&rsquo;t have permission to edit the brand.</p>
            ) : (
                <>
                    {/* AI rebrand */}
                    <div className="bzx-ai">
                        <div className="t">✨ AI brand &amp; SEO — describe your business and the look you want</div>
                        <div className="d-flex gap-2">
                            <input
                                className="form-control"
                                placeholder="e.g. modern luxury travel, deep navy & warm gold, elegant serif headings"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") onAi(); }}
                                aria-label="Describe your business and the look you want"
                            />
                            <button type="button" className="hrx-pill dark flex-shrink-0" onClick={onAi} disabled={aiBusy || !prompt.trim()}>
                                {aiBusy ? "Generating…" : "Generate"}
                            </button>
                        </div>
                    </div>

                    {/* Manual controls */}
                    <div className="bzx-brand-grid">
                        <label className="hrx-field c6">
                            <span>Brand name</span>
                            <input className="form-control" placeholder={org.name} value={b.name ?? ""} onChange={(e) => setB((p) => ({ ...p, name: e.target.value }))} />
                        </label>
                        <label className="hrx-field c6">
                            <span>Tagline</span>
                            <input className="form-control" placeholder="Short and memorable" value={b.tagline ?? ""} onChange={(e) => setB((p) => ({ ...p, tagline: e.target.value }))} />
                        </label>
                        <div className="mb-3">
                            <div className="bzx-sec mb-2">Logos &amp; favicon</div>
                            <div className="d-flex flex-wrap gap-3">
                                {([
                                    { key: "logo_url" as const, label: "Logo (dark)", w: 120, bg: "#ffffff" },
                                    { key: "logo_light" as const, label: "Logo (light)", w: 120, bg: "#111111" },
                                    { key: "favicon_url" as const, label: "Favicon", w: 56, bg: "#ffffff" },
                                ]).map(({ key, label, w, bg }) => (
                                    <div key={key}>
                                        <div style={{ fontSize: 13, color: "var(--hrx-muted)", marginBottom: 4 }}>{label}</div>
                                        <div className="bzx-logo-tile" style={{ width: w, background: bg }}>
                                            {b[key] ? <img src={b[key] as string} alt="" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} /> : <span className="none">none</span>}
                                        </div>
                                        <label className="bzx-upload">
                                            {up === key ? "Uploading…" : b[key] ? "Replace" : "Upload"}
                                            <input type="file" accept="image/*" hidden onChange={(e) => onUpload(key, e)} disabled={up === key} />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {(["primary", "accent", "bg", "text"] as const).map((k) => (
                            <label className="hrx-field c3" key={k}>
                                <span className="text-capitalize">{k === "bg" ? "Background" : k}</span>
                                <span className="d-flex align-items-center gap-2">
                                    <input type="color" className="form-control form-control-color p-1" style={{ width: 44 }} value={colors[k]} onChange={(e) => setColor(k, e.target.value)} aria-label={`${k === "bg" ? "Background" : k} colour picker`} />
                                    <input className="form-control" value={colors[k]} onChange={(e) => setColor(k, e.target.value)} />
                                </span>
                            </label>
                        ))}

                        <label className="hrx-field c5">
                            <span>Heading font</span>
                            <select className="form-select" value={fonts.heading} onChange={(e) => setFont("heading", e.target.value)}>
                                {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </label>
                        <label className="hrx-field c5">
                            <span>Body font</span>
                            <select className="form-select" value={fonts.body} onChange={(e) => setFont("body", e.target.value)}>
                                {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </label>
                        <label className="hrx-field c2">
                            <span>Radius</span>
                            <input className="form-control" value={radius} onChange={(e) => setB((p) => ({ ...p, radius: e.target.value }))} />
                        </label>

                        <label className="hrx-field">
                            <span>Business description <span className="bzx-field-note">(shows in the browser)</span></span>
                            <textarea className="form-control" rows={2} placeholder="What your business does, in a sentence or two." value={b.description ?? ""} onChange={(e) => setB((p) => ({ ...p, description: e.target.value }))} />
                        </label>

                        <div className="bzx-sec">Search engine (SEO)</div>
                        <label className="hrx-field">
                            <span>SEO title <span className="bzx-field-note">(≤ 60 chars)</span></span>
                            <input className="form-control" value={b.seo?.title ?? ""} onChange={(e) => setB((p) => ({ ...p, seo: { ...p.seo, title: e.target.value } }))} />
                        </label>
                        <label className="hrx-field">
                            <span>Meta description <span className="bzx-field-note">(≤ 155 chars)</span></span>
                            <textarea className="form-control" rows={2} value={b.seo?.description ?? ""} onChange={(e) => setB((p) => ({ ...p, seo: { ...p.seo, description: e.target.value } }))} />
                        </label>
                        <label className="hrx-field">
                            <span>Keywords</span>
                            <input className="form-control" placeholder="comma, separated, terms" value={b.seo?.keywords ?? ""} onChange={(e) => setB((p) => ({ ...p, seo: { ...p.seo, keywords: e.target.value } }))} />
                        </label>
                    </div>

                    <div className="d-flex align-items-center gap-3 mt-2">
                        <button type="button" className="hrx-pill dark" onClick={onSave} disabled={busy}>
                            {busy ? "Saving…" : "Save brand"}
                        </button>
                        {msg && <span style={{ fontSize: 14 }} role="status">{msg}</span>}
                    </div>
                </>
            )}
        </Card>
    );
}
