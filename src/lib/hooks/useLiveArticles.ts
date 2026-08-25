import { useEffect, useMemo, useState } from "react";
import { ARTICLES_BY_DATE, type Article } from "@/data/articles";
import { fetchPublishedArticles } from "@/lib/db/platformPosts";

/**
 * The full blog: the built-in editorial set plus everything published from the
 * platform console, newest first. The built-ins render immediately (and are
 * what gets prerendered); console posts stream in when the fetch lands. On a
 * slug collision the built-in wins, so a console draft can never shadow
 * shipped editorial.
 */
export function useLiveArticles(): Article[] {
  const [remote, setRemote] = useState<Article[]>([]);

  useEffect(() => {
    let active = true;
    fetchPublishedArticles().then((a) => { if (active && a.length) setRemote(a); });
    return () => { active = false; };
  }, []);

  return useMemo(() => {
    const seen = new Set(ARTICLES_BY_DATE.map((a) => a.slug));
    return [...ARTICLES_BY_DATE, ...remote.filter((a) => !seen.has(a.slug))]
      .sort((x, y) => (x.iso < y.iso ? 1 : x.iso > y.iso ? -1 : 0));
  }, [remote]);
}
