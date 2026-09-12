import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Code2, MoreVertical, PenTool, Plus, Tag as TagIcon } from "lucide-react-native";
import { categoryWatched, continueWatching, goalPct, recommended, streak, tenDayBuckets, upcomingLive } from "@coir-six/core";
import { categoryColors, useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { CourseCard, LiveRow, MentorRow, StatCard } from "@/components/cards";
import { BarChart, Ring } from "@/components/ui/charts";
import { Avatar, Badge, Card, SearchBox, SectionHead, Sparkle } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { GUTTER, HomeBar, Screen } from "@/components/shell/Screen";

/**
 * The learner home — the case study's phone screen. Where was I (Continue
 * Watching), how am I doing (ring, chart, watched counts), what is next
 * (Your Lesson). Nothing here needs a tap to be understood.
 */
export default function HomeScreen() {
    const { catalogue, user } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const [q, setQ] = useState("");
    const watching = continueWatching(catalogue, user);
    const shelf = watching.length ? watching : recommended(catalogue, user, 3);
    const watched = categoryWatched(catalogue, user);
    const live = upcomingLive(catalogue).slice(0, 3);
    const pct = goalPct(user);
    const days = streak(user);
    const buckets = tenDayBuckets(user);
    const mentors = [...catalogue.mentors].sort((a, b) => Number(user.follows.includes(b.id)) - Number(user.follows.includes(a.id)) || b.followers - a.followers).slice(0, 3);
    const maxMin = Math.max(...buckets.map((x) => x.minutes));
    const goSearch = () => {
        if (q.trim()) router.push(`/courses?q=${encodeURIComponent(q.trim())}`);
    };

    return (
        <Screen header={<HomeBar />} tabbed>
            <View style={{ marginBottom: 16 }}>
                <SearchBox value={q} onChange={setQ} onSubmit={goSearch} />
            </View>

            {/* Hero */}
            <View style={{ backgroundColor: c.brand, borderRadius: 20, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, overflow: "hidden" }}>
                <Sparkle size={130} style={{ position: "absolute", right: -52, top: -56, opacity: 0.5 }} />
                <Sparkle size={44} style={{ position: "absolute", right: 26, bottom: 22, opacity: 0.35 }} />
                <Txt weight="semibold" size={12} lineHeight={15} color={c.white} style={{ letterSpacing: 1.7 }}>
                    ONLINE COURSE
                </Txt>
                <Txt weight="semibold" size={24} lineHeight={31} color={c.white} style={{ marginTop: 14, marginBottom: 20 }}>
                    Sharpen Your Skills with Professional Online Courses
                </Txt>
                <Pressable accessibilityRole="button" onPress={() => router.push("/courses")} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.ink, borderRadius: 999, paddingVertical: 8, paddingLeft: 22, paddingRight: 8 }}>
                    <Txt weight="semibold" size={14} lineHeight={18} color={c.white}>
                        Join Now
                    </Txt>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.white, alignItems: "center", justifyContent: "center" }}>
                        <ChevronRight size={12} color={c.ink} strokeWidth={2.4} />
                    </View>
                </Pressable>
            </View>

            {/* Watched per category — a rail, edge to edge */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER, marginVertical: 20 }} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 14 }}>
                <StatCard tone="ux" icon={<PenTool size={20} color={categoryColors(c, "ux").strong} strokeWidth={1.8} />} top={`${watched.ux.done}/${watched.ux.total} watched`} title="UI/UX Design" onPress={() => router.push("/courses?cat=ux")} />
                <StatCard tone="br" icon={<TagIcon size={20} color={categoryColors(c, "br").strong} strokeWidth={1.8} />} top={`${watched.br.done}/${watched.br.total} watched`} title="Branding" onPress={() => router.push("/courses?cat=br")} />
                <StatCard tone="fe" icon={<Code2 size={20} color={categoryColors(c, "fe").strong} strokeWidth={1.8} />} top={`${watched.fe.done}/${watched.fe.total} watched`} title="Front End" onPress={() => router.push("/courses?cat=fe")} />
            </ScrollView>

            <SectionHead title={watching.length ? "Continue Watching" : "Start something"} action={<SeeAll onPress={() => router.push("/courses")} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER }} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 14 }}>
                {shelf.map((x) => (
                    <CourseCard key={x.id} course={x} />
                ))}
            </ScrollView>

            {/* Statistic */}
            <SectionHead title="Statistic" style={{ marginTop: 28 }} action={<Pressable accessibilityRole="button" accessibilityLabel="Open progress" onPress={() => router.push("/progress")}><MoreVertical size={18} color={c.muted} /></Pressable>} />
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 18 }}>
                <Ring pct={pct} size={96} label={`${pct}% of your weekly goal`}>
                    <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} px={82} />
                    <Badge style={{ position: "absolute", right: -2, top: 0 }}>{`${pct}%`}</Badge>
                </Ring>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt weight="semibold" size={17} lineHeight={22}>
                        {pct}% of your target done
                    </Txt>
                    <Txt role="caption" style={{ marginTop: 4 }}>
                        {days > 0 ? `${days}-day streak — continue your learning to hit your target.` : "Continue your learning to achieve your target!"}
                    </Txt>
                </View>
            </Card>
            <BarChart style={{ marginTop: 14, backgroundColor: c.card }} data={buckets.map((b) => ({ label: b.label.split(" – ")[0], value: b.minutes, hi: b.current || b.minutes === maxMin }))} />

            {/* Your Lesson */}
            <SectionHead title="Your Lesson" style={{ marginTop: 28, marginBottom: 10 }} action={<SeeAll onPress={() => router.push("/lessons")} />} />
            <Card padded={false} style={{ borderRadius: 18 }}>
                {live.length ? (
                    live.map((l, i) => <LiveRow key={l.id} live={l} last={i === live.length - 1} />)
                ) : (
                    <Txt role="small" style={{ padding: 16 }}>
                        No live lessons scheduled.
                    </Txt>
                )}
            </Card>

            {/* Your mentor */}
            <SectionHead title="Your mentor" style={{ marginTop: 28 }} action={<Pressable accessibilityRole="button" accessibilityLabel="All mentors" onPress={() => router.push("/mentors")} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Plus size={12} color={c.ink} strokeWidth={2} /></Pressable>} />
            <Card style={{ paddingTop: 2 }}>
                {mentors.map((m, i) => (
                    <MentorRow key={m.id} mentor={m} last={i === mentors.length - 1} />
                ))}
                <Pressable accessibilityRole="button" onPress={() => router.push("/mentors")} style={{ marginTop: 8, borderRadius: 12, backgroundColor: c.subtle, paddingVertical: 12, alignItems: "center" }}>
                    <Txt weight="medium" size={14} lineHeight={18} color={c.brandInk}>
                        See All
                    </Txt>
                </Pressable>
            </Card>
        </Screen>
    );
}

function SeeAll({ onPress }: { onPress: () => void }) {
    const { c } = useTheme();
    return (
        <Pressable accessibilityRole="link" onPress={onPress}>
            <Txt weight="medium" size={13} lineHeight={16} color={c.brand} style={{ textDecorationLine: "underline" }}>
                See all
            </Txt>
        </Pressable>
    );
}
