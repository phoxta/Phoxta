import { Suspense, lazy } from "react";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/state/auth";
import { AccessProvider } from "@/state/access";
import { DataProvider, useData } from "@/state/data";
import { TenantProvider } from "@/state/tenant";
import { ToastProvider } from "@/state/toast";
import { AppShell } from "@/components/shell/AppShell";
import { Skeleton, Sparkle } from "@/components/ui/primitives";
import { ForgotPage, LoginPage, OnboardingPage, SignupPage } from "@/pages/AuthPages";
import DashboardPage from "@/pages/DashboardPage";
import PricingPage from "@/pages/PricingPage";
import { PaymentCancelPage, PaymentSuccessPage } from "@/pages/PaymentPages";
import LaunchPage from "@/pages/LaunchPage";
import { EntitlementGate, FeatureGate } from "@/components/billing/AccessGate";
import { StaffProvider, useStaff } from "@/state/staff";
const StaffShell = lazy(() => import("@/pages/staff/StaffShell"));
const StaffOverview = lazy(() => import("@/pages/staff/StaffPages").then(m => ({default: m.StaffOverview})));
const StaffTeaching = lazy(() => import("@/pages/staff/StaffPages").then(m => ({default: m.StaffTeaching})));
const StaffPeople = lazy(() => import("@/pages/staff/StaffPages").then(m => ({default: m.StaffPeople})));
const StaffOperations = lazy(() => import("@/pages/staff/StaffPages").then(m => ({default: m.StaffOperations})));
const StaffSupport = lazy(() => import("@/pages/staff/StaffPages").then(m => ({default: m.StaffSupport})));
const ContentWorkspace = lazy(() => import("@/pages/staff/ContentWorkspace"));
const SecurityPage = lazy(() => import("@/pages/staff/SecurityPage"));
const InvitePage = lazy(() => import("@/pages/staff/InvitePage"));
const ProgrammePage = lazy(() => import("@/pages/ProgrammePage"));
const AdmissionTermsPage = lazy(() => import("@/pages/AdmissionTermsPage"));

// Every screen past the dashboard loads on demand: the first paint is the one
// the case study designed for, not the whole app.
const OpportunityPracticePage = lazy(() => import("@/pages/OpportunityPracticePage"));
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
// The classroom is the whole screen, so it loads — and routes — on its own.
const ClassroomPage = lazy(() => import("@/pages/ClassroomPage"));
const MentorDetail = lazy(() => import("@/pages/MentorsPage").then((m) => ({ default: m.MentorDetailPage })));
const Sessions = lazy(() => import("@/pages/SessionsPage")); // /sessions — 1:1 bookings
const Venture = lazy(() => import("@/pages/VenturePage")); // /venture — the record every AI surface reads
const Adviser = lazy(() => import("@/pages/AdviserPage")); // /adviser — grounded, and refuses to do the work
const Experiments = lazy(() => import("@/pages/ExperimentsPage"));
const LearnHub = lazy(() => import("@/pages/WorkflowHubs").then((m) => ({ default: m.LearnHubPage })));
const BuildHub = lazy(() => import("@/pages/WorkflowHubs").then((m) => ({ default: m.BuildHubPage })));
const ConnectHub = lazy(() => import("@/pages/WorkflowHubs").then((m) => ({ default: m.ConnectHubPage })));
const More = lazy(() => import("@/pages/WorkflowHubs").then((m) => ({ default: m.MorePage })));

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
function SignedInGate() {
    const { ready, session } = useAuth();
    const { pathname, search } = useLocation();
    if (!ready) return <Splash />;
    if (!session) return <Navigate to="/login" replace state={{ from: pathname + search }} />;
    return <Outlet />;
}

/** The data provider mounts only after a paid pass is confirmed, so the app never
 * ships a local course fallback to an account that has not enrolled. */
function SchoolDataRoute() {
    return <DataProvider><Outlet /></DataProvider>;
}

