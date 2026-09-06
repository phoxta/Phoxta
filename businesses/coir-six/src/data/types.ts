import type { Hue } from "@/lib/format";

/**
 * The domain. Two halves: the CATALOGUE (courses, mentors, live lessons,
 * groups — shared by everyone, read-only to learners) and the LEARNER STATE
 * (everything one person does with it). The split is what lets the same UI run
 * on the bundled demo and on the live backend without knowing which.
 */

export type CategoryId = "fe" | "ux" | "br";
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type LessonKind = "video" | "article" | "quiz";
export type Theme = CategoryId | "mint" | "peach";

export interface Category {
    id: CategoryId;
    name: string;
    blurb: string;
}

export interface Mentor {
    id: string;
    name: string;
    role: string;
    bio: string;
    hue: Hue;
    /** Portrait; initials on the tint when absent (design: "photo when available"). */
    photoUrl?: string;
    handle: string;
    followers: number;
    expertise: CategoryId[];
}

export interface Course {
    id: string;
    slug: string;
    title: string;
    blurb: string;
    description: string;
    categoryId: CategoryId;
    mentorId: string;
    level: Level;
    theme: Theme;
    /** Cover photo, tinted with the theme gradient; the gradient alone when absent. */
    coverUrl?: string;
    rating: number;
    learners: number;
    outcomes: string[];
    publishedAt: string;
}

export interface Module {
    id: string;
    courseId: string;
    title: string;
    sort: number;
}

export interface Lesson {
    id: string;
    courseId: string;
    moduleId: string;
    title: string;
    kind: LessonKind;
    /** Length in seconds; for YouTube lessons this is the real media length. */
    durationSec: number;
    /** A direct media file (custom player) or a YouTube watch URL (embedded player). */
    videoUrl?: string;
    captionsUrl?: string;
    /** Who made the video — shown beside "Watch on YouTube". */
    source?: string;
    /** Article body (paragraphs separated by blank lines) or the video's summary. */
    body: string;
    sort: number;
}

export interface QuizQuestion {
    id: string;
    lessonId: string;
    prompt: string;
    options: string[];
    /** Index into `options`. */
    answer: number;
    explanation: string;
}

export interface LiveLesson {
    id: string;
    mentorId: string;
    categoryId: CategoryId;
    title: string;
    description: string;
    startsAt: string;
    durationMin: number;
    joinUrl: string;
    /** Set once a past session has been published. */
    recordingUrl?: string;
}

export interface Group {
    id: string;
    name: string;
    categoryId: CategoryId;
    blurb: string;
    members: number;
    imageUrl?: string;
}

export interface GroupPost {
    id: string;
    groupId: string;
    authorName: string;
    authorHue: Hue;
    authorPhotoUrl?: string;
    body: string;
    createdAt: string;
    mine: boolean;
}

export interface Catalogue {
    categories: Category[];
    mentors: Mentor[];
    courses: Course[];
    modules: Module[];
    lessons: Lesson[];
    quiz: QuizQuestion[];
    liveLessons: LiveLesson[];
    groups: Group[];
}

// ---------------------------------------------------------------------------

export interface Profile {
    id: string;
    email: string;
    name: string;
    handle: string;
    hue: Hue;
    photoUrl?: string;
    headline: string;
    weeklyGoalMin: number;
    interests: CategoryId[];
    onboarded: boolean;
    createdAt: string;
}

export interface Enrollment {
    courseId: string;
    enrolledAt: string;
    completedAt: string | null;
    lastLessonId: string | null;
}

export interface LessonProgress {
    lessonId: string;
    positionSec: number;
    completedAt: string | null;
    updatedAt: string;
}

export interface StudySession {
    id: string;
    lessonId: string | null;
    minutes: number;
    occurredAt: string;
}

export interface Task {
    id: string;
    title: string;
    courseId: string | null;
    dueAt: string;
    doneAt: string | null;
    createdAt: string;
}

export interface Note {
    id: string;
    lessonId: string;
    atSec: number | null;
    body: string;
    createdAt: string;
}

export type PeerKind = "mentor" | "friend";

export interface Conversation {
    id: string;
    peerKind: PeerKind;
    peerId: string;
    peerName: string;
    peerRole: string;
    peerHue: Hue;
    lastBody: string;
    updatedAt: string;
    unread: number;
}

export interface Message {
    id: string;
    conversationId: string;
    fromMe: boolean;
    body: string;
    createdAt: string;
}

export type NotificationKind = "lesson" | "task" | "message" | "streak" | "certificate" | "group" | "live";

export interface Notification {
    id: string;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string | null;
    readAt: string | null;
    createdAt: string;
}

export interface QuizAttempt {
    id: string;
    lessonId: string;
    score: number;
    total: number;
    createdAt: string;
}

export interface Certificate {
    id: string;
    courseId: string;
    code: string;
    issuedAt: string;
}

export interface Friend {
    id: string;
    name: string;
    hue: Hue;
    photoUrl?: string;
    label: string;
}

export interface UserState {
    profile: Profile;
    friends: Friend[];
    enrollments: Enrollment[];
    progress: LessonProgress[];
    sessions: StudySession[];
    bookmarks: string[];
    follows: string[];
    tasks: Task[];
    notes: Note[];
    groupIds: string[];
    conversations: Conversation[];
    notifications: Notification[];
    attempts: QuizAttempt[];
    certificates: Certificate[];
    rsvps: string[];
}

export interface NewTask {
    title: string;
    courseId: string | null;
    dueAt: string;
}
