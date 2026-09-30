import TopicCards from '@/shared/sections/faqs/Section2';
import { MarketingButton, MarketingCard } from './MarketingElements';

export function DiscoveryModesSection() {
    return <TopicCards heading="You need an opportunity worth pursuing." topics={[
        { number: '01', title: 'For me', href: '/app/discover', description: 'Start with your skills, interests and constraints. Understand why an opportunity may fit.', image: '/assets/imgs/pages/img-161.webp' },
        { number: '02', title: 'By industry', href: '/app/discover/industries', description: 'Explore unmet needs, broken workflows and changing economics in a market you know.', image: '/assets/imgs/pages/img-162.webp' },
        { number: '03', title: 'From a problem', href: '/app/discover/problems', description: 'Turn a recurring frustration into a customer problem you can investigate.', image: '/assets/imgs/pages/img-163.webp' },
        { number: '04', title: 'From my idea', href: '/app/discover/my-idea', description: 'Examine the customer, alternatives, assumptions and evidence behind your idea.', image: '/assets/imgs/pages/img-164.webp' },
    ]} />;
}

export function VentureLoopSection() {
    const steps = [
        ['Discover', 'Find opportunities in problems, market shifts, new technology and unmet demand.'],
        ['Investigate', 'Understand the customer, current alternatives and why this may matter now.'],
        ['Validate', 'Identify what must be true. Run tests that produce evidence.'],
        ['Shape', 'Define the offer, positioning, business model and smallest useful solution.'],
        ['Build', 'Prepare the product, brand, workflows and operating assets.'],
        ['Launch', 'Take the offer to customers with a deliberate go-to-market plan.'],
        ['Learn', 'Review what happened. Return to any stage when the evidence changes.'],
    ];
    return <section className="pt-100 pb-100 bg-neutral-50"><div className="container"><div className="row mb-60"><div className="col-lg-8"><p className="text-uppercase fw-600">[ The venture loop ]</p><h2 className="alt-section-title lh-1 mb-20">From curiosity to a business you can launch.</h2><p>Follow the learning. Each stage helps answer a different question; you can revisit any stage.</p></div></div><div className="row g-4">{steps.map(([title, text], i) => <div className="col-lg-4 col-md-6" key={title}><MarketingCard eyebrow={`0${i + 1}`} title={title}><p className="mb-0">{text}</p></MarketingCard></div>)}</div></div></section>;
}

export function SchoolAndBuildSection() {
    return <section className="pt-100 pb-100"><div className="container"><div className="row g-4"><div className="col-lg-6"><MarketingCard eyebrow="[ Build your own ]" title="Follow your opportunity." action={<MarketingButton to="/discover">Start discovering</MarketingButton>}><p>Discover an opportunity, investigate what matters, test your assumptions, and shape a business from what you learn.</p></MarketingCard></div><div className="col-lg-6"><MarketingCard eyebrow="[ Phoxta Startup School ]" title="Learn by building something real." action={<MarketingButton to="/school">Start learning</MarketingButton>}><p>Twelve practical modules connect opportunity discovery, validation, business design and launch to the work in your live opportunity.</p></MarketingCard></div></div></div></section>;
}
