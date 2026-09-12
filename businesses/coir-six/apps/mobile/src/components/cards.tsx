import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { ArrowUpRight, Check, Clock, FileText, Heart, HelpCircle, Play, Trash2, UserPlus } from "lucide-react-native";
import { courseMinutes, courseProgress, dueLabel, duration, longDate, mentorOf, time, type Course, type Lesson, type LiveLesson, type Mentor, type Task } from "@coir-six/core";
import { categoryColors, useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Avatar, Button, Cover, IconButton, ProgressBar, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";

/** The cards and rows the whole app is composed from — the phone versions of cards.tsx on the web. */

export function CourseCard({ course, width = 240, style }: { course: Course; width?: number | "100%"; style?: StyleProp<ViewStyle> }) {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const { c, r } = useTheme();
    const router = useRouter();
    const mentor = mentorOf(catalogue, course);
    const p = courseProgress(catalogue, user, course.id);
    const saved = user.bookmarks.includes(course.id);
    const enrolled = user.enrollments.some((e) => e.courseId === course.id);
    return (
        <View style={[{ width, backgroundColor: c.card, borderRadius: 18, padding: 12, gap: 12 }, style]}>
            <View>
                <Pressable accessibilityRole="button" accessibilityLabel={course.title} onPress={() => router.push(`/courses/${course.slug}`)}>
                    <Cover theme={course.theme} src={course.coverUrl} height={124} />
                </Pressable>
                <IconButton label={saved ? "Remove from saved" : "Save course"} size="md" style={{ position: "absolute", right: 10, top: 10, borderWidth: 0 }} onPress={() => void mutate((x) => x.toggleBookmark(course.id)).then(() => toast(saved ? "Removed from saved" : "Saved for later"))}>
                    <Heart size={16} color={c.ink} strokeWidth={1.8} fill={saved ? c.ink : "none"} />
                </IconButton>
            </View>
            <Tag tone={course.categoryId} icon>
                {CATEGORY_LABEL[course.categoryId]}
            </Tag>
            <Pressable accessibilityRole="link" onPress={() => router.push(`/courses/${course.slug}`)}>
                <Txt role="h3" numberOfLines={2} style={{ height: 42 }}>
                    {course.title}
                </Txt>
            </Pressable>
            {enrolled ? (
                <ProgressBar value={p.pct} />
            ) : (
                <Txt role="caption">
                    {duration(courseMinutes(catalogue, course.id) * 60)} · {course.level}
                </Txt>
            )}
            {mentor && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 }}>
                    <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="xs" />
                    <View>
                        <Txt size={13} lineHeight={17} weight="medium">
                            {mentor.name}
                        </Txt>
                        <Txt role="caption" size={11} lineHeight={13}>
                            Mentor
                        </Txt>
                    </View>
                </View>
            )}
            <View style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, borderRadius: r.lg }} />
        </View>
    );
}

