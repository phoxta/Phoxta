import type { Hue } from "./format";

/**
 * The domain. Two halves: the CATALOGUE (courses, mentors, live lessons,
 * groups — shared by everyone, read-only to learners) and the LEARNER STATE
 * (everything one person does with it). The split is what lets the same UI run
 * on the bundled demo and on the live backend without knowing which.
 */

export type CategoryId = "start" | "fund" | "grow";
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
    /** Whether this mentor takes 1:1 bookings at all. */
    bookable?: boolean;
    /** IANA zone the availability rules are written in — never an offset. */
    timezone?: string;
    sessionMin?: number;
    /** Gap enforced on both sides of a booking, so two adjacent bookings leave 2x. */
    bufferMin?: number;
    minNoticeMin?: number;
    horizonDays?: number;
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
    /** The business asset a founder completes by applying the course. */
    finalProjectTitle?: string;
    finalProjectDescription?: string;
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
    /**
     * Where the handbook this lesson teaches has been overtaken since 2018.
     *
     * Kept as a field on the lesson rather than edited into the body, because
     * the two claims are different things and a founder needs to be able to
     * tell them apart: this is what the source says, and this is what has
     * changed since. Silently rewriting the body would leave a course that
     * agrees with itself and cites a book that no longer says that.
     */
    revision?: string;
    sort: number;
}

/** A lesson is a learning flow, not an undifferentiated article. */
export type LessonBlockType = "objective" | "learn" | "example" | "activity" | "ai_activity" | "template" | "resource";

