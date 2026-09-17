import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import type { Area } from "@/data/core";
import { cn } from "@/lib/cn";
import { MODULES, moduleById } from "@/modules";
import { useData } from "@/state/data";
import { AreaTag, PageTitle } from "@/components/shared";
import { EmptyState } from "@/components/ui/primitives";

/**
 * Global search. Every module answers `search(state, q)` over the slice this
 * member may see, so a child searching "budget" finds nothing — which is the
 * point. Hits are grouped by module in registry (nav) order.
 */

const DOT: Record<Area, string> = { home: "bg-home", grow: "bg-grow", execute: "bg-execute", live: "bg-live", create: "bg-create", family: "bg-family" };

export default function SearchPage() {
    const [params, setParams] = useSearchParams();
    const q = params.get("q") ?? "";
    const { search, loading } = useData();
    const [draft, setDraft] = useState(q);
    useEffect(() => setDraft(q), [q]);

    const hits = useMemo(() => search(q), [search, q]);
    const groups = useMemo(() => {
        const by = new Map<string, typeof hits>();
        for (const h of hits) by.set(h.moduleId, [...(by.get(h.moduleId) ?? []), h]);
        // Registry order, so results read in the same order as the nav.
        return MODULES.filter((m) => by.has(m.id)).map((m) => ({ mod: m, hits: by.get(m.id)! }));
    }, [hits]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const term = draft.trim();
        setParams(term ? { q: term } : {});
    };

    return (
        <div>
            <PageTitle title={q ? `Results for “${q}”` : "Search"} sub={q ? `${hits.length} ${hits.length === 1 ? "match" : "matches"} across ${groups.length} ${groups.length === 1 ? "module" : "modules"}` : "Tasks, lessons, verses, trips, memories — anything you can see."} />
            <form role="search" onSubmit={submit} className="mb-6 flex h-12 max-w-2xl items-center gap-3 rounded-full border border-line-strong bg-card px-4 text-base focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]">
                <Search size={18} strokeWidth={1.8} className="text-muted" aria-hidden="true" />
                <label htmlFor="search-q" className="sr-only">
                    Search
                </label>
                <input id="search-q" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search the family…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-caption" />
                <button type="submit" className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover">
                    Search
                </button>
            </form>

            {!q ? (
                <EmptyState icon={<Search size={20} aria-hidden="true" />} title="What are you looking for?" body={MODULES.length ? "Type a word or two above. Press / from any page to jump here." : "Search will cover every module as they arrive."} />
            ) : loading ? (
                <p className="text-md text-muted" role="status">
                    Still loading the family's data…
                </p>
            ) : groups.length === 0 ? (
                <EmptyState icon={<Search size={20} aria-hidden="true" />} title={`Nothing for “${q}”`} body="Try a shorter word, a name, or a different spelling. Search only covers what you can see." />
            ) : (
                <div className="flex flex-col gap-6">
                    {groups.map(({ mod, hits: list }) => {
                        const m = moduleById(mod.id) ?? mod;
                        const Icon = m.icon;
                        return (
                            <section key={m.id} aria-labelledby={`sr-${m.id}`}>
                                <div className="mb-2 flex items-center gap-2.5">
                                    <span className={cn("size-2 rounded-full", DOT[m.area])} aria-hidden="true" />
                                    <h2 id={`sr-${m.id}`} className="flex items-center gap-2 font-display text-xl">
                                        <Icon size={16} aria-hidden="true" /> {m.name}
                                    </h2>
                                    <span className="text-xs text-caption">{list.length}</span>
                                    <AreaTag area={m.area} className="ml-auto" />
                                </div>
                                <ul className="divide-y divide-line rounded-xl bg-card">
                                    {list.map((h, i) => (
                                        <li key={`${h.href}:${i}`}>
                                            <Link to={h.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-page">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-md font-medium">{h.title}</span>
                                                    <span className="block truncate text-xs text-muted">{h.meta}</span>
                                                </span>
                                                <ArrowRight size={15} className="shrink-0 text-caption transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
