import PageMeta from "@/seo/PageMeta";
import ServiceImageHoverEffect from "@/shared/effects/ServiceImageHoverEffect";
import Section1 from "@/shared/sections/index-1/Section1";
import Section2 from "@/shared/sections/index-1/Section2";
import Section3 from "@/shared/sections/index-1/Section3";
import Section4 from "@/shared/sections/index-1/Section4";
import Section5 from "@/shared/sections/index-1/Section5";
import Section6 from "@/shared/sections/index-1/Section6";
import Section7 from "@/shared/sections/index-1/Section7";
import Section8 from "@/shared/sections/index-1/Section8";
import Section10 from "@/shared/sections/index-1/Section10";
import Section11 from "@/shared/sections/index-1/Section11";
import Section12 from "@/shared/sections/index-1/Section12";
import Section13 from "@/shared/sections/index-1/Section13";
import Pricing from "@/shared/sections/index-2/Section12Pricing";

const PricingTitle = (
  <div className="mg-portfolio-title-wrap">
    <h2 className="alt-section-title lh-1 mb-15">Simple, transparent pricing</h2>
    <p className="mg-portfolio-dec mb-0">
      Start small, then grow. Own one business or a whole portfolio &mdash; billed monthly or yearly.
    </p>
  </div>
);

export default function Home1Page() {
  return (
    <>
      <PageMeta
        title="Phoxta — Own a validated, AI-powered business"
        description="Phoxta is a marketplace of validated, AI-powered businesses you can own and run from day one. Pick a business, make it yours, and go from launch to revenue in days — not months."
        path="/"
      />
                <Section1 />
                <Section2 />
                <Section3 />
                <ServiceImageHoverEffect>
                    <Section4 />
                </ServiceImageHoverEffect>
                <Section5 />
                <Section6 />
                <Section7 />
                <Section8 />
                <Section10 />
                <section className="pt-120 pb-120 bg-neutral-50">
                    <div className="container">
                        <Pricing titleSlot={PricingTitle} />
                    </div>
                </section>
                <Section11 />
                <Section12 />
                <Section13 />
            
    </>
  );
}
