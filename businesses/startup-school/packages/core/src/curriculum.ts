import type { Category, Course, Lesson, LessonBlock, Module, QuizQuestion } from "./types";
import { SCHOOL_MODULES, schoolCourseId, schoolLessonId } from "../../../../../packages/opportunity-core/school";

// Phoxta 2.0 B section 9. The former catalogue remains in curriculum-legacy.ts;
// deployment archives its rows and reports progress instead of deleting them.
export const FINAL_CATEGORIES: Category[] = [
    { id: "start", name: "Discover & Investigate", blurb: "Find the customer, problem, alternatives and timing." },
    { id: "fund", name: "Validate & Shape", blurb: "Test what must be true and design the business." },
    { id: "grow", name: "Build, Launch & Learn", blurb: "Deliver value, reach customers and review the evidence." },
];
export const FINAL_COURSES: Course[] = SCHOOL_MODULES.map((m, i) => ({
    id: schoolCourseId(m.id), slug: m.id, title: m.title, blurb: m.outcome,
    description: `${m.outcome} Produce your ${m.artifact} in a live opportunity workspace.`,
    categoryId: i < 5 ? "start" : i < 9 ? "fund" : "grow",
    mentorId: "m-phoxta-curriculum", level: "Beginner", theme: i < 5 ? "start" : i < 9 ? "fund" : "grow",
    rating: 0, learners: 0, outcomes: [m.outcome, `Create: ${m.artifact}`],
    finalProjectTitle: m.artifact, finalProjectDescription: m.exercise,
    publishedAt: "2026-09-26T00:00:00.000Z",
}));
export const FINAL_MODULES: Module[] = SCHOOL_MODULES.map(m => ({ id: `${schoolCourseId(m.id)}-module`, courseId: schoolCourseId(m.id), title: m.title, sort: 0 }));
export const FINAL_LESSONS: Lesson[] = SCHOOL_MODULES.map(m => ({
    id: schoolLessonId(m.id), courseId: schoolCourseId(m.id), moduleId: `${schoolCourseId(m.id)}-module`,
    title: m.title, kind: "article", durationSec: 600, sort: 0,
    body: `${m.lesson}\n\n**Illustrative example**\n\n${m.example}\n\n**Apply it to your opportunity**\n\n${m.exercise}`,
}));
export const FINAL_LESSON_BLOCKS: LessonBlock[] = SCHOOL_MODULES.flatMap(m => [
    { id: `${m.id}-objective`, lessonId: schoolLessonId(m.id), type: "objective", title: "Learning objective", content: m.outcome, sort: 0 },
    { id: `${m.id}-learn`, lessonId: schoolLessonId(m.id), type: "learn", title: "Learn", content: m.lesson, sort: 1 },
    { id: `${m.id}-example`, lessonId: schoolLessonId(m.id), type: "example", title: "Illustrative example", content: m.example, sort: 2 },
    { id: `${m.id}-activity`, lessonId: schoolLessonId(m.id), type: "activity", title: `Create your ${m.artifact}`, content: m.exercise, sort: 3 },
    { id: `${m.id}-template`, lessonId: schoolLessonId(m.id), type: "template", title: m.artifact, content: m.template.map(x => `- ${x}`).join("\n"), sort: 4, actionHref: `/opportunity-practice/${m.id}`, actionLabel: "Open opportunity workspace" },
    { id: `${m.id}-coach`, lessonId: schoolLessonId(m.id), type: "ai_activity", title: "Ask the Adviser", content: "Bring your real draft or observations. Ask which statements are supported, which are hypotheses and which question to test next. Do not ask AI to invent evidence.", sort: 5, actionHref: "/adviser", actionLabel: "Open Adviser" },
]);
export const FINAL_QUIZ: QuizQuestion[] = [];
