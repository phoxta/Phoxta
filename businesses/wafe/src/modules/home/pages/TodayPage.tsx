import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { longDate } from "@/lib/format";
import { useData, useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { PageTitle } from "@/components/shared";
import homeModule from "../module";
import { EMPTY_HOME, droppedToday, withoutDropped } from "../derive";
import { TodayList } from "../components/panels";

/**
 * Everything due today — the list Home used to open with.
 *
 * Home shows three things and says "and 53 more across the family"; this is
 * where that link lands. Nothing was thrown away: it is grouped the way a
 * parent thinks (me, each person, all of us), filterable by member, and it
 * starts with routines hidden, because six chores, three habits, a verse and
 * an outfit are somebody's rhythm rather than the family's day.
 */
export default function TodayPage() {
    const sp = useSpace();
    const { dashboard } = useData();
    const { state: loaded } = useModule(homeModule);
    const state = loaded ?? EMPTY_HOME;

    const today = sp.today;
    const dropped = useMemo(() => droppedToday(state, today), [state, today]);
    const agenda = useMemo(() => withoutDropped(dashboard.agenda, dropped), [dashboard.agenda, dropped]);

    return (
        <div>
            <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                <ArrowLeft size={14} aria-hidden="true" /> Home
            </Link>
            <PageTitle title="Today" sub={`Everything due across the family on ${longDate(today)}.`} area="home" />
            <TodayList agenda={agenda} meId={sp.me.id} members={sp.members} letGo={dropped.size} />
        </div>
    );
}
