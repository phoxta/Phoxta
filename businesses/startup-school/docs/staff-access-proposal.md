# Startup School: accounts, teaching and school operations

Prepared 25 September 2026; implementation update 26 September 2026. The staff, teaching, content, admission and Launch workflows are now implemented. See [staff-operations.md](./staff-operations.md) for setup, verification and remaining operational work. The baseline findings below are preserved as the original proposal, not the current implementation status.

## Confirmed pricing

| Admission | One-off fee | Learner access |
| --- | ---: | --- |
| Self-study | £250 | One year of courses, toolkits, templates, venture workspace, AI adviser and progress |
| Cohort | £1,200 | Self-study plus instructor-led classes, weekly mentorship and cohort community |
| Launch | £5,000 | Cohort plus investor-network access, any live Phoxta business with handover and three months of Operating Console |

The final confirmed fees supersede the earlier £100/£2,000 proposal. Existing paid order amounts and historical access terms stay intact. Staff assignments are separate from paid admissions. The first intake is 14 October 2026–31 January 2027, Europe/London, with no enrolment cap. Weekly mentoring permits up to three sessions per learner; the school must staff at least one weekly session.

## Original pre-implementation baseline

This is a review of the workspace source and migrations, not an assertion that every historical migration matches the current production database.

- `src/App.tsx` places `/mentoring` and `/room/:id` behind learner admission gates. `src/state/access.tsx` resolves paid entitlements only. A legitimate member of staff with no purchase cannot reach those tools.
- `src/pages/MentoringPage.tsx` and core repository methods already provide a mentor desk, preparation briefs, shared session notes and booking history. Identity is linked through `cs_mentors.user_id`; there is no staff invitation and assignment screen in the school app.
- `cs_is_live_host` recognises organisation owners/admins and the account linked to a lesson's mentor. LiveKit host moderation and recording attachment already exist. A separate lecturer assignment and co-host workflow is missing.
- The school routes have no course editor, media library, review/publish workflow or school administration workspace. Course definitions are supplied through seeded data and migrations.
- There is no first-class cohort intake model in the reviewed school schema. Community groups, scheduled classes and course enrolments are present, but do not define an intake's dates, capacity, teaching team and membership.
- The paid-access migration's restrictive booking policies and participant trigger require a learner's paid Cohort entitlement. Staff need explicit, assignment-scoped permissions at these database entry points as well as at page routes.
- `coir-live` and `startup-school-ai` use a school profile as an initial access check. A profile alone is insufficient proof of a current paid admission or staff assignment. These direct endpoints need the same permission checks as the application.
- The recordings migration creates a public bucket and permits school profiles to upload into their organisation folder. Paid recordings should use private storage, staff upload permissions and authorised playback URLs.
- `cs_cohort_signal` accepts a school identifier without a staff-assignment check in its SQL body. Its aggregate reporting needs school/cohort authorisation too.
- `LaunchPage.tsx` currently links to contact and marketplace pages. It does not reserve, allocate or transfer a provisioned business, or track an investor introduction.
- The pricing page lacked a public exit and account navigation. This is addressed independently of the proposed staff system.

## Account model

Give each person their own account. Use one sign-in service and allow multiple assigned roles on that account. A lecturer who also mentors should switch workspaces rather than maintain two passwords. Login resolves their school, active staff assignments and learner entitlement independently.

Staff workspaces do not require purchasing an admission. Access is limited to the work they are assigned. Staff preview lets them review course content without granting personal learner certificates, unlimited mentorship or a Launch business.

Public signup creates learner accounts only. Owners/admins invite staff to a named school with named responsibilities. An invitation is bound to its verified email, expires, is single-use, can be revoked and cannot grant a role above the inviter's authority. No role picker on signup can grant administrative permissions. Existing users accept into their current account.

The first owner must be explicitly bound to the verified school owner's account. Never infer ownership from being the first registrant or from an email suffix. Existing Phoxta owner/admin memberships can be mapped deliberately; school lecturers and mentors do not need broad Phoxta Operating Console access.

## Roles and responsibilities

