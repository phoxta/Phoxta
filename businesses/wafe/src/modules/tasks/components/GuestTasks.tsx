import { EmptyModule, PageTitle } from "@/components/shared";
import { Card, Skeleton } from "@/components/ui/primitives";
import { isDone } from "../derive";
import { TaskRow } from "./pieces";
import { useTasks } from "./useTasks";

/**
 * Everything a guest may see of this module, on every route it has.
 *
 * `visibleTo` already hands a guest nothing but the tasks a parent assigned to
 * them — but the list, the board and the month are the FAMILY's rooms, and the
 * guest dashboard is "that list, and nothing else is rendered". So all three
 * routes render this instead: their jobs, a tick each, no filter bar naming
 * the household, no member picker, no New task. Deep links still work; they
 * just land here.
 */
export function GuestTasks() {
    const { state, sp, complete, loading } = useTasks();
    if (loading) return <Skeleton className="h-64" />;
    const open = state.tasks.filter((t) => !isDone(t));
    const done = state.tasks.filter(isDone);
    return (
        <div>
            <PageTitle title="What you're helping with" sub={`${sp.space.name} shared these with you. Tick one off when it's done — nothing else of theirs is here.`} area="execute" />
            {open.length === 0 && done.length === 0 ? (
                <EmptyModule title="Nothing for you just now" body="When the family asks you to do something, it will appear here." />
            ) : (
                <Card>
                    <ul>
                        {[...open, ...done].map((t) => (
                            <TaskRow key={t.id} task={t} today={sp.today} canTick={!isDone(t)} onTick={() => void complete(t)} />
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}
