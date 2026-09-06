import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/state/auth";
import { DataProvider, useData } from "@/state/data";
import { TenantProvider } from "@/state/tenant";
import { ToastProvider } from "@/state/toast";
import { AppShell } from "@/components/shell/AppShell";
import { Skeleton, Sparkle } from "@/components/ui/primitives";
import { ForgotPage, LoginPage, OnboardingPage, SignupPage } from "@/pages/AuthPages";
import DashboardPage from "@/pages/DashboardPage";

// Every screen past the dashboard loads on demand: the first paint is the one
// the case study designed for, not the whole app.
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("@/pages/CourseDetailPage"));
const LessonPage = lazy(() => import("@/pages/LessonPage"));
const LiveLessonsPage = lazy(() => import("@/pages/LiveLessonsPage"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const ProgressPage = lazy(() => import("@/pages/ProgressPage"));
const CertificatePage = lazy(() => import("@/pages/CertificatePage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const Groups = lazy(() => import("@/pages/GroupsPage").then((m) => ({ default: m.GroupsPage })));
const GroupDetail = lazy(() => import("@/pages/GroupsPage").then((m) => ({ default: m.GroupDetailPage })));
const Inbox = lazy(() => import("@/pages/InboxPage"));
const NewConversation = lazy(() => import("@/pages/InboxPage").then((m) => ({ default: m.NewConversationPage })));
const Mentors = lazy(() => import("@/pages/MentorsPage").then((m) => ({ default: m.MentorsPage })));
const MentorDetail = lazy(() => import("@/pages/MentorsPage").then((m) => ({ default: m.MentorDetailPage })));

function Splash() {
    return (
        <div className="grid min-h-dvh place-items-center bg-page" role="status" aria-label="Loading">
            <span className="grid size-12 place-items-center rounded-full bg-brand">
                <Sparkle className="w-6 animate-[cs-spin-slow_4s_linear_infinite]" />
            </span>
        </div>
    );
}

function PageFallback() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
        </div>
    );
}

/** Signed out → the auth screens. Signed in but not onboarded → onboarding. */
function Gate() {
    const { ready, session, demo } = useAuth();
    const { loading, user } = useData();
    const { pathname } = useLocation();
    if (!ready) return <Splash />;
    if (!session && !demo) return <Navigate to="/login" replace state={{ from: pathname }} />;
    if (loading) return <Splash />;
    if (session && !user.profile.onboarded && pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
    return <Outlet />;
}

function Public() {
    const { ready, session, demo } = useAuth();
    if (!ready) return <Splash />;
    if (session || demo) return <Navigate to="/" replace />;
    return <Outlet />;
}

export default function App() {
    return (
        <ToastProvider>
            <TenantProvider>
                <AuthProvider>
                    <DataProvider>
                        <BrowserRouter>
                            <Routes>
                                <Route element={<Public />}>
                                    <Route path="/login" element={<LoginPage />} />
                                    <Route path="/signup" element={<SignupPage />} />
                                    <Route path="/forgot" element={<ForgotPage />} />
                                </Route>
                                <Route element={<Gate />}>
                                    <Route path="/onboarding" element={<OnboardingPage />} />
                                    <Route element={<AppShell />}>
                                        <Route index element={<DashboardPage />} />
                                        <Route
                                            element={
                                                <Suspense fallback={<PageFallback />}>
                                                    <Outlet />
                                                </Suspense>
                                            }
                                        >
                                            <Route path="courses" element={<CoursesPage />} />
                                            <Route path="courses/:slug" element={<CourseDetailPage />} />
                                            <Route path="learn/:slug/:lessonId" element={<LessonPage />} />
                                            <Route path="lessons" element={<LiveLessonsPage />} />
                                            <Route path="tasks" element={<TasksPage />} />
                                            <Route path="groups" element={<Groups />} />
                                            <Route path="groups/:id" element={<GroupDetail />} />
                                            <Route path="inbox" element={<Inbox />} />
                                            <Route path="inbox/new/:kind/:peerId" element={<NewConversation />} />
                                            <Route path="inbox/:id" element={<Inbox />} />
                                            <Route path="mentors" element={<Mentors />} />
                                            <Route path="mentors/:id" element={<MentorDetail />} />
                                            <Route path="progress" element={<ProgressPage />} />
                                            <Route path="certificates/:id" element={<CertificatePage />} />
                                            <Route path="notifications" element={<NotificationsPage />} />
                                            <Route path="settings" element={<SettingsPage />} />
                                            <Route path="*" element={<NotFound />} />
                                        </Route>
                                    </Route>
                                </Route>
                            </Routes>
                        </BrowserRouter>
                    </DataProvider>
                </AuthProvider>
            </TenantProvider>
        </ToastProvider>
    );
}

function NotFound() {
    return (
        <div className="rounded-xl bg-card px-6 py-16 text-center">
            <h1 className="text-[22px] font-semibold">That page isn't here</h1>
            <p className="mt-2 text-[14px] text-muted">It may have moved. Your dashboard is one tap away.</p>
            <a href="/" className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white">
                Back to dashboard
            </a>
        </div>
    );
}