export function StatCard({ icon, tone, top, title, onPress, width = 200 }: { icon: ReactNode; tone: "fe" | "ux" | "br"; top: string; title: string; onPress?: () => void; width?: number | "100%" }) {
    const { c, r } = useTheme();
    const k = categoryColors(c, tone);
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${top}`} onPress={onPress} style={({ pressed }) => ({ width, height: 72, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.card, borderRadius: r.lg, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, opacity: pressed ? 0.85 : 1 })}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: k.soft, alignItems: "center", justifyContent: "center" }}>{icon}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Txt role="caption" color={c.muted}>
                    {top}
                </Txt>
                <Txt weight="semibold" size={16} lineHeight={20} numberOfLines={1} style={{ marginTop: 3 }}>
                    {title}
                </Txt>
            </View>
        </Pressable>
    );
}

export function MentorRow({ mentor, last }: { mentor: Mentor; last?: boolean }) {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    const on = user.follows.includes(mentor.id);
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.lineStrong }}>
            <Pressable accessibilityRole="button" accessibilityLabel={mentor.name} onPress={() => router.push(`/mentors/${mentor.id}`)}>
                <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="lg" />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight="medium" size={14} lineHeight={18} numberOfLines={1}>
                    {mentor.name}
                </Txt>
                <Txt role="caption" style={{ marginTop: 2 }}>
                    Mentor
                </Txt>
            </View>
            <Button variant={on ? "tonal" : "outline"} size="sm" accessibilityLabel={on ? `Following ${mentor.name}, press to unfollow` : `Follow ${mentor.name}`} icon={on ? <Check size={13} color={c.brandInk} strokeWidth={2.5} /> : <UserPlus size={12} color={c.ink} strokeWidth={2} />} onPress={() => void mutate((x) => x.toggleFollow(mentor.id)).then(() => toast(on ? `Unfollowed ${mentor.name}` : `Following ${mentor.name}`))} style={{ borderRadius: 999, height: 32 }}>
                {on ? "" : "Follow"}
            </Button>
        </View>
    );
}

export function LessonKindIcon({ kind, size = 14, color }: { kind: Lesson["kind"]; size?: number; color?: string }) {
    if (kind === "video") return <Play size={size} color={color} />;
    if (kind === "article") return <FileText size={size} color={color} />;
    return <HelpCircle size={size} color={color} />;
}

/** A live-lesson row, stacked the way the design stacks it on a phone. */
export function LiveRow({ live, last }: { live: LiveLesson; last?: boolean }) {
    const { catalogue } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const mentor = catalogue.mentors.find((m) => m.id === live.mentorId);
    if (!mentor) return null;
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
            <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} px={40} />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Txt weight="medium" size={14} lineHeight={18}>
                    {mentor.name}
                </Txt>
                <Txt role="caption">
                    {longDate(live.startsAt)} · {time(live.startsAt)}
                </Txt>
                <Txt size={14} lineHeight={19} color={c.muted}>
                    {live.title}
                </Txt>
            </View>
            <IconButton label={`Open ${live.title}`} size="sm" tone="outline-brand" onPress={() => router.push(`/lessons?focus=${live.id}`)}>
                <ArrowUpRight size={12} color={c.brand} strokeWidth={2} />
            </IconButton>
        </View>
    );
}

export function TaskRow({ task, onToggle, onDelete, last }: { task: Task; onToggle: () => void; onDelete: () => void; last?: boolean }) {
    const { catalogue } = useData();
    const { c } = useTheme();
    const course = task.courseId ? catalogue.courses.find((x) => x.id === task.courseId) : null;
    const due = dueLabel(task.dueAt);
    const done = Boolean(task.doneAt);
    const dueColor = due.tone === "danger" ? c.dangerInk : due.tone === "warn" ? c.peach : c.muted;
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`} onPress={onToggle} style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: done ? c.brand : c.lineStrong, backgroundColor: done ? c.brand : c.card, alignItems: "center", justifyContent: "center" }}>
                {done && <Check size={14} color={c.white} strokeWidth={3} />}
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight="medium" size={14} lineHeight={18} numberOfLines={1} color={done ? c.muted : c.ink} style={done ? { textDecorationLine: "line-through" } : undefined}>
                    {task.title}
                </Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                    {course && (
                        <Txt role="caption" weight="medium" color={categoryColors(c, course.categoryId).ink}>
                            {CATEGORY_LABEL[course.categoryId]}
                        </Txt>
                    )}
                    {!done && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Clock size={11} color={dueColor} />
                            <Txt role="caption" color={dueColor}>
                                {due.text}
                            </Txt>
                        </View>
                    )}
                </View>
            </View>
            <IconButton label={`Delete "${task.title}"`} size="sm" onPress={onDelete} style={{ borderWidth: 0 }}>
                <Trash2 size={14} color={c.muted} />
            </IconButton>
        </View>
    );
}
