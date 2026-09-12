import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Compass } from "lucide-react-native";
import { searchCourses, type CategoryId, type Level } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { CourseCard } from "@/components/cards";
import { Chip, EmptyState, SearchBox } from "@/components/ui/primitives";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

type Sort = "featured" | "newest" | "rating" | "shortest";
const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];
const SORTS: { id: Sort; label: string }[] = [
    { id: "featured", label: "Most popular" },
    { id: "newest", label: "Newest" },
    { id: "rating", label: "Top rated" },
    { id: "shortest", label: "Shortest" },
];

/** The catalogue: search, category and level chips, sort, saved and mine. */
export default function CoursesScreen() {
    const { catalogue, user } = useData();
    const { c } = useTheme();
    const params = useLocalSearchParams<{ q?: string; cat?: string }>();
    const [q, setQ] = useState(params.q ?? "");
    const [cat, setCat] = useState<CategoryId | null>((params.cat as CategoryId | undefined) ?? null);
    const [level, setLevel] = useState<Level | null>(null);
    const [sort, setSort] = useState<Sort>("featured");
    const [saved, setSaved] = useState(false);
    const [mine, setMine] = useState(false);

    const results = useMemo(() => {
        const minutes = (id: string) => catalogue.lessons.filter((l) => l.courseId === id).reduce((n, l) => n + l.durationSec, 0);
        const list = searchCourses(catalogue, q).filter((x) => (!cat || x.categoryId === cat) && (!level || x.level === level) && (!saved || user.bookmarks.includes(x.id)) && (!mine || user.enrollments.some((e) => e.courseId === x.id)));
        const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
            featured: (a, b) => b.learners - a.learners,
            newest: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
            rating: (a, b) => b.rating - a.rating,
            shortest: (a, b) => minutes(a.id) - minutes(b.id),
        };
        return [...list].sort(by[sort]);
    }, [catalogue, q, cat, level, saved, mine, sort, user.bookmarks, user.enrollments]);

    return (
        <Screen header={<Header title="Courses" />}>
            <PageTitle title={q ? `Results for “${q}”` : "Courses"} sub={q ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Every course, filterable by what you want to get better at."} />
            <View style={{ marginBottom: 14 }}>
                <SearchBox value={q} onChange={setQ} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 10 }}>
                <Chip on={!cat} onPress={() => setCat(null)}>
                    All
                </Chip>
                {catalogue.categories.map((k) => (
                    <Chip key={k.id} on={cat === k.id} onPress={() => setCat(cat === k.id ? null : k.id)}>
                        {CATEGORY_LABEL[k.id]}
                    </Chip>
                ))}
                <View style={{ width: 1, height: 24, backgroundColor: c.lineStrong, alignSelf: "center", marginHorizontal: 4 }} />
                {LEVELS.map((l) => (
                    <Chip key={l} on={level === l} onPress={() => setLevel(level === l ? null : l)}>
                        {l}
                    </Chip>
                ))}
                <Chip on={saved} onPress={() => setSaved((v) => !v)}>
                    {`Saved${user.bookmarks.length ? ` · ${user.bookmarks.length}` : ""}`}
                </Chip>
                <Chip on={mine} onPress={() => setMine((v) => !v)}>
                    My courses
                </Chip>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 18 }}>
                {SORTS.map((s) => (
                    <Chip key={s.id} on={sort === s.id} tone="brand" onPress={() => setSort(s.id)}>
                        {s.label}
                    </Chip>
                ))}
            </ScrollView>
            {results.length === 0 ? (
                <EmptyState icon={<Compass size={22} color={c.brand} />} title="Nothing matches" body="Try a different word, or clear a filter." />
            ) : (
                <View style={{ gap: 16 }}>
                    {results.map((x) => (
                        <CourseCard key={x.id} course={x} width="100%" />
                    ))}
                </View>
            )}
        </Screen>
    );
}
