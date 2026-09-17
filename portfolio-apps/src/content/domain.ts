/**
 * What each product actually operates on, in the customer's words.
 *
 * The research modules describe a model trained on a public benchmark. The
 * product is bought to run on the customer's own records, so every surface —
 * navigation, empty states, counts, upload prompts — says "your transactions",
 * not "the IEEE-CIS test split". This is the vocabulary that makes it read as
 * software a company operates rather than a study someone published.
 *
 * The second half of each entry — plainWhat, who, benefits, steps, questions —
 * is the plain-language layer. It says the same true things as the research
 * modules, in words a category manager, an operations lead or a founder reads
 * once and understands. No acronyms, no metrics for their own sake, no
 * modelling vocabulary. If a term is genuinely the buyer's own, it is explained
 * in the same sentence.
 */
import type { Slug } from './types'

export interface Domain {
  /** The software category a buyer would search for — never the research taxonomy. */
  category: string
  /** The headline. Written per product: no two open the same way. */
  pitch: string
  /** The line under it — the promise, in the buyer's terms. */
  promise: string
  /** What the brand photography should show, as a Pexels query. */
  photo: string
  /** Singular record the product decides about: "transaction". */
  unit: string
  /** Plural: "transactions". */
  units: string
  /** Who or what the record belongs to: "cardholder". */
  subject: string
  /** The decision the product produces: "approve or decline". */
  decision: string
  /** Label for the single-case screen: "Score a transaction". */
  scoreLabel: string
  /** Heading over the result: "Decision". */
  scoreTitle: string
  /** Where the data comes from, for the connect-your-data step. */
  sources: string[]
  /** What arriving data looks like, for the upload prompt. */
  fileHint: string
  /** The queue a person works: "review queue". */
  queue: string

  /* ── the plain-language layer ─────────────────────────────────────────── */

  /** One sentence a non-technical buyer understands completely. No jargon, no acronyms, no metrics. */
  plainWhat: string
  /** Who this is for, in the words they would use about themselves. Three entries. */
  who: { title: string; line: string }[]
  /** What they get, as benefits rather than capabilities. Three entries. */
  benefits: { title: string; body: string }[]
  /** How it works, in three plain steps. */
  steps: { title: string; body: string }[]
  /** The three things a sceptical buyer actually asks, answered plainly. */
  questions: { q: string; a: string }[]
}

