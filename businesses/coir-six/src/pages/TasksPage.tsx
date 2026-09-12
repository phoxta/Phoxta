import { useMemo, useState } from "react";
import { CheckSquare, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { dayKey } from "@coir-six/core";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { TaskRow } from "@/components/cards";
import { PageTitle } from "@/components/shell/AppShell";
import { Button, Card, EmptyState, Field } from "@/components/ui/primitives";

type Filter = "open" | "today" | "overdue" | "done";

/** Tasks: the work between lessons, tied to a course, with honest due dates. */
export default function TasksPage() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const [filter, setFilter] = useState<Filter>("open");
    const [title, setTitle] = useState("");
    const [courseId, setCourseId] = useState("");
    const [due, setDue] = useState(() => dayKey(new Date(Date.now() + 86400000)));
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
    const counts = {
        open: user.tasks.filter((x) => !x.doneAt).length,
        today: user.tasks.filter((x) => !x.doneAt && dayKey(x.dueAt) === today).length,
        overdue: user.tasks.filter((x) => !x.doneAt && dayKey(x.dueAt) < today).length,
        done: user.tasks.filter((x) => x.doneAt).length,
    };

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return setErr("Give the task a name.");
        setAdding(true);
        setErr(null);
        await mutate((r) => r.addTask({ title: title.trim(), courseId: courseId || null, dueAt: new Date(`${due}T18:00:00`).toISOString() }));
        setTitle("");
        setAdding(false);
        toast("Task added", "success");
    };

    const enrolledCourses = catalogue.courses.filter((c) => user.enrollments.some((e) => e.courseId === c.id));

    return (
        <>
            <PageTitle title="Tasks" sub={counts.open ? `${counts.open} open${counts.overdue ? ` · ${counts.overdue} overdue` : ""}` : "All clear."} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div>
                    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter tasks">
                        {(["open", "today", "overdue", "done"] as Filter[]).map((f) => (
                            <button key={f} role="tab" type="button" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("h-9 rounded-full border px-3.5 text-[13px] font-semibold capitalize", filter === f ? "border-ink text-ink" : "border-line text-caption hover:text-ink", f === "overdue" && counts.overdue > 0 && filter !== f && "text-danger-ink")}>
                                {f} {counts[f] ? `· ${counts[f]}` : ""}
                            </button>
                        ))}
                    </div>
                    {list.length ? (
                        <Card>
                            <ul>
                                {list.map((t) => (
                                    <TaskRow key={t.id} task={t} onToggle={() => void mutate((r) => r.toggleTask(t.id))} onDelete={() => void mutate((r) => r.deleteTask(t.id)).then(() => toast("Task deleted"))} />
                                ))}
                            </ul>
                        </Card>
                    ) : (
                        <EmptyState icon={<CheckSquare size={22} />} title={filter === "done" ? "Nothing finished yet" : filter === "overdue" ? "Nothing overdue" : "No tasks here"} body={filter === "open" ? "Add the next thing you need to do for a course." : undefined} />
                    )}
                </div>
                <Card as="section" aria-labelledby="add-h" className="self-start xl:sticky xl:top-(--cs-rail-top)">
                    <h2 id="add-h" className="mb-3 text-[16px] font-semibold">Add a task</h2>
                    <form onSubmit={(e) => void add(e)} className="flex flex-col gap-3">
                        <Field label="Task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rebuild the pricing table with Grid" error={err} />
                        <label className="flex flex-col gap-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">
                            Course
                            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-[14px] normal-case tracking-normal text-ink">
                                <option value="">No course</option>
                                {(enrolledCourses.length ? enrolledCourses : catalogue.courses).map((c) => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </label>
                        <Field label="Due" type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} />
                        <Button type="submit" loading={adding} block>
                            <Plus size={16} /> Add task
                        </Button>
                    </form>
                </Card>
            </div>
        </>
    );
}