export interface LessonBlock {
    id: string;
    lessonId: string;
    type: LessonBlockType;
    title: string;
    content: string;
    /** A route in this school, when a block should take the founder somewhere. */
    actionHref?: string;
    actionLabel?: string;
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

/** A class the learner actually sat in — the register, from their side. */
export interface LiveAttendance {
    liveLessonId: string;
    joinedAt: string;
    /** Total time in the room across rejoins, so a dropped connection doesn't erase it. */
    seconds: number;
}

/**
 * A mentor's availability, as a weekly rule or an override for one civil date.
 *
 * Times are WALL CLOCK in the mentor's own zone. Storing instants would move
 * the rule twice a year; `onDate` set (rather than `weekday`) marks an override,
 * which is the same row shape deliberately.
 */
export interface AvailabilityRule {
    id: string;
    mentorId: string;
    /** 0 = Sunday .. 6 = Saturday. Null when this row is a date override. */
    weekday: number | null;
    /** Set for an override; null for the recurring weekly rule. */
    onDate: string | null;
    /** "14:00" in the mentor's zone. */
    startTime: string;
    endTime: string;
    /** An override that blocks a day the weekly rule would have opened. */
    closed: boolean;
}

/** A bookable slot, already resolved to instants. */
export interface Slot {
    startsAt: string;
    endsAt: string;
}

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";

/** A 1:1 session — the thing a course enrolment is not. */
export interface Booking {
    id: string;
    mentorId: string;
    startsAt: string;
    endsAt: string;
    /** The zone it was booked in, so the confirmation reads the way it was agreed. */
    bookedTz: string;
    status: BookingStatus;
    agenda: string;
    /** Visible to both. The mentor's own notes are deliberately not here. */
    sharedNotes: string;
    roomId?: string;
    rescheduledFrom?: string;
    cancelReason: string;
    createdAt: string;
}

/**
 * A booking seen from the mentor's side.
 *
 * The founder fields are the minimum a desk needs — who is arriving, and enough
 * of a one-liner to remember which business this is. Everything deeper reaches
 * the mentor through the session brief, for a booking that exists, rather than
 * through a blanket read on learners.
 */
export interface MentorBooking extends Booking {
    founderId: string;
    founderName: string;
    founderHue: Hue;
    founderPhotoUrl?: string;
    founderOneLiner: string;
    /** When the brief was last generated, or null while there isn't one. */
    briefAt: string | null;
}

/** What carries between sessions — the difference between an engagement and four calls. */
export interface BookingAction {
    id: string;
    bookingId: string;
    body: string;
    doneAt: string | null;
    createdAt: string;
}

/**
 * The venture record — the one object every AI feature in this school reads.
 *
 * A model is useful here because it knows about THIS business, not because it
 * is clever. Without a record each feature starts from nothing and produces
 * advice that would fit any company, which is the failure mode the evidence on
 * AI tutoring keeps running into.
 *
 * Eight sections, all the same shape, so the page is one renderer and adding a
 * ninth is a data change. Sections a founder has not reached are ABSENT rather
 * than empty — "no legal section yet" is a fact worth a mentor knowing.
 */
export type VentureStage =
    | "fit" | "opportunity" | "model" | "legal" | "plan"
    | "capital" | "launch" | "growth" | "scale" | "harvest";

export type VentureSectionId =
    | "founder" | "opportunity" | "model" | "legal"
    | "plan" | "money" | "traction" | "ai" | "asks";

/** How the founder is arriving at this venture. A turnkey Phoxta business is
 * still a real venture: the work shifts from idea selection to local proof,
 * launch and operation. */
export type VenturePath = "build" | "phoxta_turnkey" | "hybrid";

/**
 * How sure the founder is, and what would settle it.
 *
 * This is the handbook's ten-market-questions discipline generalised: a claim
 * without a confidence is indistinguishable from a fact, and a low-confidence
 * claim without a test is just an admission. Together they are the most useful
 * thing a mentor can read before a session — they say where to push.
 */
export type VentureConfidence = "guess" | "evidence" | "proven";

export interface VentureClaim {
    id: string;
    text: string;
    confidence: VentureConfidence;
    /** What would move this from a guess to evidence. */
    test: string;
}

export interface VentureSection {
    body: string;
    claims: VentureClaim[];
    updatedAt: string;
}

export interface Venture {
    name: string;
    oneLiner: string;
    stage: VentureStage;
    path: VenturePath;
    /** Jurisdiction. It changes the legal form, the funding sources and the rails. */
    country: string;
    sections: Partial<Record<VentureSectionId, VentureSection>>;
    updatedAt: string;
}

/** A falsifiable piece of founder work. Unlike a task, an experiment records
 * what was believed, what happened, and the decision that followed. */
export type ExperimentStatus = "planned" | "running" | "validated" | "invalidated" | "inconclusive";
export type EvidenceType = "conversation" | "payment" | "metric" | "prototype" | "observation" | "research";

export interface Experiment {
    id: string;
    claimId: string | null;
    sectionId: VentureSectionId | null;
    title: string;
    hypothesis: string;
    method: string;
    threshold: string;
    status: ExperimentStatus;
    evidenceType: EvidenceType | null;
    evidence: string;
    sourceUrl: string;
    result: string;
    decision: string;
    nextStep: string;
    dueAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NewExperiment {
    claimId?: string | null;
    sectionId?: VentureSectionId | null;
    title: string;
    hypothesis: string;
    method: string;
    threshold: string;
    status?: ExperimentStatus;
    evidenceType?: EvidenceType | null;
    evidence?: string;
    sourceUrl?: string;
    result?: string;
    decision?: string;
    nextStep?: string;
    dueAt?: string | null;
}

/** Mentor-facing preparation for a 1:1. Never shown to the founder. */
export interface SessionBrief {
    headline: string;
    context: string[];
    openWith: string;
    watchFor: string[];
    carriedOver: string[];
}

/** A DRAFT write-up of a session. A human approves it before it is saved. */
export interface SessionCapture {
    notes: string;
    actions: string[];
}

/** One grounded answer from the adviser. */
export interface Advice {
    answer: string;
    /** The framework it reasoned from — named so the founder can go and read it. */
    framework: string;
    source: string;
    nextStep: string;
    /** True when it declined to do the founder's work for them. */
    refused?: boolean;
}

/** Where this school's founders are going wrong. Aggregate — never names anyone. */
export interface CohortSignal {
    lessonId: string;
    lessonTitle: string;
    courseTitle: string;
    attempts: number;
    /** Mean score as a percentage. */
    avgScore: number;
}

export interface Catalogue {
    categories: Category[];
    mentors: Mentor[];
    courses: Course[];
    modules: Module[];
    lessons: Lesson[];
    quiz: QuizQuestion[];
    lessonBlocks: LessonBlock[];
    liveLessons: LiveLesson[];
    groups: Group[];
    availability: AvailabilityRule[];
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
    attendance: LiveAttendance[];
    bookings: Booking[];
    venture: Venture;
    experiments: Experiment[];
}

export interface NewTask {
    title: string;
    courseId: string | null;
    dueAt: string;
}
