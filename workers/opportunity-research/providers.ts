export type SourceCandidate = { evidence_id: string; url: string; title: string; publisher: string; published_at: string | null; retrieved_at: string; geography: string; excerpt: string };
export interface SearchProvider { name: string; search(query: string, limit: number, signal: AbortSignal): Promise<SourceCandidate[]>; healthCheck(): boolean; costEstimate(): number; }
export function canonicalUrl(raw: string): string | null {
    try {
        const u = new URL(raw);
        if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return null;
        u.hash = ''; for (const key of [...u.searchParams.keys()]) if (/^utm_|^(gclid|fbclid)$/.test(key)) u.searchParams.delete(key);
        return u.href;
    } catch { return null; }
}
function normalize(row: Record<string, unknown>): SourceCandidate | null {
    const url = canonicalUrl(String(row.url ?? '')); const text = String(row.description ?? row.content ?? '').replace(/<[^>]+>/g, '').trim();
    if (!url || !text) return null;
    const rawDate = String(row.page_age ?? row.published_date ?? ''); const date = rawDate ? new Date(rawDate) : null;
    return { evidence_id: crypto.randomUUID(), url, title: String(row.title ?? new URL(url).hostname).slice(0, 300), publisher: new URL(url).hostname, published_at: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null, retrieved_at: new Date().toISOString(), geography: '', excerpt: text.slice(0, 600) };
}
export function braveProvider(key: string): SearchProvider {
    return { name: 'brave', healthCheck: () => Boolean(key), costEstimate: () => 0.005,
        async search(query, limit, signal) {
            const url = new URL('https://api.search.brave.com/res/v1/web/search'); url.searchParams.set('q', query); url.searchParams.set('count', String(Math.min(limit, 20)));
            const result = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': key }, signal });
            if (!result.ok) throw new Error(`Brave search unavailable (${result.status}).`);
            const body = await result.json(); return (body.web?.results ?? []).map(normalize).filter(Boolean);
        },
    };
}
export function tavilyProvider(key: string): SearchProvider {
    return { name: 'tavily', healthCheck: () => Boolean(key), costEstimate: () => 0.008,
        async search(query, limit, signal) {
            const result = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, max_results: Math.min(limit, 20), search_depth: 'basic', include_answer: false, include_raw_content: false, include_published_date: true }), signal });
            if (!result.ok) throw new Error(`Tavily search unavailable (${result.status}).`);
            const body = await result.json(); return (body.results ?? []).map(normalize).filter(Boolean);
        },
    };
}
export async function retrieve(providers: SearchProvider[], query: string, limit: number, signal: AbortSignal, reserve: (cost: number) => Promise<void>): Promise<{ sources: SourceCandidate[]; cost: number; provider: string }> {
    const configured = providers.filter(p => p.healthCheck());
    if (!configured.length) throw new Error('Research providers are not configured. Add BRAVE_SEARCH_API_KEY or TAVILY_API_KEY to the research worker.');
    let last: unknown; let cost = 0;
    for (const provider of configured) {
        signal.throwIfAborted();
        // Reservation failure must stop the attempt, never trigger an unpaid fallback.
        await reserve(provider.costEstimate());
        cost += provider.costEstimate();
        try {
            const sources = await provider.search(query, limit, signal); const seen = new Set<string>();
            const unique = sources.filter(s => { if (seen.has(s.url)) return false; seen.add(s.url); return true; }).slice(0, limit);
            if (!unique.length) { last = new Error('No source candidates were found. Broaden the question or market.'); continue; }
            return { sources: unique, cost, provider: provider.name };
        }
        catch (error) { last = error; if (signal.aborted) break; }
    }
    throw last;
}