function SchoolGate() {
    const { loading, user } = useData();
    const { pathname } = useLocation();
    if (loading) return <Splash />;
    if (!user.profile.onboarded && pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
    if (user.profile.onboarded && pathname === "/onboarding") return <Navigate to="/" replace />;
    return <Outlet />;
}

function Public() {
    const { ready, session } = useAuth();
    const staff = useStaff();
    const { state } = useLocation();
    if (!ready || !staff.ready) return <Splash />;
    const from = (state as {from?: string} | null)?.from;
    if (session) return <Navigate to={from?.startsWith("/") && !from.startsWith("//") ? from : staff.isStaff ? "/staff" : "/"} replace />;
    return <Outlet />;
}

export default function App() {
    return (
        <ToastProvider>
            <TenantProvider>
                <AuthProvider>
                    <AccessProvider>
                    <StaffProvider>
                        <BrowserRouter>
                            <Routes>
                                <Route element={<Public />}>
                                    <Route path="/login" element={<LoginPage />} />
                                    <Route path="/signup" element={<SignupPage />} />
                                    <Route path="/forgot" element={<ForgotPage />} />
                                </Route>
                                <Route path="/pricing" element={<PricingPage />} />
                                <Route path="/admission-terms" element={<Suspense fallback={<Splash />}><AdmissionTermsPage /></Suspense>} />
                                <Route path="/staff/invite" element={<Suspense fallback={<Splash />}><InvitePage /></Suspense>} />
                                <Route element={<SignedInGate />}>
                                    <Route path="/mentoring" element={<Navigate to="/staff/teaching" replace />} />
                                    <Route path="/account/security" element={<Suspense fallback={<Splash />}><div className="mx-auto max-w-3xl space-y-6 p-6"><Link to="/pricing">← Back to Startup School</Link><SecurityPage /></div></Suspense>} />
                                    <Route path="/programme" element={<Suspense fallback={<Splash />}><ProgrammePage /></Suspense>} />
                                    <Route element={<Suspense fallback={<Splash />}><StaffShell /></Suspense>}>
                                        <Route path="/staff" element={<StaffOverview />} />
                                        <Route path="/staff/teaching" element={<StaffTeaching />} />
                                        <Route path="/staff/content" element={<ContentWorkspace />} />
                                        <Route path="/staff/people" element={<StaffPeople />} />
                                        <Route path="/staff/operations" element={<StaffOperations />} />
                                        <Route path="/staff/support" element={<StaffSupport />} />
                                        <Route path="/staff/security" element={<SecurityPage />} />
                                    </Route>
                                    <Route element={<StaffRoomGate />}>
                                        <Route element={<SchoolDataRoute />}>
                                            <Route path="/staff/room/:id" element={<Suspense fallback={<Splash />}><ClassroomPage /></Suspense>} />
                                        </Route>
                                    </Route>
                                    <Route path="/payment/success" element={<PaymentSuccessPage />} />
                                    <Route path="/payment/cancel" element={<PaymentCancelPage />} />
                                    <Route element={<EntitlementGate />}>
                                        <Route element={<SchoolDataRoute />}>
                                            <Route element={<SchoolGate />}>
                                                <Route path="/onboarding" element={<OnboardingPage />} />
                                    {/* No sidebar, no toolbar: a class fills the screen. */}
                                    <Route element={<FeatureGate feature="cohort" />}>
                                        <Route
                                            path="/room/:id"
                                            element={
                                                <Suspense fallback={<Splash />}>
                                                    <ClassroomPage />
                                                </Suspense>
                                            }
                                        />
                                    </Route>
                                        <Route element={<AppShell />}>
                                            <Route index element={<DashboardPage />} />
                                        <Route
                                            element={
                                                <Suspense fallback={<PageFallback />}>
                                                    <Outlet />
                                                </Suspense>
                                            }
                                        >
                                            <Route path="learn" element={<LearnHub />} />
                                            <Route path="build" element={<BuildHub />} />
                                            <Route path="connect" element={<ConnectHub />} />
                                            <Route path="more" element={<More />} />
                                            <Route path="courses" element={<CoursesPage />} />
                                            <Route path="opportunity-practice/:moduleId" element={<OpportunityPracticePage />} />
                                            <Route path="courses/:slug" element={<CourseDetailPage />} />
                                            <Route path="learn/:slug/:lessonId" element={<LessonPage />} />
                                            <Route element={<FeatureGate feature="cohort" />}>
                                                <Route path="lessons" element={<LiveLessonsPage />} />
                                                <Route path="groups" element={<Groups />} />
                                                <Route path="groups/:id" element={<GroupDetail />} />
                                                <Route path="inbox" element={<Inbox />} />
                                                <Route path="inbox/new/:kind/:peerId" element={<NewConversation />} />
                                                <Route path="inbox/:id" element={<Inbox />} />
                                                <Route path="mentors" element={<Mentors />} />
                                                <Route path="mentors/:id" element={<MentorDetail />} />
                                                <Route path="sessions" element={<Sessions />} />
                                            </Route>
                                            <Route path="tasks" element={<TasksPage />} />
                                            <Route path="venture" element={<Venture />} />
                                            <Route path="experiments" element={<Experiments />} />
                                            <Route path="adviser" element={<Adviser />} />
                                            <Route path="progress" element={<ProgressPage />} />
                                            <Route path="certificates/:id" element={<CertificatePage />} />
                                            <Route path="notifications" element={<NotificationsPage />} />
                                            <Route path="settings" element={<SettingsPage />} />
                                            <Route element={<FeatureGate feature="launch" />}>
                                                <Route path="launch" element={<LaunchPage />} />
                                            </Route>
                                            <Route path="*" element={<NotFound />} />
                                        </Route>
                                    </Route>
                                            </Route>
                                        </Route>
                                    </Route>
                                </Route>
                            </Routes>
                        </BrowserRouter>
                    </StaffProvider>
                    </AccessProvider>
                </AuthProvider>
            </TenantProvider>
        </ToastProvider>
    );
}

function StaffRoomGate() {
    const {ready,isStaff}=useStaff();
    if(!ready)return <Splash/>;
    return isStaff ? <Outlet/> : <Navigate to="/login" replace/>;
}

function NotFound() {
    return (
        <div className="rounded-xl bg-card px-6 py-16 text-center">
            <h1 className="text-[22px] font-semibold">That page isn't here</h1>
            <p className="mt-2 text-[14px] text-muted">It may have moved. Your dashboard is one tap away.</p>
            <Link to="/" className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white">
                Back to dashboard
            </Link>
        </div>
    );
}
