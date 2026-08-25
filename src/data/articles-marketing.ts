// Phoxta — marketing-solutions editorial set.
//
// The six articles surfaced on the /marketing page (index-3 Section11 journal
// cards) and published on /blog alongside the core set. Kept in a separate file
// so the marketing section can map over exactly these posts; the aggregate blog
// data imports this array, so this file must only ever *type*-import from
// src/data/articles.ts to avoid a circular value import.
//
// Same editorial rules as the main set: no prices in prose (link to /pricing),
// no invented case studies, and Phoxta capabilities mentioned only where the
// product genuinely does the thing being described.

import type { Article } from "@/data/articles";

export const MARKETING_ARTICLES: Article[] = [
    {
        slug: "become-the-answer-ai-search-recommends",
        title: "How to Become the Answer AI Search Recommends",
        excerpt:
            "Search used to show a list and let the customer choose. Increasingly it gives one answer — and either your business is in it or, for that question, you do not exist. Here is how small businesses get recommended.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-71.webp",
        hero: "/assets/imgs/pages/img-160.webp",
        author: "Phoxta",
        date: "July 8, 2026",
        iso: "2026-07-08",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "For twenty years, being found meant ranking — earning a position on a page of ten blue links and letting the customer pick you. That contest is quietly being replaced. When someone asks ChatGPT, Perplexity or Google's AI mode for \"a good florist that delivers same-day near Richmond\", they do not get a list to browse. They get an answer, with one or two names in it. Being ranked was a traffic game. Being recommended is a trust game, and it is played by different rules.",
            },
            {
                kind: "p",
                text: "The temptation is to treat this as another dark art with another acronym — generative engine optimisation, GEO — and wait for an agency to sell you the ritual. Resist that. What the answer engines reward is unusually legible, and most of it favours small, specific businesses over large, vague ones. The machines are trying to give a confident, checkable answer to a specific question. Your job is to be the easiest business in your category to be confident about.",
            },
            { kind: "h", text: "What the machines are actually reading" },
            {
                kind: "p",
                text: "An AI answer is assembled, not conjured. Behind the scenes the engine is retrieving and cross-checking sources: your own site, review platforms, directories, maps listings, press mentions, and the structured data your pages carry. When those sources agree — same name, same offer, same opening hours, same claims — the engine can repeat you without risk of embarrassment. When they disagree, it reaches for a competitor it can verify instead.",
            },
            {
                kind: "p",
                text: "This is why specificity is the small operator's advantage. A model asked for \"the best trainers\" has a thousand safe answers. Asked for \"a decaf subscription that is actually worth drinking\" or \"a two-chair salon in Leith that takes bookings by WhatsApp\", it has very few — and a business that has said exactly that about itself, consistently, everywhere, is the natural completion of the sentence.",
            },
            {
                kind: "list",
                items: [
                    "Make one page the definitive answer to one question a customer actually asks — not a page that gestures at six services in general terms.",
                    "Keep the boring facts identical everywhere: name, location, hours, delivery area, what you sell. Inconsistency reads as unreliability to a machine doing cross-checks.",
                    "Carry structured data — product, price availability, reviews, business details — so engines do not have to guess what your pages mean.",
                    "Accumulate real reviews and answer them. Third-party corroboration is the closest thing the answer engines have to references.",
                    "Write in plain, factual sentences. Superlatives are unquotable; specifics are citations waiting to happen.",
                ],
            },
            { kind: "h", text: "Write pages that can be quoted" },
            {
                kind: "p",
                text: "Traditional SEO copy was written to be crawled and skimmed. Answer engines lift sentences, so the useful mental test changes: could a machine quote two sentences from this page and have them stand alone as a correct, complete answer? If the honest answer to \"do you deliver on Sundays\" is buried in paragraph five, the page ranks in theory and is unquotable in practice.",
            },
            {
                kind: "duo",
                left: {
                    h: "Answer first, evidence second",
                    p: "Put the direct answer in the opening lines — the yes, the number, the how-long, the price range — then spend the rest of the page earning it. Humans skim in the same order the machines extract, so nothing is lost.",
                },
                right: {
                    h: "One page, one question",
                    p: "A page that answers \"do you do vegan cakes\", \"what is your delivery radius\" and \"can I hire you for weddings\" at once answers none of them cleanly. Split them. Small pages that each settle one question are what retrieval systems are built to find.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-192.webp",
                alt: "A calm desk with a coffee mug, notebook and glasses",
                caption: "Being recommendable is mostly a matter of saying true things clearly, in a form machines can check.",
            },
            { kind: "h", text: "The corpus you cannot fake" },
            {
                kind: "p",
                text: "There is a hard edge to all this that keeps it honest: you cannot astroturf corpus-wide consistency. One suspiciously glowing page is easy to manufacture; agreement between your site, your reviews, your directory entries and what customers say about you in public is not. The businesses that surface in AI answers tend to be the ones that were already coherent — they simply made the coherence machine-readable.",
            },
            {
                kind: "p",
                text: "It also means the fastest wins are usually corrections, not creations. An old phone number on a directory, a delivery policy that changed two years ago and was updated in only one place, a service you quietly stopped offering — each contradiction is a reason for an engine to hedge. An afternoon spent reconciling your public facts often does more than a month of new content.",
            },
            { kind: "h", text: "Where your storefront does the work" },
            {
                kind: "p",
                text: "A Phoxta storefront is built answer-shaped by default: product, availability, FAQ and review content live in the database and render as structured pages, so a fact corrected once — a delivery cut-off, an opening hour, a returns window — is corrected everywhere at the same moment. And there is a useful symmetry with the AI agent that answers your customers on web chat, SMS, WhatsApp and email: the questions people ask it are, almost word for word, the questions they ask the answer engines. The knowledge you load into one is the editorial brief for the other.",
            },
            {
                kind: "quote",
                text: "Search rankings measured how loudly you could compete for attention. AI search measures whether a cautious machine is willing to repeat you. Those are very different tests, and the second one favours the honest.",
            },
            { kind: "h", text: "How to know it is working" },
            {
                kind: "p",
                text: "You cannot install an analytics tag inside someone else's model, so the measurement is more manual and more truthful. Once a month, ask the major assistants the five questions a ready-to-buy customer would ask in your category, and record who gets named. Watch branded and direct traffic — people who arrive already knowing your name were often handed it by an answer. And listen in your own conversations for \"the AI recommended you\", which customers increasingly volunteer unprompted.",
            },
            {
                kind: "p",
                text: "None of this requires a new discipline, an agency retainer or a rebuild. It requires being specific, being consistent, and running on a storefront that presents the truth in a form machines can verify. See what a running Phoxta business includes on the pricing page — the recommendable part is standard equipment.",
            },
        ],
    },
    {
        slug: "campaigns-customers-actually-respond-to",
        title: "Campaigns Customers Actually Respond To",
        excerpt:
            "Most small-business campaigns are broadcasts into the void — sent to everyone, about the sender, with nothing to do. Response comes from permission, relevance and, above all, the ability to reply.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-72.webp",
        hero: "/assets/imgs/pages/img-110.webp",
        author: "Phoxta",
        date: "July 3, 2026",
        iso: "2026-07-03",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "A campaign is any message your business sends first — the offer, the announcement, the reminder, the nudge. Most of them fail, and they fail the same way: sent to the whole list, written about the business rather than the customer, and finished with nothing specific to do. The fix is not louder creative. It is treating a campaign as the opening line of a conversation rather than the whole of one.",
            },
            {
                kind: "p",
                text: "This matters more for a small business than a large one, because you cannot afford the large company's tolerance for waste. A brand with millions of addresses can shrug off a two per cent response. When your list is eight hundred people who actually bought from you, every message either strengthens the relationship or teaches someone to ignore you — and the second lesson, once learned, is nearly permanent.",
            },
            { kind: "h", text: "Permission is the asset" },
            {
                kind: "p",
                text: "Before tactics, the foundation: a campaign is only as good as the list it goes to, and the only list worth having is one you own and were given willingly. Followers on a social platform and customers acquired through a marketplace are rented — the platform decides who sees you, and the terms change without notice. The email address, mobile number or WhatsApp opt-in collected at your own checkout is yours for as long as you deserve it.",
            },
            {
                kind: "p",
                text: "So collect deliberately. Ask at the moments people are most willing — at checkout, after a delivery arrives well, after a question is answered properly — and say what they are signing up for. \"Occasional restock alerts and genuinely good offers\" is a promise; keep it, and the list compounds. Break it, and the unsubscribes are the polite portion of your losses.",
            },
            { kind: "h", text: "One message, one reason, one action" },
            {
                kind: "p",
                text: "The campaigns that get responses share a discipline: each one exists for a single reason the recipient would recognise as being about them, and asks for exactly one thing. \"The jacket you looked at is back in medium\" outperforms a newsletter every time, because it is not really a campaign at all — it is a useful message that happens to have been automated.",
            },
            {
                kind: "list",
                items: [
                    "Back in stock — for the customers who bought or asked about that product, nobody else.",
                    "The winback — a plain, unpushy check-in when a regular's usual re-order window passes quietly.",
                    "The reminder — bookings and appointments confirmed the day before, written so a reply can move or cancel them.",
                    "Post-purchase care — how to look after the thing, what to do if something is wrong, and a review ask timed for the day satisfaction peaks.",
                    "The genuine deadline — a seasonal offer with a real end date, sent at most a few times a year so it stays believable.",
                ],
            },
            { kind: "h", text: "Pick the channel by the job" },
            {
                kind: "p",
                text: "Channels are not interchangeable megaphones; each carries a different social contract. Email tolerates length and low urgency. A text message interrupts, which is a power to be spent rarely. WhatsApp is conversational by nature and resents being broadcast at. Matching the message to the channel's contract is most of the difference between \"useful\" and \"spam\".",
            },
            {
                kind: "table",
                caption: "The same campaign lands differently by channel — match the message to the contract.",
                head: ["Channel", "Best for", "The contract you must honour"],
                rows: [
                    ["Email", "Offers, digests, anything worth reading seated", "Earn the open with the subject line; one campaign should never chase another within days"],
                    ["SMS", "Time-sensitive facts: reminders, delivery day, back-in-stock", "It interrupts, so it must be short, rare and immediately useful — and replies must be answered"],
                    ["WhatsApp", "Bookings, order updates, two-way service conversations", "It is a chat, not a billboard; outside an open conversation window, only messages the customer opted into"],
                    ["Web chat", "The visitor already on your storefront, at the moment of doubt", "Answer instantly or not at all — an unattended chat widget is worse than none"],
                ],
            },
            {
                kind: "duo",
                left: {
                    h: "A broadcast ends the moment it is sent",
                    p: "If the only options are click or delete, the campaign's ceiling is its click rate. Everyone who had a question — the largest group, usually — is lost to silence.",
                },
                right: {
                    h: "A conversation starts there",
                    p: "\"Reply to this message to change your slot\" or \"answer here and we'll check\" converts the curious as well as the convinced. The campaigns with the best numbers are the ones a customer can talk back to.",
                },
            },
            {
                kind: "p",
                text: "Reply-ability is where most small operators quietly give up, because answering fifty replies by hand at nine in the evening is nobody's idea of marketing. It is also exactly the seam a Phoxta business is built along: campaign replies land in the same inbox as every other conversation, on whatever channel the customer used, and the AI agent answers them from the real state of the business — the order, the stock level, the diary — at any hour. Which means you can finally send the message that says \"just reply\", and mean it.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-165.webp",
                alt: "Front-of-house staff talking around a table by a window",
                caption: "The best campaigns read like one side of a conversation you are prepared to finish.",
            },
            { kind: "h", text: "Measure replies, not opens" },
            {
                kind: "p",
                text: "Open rates have been unreliable for years — privacy features inflate them and hide the truth. Judge campaigns on things that cannot be faked: replies, orders placed within a few days of the send, clicks to the one page the message pointed at, and unsubscribes. A campaign that produces twelve conversations from four hundred sends did more for the business than one that produced a thousand silent opens.",
            },
            {
                kind: "quote",
                text: "The campaign your customer actually welcomes looks like a short message from a business that knows them and is ready to talk. The good news is that this is not a writing trick. It is an operations capability.",
            },
            {
                kind: "p",
                text: "Start smaller than feels ambitious: one segment, one reason, one channel, one reply path you can honour. Every Phoxta storefront comes with the pieces — the owned customer list, the segments built from real order history, the multichannel inbox and the agent that answers — and the pricing page shows how the plans carve it up. The writing is your voice; the answering no longer has to be your evening.",
            },
        ],
    },
    {
        slug: "lifecycle-marketing-that-compounds",
        title: "Lifecycle Marketing That Compounds Over Time",
        excerpt:
            "A campaign is an event; lifecycle marketing is machinery. Messages triggered by where each customer actually is — built once, running always — are how small retention gains become large businesses.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-73.webp",
        hero: "/assets/imgs/pages/img-168.webp",
        author: "Phoxta",
        date: "July 17, 2026",
        iso: "2026-07-17",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "Campaigns are events: you write one, send it, and its effect is over by the weekend. Lifecycle marketing is machinery: a message built once that fires forever, whenever a customer reaches the moment it was built for. The distinction sounds technical and is actually economic — events cost you effort every time, while machinery compounds. A year in, the operator who built five good automated moments is being out-earned only by the one who built six.",
            },
            {
                kind: "p",
                text: "The reason this is worth an owner's attention rather than an agency's is that lifecycle marketing is powered by something only you have: the record of what each customer actually did. Not demographics, not personas — orders, bookings, gaps and silences. Every useful lifecycle message is a response to one of those facts.",
            },
            { kind: "h", text: "The five moments that matter" },
            {
                kind: "list",
                items: [
                    "Arrival — the first hours after a first order, when attention and goodwill both peak and most businesses send only a receipt.",
                    "The second-purchase window — the weeks in which a one-time buyer either becomes a customer or quietly becomes a statistic.",
                    "The habit — the regular's rhythm, which wants protecting: replenishment nudges, early access, the sense of being known.",
                    "The wobble — a missed usual order, a lapsed booking pattern, a subscription payment that failed. Recoverable, briefly.",
                    "The lapse — genuinely gone quiet. Worth one honest, generous attempt; not worth a monthly guilt trip.",
                ],
            },
            {
                kind: "p",
                text: "Of these, the second-purchase window is the hinge for almost every small business. First orders are bought — with ads, discounts, effort. Second orders are earned, and they are where the economics turn: a customer who buys twice is several times more likely to buy a third time, and acquisition costs stop haemorrhaging out of the margin. If you automate nothing else, automate the care and the reason-to-return inside that window.",
            },
            { kind: "h", text: "Triggers beat calendars" },
            {
                kind: "p",
                text: "The defining feature of lifecycle work is that the customer's behaviour starts the clock, not yours. A \"we miss you\" email blasted to everyone each quarter mostly reaches people who bought last week and people who left for a reason. A message triggered forty days after a customer's own last order of a thirty-day product reaches one person, at the one moment the message is true. Relevance is not a copywriting achievement; it is a data condition.",
            },
            {
                kind: "duo",
                left: {
                    h: "Built once, runs always",
                    p: "An automated post-purchase flow written this month will still be welcoming customers in two years, unattended. Its cost is fixed; its return scales with every order. This is what compounding means in marketing terms.",
                },
                right: {
                    h: "Sent once, gone",
                    p: "The hand-crafted campaign has its place — launches, seasons, news — but it is labour, and labour does not compound. A healthy mix is machinery for the predictable moments, campaigns for the genuine occasions.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-195.webp",
                alt: "A desk with a keyboard and an open planner",
                caption: "The machinery is designed once, on a quiet afternoon, and then simply runs.",
            },
            { kind: "h", text: "What this looks like in practice" },
            {
                kind: "p",
                text: "Take a small storefront selling consumables. Day two after delivery: a short care message — how to store it, how to get the best out of it — with a reply path for anything wrong. Day twenty: a replenishment nudge timed to the product's actual life, with a one-tap reorder. Day forty-five of silence: a single, human check-in that asks a question rather than pushing a discount. Around each subscription: a reminder before renewal, a graceful path to pause rather than cancel, and an immediate, reply-able message when a payment fails — because involuntary churn is the most recoverable revenue in the business.",
            },
            {
                kind: "p",
                text: "Every one of those messages depends on state: what was ordered, when, what usually happens next, what just went wrong. This is why lifecycle marketing belongs where the operations live. On a Phoxta business the automations run off the real order, subscription and conversation records in the console, go out on the channel each customer actually uses — email, SMS or WhatsApp — and every reply lands back in the same inbox, where the AI agent answers it with the same records behind it. The loop closes without you standing in it.",
            },
            { kind: "h", text: "Measuring compounding" },
            {
                kind: "p",
                text: "Judge lifecycle work on cohorts, not sends. Of the customers who first bought in March, what share bought again within sixty days — and is that number better than it was for January's cohort? Alongside that, watch time-to-second-order, the share of revenue arriving from automated messages, and the pause-to-cancel ratio on subscriptions. These numbers move slowly and honestly, which is the point: they are the shape of the business bending.",
            },
            {
                kind: "quote",
                text: "A campaign borrows the customer's attention for an afternoon. A lifecycle programme builds a balance — and like all balances, its growth looks unimpressive weekly and unarguable annually.",
            },
            {
                kind: "p",
                text: "Start with one moment — the second-purchase window — and build it properly before adding another. The pieces are standard equipment on a Phoxta storefront, and the pricing page shows what each plan carries. The strategy is deciding which moments deserve machinery. The machinery itself is no longer the hard part.",
            },
        ],
    },
    {
        slug: "turning-visitors-into-customers-with-cro",
        title: "Turning More Visitors Into Customers With CRO",
        excerpt:
            "Conversion optimisation for a small storefront is not button colours and A/B tests. It is finding the doubt or the effort standing between intent and payment, and removing it — often by simply answering.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-51.webp",
        hero: "/assets/imgs/pages/img-118.webp",
        author: "Phoxta",
        date: "July 28, 2026",
        iso: "2026-07-28",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "Every visitor who leaves without buying was, for a moment, a possible customer. Conversion-rate optimisation has a reputation as a statistical discipline — heatmaps, split tests, button colours — and for businesses with millions of visitors it is. For a small storefront the truth is simpler and more useful: most lost sales are lost to a doubt that went unanswered or an effort that felt unearned. CRO, at this scale, is the craft of removing those two things.",
            },
            {
                kind: "p",
                text: "The economics justify the attention. Traffic is the expensive input — every visitor arrived through effort or spend — and conversion multiplies everything downstream of it. Moving a storefront from one visitor in a hundred buying to two does the same for revenue as doubling your marketing, at none of the cost. There is no other lever in the business this cheap.",
            },
            { kind: "h", text: "Find the leak before choosing the fix" },
            {
                kind: "p",
                text: "Optimisation folklore starts with tactics; actual optimisation starts with a walk. Open your storefront on a phone — not your desktop, the phone, on mobile data — and buy something as a stranger would. Count every screen, every field, every moment you had to scroll to find an answer, every second a page took to arrive. Then look at where the numbers say people leave: which pages they exit from, where baskets are abandoned, where checkouts stall. The leak is almost always visible once you stop looking at the site the way its owner does.",
            },
            {
                kind: "list",
                items: [
                    "Pages that are slow on a mid-range phone — the single most common and least glamorous leak.",
                    "Delivery cost and timing revealed only at checkout — the classic basket-killer; surprises this late read as bad faith.",
                    "Unanswered doubt at the decision point — sizing, returns, \"will it arrive by Friday\", \"is this in stock in blue\".",
                    "Forced account creation before payment — a demand for commitment the visitor has not yet decided to make.",
                    "Forms that ask for more than the transaction needs — every field is a small toll, and tolls add up.",
                ],
            },
            { kind: "h", text: "Reduce doubt, then reduce effort" },
            {
                kind: "duo",
                left: {
                    h: "Doubt is answered, not designed away",
                    p: "Put the returns policy within sight of the buy button. Put the delivery estimate on the product page, not the checkout. Answer the size question where it is asked. A doubtful visitor does not need persuading; they need one specific fact, at the moment it occurs to them.",
                },
                right: {
                    h: "Effort is subtracted, not decorated",
                    p: "Guest checkout. Fewer fields. Address lookup. Payment methods people already have set up on their phones. Nothing here is clever — which is why it is so often skipped in favour of things that are.",
                },
            },
            {
                kind: "p",
                text: "Of the two, doubt is the bigger and the more neglected, because most storefronts have no way to answer a question in the moment it blocks a purchase. This is where an always-on agent quietly becomes a conversion tool rather than a support one. On a Phoxta storefront, the visitor hovering over a product at 22:40 can ask \"would this fit a tall eight-year-old\" or \"can it arrive before Saturday\" in web chat and get an answer built from the real stock record and the real delivery cut-offs — in the same minute their card is already in reach. Visitors who ask a question and get a real answer buy at a multiple of the rate of those who leave to \"think about it\". Every unanswered question is a bounce wearing a polite excuse.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/FS2.webp",
                alt: "A live storefront running on its own domain",
                caption: "The storefront is the funnel. Every screen either removes a doubt or adds one.",
            },
            { kind: "h", text: "Test like a small business, not a lab" },
            {
                kind: "p",
                text: "A/B testing needs traffic volumes most small storefronts simply do not have — a test that would take you nine months to reach significance is not a test, it is a superstition with a dashboard. The honest method at this scale is before-and-after: make one meaningful change at a time, note the date, and compare full weeks against full weeks. Big, obvious fixes — the surprise delivery charge, the six-field form, the dead chat widget — do not need a laboratory to prove themselves. They need someone to do them.",
            },
            { kind: "h", text: "The numbers worth watching weekly" },
            {
                kind: "list",
                items: [
                    "Product-page-to-basket rate — whether the page itself persuades.",
                    "Checkout completion rate — of those who started paying, how many finished; the purest friction gauge in the business.",
                    "The mobile gap — mobile conversion as a share of desktop conversion; a wide gap almost always means speed or form problems.",
                    "Chat-to-order rate — how often an answered question becomes a purchase; the clearest proof that answering is selling.",
                ],
            },
            {
                kind: "quote",
                text: "Nobody abandons a basket out of malice. They leave because something felt unanswered or unearned — and in most shops, nobody was listening at the moment it happened.",
            },
            {
                kind: "p",
                text: "None of this requires a consultancy or a testing platform. It requires walking your own funnel monthly, fixing the obvious in order of size, and running a storefront where questions get answered while they still matter. The checkout, the speed and the agent that answers come standard on a Phoxta business — the pricing page shows the rest. The multiplier is sitting in the traffic you already have.",
            },
        ],
    },
    {
        slug: "paid-media-in-the-age-of-ai-search",
        title: "Paid Media in the Age of AI Search",
        excerpt:
            "Clicks cost more, AI answers absorb the easy queries, and the platforms automate against your interests. Paid media still works — as a multiplier on a shop that already converts and retains, never as the business model.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-52.webp",
        hero: "/assets/imgs/pages/bg-img-4.webp",
        author: "Phoxta",
        date: "July 10, 2026",
        iso: "2026-07-10",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "For a decade the small-business growth recipe was simple: buy clicks, convert some, repeat. That recipe has not stopped working, but every ingredient has become more expensive and less obedient. Auction prices have climbed for years, AI answers now settle many searches before anyone clicks anything, and the platforms' automation optimises fluently for its own metrics. Paid media in 2026 is still a genuine lever — but only in one configuration: as a multiplier on a business that already converts and retains. As a foundation, it is a subscription to disappointment.",
            },
            {
                kind: "p",
                text: "Understand what actually changed. The informational searches that used to feed the top of your funnel — \"how to choose\", \"what's the difference\", \"is it worth it\" — are increasingly answered on the results page by the engine itself. The clicks that remain skew closer to the purchase, which makes them more valuable and, predictably, more contested. Meanwhile the campaign types the platforms push hardest hand your budget to a black box that will happily spend it, and grade its own homework when reporting the results.",
            },
            { kind: "h", text: "Pay for buyers, not for browsing" },
            {
                kind: "p",
                text: "The strategic response is to stop renting the part of the funnel AI is eating and concentrate spend where a click still means intent. Search terms that contain the product, the problem and a buying signal. Shopping placements with a price attached. Retargeting only of people who did something meaningful. The awareness layer — the browsing, the inspiration, the education — is better served by the content and answer-engine work you own outright, which does not bill you per impression.",
            },
            {
                kind: "p",
                text: "Then feed the machines honest signals. Platform automation is not evil, it is literal: it optimises toward whatever you count as a conversion. If that is \"clicked through\", it will find you the world's most enthusiastic clickers. Send it real purchases — actual orders, from your actual storefront — and its considerable power starts pulling in your direction rather than its own.",
            },
            { kind: "h", text: "Land on ground you own" },
            {
                kind: "duo",
                left: {
                    h: "The click is rented",
                    p: "You paid for one arrival, once. If the visit ends in a bounce, the platform keeps the money and the lesson. Rented attention has no memory.",
                },
                right: {
                    h: "The relationship is owned",
                    p: "The same click that becomes an order, an opt-in or a conversation is an asset with a future. The entire game of paid media is converting rented attention into owned relationships before the meter stops.",
                },
            },
            {
                kind: "p",
                text: "This is why the landing experience is half the media plan. A paid click deserves a page that answers the exact promise of the ad — same product, same offer, price and delivery facts in plain sight — and a way to ask the one question standing between doubt and payment. On a Phoxta storefront that question goes to the agent in web chat and gets answered from live stock and delivery data in the moment; and whether or not the visitor buys tonight, a checkout opt-in or a started conversation means the click left something behind. The ad budget buys arrivals; the storefront decides whether you keep anything.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/wbd3.webp",
                alt: "A branded storefront on a custom domain",
                caption: "Every paid click should land on ground you own, with a way to answer and a reason to stay.",
            },
            { kind: "h", text: "Rules of thumb for small budgets" },
            {
                kind: "list",
                items: [
                    "One channel, done properly, before a second. A small budget split three ways teaches three platforms and you nothing.",
                    "Judge spend on blended numbers — total marketing cost against total new customers — not the platform's self-reported return, which flatters by design.",
                    "Know your payback period: how many weeks of a customer's ordering it takes to repay their acquisition. Retention data sets your real bidding ceiling.",
                    "Put the price in the ad. A click from someone who has seen the price is worth several from people who have not.",
                    "Turn off anything you cannot explain. If you do not know why a campaign spent what it spent, it is spending on the platform's behalf, not yours.",
                ],
            },
            { kind: "h", text: "When not to spend" },
            {
                kind: "p",
                text: "There is one situation in which the correct paid-media budget is zero: when the funnel behind it leaks. Buying traffic for a storefront that converts poorly, or acquiring customers a leaky retention programme will lose in a month, is paying to discover your problems at scale. Fix conversion and the second-purchase window first — they are cheaper, they are permanent, and they raise the value of every click you buy afterwards. The order of operations is the strategy.",
            },
            {
                kind: "quote",
                text: "Paid media is a multiplier. Point it at a shop that converts and retains, and it compounds your strengths. Point it at a leaky one, and you are paying to be disappointed more efficiently.",
            },
            {
                kind: "p",
                text: "Practically, the discipline is fortnightly and unglamorous: one channel, blended maths, honest conversion signals, and a landing experience that answers. The console on a Phoxta business shows orders alongside the conversations they came from, which keeps the blended numbers in view without a spreadsheet safari. Start with the storefront working; see the pricing page for what that includes. Then, and only then, is the click worth buying.",
            },
        ],
    },
    {
        slug: "content-that-ranks-in-google-and-ai-answers",
        title: "Content That Ranks in Google and in AI Answers",
        excerpt:
            "Generic content is now free to produce, which is exactly why it earns nothing. The content that wins both Google and the answer engines is the same content: specific, evidenced, and written to be quoted.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-53.webp",
        hero: "/assets/imgs/pages/wbd1.webp",
        author: "Phoxta",
        date: "July 19, 2026",
        iso: "2026-07-19",
        readMinutes: 9,
        body: [
            {
                kind: "lead",
                text: "The old content playbook — pick keywords, publish weekly, wait for rankings — died of abundance. When anyone can generate a thousand competent words on any topic in a minute, competent words on a topic are worth what they cost. What still earns attention, in Google's rankings and in the answers AI engines assemble, is the content that could not have been generated: the piece that carries facts, numbers and experience that exist nowhere else. Happily, a real business produces those every single day.",
            },
            {
                kind: "p",
                text: "It helps that the two audiences have converged. Google's systems increasingly reward demonstrated experience and first-hand knowledge; answer engines retrieve and quote sources they can verify. Both are, in different ways, asking the same question of every page: does the person who wrote this actually know something? Content strategy in 2026 is mostly the discipline of making your genuine knowledge legible.",
            },
            { kind: "h", text: "Write what only you can write" },
            {
                kind: "p",
                text: "The test for every piece before you write it: could a competitor — or a model — produce this without running your business? If yes, it will not move anything, however polished. If no, you have something. Your materials and where they come from. What actually goes wrong with the product and how you fix it. What a year of orders taught you about what people in your town really buy. The comparison you are qualified to make because you have used both.",
            },
            {
                kind: "list",
                items: [
                    "Answers to the questions your customers literally ask — in their words, not your category's jargon.",
                    "Original numbers, however small: what you measured, counted or learned from your own orders and seasons.",
                    "Honest comparisons that concede a point — the concession is what makes the recommendation citable.",
                    "Process and experience pieces: how the thing is made, chosen, fitted, repaired. Experience is the one input that cannot be generated.",
                    "Local and niche specificity — the narrower the question, the shorter the list of credible answers, and the more likely yours is the one that gets quoted.",
                ],
            },
            { kind: "h", text: "Shape it for extraction" },
            {
                kind: "p",
                text: "Knowing something is half the job; presenting it so a machine can safely lift it is the other half. Answer engines quote sentences, so write sentences that survive being quoted alone: the direct answer in the opening lines, headings phrased as the questions people ask, facts stated plainly rather than implied across three paragraphs. And keep your facts consistent across every page that mentions them — a delivery time stated three different ways on three pages reads, to a cross-checking machine, as a business not to be quoted.",
            },
            {
                kind: "duo",
                left: {
                    h: "Written to be read",
                    p: "A human wants the story: why it matters, what it feels like, the detail that proves you were there. This is what earns the links, the shares and the trust that rankings still run on.",
                },
                right: {
                    h: "Written to be quoted",
                    p: "A machine wants the extractable fact: the number, the timeframe, the plain yes-or-no. The craft is carrying both in one page — the quotable sentence up front, the readable proof beneath it.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-192.webp",
                alt: "A calm desk with a coffee mug, notebook and glasses",
                caption: "One genuinely knowledgeable piece a month, maintained, beats a year of weekly filler.",
            },
            { kind: "h", text: "Your inbox is the editorial calendar" },
            {
                kind: "p",
                text: "The perennial small-business complaint — \"I don't know what to write about\" — has a mechanical answer: your customers tell you, daily, in their own words. Every question that arrives by web chat, SMS, WhatsApp or email is a search query with a name attached; if one person paid the social cost of asking, dozens typed it into a search box or an assistant. On a Phoxta business those conversations sit in one console, which turns topic research into a reading exercise: the questions your agent answers most often are, verbatim, the pages you should publish. And the loop closes neatly — the page you write becomes knowledge the agent answers from, so the same work serves the customer you have and the one still searching.",
            },
            { kind: "h", text: "Cadence over bursts" },
            {
                kind: "p",
                text: "The publishing pattern that works is unheroic: one genuinely useful piece a month, sustained, with an afternoon each quarter spent updating what you have already published — refreshing the numbers, correcting what changed, tightening the answer. Engines notice maintenance, and answer engines in particular prefer sources whose facts are current. A burst of ten posts followed by silence produces neither trust nor rankings; it produces an archive with a death date on it.",
            },
            {
                kind: "quote",
                text: "Search engines rank pages. Answer engines repeat sentences. The whole craft now is writing sentences worth repeating, on pages worth arriving at.",
            },
            { kind: "h", text: "Knowing whether it works" },
            {
                kind: "p",
                text: "Content moves slowly, so measure it patiently and honestly. Watch which pages earn search impressions for questions rather than just your name; ask the major assistants your customers' questions monthly and note when your pages start informing the answers; and watch the questions arriving in your own inbox — when customers start saying \"I read your piece on this\", the flywheel has engaged. What you should not measure is volume. Nobody is counting your posts except you.",
            },
            {
                kind: "p",
                text: "The stack matters less than the knowledge, but it is not nothing: the content on a Phoxta storefront is data-driven and structured, so publishing and updating never involves a developer, and every piece lives on the same domain as the checkout it ultimately serves. The pricing page shows what is included. The knowledge — the only part that ranks — was always yours.",
            },
        ],
    },
];
