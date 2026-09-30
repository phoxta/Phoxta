/** Copy transcribed from the supplied Brand & Product Architecture.
 * References are PDF page numbers; typographic apostrophes/dashes normalised.
 */
export const BRAND_COPY = {
    // B pp. 21–23, §10.2
    hero: {
        eyebrow: 'PHOXTA • OPPORTUNITY DISCOVERY & VENTURE CREATION',
        title: 'Discover Business Opportunities',
        body: 'Find opportunities worth investigating. Understand the customer, market and evidence. Validate what must be true. Then build and launch with Phoxta.',
        primary: 'Discover Opportunities', secondary: 'Explore Ready-to-Launch Businesses',
        trust: 'Start free. No business idea required.',
    },
    discovery: {
        eyebrow: 'You don’t need the perfect idea', title: 'You need an opportunity worth pursuing.',
        body: 'Start with your skills, an industry, a problem you’ve noticed, a technology, a trend — or simply the ambition to build. Phoxta helps you turn signals into structured opportunities and shows you what to investigate next.',
    },
    modes: [
        { id: 'for-me', title: 'For Me', body: 'Tell Phoxta what you know, what you want and what constraints you have. Get opportunities matched to your profile.', href: '/app/discover' },
        { id: 'industry', title: 'By Industry', body: 'Explore unmet needs, broken workflows and changing economics inside a market you understand.', href: '/app/discover/industries' },
        { id: 'problem', title: 'From a Problem', body: 'Turn a recurring frustration or inefficient workflow into an opportunity thesis.', href: '/app/discover/problems' },
        { id: 'idea', title: 'From My Idea', body: 'Already have an idea? Investigate the customer, alternatives, assumptions and evidence behind it.', href: '/app/discover/my-idea' },
    ],
    loop: {
        title: 'From curiosity to a business you can launch.',
        stages: [
            { title: 'Discover', body: 'Find opportunities from problems, market shifts, technology and unmet demand.' },
            { title: 'Investigate', body: 'Understand customers, alternatives, market structure and why the opportunity may exist now.' },
            { title: 'Validate', body: 'Identify what must be true and run tests that produce evidence.' },
            { title: 'Shape', body: 'Define the offer, positioning, business model and MVP.' },
            { title: 'Build', body: 'Create the product, brand, workflows and operating system.' },
            { title: 'Launch', body: 'Prepare your go-to-market motion, acquire customers and learn from the market.' },
        ],
    },
    brief: {
        title: 'Every opportunity becomes something you can reason about.',
        body: 'Phoxta turns discovery into a living Opportunity Brief: the problem, customer, why now, alternatives, evidence, business-model hypotheses, risks, assumptions and next validation actions — all in one place.',
        cta: 'See how Opportunity Briefs work',
    },
    evidence: {
        title: 'Don’t confuse an interesting idea with a proven opportunity.',
        body: 'Phoxta separates facts, external evidence, customer evidence, assumptions and AI-generated hypotheses so you always know what you know — and what still needs testing.',
    },
    paths: [
        { title: 'Build Your Own', body: 'Discover an opportunity and use Phoxta to investigate, validate, shape, build and launch it.', cta: 'Start Discovering', href: '/discover' },
        { title: 'Ready-to-Launch', body: 'Choose a business Phoxta has already designed with the brand, systems, automation and launch assets assembled.', cta: 'Explore Businesses', href: '/businesses' },
    ],
    school: {
        title: 'Learn by building something real.',
        body: 'Phoxta Startup School teaches opportunity discovery, validation, business design and go-to-market through practical lessons connected to your live workspace.',
        cta: 'Start Learning',
        // B p. 20, §9.4
        hero: 'Learn how to discover and build business opportunities.',
        subtext: 'Learn how to identify real customer problems, understand markets, test assumptions, design a business model and launch with evidence — not guesswork.',
    },
    final: {
        title: 'Your next business may start with a problem, a shift or a question.',
        body: 'Discover what is changing, what customers still struggle with and what may be worth building next.', cta: 'Discover Opportunities',
    },
    // B pp. 13–14, §6.1. Structural explanations, never presented as research.
    briefSections: [
        ['Executive thesis', 'What the opportunity is, for whom, and why it may matter now.'],
        ['Problem', 'Specific job, pain, friction, cost or unmet outcome.'],
        ['Target customer', 'Primary ICP plus secondary segments.'],
        ['Context', 'When/where the problem occurs and what triggers it.'],
        ['Current alternatives', 'Products, services, internal processes, spreadsheets, manual work, doing nothing.'],
        ['Why now', 'Technological, regulatory, behavioural, economic or distribution changes.'],
        ['Evidence', 'Observed signals with source, date, geography and confidence.'],
        ['Market structure', 'Value chain, buyer/user distinction, stakeholders, category boundaries.'],
        ['Competitive landscape', 'Direct, indirect, substitute and status-quo alternatives.'],
        ['Business-model hypotheses', 'Who pays, what for, how often, and plausible pricing logic.'],
        ['Distribution hypotheses', 'How the customer could be reached and why that channel may work.'],
        ['Critical assumptions', 'Statements that must be true for the opportunity to become a viable business.'],
        ['Risks', 'Demand, adoption, technical, regulatory, operational, distribution and economic risks.'],
        ['Validation plan', 'Cheapest credible experiments for the highest-risk assumptions.'],
        ['Decision review', 'Proceed, revise, pause or stop — with evidence and unresolved questions.'],
    ],
    // B pp. 30–31, §15 and §15.1
    confidence: [
        ['Hypothesis', 'Reasonable proposition with insufficient direct evidence.'],
        ['Emerging evidence', 'Multiple relevant signals but important uncertainty remains.'],
        ['Supported', 'Meaningful evidence supports the statement in the defined context.'],
        ['Contradicted', 'Evidence materially conflicts with the current assumption.'],
        ['Unknown', 'Phoxta does not have enough information to make a responsible claim.'],
    ],
    trustRules: [
        'Every externally sourced fact should retain source, date and geography.',
        'AI-generated statements should be labelled as hypotheses or synthesis, not evidence.',
        'Market-size estimates should expose assumptions and methodology.',
        'Generated competitors must be verified before being presented as factual entities.',
    ],
    // B pp. 17–18, §8.1 and §8.4
    businesses: {
        title: 'Skip the blank page.', subtitle: 'Start with a business already designed around a researched opportunity.',
        body: 'Explore businesses with the product, brand, workflows, automation, AI systems and launch assets already assembled. Review the opportunity thesis and decide whether the business fits you before you commit.',
        trust: 'A Ready-to-Launch Business is developed infrastructure around an opportunity thesis, not a guaranteed income stream. Every listing should distinguish researched evidence, tested evidence and untested assumptions.',
    },
} as const;
