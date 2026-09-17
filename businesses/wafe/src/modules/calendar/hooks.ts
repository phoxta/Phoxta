import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import mod from "./module";
import { buildEntries, conflicts, filterByMembers, filterBySources, peopleEntries, type Conflict, type Entry, type EntrySource, type OverlaySources } from "./derive";
import type { CurriculaSlice, FinanceSlice, GoalsSlice, PeopleSlice, TasksSlice, TravelSlice } from "./types";

/**
 * The calendar's read path, in one place.
 *
 * Overlays are read from other modules' LOADED SLICES (`useModuleState`), never
 * from their repos and never from their code — so a task deleted in Tasks is
 * gone from the grid on the next render, with no synchronisation anywhere, and
 * a module that has not loaded (or does not exist yet) simply contributes
 * nothing instead of breaking the build.
 */

export function useOverlaySources(fromDate: string, toDate: string): OverlaySources {
    const tasks = useModuleState<TasksSlice>("tasks");
    const goals = useModuleState<GoalsSlice>("goals");
    const travel = useModuleState<TravelSlice>("travel");
    const finance = useModuleState<FinanceSlice>("finance");
    const curricula = useModuleState<CurriculaSlice>("curricula");
    const people = useModuleState<PeopleSlice>("people");

    return useMemo(
        // People owns birthdays and anniversaries; the calendar reads them off
        // People's slice and keeps none of its own (AC 8).
        () => ({ tasks, goals, travel, finance, curricula, people: peopleEntries(people, fromDate, toDate) }),
        [tasks, goals, travel, finance, curricula, people, fromDate, toDate],
    );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The day, week or month a view is showing, held in the URL as `?d=`.
 *
 * A date in component state cannot be linked to, and is lost on every refresh
 * and every back button — so "look at the week of the 12th" only ever means
 * today. Today itself keeps the URL clean by leaving the parameter off.
 */
export function useDateParam(fallback: string): [string, (next: string) => void] {
    const [params, setParams] = useSearchParams();
    const raw = params.get("d") ?? "";
    const date = ISO_DATE.test(raw) ? raw : fallback;

    const setDate = useCallback(
        (next: string) => {
            const p = new URLSearchParams(params);
            if (next === fallback || !ISO_DATE.test(next)) p.delete("d");
            else p.set("d", next);
            setParams(p);
        },
        [params, setParams, fallback],
    );

    return [date, setDate];
}

/** The member-filter chips, shared by every view through the URL-free local state. */
export function useMemberFilter(): { picked: string[]; toggle: (id: string) => void; clear: () => void } {
    const [picked, setPicked] = useState<string[]>([]);
    return {
        picked,
        toggle: (id: string) => setPicked((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id])),
        clear: () => setPicked([]),
    };
}

export interface CalendarWindow {
    entries: Entry[];
    all: Entry[];
    clashes: Conflict[];
    loading: boolean;
    error: string | null;
}

/**
 * Everything drawn between two dates for this member, already filtered by the
 * member chips and the source toggles.
 */
export function useCalendarWindow(fromDate: string, toDate: string, memberIds: string[] = [], hiddenSources: EntrySource[] = []): CalendarWindow {
    const { state, loading, error } = useModule(mod);
    const { members } = useSpace();
    const sources = useOverlaySources(fromDate, toDate);

    const all = useMemo(() => (state ? buildEntries(state, members, sources, fromDate, toDate) : []), [state, members, sources, fromDate, toDate]);
    const entries = useMemo(() => filterBySources(filterByMembers(all, memberIds), hiddenSources), [all, memberIds, hiddenSources]);
    const clashes = useMemo(() => conflicts(entries, members), [entries, members]);

    return { entries, all, clashes, loading, error };
}
