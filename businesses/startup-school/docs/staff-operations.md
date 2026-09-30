# Startup School implementation and operator guide

Updated 26 September 2026. Website: https://learn.phoxta.com. Staff entry: `/staff`; learner programme/support: `/programme`; public terms: `/admission-terms`.

## Confirmed offer

- Self-study £250, Cohort £1,200, Launch £5,000; each a one-off admission.
- New purchases receive one calendar year of course/workspace access from verified payment. Earlier purchases retain their previous access terms. Expiry is enforced in database policies, not only navigation.
- First intake: 14 October 2026 through 31 January 2027, Europe/London. No enrolment cap: capacity is SQL NULL, not an artificial high limit.
- Mentoring during the intake: one session each week, up to three per Monday–Sunday week where slots are available. The database enforces the three-session maximum, includes completed/no-show bookings and excludes cancelled bookings. Rescheduling is transactional. Coverage statistics highlight learners without a weekly booking; staff must provide enough appointment slots.
- Launch: any currently live Phoxta business listing, one included provisioned business per learner, human handover, three calendar months of Growth Operating Console from provisioning. No stored-card subscription or automatic paid renewal is created. Third-party costs remain separate.
- Full voluntary 14-day admission cancellation window, including learners who have started accessing content; one free intake transfer requested at least seven days before the start, subject to availability. Later/exceptional requests are reviewed individually. No restriction of statutory rights. These are proposed operational terms selected on the owner's request, not a legal opinion; obtain UK legal review before broad marketing.

References checked: [GOV.UK distance selling](https://www.gov.uk/online-and-distance-selling-for-businesses), [GOV.UK online selling](https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling), [Consumer Contracts Regulations](https://www.legislation.gov.uk/uksi/2013/3134). The app does not ask learners to waive digital-content cancellation rights. Checkout stores the accepted policy snapshot and timestamp with the order.

## First operator session

1. Sign in with the existing verified school-owner account at `/staff`. No admission purchase is required for staff work. Owner mapping uses the school's existing organization ownership, not first signup or an email domain.
2. In Security, enrol and verify an authenticator. Staff invitations, sensitive revocation, finance actions and provisioning require MFA.
3. In People, create one invitation per colleague's verified email and role. Select school/course/intake/class/learner scope by name. Share the generated single-use, seven-day link privately. **Invitation emails are not automatically sent.** Staff accept into their own account; no demo/shared staff accounts are created.
4. Assign mentors and lecturers to the October intake. Give lecturers a course assignment as well if they need to edit that course. Mentors publish their availability in Teaching; the coverage panel identifies staffing gaps.
5. In Content, draft/edit courses, modules, readings, video references, resources, captions, quizzes and assignments. Uploads use private storage with resumable progress. Submit for review; a publisher approves. Autosave/version history do not overwrite the published course or erase progress.
6. In Teaching, schedule classes in the chosen timezone (recurrences preserve local time across UK DST), enter the classroom, review attendance, upload recordings and approve replay/AI recaps. Mentor private notes are separate from learner-shared notes. Private mentoring rooms admit only the assigned mentor and learner.
7. In Operations, review payments, support, intake membership, policies, Launch selections and the audit log. Provisioning is idempotent and MFA-protected. Once provisioned, a Launch refund needs coordinated business-ownership return before finance completes it; do not silently revoke the customer's business.

## Roles delivered

Learners use the existing learner UI. Staff can hold multiple assignments: owner, school administrator, programme manager, lecturer, mentor, content editor, learner support, finance and Launch coordinator. Signup cannot self-select a staff role. Navigation is permission-filtered; the database, private storage and Edge Functions independently check current scope/assignment. A revoked assignment cannot regain access using an old role-bearing token. LiveKit tokens are short-lived; the revocation endpoint also removes active host connections.

## Deployment and tests

Migrations 0169–0179 implement role access, workflows, teaching/private media, payment fulfilment, operational guards, private recap review, mentoring rooms, annual terms, the uncapped intake and staff priorities. They were applied with explicit `supabase db query --file` calls against the linked production project. Historical migration-history drift means **do not run an unreviewed full `db push`**. Updated 0170 and 0172 definitions were reapplied after 0177/0178; do not replay one-off rename migrations. Use sequential CLI database queries: parallel temporary-login initialization rotates the shared CLI login password.

- Web production build and core TypeScript check.
- Targeted ESLint for new staff/admission/resource code.
- Deno type checking for school checkout, staff actions, AI, live rooms, recaps, webhook and console billing changes.
- `tests/browser-smoke.mjs`: responsive 320/390/1440px pricing; staff roles without payment; permission-aware navigation; independent scrolling; staff/content/programme mobile rendering; anonymous/learner staff denial. Auth/API responses are mocked in this suite; synthetic tokens never go to Supabase.
- `tests/school-security.sql`: real permission/RLS checks, cross-tenant denial, stale-role revocation, draft protection, MFA invitations, amount-access authority and UK timezone conversion.
- `tests/admission-transactions.sql`: bounded-seat holds, amount mismatch rejection, duplicate fulfilment, late lower-plan protection and refund restoration.
- `tests/mentoring-privacy.sql`: private notes, assigned private room participants and immediate revoked-mentor denial.
- `tests/programme-rules.sql`: one-year grant and replay stability, uncapped seats, three-per-week limit across UK DST, expiry denial, one-business provisioning retries and three-month console benefit.

All SQL fixtures use synthetic identities inside rolled-back transactions. No real card charge/refund, external invitation, actual customer business or live video call is made by these tests. A supervised real-account checkout/live-call/large-video-upload acceptance pass is still needed.

## Operational limits and remaining work

- Real mentor/lecturer names, email addresses, appointment availability, lesson media and the teaching timetable must be supplied by the school. The tools do not manufacture instructors or course videos.
- Secure invitation links and in-app class reminders are implemented; bulk invitation email delivery/failure queues and a separate staff messaging centre are not.
- Upload validation/private playback and resumable transfers are implemented; automatic video transcoding/processing is not. Supply playable MP4/WebM and WebVTT captions. Private media links expire and may require reloading after an hour.
- The existing LiveKit device check/moderation is reused; a new moderated waiting-room admission queue was not built. Human-approved recap publication is separate from automatic AI generation.
- Current lists load at most 500 records, except directory lookup (1,000). Dedicated pagination/exports and advanced operational analytics remain follow-up work for larger intakes.
- Editing published policy copy does not reconfigure hard-coded fee amounts, the one-year access rule or mentor weekly limits. Changes to those commercial rules require coordinated code/database updates. Integration keys are not exposed in a browser settings editor.
- Payments are genuine Stripe-backed checkout/verified webhook fulfilment. The card-only configuration disables Link, but a card issuer may still require 3-D Secure or an OTP; the school cannot bypass bank authentication.
- Review Stripe webhook event subscriptions and receipt delivery in the merchant account during payment acceptance. No live purchase was made solely to verify them.
