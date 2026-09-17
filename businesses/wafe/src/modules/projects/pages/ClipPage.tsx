import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Scissors, Sparkles } from "lucide-react";
import type { Visibility } from "@/data/core";
import { useAi } from "@/lib/ai";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Notice, PageTitle, VisibilityPicker } from "@/components/shared";
import { Button, Field } from "@/components/ui/primitives";
import projectsModule from "../module";
import { BASE, activeProjects, hostOf, snapshotFrom } from "../derive";
import { Select, TextArea } from "../components/dialogs";
import { SNAPSHOT_LABEL, type SnapshotSource } from "../types";

/**
 * The web clipper.
 *
 * There is no browser extension and no PWA share target — Wàfè is a web app
 * inside a family's own space, and neither is available to it. What there is
 * instead is a bookmarklet: one line the person drags (or pastes) into their
 * bookmarks bar, which opens this page with the URL, the page title, whatever
 * they had selected and the page's own share image already filled in. From
 * there the clip is one button.
 *
 * The readable snapshot is the point. A link rots; a snapshot does not. It
 * comes from the selection the bookmarklet carried, or the companion reads the
 * page back into prose — and the clip always says which of the two it was.
 */

export default function ClipPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { state, mutate, loading } = useModule(projectsModule);
    const { role, me } = useSpace();
    const { ask, busy, available } = useAi();

    const [url, setUrl] = useState(params.get("url") ?? "");
    const [title, setTitle] = useState(params.get("title") ?? "");
    const [excerpt, setExcerpt] = useState(params.get("text") ?? "");
    const [imageUrl, setImageUrl] = useState(params.get("image") ?? "");
    const [projectId, setProjectId] = useState(params.get("project") ?? "");
    const [folder, setFolder] = useState(params.get("folder") ?? "Inbox");
    const [tags, setTags] = useState("");
    const [snapshot, setSnapshot] = useState("");
    const [source, setSource] = useState<SnapshotSource>("selection");
    const [visibility, setVisibility] = useState<Visibility>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [childSafe, setChildSafe] = useState(role === "child");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unavailable, setUnavailable] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const bookmarklet = `javascript:(function(){var u=encodeURIComponent(location.href),t=encodeURIComponent(document.title),s=encodeURIComponent(String(window.getSelection()||'').slice(0,1200)),m=document.querySelector('meta[property="og:image"]'),i=encodeURIComponent(m?m.content:'');window.open('${origin}${BASE}/clip?url='+u+'&title='+t+'&text='+s+'&image='+i,'_blank');})();`;

    if (role === "guest") {
        return (
            <div>
                <PageTitle title="Clip a page" area="execute" />
                <Notice tone="info">Guests read what the family shared with them; the vault is not yours to add to.</Notice>
            </div>
        );
    }

    const readBack = async () => {
        setUnavailable(null);
        setError(null);
        try {
            const r = await ask<{ takeaways?: unknown }>({
                action: "summarize",
                prompt: `Write a short readable snapshot (3–5 sentences, plain prose, no bullet points) of this page so it is still useful when the link stops working.`,
                extraContext: `URL: ${url}\nTitle: ${title}\nWhat was captured from the page: ${excerpt}`.slice(0, 3000),
            });
            if (r.unavailable) return setUnavailable(r.unavailable);
            if (r.text.trim()) {
                setSnapshot(r.text.trim());
                setSource("companion");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "The companion couldn't read that back.");
        }
    };

    const projects = state ? activeProjects(state).filter((p) => role === "parent" || p.ownerMemberId === me.id || p.members.some((m) => m.memberId === me.id)) : [];

    return (
        <div className="max-w-3xl">
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> All projects
            </Link>

            <PageTitle title="Clip a page" sub="Save the link, a picture and a readable snapshot, so the thing you found is still here when the page is gone." area="execute" />

            {loading && !state && <p className="text-md text-muted">Loading…</p>}

            <form
                className="flex flex-col gap-4 rounded-xl bg-card p-5"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!url.trim()) {
                        setError("Paste the link first.");
                        return;
                    }
                    setSaving(true);
                    setError(null);
                    try {
                        await mutate((r) =>
                            r.saveClip({
                                url,
                                title,
                                excerpt,
                                imageUrl: imageUrl.trim() || null,
                                projectId: projectId || null,
                                folder,
                                snapshotText: snapshot.trim() || snapshotFrom(title, excerpt, url),
                                snapshotSource: snapshot.trim() ? source : "selection",
                                tags: tags
                                    .split(",")
                                    .map((t) => t.trim())
                                    .filter(Boolean),
                                visibility,
                                sharedWith,
                                childSafe,
                            }),
                        );
                        navigate(projectId ? `${BASE}/${projectId}?tab=vault` : `${BASE}/vault`);
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                {error && (
                    <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger-ink">
                        {error}
                    </p>
                )}

                <Field label="Link" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required hint={url ? hostOf(url) : undefined} />
                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What the page is called" />
                <TextArea label="What you highlighted" value={excerpt} onChange={setExcerpt} rows={3} placeholder="The sentence that made you save it." />

                <div>
                    <TextArea label="Readable snapshot" value={snapshot} onChange={(v) => { setSnapshot(v); setSource("typed"); }} rows={5} placeholder="Leave this empty and we'll build one from your highlight." />
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        {available && (
                            <Button size="sm" variant="outline" loading={busy} onClick={() => void readBack()} disabled={!url.trim()}>
                                <Sparkles size={14} aria-hidden="true" /> Read it back with the companion
                            </Button>
                        )}
                        {snapshot && <span className="text-xs text-caption">{SNAPSHOT_LABEL[source]}</span>}
                    </div>
                    {unavailable && (
                        <Notice tone="info" className="mt-2">
                            {unavailable}
                        </Notice>
                    )}
                </div>

                <Field label="Picture" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/image.jpg" hint="The bookmarklet fills this in from the page's own share image." />
                {imageUrl && <img src={imageUrl} alt="" width={320} height={200} loading="lazy" className="h-40 w-full rounded-md object-cover sm:w-80" />}

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Select label="Project" value={projectId} onChange={setProjectId}>
                        <option value="">The vault (no project yet)</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.title}
                            </option>
                        ))}
                    </Select>
                    <Field label="Folder" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Sixth form" />
                </div>

                <Field label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="coloma, results" hint="Comma separated." />

                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />
                <label className="flex items-center gap-2.5 text-md">
                    <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                    The children may see this clip
                </label>

                <div className="flex justify-end gap-2 pt-1">
                    <Link to={BASE} className="inline-flex h-11 items-center px-4 text-md font-semibold text-muted hover:text-ink">
                        Cancel
                    </Link>
                    <Button type="submit" loading={saving}>
                        <Scissors size={15} aria-hidden="true" /> Save the clip
                    </Button>
                </div>
            </form>

            <section className="mt-8 rounded-xl bg-card p-5">
                <h2 className="text-lg font-semibold">Clip from anywhere: the bookmarklet</h2>
                <p className="mt-1.5 text-md leading-6 text-muted">
                    Copy the line below and save it as a new bookmark (name it “Clip to Wàfè”). On any page, highlight the bit that matters and click the bookmark — this form opens with the link,
                    the title, your highlight and the page's picture already filled in.
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md bg-page p-3 text-2xs leading-5 text-muted">
                    <code>{bookmarklet}</code>
                </pre>
                <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(bookmarklet);
                            setCopied(true);
                            window.setTimeout(() => setCopied(false), 2000);
                        } catch {
                            setCopied(false);
                        }
                    }}
                >
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied ? "Copied" : "Copy the bookmarklet"}
                </Button>
                <p className="mt-3 text-xs leading-5 text-caption">
                    There is no browser extension and no phone share-target yet — on a phone, share the page to any note app and paste the link here, or use the bookmarklet in a desktop browser.
                </p>
            </section>
        </div>
    );
}
