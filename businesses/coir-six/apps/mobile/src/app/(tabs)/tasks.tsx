import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { CheckSquare, Plus } from "lucide-react-native";
import { dayKey } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { TaskRow } from "@/components/cards";
import { Button, Card, Chip, EmptyState, Field } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

type Filter = "open" | "today" | "overdue" | "done";
const DUE = [
    { label: "Today", days: 0 },
    { label: "Tomorrow", days: 1 },
    { label: "In 3 days", days: 3 },
    { label: "Next week", days: 7 },
];

/** Tasks: the work between lessons, tied to a course, with honest due dates. */
export default function TasksScreen() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const [filter, setFilter] = useState<Filter>("open");
    const [title, setTitle] = useState("");
    const [courseId, setCourseId] = useState("");
    const [dueDays, setDueDays] = useState(1);
    const [adding, setAdding] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const today = dayKey(new Date());
    const list = useMemo(() => {
        const t = user.tasks;
        const by: Record<Filter, typeof t> = {
            open: t.filter((x) => !x.doneAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
            today: t.filter((x) => !x.doneAt && dayKey(x.dueAt) === today),
            overdue: t.filter((x) => !x.doneAt && dayKey(x.dueAt) < today),
            done: t.filter((x) => x.doneAt).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "")),
        };
        return by[filter];
    }, [user.tasks, filter, today]);
    const counts: Record<Filter, number> = {
        open: user.tasks.filter((x) => !x.doneAt).length,
        today: user.tasks.filter((x) => !x.doneAt && dayKey(x.dueAt) === today).length,
        overdue: user.tasks.filter((x) => !x.doneAt && dayKey(x.dueAt) < today).length,
        done: user.tasks.filter((x) => x.doneAt).length,
    };

    const add = async () => {
        if (!title.trim()) return setErr("Give the task a name.");
        setAdding(true);
        setErr(null);
        const due = new Date();
        due.setDate(due.getDate() + dueDays);
        due.setHours(18, 0, 0, 0);
        await mutate((r) => r.addTask({ title: title.trim(), courseId: courseId || null, dueAt: due.toISOString() }));
        setTitle("");
        setAdding(false);
        toast("Task added", "success");
    };

    const enrolledCourses = catalogue.courses.filter((x) => user.enrollments.some((e) => e.courseId === x.id));
    const courseChoices = enrolledCourses.length ? enrolledCourses : catalogue.courses;

    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="Tasks" sub={counts.open ? `${counts.open} open${counts.overdue ? ` · ${counts.overdue} overdue` : ""}` : "All clear."} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {(["open", "today", "overdue", "done"] as Filter[]).map((f) => (
                    <Chip key={f} on={filter === f} onPress={() => setFilter(f)}>
                        {`${f[0].toUpperCase()}${f.slice(1)}${counts[f] ? ` · ${counts[f]}` : ""}`}
                    </Chip>
                ))}
            </ScrollView>
            {list.length ? (
                <Card style={{ paddingVertical: 4 }}>
                    {list.map((t, i) => (
                        <TaskRow key={t.id} task={t} last={i === list.length - 1} onToggle={() => void mutate((r) => r.toggleTask(t.id))} onDelete={() => void mutate((r) => r.deleteTask(t.id)).then(() => toast("Task deleted"))} />
                    ))}
                </Card>
            ) : (
                <EmptyState icon={<CheckSquare size={22} color={c.brand} />} title={filter === "done" ? "Nothing finished yet" : filter === "overdue" ? "Nothing overdue" : "No tasks here"} body={filter === "open" ? "Add the next thing you need to do for a course." : undefined} />
            )}

            <Card style={{ marginTop: 24, gap: 14 }}>
                <Txt role="h3" size={16} lineHeight={21}>
                    Add a task
                </Txt>
                <Field label="Task" value={title} onChangeText={setTitle} placeholder="e.g. Rebuild the pricing table with Grid" error={err} />
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>
                        Course
                    </Txt>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        <Chip on={!courseId} tone="brand" onPress={() => setCourseId("")}>
                            No course
                        </Chip>
                        {courseChoices.map((x) => (
                            <Chip key={x.id} on={courseId === x.id} tone="brand" onPress={() => setCourseId(x.id)}>
                                {x.title}
                            </Chip>
                        ))}
                    </ScrollView>
                </View>
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>
                        Due
                    </Txt>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {DUE.map((d) => (
                            <Chip key={d.days} on={dueDays === d.days} tone="brand" onPress={() => setDueDays(d.days)}>
                                {d.label}
                            </Chip>
                        ))}
                    </View>
                </View>
                <Button block loading={adding} icon={<Plus size={16} color={c.white} />} onPress={() => void add()}>
                    Add task
                </Button>
            </Card>
        </Screen>
    );
}
