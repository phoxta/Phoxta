// Canonical platform subscription plans — the single source of truth for the
// monthly fee shown on the pricing page, the billing page, and each business
// detail page. Prices mirror the in-app billing plans and the real per-plan AI
// token allowances (MONTHLY_TOKEN_CAP in the backend).
export type PlatformPlan = {
  key: "starter" | "growth" | "scale";
  name: string;
  priceMonthly: number; // USD / month, billed monthly
  blurb: string;
  features: string[];
  popular?: boolean;
};

export const PLATFORM_PLANS: PlatformPlan[] = [
  {
    key: "starter",
    name: "Starter",
    priceMonthly: 75,
    blurb: "Launch your first AI-powered business.",
    features: ["1 business", "AI agent on every channel", "Full operating console", "200K AI tokens / month"],
  },
  {
    key: "growth",
    name: "Growth",
    priceMonthly: 250,
    blurb: "Grow on your own brand and domain.",
    features: ["Up to 3 businesses", "Your own custom domain", "1M AI tokens / month", "Proactive automations"],
    popular: true,
  },
  {
    key: "scale",
    name: "Scale",
    priceMonthly: 1500,
    blurb: "Run multiple businesses with a team.",
    features: ["Up to 10 businesses", "5M AI tokens / month", "Outbound & call-center agent", "Team seats"],
  },
];

/** Lowest monthly plan price — for "from $X/mo" copy. */
export const PLAN_STARTING_PRICE = Math.min(...PLATFORM_PLANS.map((p) => p.priceMonthly));
