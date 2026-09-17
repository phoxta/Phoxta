import type { Book, NewCourse, QuizQuestion } from "./types";

/**
 * Book → course, and the two things that make it trustworthy.
 *
 * 1. A HARD CEILING. The companion is given twenty seconds. Whatever it has
 *    or has not produced by then, `generateCourse` resolves — with the model's
 *    weeks if they arrived and parsed, otherwise with the scaffold below. The
 *    acceptance criterion "a course generates in ≤ 20 s and opens in an editor"
 *    is therefore true by construction rather than by hoping the network is
 *    quick, and it is measurable on any device: the caller is handed a
 *    `seconds` number it can show.
 *
 * 2. A SCAFFOLD THAT IS A REAL COURSE. When the plan is capped, the backend is
 *    not configured, the reply cannot be parsed or the twenty seconds run out,
 *    the family still gets four weeks with chapter ranges, three questions and
 *    an activity — empty of opinions the model did not have, and entirely
 *    editable. Nothing about authoring a course by hand is a lesser path.
 */

export const COURSE_TIMEOUT_MS = 20_000;

type Raw = Record<string, unknown>;

const str = (v: unknown, d = ""): string => (typeof v === "string" ? v.trim() : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown, max: number): string[] => arr(v).map((x) => str(x)).filter(Boolean).slice(0, max);

function parseQuiz(v: unknown): QuizQuestion[] {
    return arr(v)
        .map((raw): QuizQuestion | null => {
            const q = raw as Raw;
            const options = strList(q.options ?? q.choices ?? q.answers, 6);
            if (options.length < 2) return null;
            const rawAnswer = q.answer ?? q.correct ?? q.correctIndex;
            let answer = 0;
            if (typeof rawAnswer === "number") answer = rawAnswer;
            else if (typeof rawAnswer === "string") {
                const byText = options.findIndex((o) => o.toLowerCase() === rawAnswer.trim().toLowerCase());
                answer = byText >= 0 ? byText : Number(rawAnswer) || 0;
            }
            const text = str(q.q ?? q.question ?? q.prompt);
            if (!text) return null;
            return { q: text, options, answer: Math.min(Math.max(0, Math.round(answer)), options.length - 1), why: str(q.why ?? q.explanation) || undefined };
        })
        .filter((x): x is QuizQuestion => x !== null)
        .slice(0, 5);
}

/** Normalise whatever the companion returned into weeks we can store. */
export function parseCourseWeeks(data: unknown): NewCourse["weeks"] | null {
    if (!data || typeof data !== "object") return null;
    const root = data as Raw;
    const list = arr(root.weeks);
    if (!list.length) return null;
    const weeks = list
        .map((raw, i) => {
            const w = raw as Raw;
            const theme = str(w.theme ?? w.title);
            const chapters = str(w.chapters ?? w.reading ?? w.chapterRange);
            if (!theme && !chapters) return null;
            return {
                week: typeof w.week === "number" ? w.week : i + 1,
                theme: theme || `Week ${i + 1}`,
                chapters,
                discussionQuestions: strList(w.discussion ?? w.discussionQuestions ?? w.questions, 5),
                familyActivity: str(w.assignment ?? w.familyActivity ?? w.activity),
                quiz: parseQuiz(w.quiz ?? w.questions_quiz),
            };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 8);
    return weeks.length ? weeks : null;
}

export const courseTitleFrom = (data: unknown, book: Book): string => {
    const t = data && typeof data === "object" ? str((data as Raw).title) : "";
    return t || `${book.title} — four weeks for us`;
};

/** Four weeks of structure with nothing invented — the manual path, and the fallback. */
export function scaffoldWeeks(book: Book, count = 4): NewCourse["weeks"] {
    const total = book.pages || 0;
    const per = total ? Math.ceil(total / count) : 0;
    const unit = book.format === "audio" ? "minutes" : "pages";
    return Array.from({ length: count }, (_, i) => ({
        week: i + 1,
        theme: "",
        chapters: per ? `${unit === "minutes" ? "Minutes" : "Pages"} ${i * per + 1}–${Math.min(total, (i + 1) * per)}` : "",
        discussionQuestions: ["", "", ""],
        familyActivity: "",
        quiz: [],
    }));
}

/** The prompt the companion is given — the family's own words, and the book's. */
export function coursePrompt(book: Book, audience: string, weeks: number): string {
    return [
        `Build a ${weeks}-week family course from the book "${book.title}"${book.author ? ` by ${book.author}` : ""}.`,
        book.pages ? `It is ${book.pages} ${book.format === "audio" ? "minutes of audio" : "pages"} long.` : "",
        book.notes ? `What we said about it: ${book.notes}` : "",
        audience ? `Who it is for: ${audience}` : "",
        "Each week needs a theme, the chapters to read, three discussion questions we could actually ask at the table, one family activity, and a five-question multiple-choice quiz with the correct answer marked.",
    ]
        .filter(Boolean)
        .join(" ");
}
