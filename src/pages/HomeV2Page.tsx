import PageMeta from "@/seo/PageMeta";
// Home v2 — a fresh, conversion-led homepage composition for review at /home-v2
// before it (optionally) replaces the live homepage. Studio UI only: the hero,
// how-it-works, marketplace showcase and closing CTA are in src/shared/sections/
// home-v2; the rest reuse the already-on-brand index-1 blocks in a best-practice
// information order. noindex while it's a preview.
import Hero from "@/shared/sections/home-v2/Hero";
import HowItWorks from "@/shared/sections/home-v2/HowItWorks";
import Marketplace from "@/shared/sections/home-v2/Marketplace";
import FinalCta from "@/shared/sections/home-v2/FinalCta";
// Reused, already-Phoxta-branded studio blocks
import Stats from "@/shared/sections/index-1/Section8"; // proof strip
import WhatIsPhoxta from "@/shared/sections/index-1/Section2";
import WhatYouGet from "@/shared/sections/index-1/Section4";
import WhyPhoxta from "@/shared/sections/index-1/Section7";
import Testimonials from "@/shared/sections/index-1/Section6";
import Faq from "@/shared/sections/index-1/Section11";
import Blog from "@/shared/sections/index-1/Section13";
import Pricing from "@/shared/sections/index-2/Section12Pricing";

const PricingTitle = (
    <div className="mg-portfolio-title-wrap">
        <h2 className="alt-section-title lh-1 mb-15">Simple, transparent pricing</h2>
        <p className="mg-portfolio-dec mb-0">
            Start small, then grow. Own one business or a whole portfolio &mdash; billed monthly or yearly.
        </p>
    </div>
);

export default function HomeV2Page() {
    return (
        <>
            <PageMeta
                title="Phoxta — Own a validated, AI-powered business (preview)"
                description="Pick a vetted, AI-powered business, make it your own, and go live in days. Preview of the rebuilt Phoxta homepage."
                path="/home-v2"
                noindex
            />

            {/* 1 — Hero (single hero + dual CTA) */}
            <Hero />
            {/* 2 — Proof strip (key metrics, above the fold) */}
            <Stats />
            {/* 3 — What is Phoxta (positioning) */}
            <WhatIsPhoxta />
            {/* 4 — How it works (the 4-step funnel) */}
            <HowItWorks />
            {/* 5 — What you get (value props) */}
            <WhatYouGet />
            {/* 6 — The marketplace (product showcase, fixed public links) */}
            <Marketplace />
            {/* 7 — Why Phoxta (differentiators) */}
            <WhyPhoxta />
            {/* 8 — Testimonials (social proof) */}
            <Testimonials />
            {/* 9 — Pricing (transparent tiers) */}
            <section className="pt-120 pb-120 bg-neutral-50">
                <div className="container">
                    <Pricing titleSlot={PricingTitle} />
                </div>
            </section>
            {/* 10 — FAQ (objection handling) */}
            <Faq />
            {/* 11 — Final CTA (responsive, visible on mobile) */}
            <FinalCta />
            {/* 12 — From the blog */}
            <Blog />
        </>
    );
}
