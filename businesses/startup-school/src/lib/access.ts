export const ACCESS_PLANS = {
    self_study: {
        name: "Self-study",
        price: 250,
        description: "Learn at your pace with the full curriculum, founder toolkits and practical templates.",
        features: ["One year of course access", "Founder toolkits and templates", "Venture workspace and AI adviser", "Progress tracking and certificates"],
    },
    cohort: {
        name: "Cohort",
        price: 1200,
        description: "Learn with a cohort, live teaching and mentor support around the work you are doing.",
        features: ["Everything in Self-study", "Instructor-led live classes", "Weekly mentoring; up to 3 sessions a week", "Cohort community and peer feedback"],
    },
    launch: {
        name: "Launch",
        price: 5000,
        description: "A supported launch path with the cohort experience, investor network and a Phoxta business ready to make your own.",
        features: ["Everything in Cohort", "Access to the investor network", "Your choice of live Phoxta business", "3 months of Operating Console included", "Launch concierge and handover"],
    },
} as const;

export type AccessPlan = keyof typeof ACCESS_PLANS;
export type AccessFeature = "self_study" | "cohort" | "launch";

export const PLAN_RANK: Record<AccessPlan, number> = { self_study: 1, cohort: 2, launch: 3 };

export function canAccess(plan: AccessPlan | null | undefined, feature: AccessFeature): boolean {
    return Boolean(plan && PLAN_RANK[plan] >= PLAN_RANK[feature]);
}

export function formatFee(price: number): string {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(price);
}
