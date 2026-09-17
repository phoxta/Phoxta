import { useCallback } from "react";
import { useData } from "@/state/data";

/**
 * Sending a party checklist across to Tasks, without reaching into the Tasks
 * module's code.
 *
 * The rule of the house is that a module owns its folder and reads other
 * modules through their LOADED SLICE, never their source. A checklist line has
 * to become a real Task, though, so this file does the smallest possible
 * version of that: it looks up the tasks slice the shell already built, checks
 * — structurally, at run time — that it exposes a `createTask`, and calls it
 * with a plain object. No import of the Tasks module, no shared type, no
 * assumption beyond the one field name the whole product agrees on.
 *
 * If Tasks is not present (a build without it, a slice that failed to load),
 * `useTaskWriter` returns null and the board falls back to keeping the
 * checklist to itself and saying so. The lines stay; nothing is lost.
 */

export interface TaskDraft {
    title: string;
    notes?: string;
    assigneeMemberIds?: string[];
    dueAt?: string | null;
    /** The board this came from, so the task remembers where it was decided. */
    sourceType?: string;
    sourceId?: string | null;
    childSafe?: boolean;
}

type Writer = { createTask: (input: TaskDraft) => Promise<unknown> };

const isWriter = (v: unknown): v is Writer => typeof v === "object" && v !== null && typeof (v as Writer).createTask === "function";

/** The id of the created task, when the Tasks module hands one back. */
const idOf = (v: unknown): string | null => {
    if (typeof v === "object" && v !== null) {
        const id = (v as { id?: unknown }).id;
        if (typeof id === "string" && id) return id;
    }
    return null;
};

/**
 * Returns a function that creates tasks and reloads the Tasks slice, or null
 * when Tasks is not available in this build.
 */
export function useTaskWriter(): ((drafts: TaskDraft[]) => Promise<Array<string | null>>) | null {
    const { slices, reload } = useData();
    const repo = slices.tasks?.repo as unknown;
    const ready = isWriter(repo);

    const write = useCallback(
        async (drafts: TaskDraft[]): Promise<Array<string | null>> => {
            if (!isWriter(repo)) throw new Error("Tasks isn't available in this build.");
            const ids: Array<string | null> = [];
            for (const draft of drafts) ids.push(idOf(await repo.createTask(draft)));
            await reload("tasks");
            return ids;
        },
        [repo, reload],
    );

    return ready ? write : null;
}
