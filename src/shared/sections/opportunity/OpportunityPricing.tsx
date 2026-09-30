import Pricing from '@/shared/sections/index-2/Section12Pricing';
import { useLoad } from '@/components/opportunities/UI';
import { plans } from '@/lib/opportunities/repository';
import { MarketingStatus } from './MarketingElements';

export default function OpportunityPricing() {
    const state = useLoad(plans, 'public-plans');
    return <><MarketingStatus {...state} retry={state.reload} />{state.data && <Pricing titleSlot={<div className="mg-portfolio-title-wrap"><h2 className="alt-section-title lh-1 mb-15">Start with curiosity. Add depth as you go.</h2><p className="mg-portfolio-dec mb-0">Start free, then choose the research depth and workspace capacity you need. Business packages and cohort services are separate.</p></div>} plans={state.data.map(plan => ({
        key: plan.plan_key,
        title: plan.label,
        priceClass: 'text-price-starter',
        monthlyPrice: plan.monthly_gbp === 0 ? 'Free' : `£${plan.monthly_gbp}`,
        desc: ({ free: 'Find a place to start.', explorer: 'Investigate with more depth.', builder: 'Turn your learning into a business.', studio: 'Build together across ventures.' } as Record<string, string>)[plan.plan_key] ?? '',
        btnText: plan.plan_key === 'free' ? 'Start free' : `Explore ${plan.label}`,
        href: plan.plan_key === 'free' ? '/signup' : '/app/settings/billing',
        popular: false,
        features: [
            `${plan.limits.active} active opportunities`,
            `${plan.limits.research} deep research jobs per month`,
            `${plan.limits.evidence} evidence items per opportunity`,
            plan.limits.experiments === null ? 'Experiments with fair-use limits' : `${plan.limits.experiments} experiments${plan.limits.experiment_period === 'month' ? ' per month' : ' in total'}`,
            `${plan.limits.seats} ${plan.limits.seats === 1 ? 'seat' : 'seats'}`,
        ],
    }))} />}{!state.loading && !state.error && state.data?.length === 0 && <p>Plan details are being prepared. You can still <a href="/signup">create an account</a>.</p>}</>;
}
