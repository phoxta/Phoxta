/**
 * Emit the 0155 seed migration from the TypeScript catalogue.
 *
 * The SQL and the bundled demo must carry identical rows — that is the whole
 * point of the seed being the fallback AND the seed. Generating one from the
 * other removes the chance of them drifting, which is what would happen if
 * fifty-eight lessons were transcribed by hand.
 *
 * Run from this folder:
 *   node scripts/gen-migration.mjs > ../../supabase/migrations/0155_startup_school_seed.sql
 */
import { build } from "esbuild";

const bundled = await build({
    entryPoints: ["packages/core/src/seed.ts"],
    bundle: true,
    format: "esm",
    write: false,
    platform: "neutral",
});
const mod = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const { CATEGORIES, MENTORS, COURSES, MODULES, LESSONS, QUIZ, LIVE_LESSONS, GROUPS, AVAILABILITY } = mod;

/** SQL string literal, single quotes doubled. NULL for null/undefined. */
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined ? "NULL" : String(v));
/** A jsonb array literal from a JS array of strings. */
const jarr = (a) => `'${JSON.stringify(a ?? []).replace(/'/g, "''")}'::jsonb`;
/** A text[] literal. */
const tarr = (a) => `array[${(a ?? []).map(q).join(", ")}]::text[]`;

const rows = (list, fn) => list.map((x, i) => "    (" + fn(x, i) + ")").join(",\n");

const out = [];
const w = (s = "") => out.push(s);

w("-- ---------------------------------------------------------------------------");
w("-- Phoxta Startup School — starter curriculum");
w("--");
w("-- The school reuses the Coir Six `cs_*` tables under its own organisation:");
w("-- every one of them is org-scoped, `cs_courses.category_id` is plain text with");
w("-- no check constraint, and `cs_categories` is per-org — so a second school");
w("-- needs content, not schema.");
w("--");
w("-- Three tracks replace the three design subjects:");
w("--   start  founder fit, opportunity, model, legal form, plan and pitch");
w("--   fund   opening capital, growth capital, angels and venture");
w("--   grow   selling, operating, measuring, scaling, harvest");
w("--");
w("-- Curriculum distilled from HBR's Entrepreneur's Handbook (fourteen chapters,");
w("-- four appendices) plus the thirteen researched 2026 supplements in");
w("-- .claude/skills/entrepreneur-handbook.");
w("--");
w("-- GENERATED from businesses/startup-school/packages/core/src/seed.ts by");
w("-- _gen_migration.mjs. Edit the TypeScript and regenerate; do not hand-edit,");
w("-- or the bundled demo and the live school will drift apart.");
w("--");
w("-- Idempotent: safe to re-run to refresh starter content without touching");
w("-- learner rows. Called by provisioning for the startup-school blueprint,");
w("-- the way cs_seed_org is called for coir-six.");
w("-- ---------------------------------------------------------------------------");
w("");
// Columns this seed writes that the base schema (0147) does not have. Emitted
// ahead of the function so the file applies on its own, in number order, rather
// than depending on a later migration having run first.
w("-- Where a lesson's 2018 source has been overtaken. A separate column, not an");
w("-- edit to the body: the learner has to be able to tell the two claims apart.");
w("alter table public.cs_lessons add column if not exists revision text not null default '';");
w("");
w("create or replace function public.ss_seed_org(p_org uuid) returns void");
w("language plpgsql security definer set search_path = public as $seed$");
w("begin");
w("");

// -- categories
w("  insert into cs_categories (organization_id, id, name, blurb, sort)");
w("  select p_org, v.* from (values");
w(rows(CATEGORIES, (c, i) => [q(c.id), q(c.name), q(c.blurb), i].join(", ")));
w("  ) as v(id, name, blurb, sort)");
w("  on conflict (organization_id, id) do update set name = excluded.name, blurb = excluded.blurb, sort = excluded.sort;");
w("");

