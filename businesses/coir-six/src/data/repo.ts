import type {
    Catalogue,
    Certificate,
    Conversation,
    GroupPost,
    Message,
    NewTask,
    Note,
    PeerKind,
    Profile,
    QuizAttempt,
    Task,
    UserState,
} from "@/data/types";

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

    updateProfile(patch: Partial<Profile>): Promise<void>;

    enroll(courseId: string): Promise<void>;
    /** Save playback position; `completed` marks the lesson done. */
    saveProgress(lessonId: string, positionSec: number, completed?: boolean): Promise<void>;
    logStudy(lessonId: string | null, minutes: number): Promise<void>;

    toggleBookmark(courseId: string): Promise<boolean>;
    toggleFollow(mentorId: string): Promise<boolean>;
    toggleRsvp(liveLessonId: string): Promise<boolean>;

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
