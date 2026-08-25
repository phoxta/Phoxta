import { useEffect, useMemo, useState } from "react";
import { ARTICLES_BY_DATE, type Article } from "@/data/articles";
import { fetchLiveOverrides } from "@/lib/db/platformPosts";

/**
 * The full blog as the console has shaped it: the built-in editorial set with
 * console overrides applied (an edited built-in shows the edited version, a
 * hidden built-in disappears) plus everything published fresh from the
 * console, newest first. The built-ins render immediately — they are what
 * gets prerendered — and the console's changes stream in when the fetch lands.
 */
export function useLiveArticles(): Article[] {
  const [remote, setRemote] = useState<{ published: Article[]; hidden: string[] } | null>(null);

  useEffect(() => {
    let active = true;
    fetchLiveOverrides().then((r) => {
      if (active && (r.published.length || r.hidden.length)) setRemote(r);
    });
    return () => { active = false; };
  }, []);

  return useMemo(() => {
    if (!remote) return ARTICLES_BY_DATE;
    const overrides = new Map(remote.published.map((a) => [a.slug, a]));
    const hidden = new Set(remote.hidden);
    const builtinSlugs = new Set(ARTICLES_BY_DATE.map((a) => a.slug));

    const builtins = ARTICLES_BY_DATE
      .filter((a) => !hidden.has(a.slug))
      .map((a) => overrides.get(a.slug) ?? a);
    const fresh = remote.published.filter((a) => !builtinSlugs.has(a.slug));

    return [...builtins, ...fresh].sort((x, y) => (x.iso < y.iso ? 1 : x.iso > y.iso ? -1 : 0));
  }, [remote]);
}
