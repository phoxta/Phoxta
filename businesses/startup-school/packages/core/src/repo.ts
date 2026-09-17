import type { CaptionSource, LiveRecap, LiveRoom, LocalMedia, TranscriptLine, VideoFilter } from "./live/room";
import type {
    Advice,
    BookingAction,
    Catalogue,
    CohortSignal,
    Certificate,
    Conversation,
    GroupPost,
    LiveLesson,
    Mentor,
    MentorBooking,
    Message,
    NewTask,
    Note,
    PeerKind,
    Profile,
    QuizAttempt,
    SessionBrief,
    SessionCapture,
    Slot,
    Task,
    UserState,
    Venture,
} from "./types";

export interface OpenRoomInput {
    lesson: LiveLesson;
    mentor: Mentor | null;
    /** The app's own camera and microphone; core cannot reach them itself. */
    media?: LocalMedia;
    /** Demo only — look at the room the way the mentor running it would. */
    asHost?: boolean;
    /** Live captions for the local microphone; absent = the room offers none. */
    captions?: CaptionSource;
    /** Background blur for the published camera; absent = the room offers none. */
    filter?: VideoFilter;
}

/**
 * Everything the UI can read or change, behind one interface.
 *
 * Two implementations: `LocalRepo` (the bundled demo, persisted in the
 * browser so a visitor can explore every feature without an account) and
 * `SupabaseRepo` (a signed-in learner's real data under row-level security).
 * Pages never know which they are talking to — the same screen that shows
 * Tobi's progress shows yours.
 */
export interface Repo {
    readonly kind: "demo" | "live";

    loadCatalogue(): Promise<Catalogue>;
    loadUser(): Promise<UserState>;
    /** Called when something changed outside the UI (realtime, another tab). */
    subscribe(onChange: () => void): () => void;

    /** `photoUrl: ""` removes the photo. */
    updateProfile(patch: Partial<Profile>): Promise<void>;
    /** Store a cropped, square JPEG profile photo (a Blob on the web, bytes on a phone) and return the URL to save on the profile. */
    uploadPhoto(data: Blob | ArrayBuffer): Promise<string>;

    enroll(courseId: string): Promise<void>;
    /** Save playback position; `completed` marks the lesson done. */
    saveProgress(lessonId: string, positionSec: number, completed?: boolean): Promise<void>;
    logStudy(lessonId: string | null, minutes: number): Promise<void>;

    toggleBookmark(courseId: string): Promise<boolean>;
    toggleFollow(mentorId: string): Promise<boolean>;
    toggleRsvp(liveLessonId: string): Promise<boolean>;

    /**
     * Open the classroom for a live lesson — records attendance and returns
     * whichever room this tenant can actually run (see `live/room.ts`).
     */
    openLiveRoom(input: OpenRoomInput): Promise<LiveRoom>;
    /** Close the attendance row when the learner leaves. */
    leaveLive(liveLessonId: string, seconds: number): Promise<void>;
    /** Host only: store a finished recording and attach it to the lesson. */
    saveRecording(liveLessonId: string, data: Blob | ArrayBuffer, mimeType: string): Promise<string>;
    /**
     * A ticketed URL for the transcription relay. Host only. The Deepgram key
     * stays on the relay; this is an HMAC good for one class, for minutes.
     */
    liveCaptionUrl(liveLessonId: string): Promise<string>;
    /** The class recap, written once and shared. Null while there isn't one. */
    liveRecap(liveLessonId: string, force?: boolean): Promise<LiveRecap | null>;
    /** What was actually said, in order. Empty when the class wasn't captioned. */
    liveTranscript(liveLessonId: string): Promise<TranscriptLine[]>;

    addTask(input: NewTask): Promise<Task>;
    toggleTask(id: string): Promise<void>;
    deleteTask(id: string): Promise<void>;

    addNote(lessonId: string, body: string, atSec: number | null): Promise<Note>;
    deleteNote(id: string): Promise<void>;

    joinGroup(groupId: string): Promise<boolean>;
    loadGroupPosts(groupId: string): Promise<GroupPost[]>;
    postToGroup(groupId: string, body: string): Promise<GroupPost>;

    startConversation(peerKind: PeerKind, peerId: string): Promise<Conversation>;
    loadMessages(conversationId: string): Promise<Message[]>;
    sendMessage(conversationId: string, body: string): Promise<Message>;
    markRead(conversationId: string): Promise<void>;

    markNotificationsRead(ids?: string[]): Promise<void>;

    submitQuiz(lessonId: string, score: number, total: number): Promise<QuizAttempt>;
    issueCertificate(courseId: string): Promise<Certificate>;

    /**
     * Bookable slots for a mentor across a date range, already resolved to
     * instants in the mentor's zone.
     *
     * Always recomputed, never cached: a stale grid offers times that are
     * already taken, which is a worse failure than a slow one.
     */
    mentorSlots(mentorId: string, fromISO: string, toISO: string): Promise<Slot[]>;
    /** Claim a slot. Throws with a readable message if it went in the meantime. */
    bookSlot(mentorId: string, startsAtISO: string, tz: string, agenda: string): Promise<string>;
    cancelBooking(id: string, reason?: string): Promise<void>;
    /** Cancel plus re-book, linked — never a move of `startsAt`, so the trail survives. */
    rescheduleBooking(id: string, startsAtISO: string): Promise<string>;
    /** Action items carried between sessions. */
    bookingActions(bookingId: string): Promise<BookingAction[]>;
    addBookingAction(bookingId: string, body: string): Promise<BookingAction>;
    toggleBookingAction(id: string): Promise<void>;

    // --- the mentor's side --------------------------------------------------

    /**
     * The mentor this account IS, or null. Null is the normal answer — it is
     * what hides the mentoring console, rather than a role flag on the client.
     */
    myMentor(): Promise<Mentor | null>;
    /** Sessions booked WITH this mentor, with enough of the founder to prepare. */
    mentorBookings(): Promise<MentorBooking[]>;

    // --- the venture record and the three AI surfaces ----------------------

    /** Save part of the venture record. Sections are replaced whole. */
    saveVenture(patch: Partial<Venture>): Promise<Venture>;
    /**
     * A grounded answer from the adviser.
     *
     * It reasons only from the handbook's framework index and names the chapter
     * every time, and it refuses to write the founder's plan for them — which
     * is not squeamishness: a plan handed over skips the deciding, which was
     * the whole value of writing one.
     */
    advise(question: string): Promise<Advice>;
    /**
     * Mentor-facing preparation for a session. Null when the caller is not the
     * mentor on it — the founder does not get to read how to be opened with.
     */
    sessionBrief(bookingId: string, force?: boolean): Promise<SessionBrief | null>;
    /**
     * A DRAFT write-up from what was said. Mentor only, and deliberately not
     * saved: a summary of a conversation about someone's business is exactly
     * the wrong thing to publish unreviewed.
     */
    captureSession(bookingId: string): Promise<SessionCapture | null>;
    /** The mentor approving that draft. This is the write. */
    saveSessionNotes(bookingId: string, notes: string, actions: string[]): Promise<void>;
    /**
     * Where this school's founders are going wrong, in aggregate. No model
     * involved — it is a GROUP BY, and it is what tells a mentor what to teach
     * live on Thursday. Never names a founder.
     */
    cohortSignal(days?: number): Promise<CohortSignal[]>;

    /** Demo only: put Tobi back the way the case study left him. */
    resetDemo?(): Promise<void>;
}
