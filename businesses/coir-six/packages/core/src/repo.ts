import type { CaptionSource, LiveRecap, LiveRoom, LocalMedia, VideoFilter } from "./live/room";
import type {
    Catalogue,
    Certificate,
    Conversation,
    GroupPost,
    LiveLesson,
    Mentor,
    Message,
    NewTask,
    Note,
    PeerKind,
    Profile,
    QuizAttempt,
    Task,
    UserState,
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
 * Jason's progress shows yours.
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

    /** Demo only: put Jason back the way the case study left him. */
    resetDemo?(): Promise<void>;
}