// -- mentors
w("  insert into cs_mentors (organization_id, id, name, role, bio, hue, photo_url, handle, followers, expertise, bookable, timezone, session_min, buffer_min, min_notice_min, horizon_days)");
w("  select p_org, v.* from (values");
w(rows(MENTORS, (m) => [q(m.id), q(m.name), q(m.role), q(m.bio), q(m.hue), q(m.photoUrl), q(m.handle), n(m.followers), tarr(m.expertise),
    m.bookable ? "true" : "false", q(m.timezone ?? "UTC"), n(m.sessionMin ?? 30), n(m.bufferMin ?? 10), n(m.minNoticeMin ?? 240), n(m.horizonDays ?? 28)].join(", ")));
w("  ) as v(id, name, role, bio, hue, photo_url, handle, followers, expertise, bookable, timezone, session_min, buffer_min, min_notice_min, horizon_days)");
w("  on conflict (organization_id, id) do update set");
w("    name = excluded.name, role = excluded.role, bio = excluded.bio, hue = excluded.hue,");
w("    photo_url = excluded.photo_url, handle = excluded.handle, followers = excluded.followers, expertise = excluded.expertise,");
w("    bookable = excluded.bookable, timezone = excluded.timezone, session_min = excluded.session_min,");
w("    buffer_min = excluded.buffer_min, min_notice_min = excluded.min_notice_min, horizon_days = excluded.horizon_days;");
w("");

// -- courses
w("  insert into cs_courses (organization_id, id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, published_at)");
w("  select p_org, v.* from (values");
w(rows(COURSES, (c) => [
    q(c.id), q(c.slug), q(c.title), q(c.blurb), q(c.description), q(c.categoryId), q(c.mentorId),
    q(c.level), q(c.theme), q(c.coverUrl), n(c.rating), n(c.learners), jarr(c.outcomes), q(c.publishedAt) + "::timestamptz",
].join(", ")));
w("  ) as v(id, slug, title, blurb, description, category_id, mentor_id, level, theme, cover_url, rating, learners, outcomes, published_at)");
w("  on conflict (organization_id, id) do update set");
w("    slug = excluded.slug, title = excluded.title, blurb = excluded.blurb, description = excluded.description,");
w("    category_id = excluded.category_id, mentor_id = excluded.mentor_id, level = excluded.level, theme = excluded.theme,");
w("    cover_url = excluded.cover_url, rating = excluded.rating, learners = excluded.learners,");
w("    outcomes = excluded.outcomes, published_at = excluded.published_at;");
w("");

// -- modules
w("  insert into cs_modules (organization_id, id, course_id, title, sort)");
w("  select p_org, v.* from (values");
w(rows(MODULES, (m) => [q(m.id), q(m.courseId), q(m.title), n(m.sort)].join(", ")));
w("  ) as v(id, course_id, title, sort)");
w("  on conflict (organization_id, id) do update set course_id = excluded.course_id, title = excluded.title, sort = excluded.sort;");
w("");

// -- lessons
w("  insert into cs_lessons (organization_id, id, course_id, module_id, title, kind, duration_sec, video_url, captions_url, source, body, revision, sort)");
w("  select p_org, v.* from (values");
w(rows(LESSONS, (l) => [
    q(l.id), q(l.courseId), q(l.moduleId), q(l.title), q(l.kind), n(l.durationSec),
    // source and revision are optional on the Lesson type but NOT NULL in the
    // table, and an explicit NULL defeats a column default. Most lessons here
    // are written for the school rather than attributed to an outside teacher,
    // so an absent one is the empty string, which is what Coir Six stores too.
    q(l.videoUrl), q(l.captionsUrl), q(l.source ?? ""), q(l.body), q(l.revision ?? ""), n(l.sort),
].join(", ")));
w("  ) as v(id, course_id, module_id, title, kind, duration_sec, video_url, captions_url, source, body, revision, sort)");
w("  on conflict (organization_id, id) do update set");
w("    course_id = excluded.course_id, module_id = excluded.module_id, title = excluded.title, kind = excluded.kind,");
w("    duration_sec = excluded.duration_sec, video_url = excluded.video_url, captions_url = excluded.captions_url,");
w("    source = excluded.source, body = excluded.body, revision = excluded.revision, sort = excluded.sort;");
w("");

