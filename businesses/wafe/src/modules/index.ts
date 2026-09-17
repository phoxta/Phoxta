import type { WafeModule } from "@/data/core";

import home from "./home/module";
import notifications from "./notifications/module";
import family from "./family/module";
import people from "./people/module";
import learning from "./learning/module";
import books from "./books/module";
import bible from "./bible/module";
import curricula from "./curricula/module";
import tasks from "./tasks/module";
import goals from "./goals/module";
import projects from "./projects/module";
import calendar from "./calendar/module";
import finance from "./finance/module";
import travel from "./travel/module";
import wardrobe from "./wardrobe/module";
import wellness from "./wellness/module";
import studio from "./studio/module";
import moodboards from "./moodboards/module";
import memories from "./memories/module";

/**
 * The module registry. Order is nav order within each area; the shell groups
 * by `area`. Adding a module is one import + one line here and nothing else.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODULES: WafeModule<any, any>[] = [
    home,
    notifications,
    family,
    people,
    learning,
    books,
    bible,
    curricula,
    tasks,
    goals,
    projects,
    calendar,
    finance,
    travel,
    wardrobe,
    wellness,
    studio,
    moodboards,
    memories,
];

export function moduleById(id: string): WafeModule<unknown> | undefined {
    return MODULES.find((m) => m.id === id) as WafeModule<unknown> | undefined;
}