export const DOMAIN: Record<Slug, Domain> = {
  /**
   * The merge of four apps that were always one product: two that read what
   * customers say, two that scored what customers do. Everything here has to
   * hold for both halves, which is why the unit is the customer rather than the
   * review or the lead.
   */
  customer: {
    pitch: 'What to fix, and who to call',
    promise:
      'Everything your customers say and everything they do, read together. You get the problems worth fixing this week, and the short list of people worth spending money on.',
    category: 'Customer intelligence platform', photo: 'customer service team office meeting',
    unit: 'customer', units: 'customers', subject: 'customer', decision: 'contact, fix or leave alone',
    scoreLabel: 'Look up a customer', scoreTitle: 'Customer view', queue: 'follow-up queue',
    sources: ['Your review and survey feeds', 'Your CRM', 'Support tickets', 'Order and billing history'],
    fileHint: 'One row per customer, or one row per review. Both work.',
    plainWhat:
      'Reviews, tickets and surveys are sorted into your own list of problems, and every customer is scored so you know who to spend money on.',
    who: [
      {
        title: 'Head of customer experience',
        line: 'Reads a sample of feedback each quarter and finds out about problems from a complaint.',
      },
      {
        title: 'Retention lead',
        line: 'Sends the same offer to everyone at risk, including the ones who were never leaving.',
      },
      {
        title: 'Head of product quality',
        line: 'Knows a fault exists but cannot show which product, how many, or since when.',
      },
    ],
    benefits: [
      {
        title: 'Every complaint is read',
        body: 'All of your reviews, tickets and survey answers are sorted into your own list of problems, so nothing is missed for want of time.',
      },
      {
        title: 'Spend only where it changes things',
        body: 'You see which customers an offer would actually keep, and stop discounting the ones who were staying anyway.',
      },
      {
        title: 'One customer, one picture',
        body: 'What someone said and what they did sit on the same record, so a complaint and a cancellation are finally the same story.',
      },
    ],
    steps: [
      {
        title: 'Point it at your feedback',
        body: 'Connect your review sites, survey tool and helpdesk. History loads first, so you start with a trend rather than a blank page.',
      },
      {
        title: 'Add who they are',
        body: 'Connect your customer list and order history. Feedback is matched to the person who left it wherever an email or order matches.',
      },
      {
        title: 'Work the short list',
        body: 'You get the problems that are growing and the customers worth a call. Everything else stays quiet until it matters.',
      },
    ],
    questions: [
      {
        q: 'Do we need both the feedback and the customer data?',
        a: 'No. Either half works on its own and is useful from day one. Connecting both is what lets you see that the people complaining about delivery are the ones about to leave.',
      },
      {
        q: 'Will it use our own words for problems?',
        a: 'Yes. It proposes a list of problems from your actual feedback, you edit it, and it holds still after that. Your trend lines do not reset when you add a label.',
      },
      {
        q: 'How is this different from a survey tool?',
        a: 'A survey tool asks a question and counts the answers. This reads everything customers already wrote, then tells you which of them is worth calling and what it would cost you not to.',
      },
    ],
  },
  brand: {
    pitch: 'Hear the complaint before it becomes a headline',
    promise:
      'Feedback read as it lands, sorted by site and by what it is about, with the ones that signal a real problem sent to whoever can fix them.',
    category: 'Customer feedback intelligence', photo: 'hotel lobby reception guest service',
    unit: 'review', units: 'reviews', subject: 'location', decision: 'escalate or watch',
    scoreLabel: 'Analyse a review', scoreTitle: 'Brand signal', queue: 'crisis queue',
    sources: ['Google Business Profile', 'Trustpilot', 'App Store and Play', 'Your survey tool', 'CSV export'],
    fileHint: 'One row per review: text, date, location, rating.',

    plainWhat:
      'All the reviews, surveys and call notes about your sites are read as they arrive, and the site that is slipping gets named.',
    who: [
      { title: 'Brand and reputation leads', line: 'You answer for the star rating, and you find out too late when it moves.' },
      { title: 'Regional operations managers', line: 'You run twenty sites and cannot read every review from all of them.' },
      { title: 'Guest experience teams', line: 'You want to know which fix would lift scores most, not just that scores fell.' },
    ],
    benefits: [
      {
        title: 'One place for all feedback',
        body: 'Reviews, survey answers and call notes arrive in one list, tagged by site and by what the guest was actually complaining about.',
      },
      {
        title: 'Early warning on a bad week',
        body: "When one site's reviews turn, you get told the same day, with the reviews that caused it attached.",
      },
      {
        title: 'See where rivals beat you',
        body: 'Compare your sites against the competitors nearby on the things guests mention most, like cleanliness, staff and value.',
      },
    ],
    steps: [
      {
        title: 'Connect your review sources',
        body: 'Point us at Google, Trustpilot, the app stores and your survey tool. Old reviews load first so you start with history.',
      },
      {
        title: 'Everything gets sorted',
        body: 'Each review is filed by site and by topic, and marked positive or negative on each topic it touches.',
      },
      {
        title: 'You get told what changed',
        body: 'A daily view shows movement by site, and an alert fires when one site drops sharply.',
      },
    ],
    questions: [
      {
        q: 'Do we have to change how we collect reviews?',
        a: 'No. It reads the sources you already have. Nothing changes for guests, and you keep replying to reviews wherever you reply today.',
      },
      {
        q: 'How fast do we hear about a problem?',
        a: 'The same day the reviews land. A sharp drop at one site raises an alert with the reviews behind it, so you can act before the weekend.',
      },
      {
        q: 'What about sarcasm and badly written reviews?',
        a: 'They are still read and filed, but anything the reading is unsure about is set aside for a person to look at rather than counted as fact.',
      },
    ],
  },

  fraud: {
    pitch: 'Stop the fraud, not the customer',
    promise:
      'Every payment gets an answer while the customer is still at the till, and every answer carries the reasons behind it.',
    category: 'Fraud decisioning platform', photo: 'contactless card payment terminal shop',
    unit: 'transaction', units: 'transactions', subject: 'cardholder', decision: 'approve, review or decline',
    scoreLabel: 'Score a transaction', scoreTitle: 'Decision', queue: 'review queue',
    sources: ['Your payment processor', 'Core banking export', 'Kafka or webhook stream', 'Warehouse table', 'CSV export'],
    fileHint: 'One row per transaction: amount, card, merchant, device, timestamp.',

    plainWhat:
      'Card payments are checked as they happen and come back approved, held for a second look, or turned down.',
    who: [
      { title: 'Fraud and risk leads', line: 'You are judged on losses and on how many good customers you wrongly turned away.' },
      { title: 'Card operations teams', line: 'You work a queue of flagged payments and need the worst ones at the top.' },
      { title: 'Compliance officers', line: 'You have to explain a declined payment to a customer and to a regulator.' },
    ],
    benefits: [
      {
        title: 'Fewer good customers stopped',
        body: 'Genuine customers stop being blocked at the till, because the whole picture of a payment is read rather than a list of rules.',
      },
      {
        title: 'A reason on every decline',
        body: 'Each answer arrives with a short explanation in ordinary language, ready to put in front of a customer or an auditor.',
      },
      {
        title: 'You know when it goes stale',
        body: 'You are told when the payments coming in stop looking like the ones the model learned from, and whether it is time to retrain.',
      },
    ],
    steps: [
      {
        title: 'Send us the payment',
        body: 'Your payment system calls ours as the card is presented. The answer comes back before the terminal can print.',
      },
      {
        title: 'Get a decision and a reason',
        body: 'Approve, review or decline, with the handful of things that pushed it that way.',
      },
      {
        title: 'Work only what is left',
        body: 'Anything uncertain lands in a review queue, sorted by money at risk, so your team spends the day on cases that matter.',
      },
    ],
    questions: [
      {
        q: 'Will this slow down checkout?',
        a: 'No. The answer comes back in a fraction of the time the card terminal itself takes, so the customer never sees a pause.',
      },
      {
        q: 'Can we explain a decline to a customer?',
        a: 'Yes. Every decline arrives with three written reasons in ordinary language, ready to drop into the letter your rules already require.',
      },
      {
        q: 'Does it keep working as fraud changes?',
        a: 'It compares the payments coming in with the ones it learned from, and tells you when the two have grown too different to trust.',
      },
    ],
  },

  mortgage: {
    pitch: 'Underwrite in seconds. Defend it for years.',
    promise:
      'Applications answered the moment they arrive. When you turn someone down, the letter and the fairness evidence are already written.',
    category: 'Automated underwriting platform', photo: 'house keys mortgage paperwork signing',
    unit: 'application', units: 'applications', subject: 'applicant', decision: 'approve, refer or decline',
    scoreLabel: 'Score an application', scoreTitle: 'Underwriting decision', queue: 'underwriting queue',
    sources: ['Your loan origination system', 'Encompass or Blend export', 'Warehouse table', 'CSV export'],
    fileHint: 'One row per application: loan amount, income, DTI, LTV, purpose.',

    plainWhat:
      'A home loan application gets an answer in seconds, along with the paperwork that shows you treated applicants alike.',
    who: [
      { title: 'Heads of underwriting', line: 'You need faster decisions without letting through the ones that should have been declined.' },
      { title: 'Fair lending officers', line: 'You have to show a regulator that approval rates hold up across groups.' },
      { title: 'Mortgage operations managers', line: 'You want files moving instead of sitting in a queue waiting for a human.' },
    ],
    benefits: [
      {
        title: 'Answers while the file is open',
        body: 'An application is scored the moment it arrives, so a borrower hears back the same day instead of waiting a week in a queue.',
      },
      {
        title: 'The decline letter writes itself',
        body: 'The letter naming your reasons, which the law requires whenever you say no, comes out already worded alongside the decision.',
      },
      {
        title: 'Fairness checked before you ship',
        body: 'Approval rates are compared across race, sex, ethnicity and age, so a gap shows up in testing rather than in an examination.',
      },
    ],
    steps: [
      {
        title: 'Connect your loan system',
        body: 'Applications flow in from the system your team already keys them into. Nothing changes for the processor.',
      },
      {
        title: 'Each file gets a decision',
        body: 'You see the chance the loan goes bad, a clear approve, refer or decline, and what drove it.',
      },
      {
        title: 'The evidence files itself',
        body: 'Every decision is stored with its reasons and its fairness numbers, ready for the day an examiner asks.',
      },
    ],
    questions: [
      {
        q: 'Does a person still make the call?',
        a: 'Wherever you want one to. You set the bands. Clear cases go straight through and anything close to the line goes to an underwriter.',
      },
      {
        q: 'How do we know it is not biased?',
        a: 'Fairness limits are applied while the model is being built, not checked afterwards. The gap between approval rates by group is reported on every run.',
      },
      {
        q: 'What if the market turns?',
        a: 'You can run the whole loan book through a downturn, a rate rise or a house price fall and see what it does to your losses before it happens.',
      },
    ],
  },

  people: {
    pitch: 'Know who is leaving while you can still act',
    promise:
      'You see who is likely to go, which change would actually keep them, and what it would cost. The pay reporting comes out of the same work.',
    category: 'People analytics platform', photo: 'diverse team meeting modern office',
    unit: 'employee', units: 'employees', subject: 'employee', decision: 'intervene or monitor',
    scoreLabel: 'Score an employee', scoreTitle: 'Retention risk', queue: 'at-risk list',
    sources: ['Workday', 'BambooHR', 'Your HRIS export', 'Warehouse table', 'CSV export'],
    fileHint: 'One row per employee: tenure, compensation, engagement, manager.',

    plainWhat:
      'You find out who is likely to resign, what would actually make them stay, and what that would cost you.',
    who: [
      { title: 'People analytics leads', line: 'You already know who might leave, and not what would make them stay.' },
      { title: 'Reward and pay teams', line: 'You have to report pay gaps and explain them with something better than a spreadsheet.' },
      { title: 'HR directors', line: 'You have a fixed retention budget and far too many names to spend it on.' },
    ],
    benefits: [
      {
        title: 'Spend where it changes something',
        body: 'You see which people a pay correction would actually keep and which it would do nothing for, before you approve the spend.',
      },
      {
        title: 'Pay reporting from the same model',
        body: 'The pay analysis regulators now ask for falls out of the work you already ran, rather than becoming a separate consulting project.',
      },
      {
        title: 'A record of what you tried',
        body: "Every action is logged against the person and the outcome, so next year's decisions rest on evidence rather than memory.",
      },
    ],
    steps: [
      {
        title: 'Bring in your people data',
        body: 'Connect Workday, BambooHR or a file export. Tenure, pay, role, manager and engagement are enough to start.',
      },
      {
        title: 'See the risk and the remedy',
        body: 'Each person gets a leaving risk and a short list of actions ranked by how much each would change it.',
      },
      {
        title: 'Choose within your budget',
        body: 'Set what you can spend. You get back the people and the actions that save the most for that money.',
      },
    ],
    questions: [
      {
        q: 'Is this just another churn score?',
        a: 'No. A churn score says who is leaving. This says whether a promotion, a pay rise or a manager change would alter it, which is a different question.',
      },
      {
        q: 'Will managers see individual scores?',
        a: 'Only if you let them. Access is set by you, and every action taken on a person is recorded with the name of whoever took it.',
      },
      {
        q: 'What about the new pay transparency rules?',
        a: 'The pay gap analysis and the model documentation are produced for you, in the shape the reporting duty asks for, from the same run.',
      },
    ],
  },

  parkinsons: {
    pitch: 'Catch the change between clinic visits',
    promise:
      'A short recording turns into a score with an honest range around it, and a trend a clinician can follow between appointments.',
    category: 'Clinical research analytics', photo: 'medical research laboratory scientist',
    unit: 'recording', units: 'recordings', subject: 'participant', decision: 'flag for clinician review',
    scoreLabel: 'Assess a recording', scoreTitle: 'Assessment', queue: 'review queue',
    sources: ['Your eCOA platform', 'Study app export', 'Wearable API', 'CSV export'],
    fileHint: 'One row per recording session: acoustic and motor measures.',

    plainWhat:
      'A short voice recording and a walk with a phone in the pocket become a score a clinician can read between visits.',
    who: [
      { title: 'Clinical trial teams', line: 'You need a repeatable measure between visits, not a rating scored twice a year.' },
      { title: 'Neurology research groups', line: 'You want an objective signal from a device the patient already owns.' },
      { title: 'Study coordinators', line: 'You have hundreds of participants and no way to spot who is changing.' },
    ],
    benefits: [
      {
        title: 'A measure between clinic visits',
        body: 'You see the weeks between appointments, because a score is produced whenever the patient records rather than when a rater is in the room.',
      },
      {
        title: 'It says when it is unsure',
        body: 'Every score carries a range around it, and a noisy recording produces a wide one that goes to a person rather than into the data.',
      },
      {
        title: 'You can see the trend',
        body: 'Scores are tracked for each participant over time, and a steady rise is flagged rather than left for someone to notice.',
      },
    ],
    steps: [
      {
        title: 'The patient records on their phone',
        body: 'A short recording of speech, a walk, and a moment holding still. No clinic visit and no extra hardware.',
      },
      {
        title: 'Three signals become one score',
        body: 'Voice, walking and tremor are read separately, then combined, so one poor recording does not swing the result.',
      },
      {
        title: 'A clinician reviews it',
        body: 'Each score arrives with the signals behind it and its uncertainty, as a prompt for review rather than a diagnosis.',
      },
    ],
    questions: [
      {
        q: 'Is this a diagnosis?',
        a: 'No, and it is not sold as one. It is a screening signal for a clinician to act on. The diagnosis stays with the doctor.',
      },
      {
        q: 'What if the recording is poor?',
        a: 'A poor recording widens the range on the score and sends it for human review. It is not quietly scored as though it were clean.',
      },
      {
        q: 'How was it tested?',
        a: 'On recordings from people it had never seen. No participant appears in both the training and the testing data, so the results reflect new patients.',
      },
    ],
  },

  'supply-chain': {
    pitch: 'See the supplier fail before the invoices stop',
    promise:
      'Published accounts, filings and news read continuously across your supplier list, with the small firms two steps down the chain mapped out.',
    category: 'Supplier risk intelligence', photo: 'cargo shipping port containers logistics',
    unit: 'supplier', units: 'suppliers', subject: 'supplier', decision: 'act now, watch or clear',
    scoreLabel: 'Score a supplier', scoreTitle: 'Distress risk', queue: 'watchlist',
    sources: ['Your ERP vendor master', 'SAP or Coupa export', 'Warehouse table', 'CSV export'],
    fileHint: 'One row per supplier: financials, spend, tier, geography.',

    plainWhat:
      "Your suppliers' own published accounts and their news are read every month, so you hear that one is in trouble long before a delivery is missed.",
    who: [
      { title: 'Procurement directors', line: 'You find out a supplier is in trouble when they miss a delivery.' },
      { title: 'Supply chain risk managers', line: 'You watch your main suppliers and cannot see the ones behind them.' },
      { title: 'Credit and treasury teams', line: 'You set payment terms and prepayments and want a reason for each one.' },
    ],
    benefits: [
      {
        title: 'Months of warning, not days',
        body: 'You hear about trouble months earlier, because published accounts move well before a credit rating does, and that is where it shows first.',
      },
      {
        title: 'See who your suppliers depend on',
        body: 'A map of who buys from whom shows you the small firm two steps down the chain that would stop three of your lines.',
      },
      {
        title: 'A briefing for the committee',
        body: 'Each supplier comes with its numbers, the things pushing the score up, and what would have to change to bring it back down.',
      },
    ],
    steps: [
      {
        title: 'Load your supplier list',
        body: 'Export the vendor list from your finance system. Names and spend are enough to begin.',
      },
      {
        title: 'Each supplier gets a health score',
        body: 'Their filings, their ratios and recent news are read together, with separate views for the next quarter and the next year and a half.',
      },
      {
        title: 'Watch the ones that move',
        body: 'A watchlist shows who is deteriorating, who they would take with them, and what a shock like an energy price rise would do.',
      },
    ],
    questions: [
      {
        q: 'Where does the data come from?',
        a: 'Public company filings and news, plus whatever you already hold on spend and contracts. You do not have to ask your suppliers for anything.',
      },
      {
        q: 'What about private suppliers with no filings?',
        a: 'They are scored on what you do have, mostly your own payment and delivery history, and the score is marked as thinner. It is not padded out with guesses.',
      },
      {
        q: 'How far down the chain can we see?',
        a: 'Three steps. You see your supplier, their supplier, and theirs, and how the failure of one would travel back up to you.',
      },
    ],
  },

  retail: {
    pitch: 'Every empty shelf, found the hour it empties',
    promise:
      'Your existing cameras become a continuous check on the shelves, so restocking follows a real gap rather than a rota.',
    category: 'Shelf intelligence platform', photo: 'supermarket shelves grocery aisle',
    unit: 'shelf', units: 'shelves', subject: 'store', decision: 'replenish or leave',
    scoreLabel: 'Check a shelf', scoreTitle: 'On-shelf availability', queue: 'replenishment queue',
    sources: ['Your store cameras', 'VMS or NVR feed', 'Planogram export', 'Image upload'],
    fileHint: 'One row per capture: store, aisle, camera, timestamp.',

    plainWhat:
      'The cameras already in your stores watch the shelves, and the nearest colleague is sent to fill the gaps.',
    who: [
      { title: 'Store operations directors', line: 'You know you lose sales to empty shelves and cannot say which ones.' },
      { title: 'Category managers', line: 'You want to know whether a line is selling badly or simply missing from the shelf.' },
      { title: 'Store managers', line: 'You want your team restocking what is actually empty, not walking a rota.' },
    ],
    benefits: [
      {
        title: 'No new hardware',
        body: 'It runs on the cameras and the network you already have. There is no robot, no shelf sensor and no capital request.',
      },
      {
        title: 'Gaps priced in lost sales',
        body: 'Every gap is ranked by what it is costing you an hour, so the shelf losing you the most gets filled first.',
      },
      {
        title: 'New products added in a sentence',
        body: 'New lines and new fittings are described in plain words and recognised the same afternoon, instead of waiting on a supplier to photograph them.',
      },
    ],
    steps: [
      {
        title: 'Point it at your cameras',
        body: 'One aisle is enough to start. Pictures are read inside the store and thrown away.',
      },
      {
        title: 'It watches the shelf all day',
        body: 'Gaps, misplaced items and thin shelves are picked up all day rather than on a walk-round.',
      },
      {
        title: 'A task reaches the shop floor',
        body: 'The nearest colleague gets the aisle, the product and the priority on their handset within seconds.',
      },
    ],
    questions: [
      {
        q: 'Do we need to buy cameras?',
        a: 'No. It uses the ones already installed for security. You pay for each camera by the month, and a single aisle can be trialled in a week.',
      },
      {
        q: 'Are we filming customers?',
        a: 'Pictures are read inside the store and discarded straight away. No face is recorded and no picture of a shopper leaves the building.',
      },
      {
        q: 'What happens when the shelf layout changes?',
        a: 'You describe the change in plain words and it is picked up the same day. There is no annotation job and no waiting list.',
      },
    ],
  },

  ergonomics: {
    pitch: 'Catch the posture that becomes a claim',
    promise:
      'Postures scored all day on the same scale your ergonomist already uses, and left blank when the camera cannot see well enough to judge.',
    category: 'Workplace safety analytics', photo: 'warehouse worker lifting boxes',
    unit: 'workstation', units: 'workstations', subject: 'operator', decision: 'redesign or monitor',
    scoreLabel: 'Assess a posture', scoreTitle: 'Ergonomic risk', queue: 'assessment queue',
    sources: ['Your site cameras', 'VMS feed', 'Recorded task video', 'Image upload'],
    fileHint: 'One row per assessment: site, task, shift, duration.',

    plainWhat:
      'Cameras on the floor score how people lift, reach and twist, so you can fix the jobs most likely to injure someone.',
    who: [
      { title: 'Safety directors', line: 'Back injuries are your biggest cost and your least visible one.' },
      { title: 'Company ergonomists', line: 'You can score a dozen jobs a visit and there are several hundred.' },
      { title: 'Operations managers', line: 'You want to know which workstation to change first and what it will buy you.' },
    ],
    benefits: [
      {
        title: 'Every job, every shift',
        body: 'Every job the cameras can see is scored, including the night shift where posture is worst. An ergonomist manages a handful a visit.',
      },
      {
        title: 'Proof the fix worked',
        body: 'Score a job before you install the lift table and again after. The improvement is measured rather than asserted.',
      },
      {
        title: 'It admits what it cannot see',
        body: 'When someone is turned away from the camera or hidden behind a pallet, no score is given. You are told how much was covered.',
      },
    ],
    steps: [
      {
        title: 'Use the cameras on the floor',
        body: 'Existing site cameras are enough. Footage is scored where it is filmed and never has to leave the building.',
      },
      {
        title: 'Postures get the standard score',
        body: 'Each posture is scored on the same scale your ergonomist fills in by hand, so the numbers mean what your team expects.',
      },
      {
        title: 'Fix the worst jobs first',
        body: 'Jobs are ranked by risk and by how many people do them, so the biggest exposure comes to the top.',
      },
    ],
    questions: [
      {
        q: 'Is this monitoring individual workers?',
        a: 'It is set up to score jobs, not people. Scores roll up to the workstation and the shift, and the pack for the works council is part of the setup.',
      },
      {
        q: 'How close is it to a real ergonomist?',
        a: 'You measure that yourself. Setup builds a set of clips your own ergonomist scores by hand, and how often the two agree is reported for your site.',
      },
      {
        q: 'What if the camera angle is bad?',
        a: 'No score is produced. Bad angles and blocked views are reported as gaps in coverage rather than being scored badly and quietly counted.',
      },
    ],
  },

  clv: {
    pitch: 'Spend retention budget only where it changes the outcome',
    promise:
      'You see what an offer would actually change for each customer, measured against a group that is never contacted at all.',
    category: 'Retention analytics platform', photo: 'customer subscription mobile app usage',
    unit: 'customer', units: 'customers', subject: 'customer', decision: 'treat or hold back',
    scoreLabel: 'Score a customer', scoreTitle: 'Incremental value', queue: 'treatment list',
    sources: ['Snowflake or BigQuery', 'Your billing system', 'Braze or Klaviyo', 'CSV export'],
    fileHint: 'One row per customer: recency, frequency, spend, tenure.',

    plainWhat:
      'You find out which customers a retention offer would actually save, and stop discounting the ones who were staying anyway.',
    who: [
      { title: 'Retention and growth leads', line: 'You defend a large discount budget and cannot show what it bought.' },
      { title: 'Lifecycle marketing managers', line: 'You send the save offer and never learn who would have stayed regardless.' },
      { title: 'Subscriber analytics teams', line: 'You have a churn model but no clean read on whether the offers work.' },
    ],
    benefits: [
      {
        title: 'Stop paying people who were staying',
        body: 'The customers who would have renewed anyway come off the list, so you stop paying for renewals you were already getting free.',
      },
      {
        title: 'Leave the sleeping dogs alone',
        body: 'Customers who would cancel only because you reminded them they were paying come back marked do not contact, rather than targeted harder.',
      },
      {
        title: 'A control group that survives',
        body: 'A slice of every campaign is never contacted, and that group survives retrains and vendor changes. Your saved-revenue number holds up in a board review.',
      },
    ],
    steps: [
      {
        title: 'Connect the warehouse',
        body: 'Point it at Snowflake, BigQuery or your billing export. Order history and cancellations are the starting point.',
      },
      {
        title: 'Every customer gets a figure',
        body: 'Not a churn score. The amount your offer would change their behaviour, in money, minus what the offer costs.',
      },
      {
        title: 'Set the budget, get the list',
        body: 'Tell it what you can spend this month. It returns who to contact, with what, and who to leave alone.',
      },
    ],
    questions: [
      {
        q: 'How is this different from a churn score?',
        a: 'A churn score ranks who is likely to leave. It says nothing about whether your offer would change their mind. This measures the change, which is the thing you are buying.',
      },
      {
        q: 'Do we have to stop sending campaigns?',
        a: 'No. It decides who goes on the list. Your email and messaging tools send exactly as they do now, and nothing about your setup changes.',
      },
      {
        q: 'How do we know the savings are real?',
        a: 'Because a randomly chosen group was never contacted. The difference between them and the customers you treated is the number, and nobody can switch that group off.',
      },
    ],
  },

  ppe: {
    pitch: 'Every site, every shift, actually checked',
    promise:
      'Compliance checked all day instead of on a walk-round, with the footage staying on site and the rules set area by area.',
    category: 'Site safety monitoring', photo: 'construction workers hard hats site',
    unit: 'site', units: 'sites', subject: 'worker', decision: 'intervene or clear',
    scoreLabel: 'Check compliance', scoreTitle: 'Compliance', queue: 'incident queue',
    sources: ['Your site cameras', 'VMS feed', 'Contractor uploads', 'Image upload'],
    fileHint: 'One row per capture: site, zone, camera, timestamp.',

    plainWhat:
      'Site cameras check that the right safety kit is being worn in each area, and tell the supervisor who owns that area.',
    who: [
      { title: 'Site safety managers', line: 'You check what you can walk past, which is a few minutes an area a day.' },
      { title: 'Construction project directors', line: 'One serious violation costs more than the whole safety budget.' },
      { title: 'Contractor compliance teams', line: 'You need a fair record of who was warned and when.' },
    ],
    benefits: [
      {
        title: 'Different rules per area',
        body: 'Each area declares what it requires, so the welding bay asks for eye protection, the scaffold asks for a harness, and nobody is written up wrongly.',
      },
      {
        title: 'A fair record per worker',
        body: 'Repeat offences build a history with the warning steps your discipline policy already sets out, so nothing rests on who a supervisor happened to see.',
      },
      {
        title: 'A number for the finance director',
        body: 'Fines avoided and injuries avoided, set against what the system costs, so the safety case can be made in money.',
      },
    ],
    steps: [
      {
        title: 'Connect the site cameras',
        body: 'Footage is checked on a small box in the site office. No video leaves the compound.',
      },
      {
        title: 'Missing kit becomes a violation',
        body: 'Only the items that area actually requires are counted, and each one is graded from minor to critical.',
      },
      {
        title: 'The supervisor gets it',
        body: 'The alert lands with the person who owns that area, with a still image, the time and the severity.',
      },
    ],
    questions: [
      {
        q: 'Does the footage leave site?',
        a: 'No. It is read on a box in the site office and the video stays there. Only the violation record travels, and you decide who receives it.',
      },
      {
        q: 'Will this get workers disciplined unfairly?',
        a: 'Each alert carries the image and the time, so a supervisor can dismiss it. Nothing escalates on its own, and the history shows every warning given.',
      },
      {
        q: 'How many cameras do we need?',
        a: 'Whatever you already have. It runs on ordinary site cameras without extra graphics hardware, so another camera costs a subscription rather than a server.',
      },
    ],
  },

  marketing: {
    pitch: 'Call the leads that convert. Skip the rest.',
    promise:
      'Every contact ranked before the dialler opens, with what the call is worth attached, and the credit for a sale shared across the whole journey.',
    category: 'Campaign intelligence platform', photo: 'marketing team analytics dashboard meeting',
    unit: 'lead', units: 'leads', subject: 'contact', decision: 'contact or skip',
    scoreLabel: 'Score a lead', scoreTitle: 'Response likelihood', queue: 'call list',
    sources: ['Salesforce or HubSpot', 'Your CDP', 'Warehouse table', 'CSV export'],
    fileHint: 'One row per contact: profile, history, channel, campaign.',

    plainWhat:
      'Your call list comes back ranked, and you see which channels really earned the sale rather than which one happened to be last.',
    who: [
      { title: 'Heads of customer marketing', line: 'You spend on channels because they were the last click, not because they worked.' },
      { title: 'Contact centre managers', line: 'Your team burns the day on a list nobody ranked.' },
      { title: 'Campaign analysts', line: 'You need segments that reflect real behaviour, not five buckets someone drew.' },
    ],
    benefits: [
      {
        title: 'A ranked call list',
        body: 'Each contact carries the chance they take the offer and what it is worth, so the first hour of the day covers the best names.',
      },
      {
        title: 'Credit spread across the journey',
        body: 'Every touch that led to the sale gets a share of the credit, so you can see which channels last-click was quietly over-paying.',
      },
      {
        title: 'Segments the data actually shows',
        body: 'Groups come from how people behave rather than being forced into a fixed number of buckets, so a real segment does not get split three ways.',
      },
    ],
    steps: [
      {
        title: 'Bring the customer list',
        body: 'Connect Salesforce, HubSpot or a file. Contact history and a basic profile are enough.',
      },
      {
        title: 'Everyone gets a score',
        body: 'The chance of a yes, what the yes is worth, and which behavioural group the contact belongs to.',
      },
      {
        title: 'Work the list, check the credit',
        body: 'Call from the top, then see which channels really earned the conversions and move the budget accordingly.',
      },
    ],
    questions: [
      {
        q: 'Will it work on our list, not a benchmark?',
        a: 'It runs against your own contacts. You can drop a file in and see the ranking before anything is connected to a live system.',
      },
      {
        q: 'Why not just call everyone?',
        a: 'Because response falls sharply after the first few attempts, and the working day is finite. The ranking decides what fits in the day.',
      },
      {
        q: 'How does the channel credit work?',
        a: 'Every touch that led to the sale is given a share of it, and the result sits next to last-click so you can see which channels were being over-paid.',
      },
    ],
  },

  automotive: {
    pitch: 'Price every vehicle the day it lands',
    promise:
      'A price you can defend for every unit, the range it could really sell in, the cars behind the number, and an update as the market moves.',
    category: 'Vehicle pricing intelligence', photo: 'car dealership lot vehicles',
    unit: 'vehicle', units: 'vehicles', subject: 'vehicle', decision: 'price and list',
    scoreLabel: 'Price a vehicle', scoreTitle: 'Valuation', queue: 'pricing queue',
    sources: ['Your DMS', 'vAuto or Dealertrack export', 'Auction feed', 'CSV export'],
    fileHint: 'One row per vehicle: year, make, model, mileage, condition, trim.',

    plainWhat:
      'Every used vehicle gets a price, a realistic range around it, and the cars that number came from.',
    who: [
      { title: 'Used car managers', line: 'You win or lose the margin on the trade-in appraisal.' },
      { title: 'Dealer group buyers', line: 'You bid at auction and need a number faster than the lane moves.' },
      { title: 'Online offer teams', line: 'You quote a price on a web form and have to stand behind it.' },
    ],
    benefits: [
      {
        title: 'A range, not just a number',
        body: 'You see whether the estimate is tight or wide before you make the offer, rather than one bare figure with no sense of confidence.',
      },
      {
        title: 'The reasons, in money',
        body: 'You see what the mileage cost, what the condition added and what the trim was worth, so an appraiser can explain the offer to the customer.',
      },
      {
        title: 'Overpriced stock stands out',
        body: 'Every unit on the lot is compared with its own asking price, so the cars sitting too high show up before they age.',
      },
    ],
    steps: [
      {
        title: 'Enter the vehicle',
        body: 'Year, make, model, mileage, condition and trim. Or connect the dealer system and price the whole lot at once.',
      },
      {
        title: 'Get a price and a range',
        body: 'A number, a realistic spread around it, and the comparable listings it came from.',
      },
      {
        title: 'Watch it move',
        body: "Prices refresh as the market does, so the number you quote on Friday is not last quarter's guidebook.",
      },
    ],
    questions: [
      {
        q: 'Is this better than a guidebook?',
        a: 'Guidebooks refresh every few months. This is built from live listings, so a fuel price move or a model-year change shows up in weeks rather than the next edition.',
      },
      {
        q: 'How accurate is it?',
        a: 'Accuracy is published by body type, make and price band, so you can see where it is sharp and where it is not, rather than one average that hides both.',
      },
      {
        q: 'What about a rare spec?',
        a: 'It is priced, but the range comes back wider. A wide range is the honest answer for a car with few comparables, and you can see how few there were.',
      },
    ],
  },

  loan: {
    pitch: 'Approve more without taking on more risk',
    promise:
      'Every application comes back with a clear risk score and the two or three reasons behind it. When you decline someone, the explanation letter is already written.',
    category: 'Credit decisioning platform', photo: 'bank advisor customer loan meeting',
    unit: 'account', units: 'accounts', subject: 'borrower', decision: 'approve, limit or decline',
    scoreLabel: 'Score an account', scoreTitle: 'Credit risk', queue: 'decision queue',
    sources: ['Your core banking system', 'Bureau file', 'Warehouse table', 'CSV export'],
    fileHint: 'One row per account: limit, balance, payment history, demographics.',

    plainWhat:
      'Each credit application comes back with a clear risk score, the two or three reasons behind it, and a decline letter already written.',
    who: [
      { title: 'Credit risk managers', line: 'You have to grow the book without growing the losses.' },
      { title: 'Collections and limits teams', line: 'You set limits and need to know who is about to slip.' },
      { title: 'Compliance leads', line: 'Every decline needs a reason you can put in writing and stand behind.' },
    ],
    benefits: [
      {
        title: 'Scores that mean what they say',
        body: 'When it says a thirty per cent chance of missing a payment, roughly three in ten do. That makes the score usable for pricing and limits.',
      },
      {
        title: 'Bands you can set yourself',
        body: 'You choose where the lines sit between approve, approve with conditions, send for review and decline, and the whole book sorts itself.',
      },
      {
        title: 'The decline letter comes with it',
        body: 'The reasons are ranked and worded for the notice you are required to send, so nobody has to write one by hand.',
      },
    ],
    steps: [
      {
        title: 'Send the application',
        body: 'Connect your core banking system or drop in a file. Limit, age, repayment history and recent bills are the core of it.',
      },
      {
        title: 'Get a score and reasons',
        body: 'Each borrower comes back with the chance of missing a payment, the decision band, and what pushed them there.',
      },
      {
        title: 'Check it treats people alike',
        body: 'Approval and miss rates are compared across sex, age and education before you sign off a threshold.',
      },
    ],
    questions: [
      {
        q: 'What does a score actually mean?',
        a: 'A score of thirty means about three in ten borrowers like this one miss a payment. The scores are adjusted to line up with what really happens.',
      },
      {
        q: 'Missed payments are rare. Does that break it?',
        a: 'It is the usual trap. A model that always says pays looks accurate and is useless. This is built specifically to find the small group that does not pay.',
      },
      {
        q: 'Can we defend a decline?',
        a: 'Yes. Each decline lists the main reasons in the categories the notice requires, and the fairness checks are run before any threshold goes live.',
      },
    ],
  },

  malaria: {
    pitch: 'Read every slide. Send only what needs a person.',
    promise:
      'Slides read in seconds on a clinic laptop, with the parasite marked on the picture and anything doubtful handed to a person.',
    category: 'Laboratory workflow intelligence', photo: 'microscope laboratory blood sample',
    unit: 'slide', units: 'slides', subject: 'specimen', decision: 'flag for review',
    scoreLabel: 'Review a slide', scoreTitle: 'Screening result', queue: 'review queue',
    sources: ['Your slide scanner', 'LIS or LIMS', 'Field capture app', 'Image upload'],
    fileHint: 'One row per specimen: slide id, site, stain, capture time.',

    plainWhat:
      'Blood smear images are checked in a moment on an ordinary laptop, with anything doubtful passed to a microscopist.',
    who: [
      { title: 'District laboratory managers', line: 'You have far more slides than you have trained microscopists.' },
      { title: 'Field programme leads', line: 'You work in clinics with no reliable internet and no expensive computers.' },
      { title: 'Reference laboratory staff', line: 'You want a second read on the slides at the edge of a call.' },
    ],
    benefits: [
      {
        title: 'Runs on a clinic laptop',
        body: 'No internet connection and no graphics card. The whole thing fits on an ordinary laptop, a small board computer or an Android phone.',
      },
      {
        title: 'It shows you where it looked',
        body: 'A heat map sits over each cell, so a microscopist can see the call was made on the parasite and not a stain mark.',
      },
      {
        title: 'Doubt goes to a person',
        body: 'A blurred or badly stained image comes back marked as uncertain and waits for a human read, rather than being given a confident answer.',
      },
    ],
    steps: [
      {
        title: 'Capture the image',
        body: 'Photograph the stained slide through the microscope, or upload straight from your slide scanner.',
      },
      {
        title: 'Every cell is checked',
        body: 'Each red blood cell is looked at in turn, and the infected ones are marked on the picture.',
      },
      {
        title: 'A microscopist confirms',
        body: 'The clear cases are grouped, the doubtful ones are separated, and a person reads the ones that need reading.',
      },
    ],
    questions: [
      {
        q: 'Does it replace the microscopist?',
        a: 'No. It reads every field so a person does not have to, and hands back the cases that need judgement. The result is still signed by a human.',
      },
      {
        q: 'Does it need internet?',
        a: 'No. It runs on the laptop or phone in the clinic. Nothing is uploaded, which matters where connections are unreliable and patient images should not travel.',
      },
      {
        q: 'Would it miss a light infection?',
        a: 'That is the case it is tuned for. The threshold is set so that missing an infection counts as far worse than a false alarm somebody re-reads.',
      },
    ],
  },

  emotion: {
    pitch: 'Know exactly where the audience looked away',
    promise:
      'Attention and response second by second from people who agreed to take part, lined up with your edit so a cut has evidence behind it.',
    category: 'Audience response measurement', photo: 'focus group watching screen research',
    unit: 'session', units: 'sessions', subject: 'panellist', decision: 'report the response curve',
    scoreLabel: 'Analyse a session', scoreTitle: 'Audience response', queue: 'study queue',
    sources: ['Your panel provider', 'Study platform export', 'Consented webcam capture', 'Video upload'],
    fileHint: 'One row per session: panellist id, creative, consent record.',

    plainWhat:
      'You see the exact second a test audience stopped watching, measured only on people who agreed to take part.',
    who: [
      { title: 'Creative effectiveness leads', line: 'You have forty cut-downs to choose between and budget to test four.' },
      { title: 'Agency insight directors', line: 'You need evidence for an edit argument inside the production window.' },
      { title: 'Content research teams', line: 'You want to know where a trailer loses people, not that it scored sixty-two.' },
    ],
    benefits: [
      {
        title: 'A timestamp, not a score',
        body: 'You see that attention fell away at seven seconds and never came back. A survey only tells you the ad underperformed.',
      },
      {
        title: 'Test every cut, not four',
        body: 'Sessions run in a browser with no lab booking and no kit to ship, so testing every cut-down costs what testing a handful used to.',
      },
      {
        title: 'No response is reported honestly',
        body: 'If a face gave nothing you could measure, that is what you are told. You do not get a made-up percentage.',
      },
    ],
    steps: [
      {
        title: 'Recruit a consented panel',
        body: 'People opt in with a record of what they agreed to, for what purpose, and for how long. Nothing is measured without one.',
      },
      {
        title: 'They watch the cut',
        body: 'In their own browser, on their own machine. No lab booking and no kit to ship.',
      },
      {
        title: 'A curve against the shot list',
        body: 'Attention over time, lined up with your edit, so a drop points at a specific shot.',
      },
    ],
    questions: [
      {
        q: 'Does this tell us what people felt?',
        a: 'No, and we will not claim it. It reports what faces did and how sure that reading is. Claims about inner feelings do not survive scrutiny in the room.',
      },
      {
        q: 'Can we use this on staff or candidates?',
        a: 'No. Workplace, hiring and classroom use is refused when the account is set up. It is sold only for testing creative with people who opted in.',
      },
      {
        q: 'What do we tell our legal team?',
        a: 'That every session carries a signed record naming the purpose, the country, how long the data is kept and how to withdraw. That record is on every row you export.',
      },
    ],
  },

  music: {
    pitch: 'Surface the catalogue nobody is finding',
    promise:
      'Suggestions built from everything a listener has played rather than the last thing they clicked, with a real route for new and older releases.',
    category: 'Recommendation platform', photo: 'person listening music headphones',
    unit: 'listener', units: 'listeners', subject: 'listener', decision: 'what to recommend next',
    scoreLabel: 'Recommend for a listener', scoreTitle: 'Recommendations', queue: 'catalogue queue',
    sources: ['Your event stream', 'Warehouse table', 'Catalogue API', 'CSV export'],
    fileHint: 'One row per interaction: listener, item, action, timestamp.',

    plainWhat:
      'Each listener gets a next track chosen from everything they have played, and new releases get a real chance of being heard.',
    who: [
      { title: 'Streaming product managers', line: 'Your recommendations are accurate and boring, and people stop exploring.' },
      { title: 'Catalogue and label teams', line: 'Your back catalogue and your new releases never reach a listener.' },
      { title: 'Platform engineers', line: 'You need a suggestion per session across a million users without a cluster.' },
    ],
    benefits: [
      {
        title: 'New releases on day one',
        body: 'A track with no plays can still be suggested, because it is matched on how it sounds rather than on who has played it.',
      },
      {
        title: 'Not just the charts again',
        body: "Popular tracks are held back a little on purpose, so a listener's list is personal rather than the same forty songs everyone else gets.",
      },
      {
        title: 'Cheap to run',
        body: 'The whole index fits on an ordinary server and answers in a few thousandths of a second. No graphics cards and no special search hardware.',
      },
    ],
    steps: [
      {
        title: 'Send the play events',
        body: 'Whatever your app already logs. Who played what, and when. No star ratings needed.',
      },
      {
        title: 'Two ways of matching, combined',
        body: 'One reads taste from what similar listeners play. The other matches on how the music sounds, which covers anything new.',
      },
      {
        title: 'The list gets balanced',
        body: 'The list is trimmed for variety and nudged away from the obvious, then handed back to your app.',
      },
    ],
    questions: [
      {
        q: 'We have no star ratings. Does that matter?',
        a: 'No. Presses of play are enough, and that is what most services actually have. Nobody has to rate anything for this to work.',
      },
      {
        q: 'How do new artists get heard?',
        a: 'By sound. A new track is matched to what it resembles, so it can be recommended on the day it lands, before anyone has played it.',
      },
      {
        q: 'How fast is it?',
        a: 'A list comes back in a few thousandths of a second from one ordinary server, so you can call it at the start of every session.',
      },
    ],
  },

  reviews: {
    pitch: 'Read every review, not a two per cent sample',
    promise:
      'The whole feedback stream sorted into problems named in your own words, with every count opening back into the customers who wrote it.',
    category: 'Voice-of-customer intelligence', photo: 'warehouse packages ecommerce products',
    unit: 'review', units: 'reviews', subject: 'product', decision: 'route and prioritise',
    scoreLabel: 'Classify a review', scoreTitle: 'Triage', queue: 'triage queue',
    sources: ['Amazon and marketplace feeds', 'Zendesk', 'Your support desk', 'CSV export'],
    fileHint: 'One row per review: text, product, rating, date, channel.',

    plainWhat:
      'Reviews and support tickets are all sorted into your own list of problems, so no complaint goes unread because nobody had time.',
    who: [
      { title: 'Product managers', line: 'You need to know which complaint is growing, not which one shouted loudest.' },
      { title: 'Quality and returns teams', line: 'You want the fault named before the return rate moves.' },
      { title: 'Category managers', line: 'You sell thousands of lines and read the reviews for a handful.' },
    ],
    benefits: [
      {
        title: 'All of it, not a sample',
        body: 'Everything is read, every day, so the small problem that is quietly growing is not the one a quarterly sample happens to miss.',
      },
      {
        title: 'Your words, not fixed categories',
        body: "The list of problems is drawn from your own feedback and kept current as new ones appear, rather than mapped onto somebody else's categories.",
      },
      {
        title: 'Click a theme, read the words',
        body: 'Every count opens into the actual reviews behind it, so nobody has to take a chart on trust in a meeting.',
      },
    ],
    steps: [
      {
        title: 'Connect the feedback',
        body: 'Marketplace reviews, your support desk, survey exports. One row per piece of feedback is enough.',
      },
      {
        title: 'Problems get named and applied',
        body: 'The recurring problems are named in your own words, then applied to every piece of feedback you hold.',
      },
      {
        title: 'Watch what is moving',
        body: 'You see which problems are rising, on which products, and which reviews are driving the change.',
      },
    ],
    questions: [
      {
        q: 'How much of our feedback gets read?',
        a: 'All of it. Coverage is not the thing you pay for. Price is set by catalogue size and language, and the number of reviews is left out of the contract.',
      },
      {
        q: 'Will it use our language or generic labels?',
        a: 'Yours. The problem names come out of your own feedback, and you can edit, merge or split any of them at any point.',
      },
      {
        q: 'Can we trust the numbers?',
        a: 'Every theme links back to the individual reviews counted under it, so any figure can be checked by reading the customers who produced it.',
      },
    ],
  },
}

export const domainOf = (slug: Slug): Domain => DOMAIN[slug]