// -- quiz
w("  insert into cs_quiz_questions (organization_id, id, lesson_id, prompt, options, answer, explanation, sort)");
w("  select p_org, v.* from (values");
{
    const perLesson = {};
    w(rows(QUIZ, (x) => {
        const i = (perLesson[x.lessonId] = (perLesson[x.lessonId] ?? -1) + 1);
        return [q(x.id), q(x.lessonId), q(x.prompt), jarr(x.options), n(x.answer), q(x.explanation), n(i)].join(", ");
    }));
}
w("  ) as v(id, lesson_id, prompt, options, answer, explanation, sort)");
w("  on conflict (organization_id, id) do update set");
w("    lesson_id = excluded.lesson_id, prompt = excluded.prompt, options = excluded.options,");
w("    answer = excluded.answer, explanation = excluded.explanation, sort = excluded.sort;");
w("");

// -- live lessons. Dates are relative to seeding so the timetable is alive.
w("  -- Relative to seeding, so a freshly provisioned school always has a live");
w("  -- timetable rather than one that expired before anyone signed in. live-2 is");
w("  -- deliberately already under way (see seed.ts `inProgress`).");
w("  insert into cs_live_lessons (organization_id, id, mentor_id, category_id, title, description, starts_at, duration_min, join_url)");
w("  select p_org, v.* from (values");
w(rows(LIVE_LESSONS, (l, i) => {
    // Preserve the intent of at()/inProgress() as SQL relative to now().
    const offsets = ["now() - interval '18 days'", "now() - interval '5 minutes'", "now() + interval '3 days'",
        "now() + interval '6 days'", "now() + interval '9 days'", "now() - interval '5 days'"];
    return [q(l.id), q(l.mentorId), q(l.categoryId), q(l.title), q(l.description),
        offsets[i] ?? "now()", n(l.durationMin), q(l.joinUrl)].join(", ");
}));
w("  ) as v(id, mentor_id, category_id, title, description, starts_at, duration_min, join_url)");
w("  on conflict (organization_id, id) do update set");
w("    mentor_id = excluded.mentor_id, category_id = excluded.category_id, title = excluded.title,");
w("    description = excluded.description, starts_at = excluded.starts_at,");
w("    duration_min = excluded.duration_min, join_url = excluded.join_url;");
w("");

// -- availability. Wall-clock in each mentor's own zone; see 0156.
w("  insert into cs_availability (organization_id, id, mentor_id, weekday, on_date, start_time, end_time, closed)");
w("  select p_org, v.* from (values");
w(rows(AVAILABILITY, (a) => [
    q(a.id), q(a.mentorId),
    a.weekday === null || a.weekday === undefined ? "NULL::smallint" : `${a.weekday}::smallint`,
    a.onDate ? `${q(a.onDate)}::date` : "NULL::date",
    `${q(a.startTime)}::time`, `${q(a.endTime)}::time`,
    a.closed ? "true" : "false",
].join(", ")));
w("  ) as v(id, mentor_id, weekday, on_date, start_time, end_time, closed)");
w("  on conflict (organization_id, id) do update set");
w("    mentor_id = excluded.mentor_id, weekday = excluded.weekday, on_date = excluded.on_date,");
w("    start_time = excluded.start_time, end_time = excluded.end_time, closed = excluded.closed;");
w("");

// -- groups
w("  insert into cs_groups (organization_id, id, name, category_id, blurb, members, image_url)");
w("  select p_org, v.* from (values");
w(rows(GROUPS, (g) => [q(g.id), q(g.name), q(g.categoryId), q(g.blurb), n(g.members), q(g.imageUrl)].join(", ")));
w("  ) as v(id, name, category_id, blurb, members, image_url)");
w("  on conflict (organization_id, id) do update set");
w("    name = excluded.name, category_id = excluded.category_id, blurb = excluded.blurb,");
w("    members = excluded.members, image_url = excluded.image_url;");
w("");
w("end $seed$;");
w("");
w("grant execute on function public.ss_seed_org(uuid) to service_role;");
w("");
w("-- ---------------------------------------------------------------------------");
w("-- To populate a school:  select ss_seed_org('<organization uuid>');");
w("-- Re-running refreshes the catalogue and leaves learner rows untouched.");
w("-- ---------------------------------------------------------------------------");

process.stdout.write(out.join("\n") + "\n");