| Role | Workspace capabilities | Scope and restrictions |
| --- | --- | --- |
| Learner | Study, submit work, track progress; use classes, mentoring and Launch services according to admission | Their own work and enrolled cohorts; no publishing or host controls |
| Lecturer / instructor | Prepare assigned courses, upload lesson materials, schedule and host assigned classes, review submissions and give feedback | Assigned courses/cohorts; cannot manage billing or appoint staff |
| Mentor | Set availability, receive bookings, review assigned founders' shared venture work, hold sessions, approve notes and follow-up actions | Assigned mentees/bookings; private notes have separate visibility; no general access to all learners |
| Content editor | Draft lessons, upload videos, captions and resources, prepare quizzes, preview and submit for review | Assigned content; cannot self-publish by default, host classes or view private learner records |
| Programme manager | Manage intakes, seats, timetables, staff assignments, announcements, learner support and completion review | School operations; content publication or Launch allocation requires an explicit permission |
| School administrator | Invite operational staff, approve/publish content, manage school settings, review enrolment and access issues | This school only; cannot appoint/remove owners; refunds and sensitive exports require separate finance permissions |
| Owner | Appoint admins, configure pricing, approve financial actions, manage integration settings and review audit history | The school they own; no automatic access to unrelated Phoxta businesses |

Start with Learner, Lecturer, Mentor, Administrator and Owner experiences. Programme manager and Content editor use the same staff shell with fewer permissions when those responsibilities are delegated. One small founding team can hold several assignments.

Support, finance and Launch coordinator can be restricted permission profiles within that shell, rather than three more applications. Support can resolve access tickets without seeing private mentor notes. Finance can view payments and carry out explicitly granted financial actions without editing lessons. A Launch coordinator manages the business handover and introduction queue.

Guest lecturers are time-limited class assignments. Investors do not receive general school accounts or access to student work. A future investor portal would require founder-approved sharing of specific materials.

## Navigation and onboarding

- Learner: keep the current learning UI. Restore Self-study alongside Cohort and Launch. Pricing has Back to Startup School, Sign in/Sign out, and My learning for enrolled users.
- Staff: a compact workspace with Overview, Teaching, Content, People and Operations; show only relevant entries. Calendar, messages, help and account settings remain consistent utilities.
- Mentor: default to today's appointments and assigned founders. Availability and notes sit inside Mentoring, not scattered across learner pages.
- Lecturer: default to upcoming classes, assigned courses and submissions awaiting feedback. Starting the next class is the primary action.
- Admin/owner: default to pending staff invitations, content approvals, upcoming cohorts, access problems and unfulfilled Launch purchases. Billing and settings are secondary destinations.
- Multi-role users: a visible workspace switcher with permission checks on the destination. A navigation label never determines authority.
- Staff accept an invitation, verify their account, complete their teaching profile and see their assignments. Learners follow the admission/onboarding path. Staff should not be sent into learner onboarding or checkout.

## Essential workflows

### Content and media

Create a course draft, organise modules and lessons, upload video/PDF/templates, add captions, accessible descriptions, quizzes and practical assignments. Provide mobile and learner previews, autosave, upload progress and a clear distinction between saved draft and published version.

Use Draft → In review → Published → Archived, with reviewer feedback and version history. Students retain the last approved content while a revision is being edited. Publication requires a separate permission; an owner can deliberately assign it to a lecturer. AI can draft lesson outlines, questions and summaries, but a person approves them.

Media needs private storage, file-type and size validation, resumable video uploads, processing status and authorised playback. Archiving a course should preserve enrolment, progress and certificates. A metadata edit should not erase completed learner work.

### Cohorts and admission

Create intakes with start/end dates, an explicit timezone (default Europe/London), capacity, course schedule, lecturer/mentor assignments and membership. Display times in the learner's timezone and test UK daylight-saving changes. Define whether lessons unlock immediately or by cohort schedule.

Cohort and Launch buyers select an available intake before paying. Reserve a seat for a limited checkout period; release it on abandonment/expiry. A full intake offers a waitlist. Payment confirmation and seat allocation must tolerate retries and avoid overselling. Self-study requires no cohort selection.

Define transfers, cancellations, rescheduling, no-shows and recording availability in the operational settings. Programme staff need an enrolment list, attendance, announcements and a way to contact learners who are falling behind.

### Classes and mentoring

