import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass } from "lucide-react";
import type { CategoryId, Level } from "@/data/types";
import { cn } from "@/lib/cn";
import { searchCourses } from "@/lib/derive";
import { useData } from "@/state/data";
import { CourseCard } from "@/components/cards";
import { PageTitle } from "@/components/shell/AppShell";
import { EmptyState, SearchBox } from "@/components/ui/primitives";
import { CATEGORY_LABEL } from "@/components/ui/icons";

type Sort = "featured" | "newest" | "rating" | "shortest";
const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];

/** The catalogue: search, category and level chips, sort, and a saved filter — all in the URL. */
export default function CoursesPage() {
    const { catalogue, user } = useData();
    const [params, setParams] = useSearchParams();
    const q = params.get("q") ?? "";
    const cat = params.get("cat") as CategoryId | null;
    const level = params.get("level") as Level | null;
    const sort = (params.get("sort") as Sort | null) ?? "featured";
    const saved = params.get("saved") === "1";
    const mine = params.get("mine") === "1";

    const set = (patch: Record<string, string | null>) => {
        const p = new URLSearchParams(params);
        for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === "") p.delete(k);
            else p.set(k, v);
        }
        setParams(p, { replace: true });
    };

    const results = useMemo(() => {
        const minutes = (id: string) => catalogue.lessons.filter((l) => l.courseId === id).reduce((n, l) => n + l.durationSec, 0);
        let list = searchCourses(catalogue, q).filter((c) => (!cat || c.categoryId === cat) && (!level || c.level === level) && (!saved || user.bookmarks.includes(c.id)) && (!mine || user.enrollments.some((e) => e.courseId === c.id)));
        const by: Record<Sort, (a: typeof list[number], b: typeof list[number]) => number> = {
            featured: (a, b) => b.learners - a.learners,
            newest: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
            rating: (a, b) => b.rating - a.rating,
            shortest: (a, b) => minutes(a.id) - minutes(b.id),
        };
        list = [...list].sort(by[sort]);
        return list;
    }, [catalogue, q, cat, level, saved, mine, sort, user.bookmarks, user.enrollments]);

    const chip = (on: boolean) => cn("h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors", on ? "border-ink text-ink" : "border-line text-caption hover:text-ink");

    return (
        <>
            <PageTitle title={q ? `Results for “${q}”` : "Courses"} sub={q ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Every course, filterable by what you want to get better at."} />
            <div className="mb-4 md:hidden">
                <SearchBox value={q} onChange={(v) => set({ q: v })} />
            </div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
                <button type="button" className={chip(!cat)} onClick={() => set({ cat: null })}>
                    All
                </button>
                {catalogue.categories.map((c) => (
                    <button key={c.id} type="button" className={chip(cat === c.id)} aria-pressed={cat === c.id} onClick={() => set({ cat: cat === c.id ? null : c.id })}>
                        {CATEGORY_LABEL[c.id]}
                    </button>
                ))}
                <span className="mx-1 h-6 w-px bg-line-strong max-md:hidden" aria-hidden="true" />
                {LEVELS.map((l) => (
                    <button key={l} type="button" className={chip(level === l)} aria-pressed={level === l} onClick={() => set({ level: level === l ? null : l })}>
                        {l}
                    </button>
                ))}
                <button type="button" className={chip(saved)} aria-pressed={saved} onClick={() => set({ saved: saved ? null : "1" })}>
                    Saved {user.bookmarks.length ? `· ${user.bookmarks.length}` : ""}
                </button>
                <button type="button" className={chip(mine)} aria-pressed={mine} onClick={() => set({ mine: mine ? null : "1" })}>
                    My courses
                </button>
                <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
                    Sort
                    <select value={sort} onChange={(e) => set({ sort: e.target.value === "featured" ? null : e.target.value })} className="h-9 rounded-full border border-line-strong bg-card px-3 text-[13px] font-semibold text-ink">
                        <option value="featured">Most popular</option>
                        <option value="newest">Newest</option>
                        <option value="rating">Top rated</option>
                        <option value="shortest">Shortest first</option>
                    </select>
                </label>
            </div>

            {results.length === 0 ? (
                <EmptyState icon={<Compass size={22} />} title="Nothing matches" body="Try a different word, or clear a filter." />
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                    {results.map((c) => (
                        <CourseCard key={c.id} course={c} className="!w-auto" />
                    ))}
                </div>
            )}
        </>
    );
}