Schedule one-off or recurring classes, assign host/co-host, send reminders, open a device check, run the waiting room and manage participant permissions. Reuse the existing classroom moderation controls. Add recording status, recording notice, attendance and an approved replay/recap workflow; an attached recording URL alone is not a reliable recording pipeline.

Mentors set available slots, session length, timezone, buffer time and capacity. Show booking conflicts and support cancellation/rescheduling. Link preparation notes to the assigned founder's shared venture record. Clearly separate private preparation from notes and actions sent to the learner. Session allowances must be explicit so a single admission does not silently promise unlimited mentor time.

### Progress and support

Assignments need a brief, due date, submission, rubric, feedback and resubmission. AI may suggest feedback; the assigned lecturer confirms assessment outcomes. Define completion rules before issuing certificates. Provide staff views for missing submissions, attendance and support requests, scoped to their cohort.

### Launch fulfilment

Treat £5,000 Launch as an operational commitment: eligibility review, a defined catalogue of included businesses, reservation, ownership acceptance, provision, handover checklist and activation of the Phoxta Operating Console. Track one allocation per entitlement and make allocation idempotent so retries cannot transfer two businesses.

Use a visible status journey: Eligible → Selection → Reserved → Provisioning → Handover → Launched. Confirm what the fee includes and identify any ongoing business operating costs. Coordinate investor introductions through a separate readiness/review queue, with explicit founder consent to share their materials. Access to a network is not a funding guarantee.

### School administration

Manage staff invitations, assignments, active/suspended access, payments and refunds, learner support, email delivery failures, failed media uploads and audit history. Require additional verification for role elevation and sensitive financial actions. Removing an assignment must stop new access immediately and end active host privileges where appropriate.

## Permission implementation

Keep three independent concepts: identity, staff responsibilities and purchased learner entitlements. Permissions must also consider the school and the assigned course, cohort, class, booking or founder.

Introduce school staff memberships, role assignments, invitations, cohorts/memberships, teaching assignments, content revisions, submissions/reviews and a staff action log. Extend existing courses, lessons, mentors, bookings and classrooms instead of rebuilding them. Add Launch allocations when the fulfilment phase is approved.

Use shared permission helpers in the database and server functions. Cover direct table reads/writes, RPCs, storage, room-token issuance, recording operations, reports and AI context retrieval. Fresh database membership checks protect sensitive operations when a token still contains an old role. Frontend permissions control which tools are visible, not whether data is accessible.

Private media URLs are short-lived and issued only after authorisation. Existing public recording URLs require an explicit migration plan, since merely hiding a page does not protect an already-public file. Do not expose service keys to staff browsers. Record role changes, publishing, exports, refunds and business allocation with actor, school, target and timestamp.

## Build order and acceptance criteria

1. **Access foundation:** invitations, staff identities/assignments, workspace routing and server/database policies. Verify staff can work without paying, learners cannot self-elevate, cross-school access fails, private notes stay private and revoked staff lose access.
2. **Teaching operations:** cohorts, schedules, lecturer and mentor workspaces, availability and booking controls. Verify instructors can host only assigned classes, learners cannot mint host tokens, reserved seats cannot oversell and timezone changes preserve the intended class time.
3. **Content management:** course editor, private uploads, preview, review, publication and assignment feedback. Verify drafts stay hidden from learners, unpublished files cannot be fetched directly and edits preserve progress.
4. **Administration and Launch:** operational reports, explicitly authorised billing actions, certificate review, business allocation/handover and investor introduction workflow. Verify webhook retries, refunds, upgrades and provisioning retries produce the expected single result.

AI additions fit inside these workflows: content drafts, mentor preparation, approved session summaries and progress signals. They use only information the requesting account is allowed to see and never grant roles, publish content, refund payments or allocate businesses autonomously.

Before building, decide the cohort duration, mentor session allowance, period of learner access and eligible Launch business catalogue. These are product settings to define, not terms to invent in the UI. Staff names/email addresses are required when actual invitations are sent; the system can be built before those invitations.

## Technical references

- Supabase role/permission tables and database enforcement: https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac
- Supabase storage access policies: https://supabase.com/docs/guides/storage/security/access-control
- Stripe price replacement and lookup keys: https://docs.stripe.com/products-prices/manage-prices
