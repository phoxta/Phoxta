import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/index-1/Section1";
import ProductIntroduction from "@/shared/sections/index-1/ProductIntroduction";
import Section11 from "@/shared/sections/index-1/Section11";
import Section13 from "@/shared/sections/index-1/Section13";
import Pricing from "@/shared/sections/index-2/Section12Pricing";
import Business_Lisiting from "@/shared/sections/index-1/Business_Listing";
import AIOpsShowcase from "@/shared/sections/index-1/AIOpsShowcase";

const PricingTitle = (
  <div className="mg-portfolio-title-wrap phoxta-home-pricing__heading">
    <h2 className="alt-section-title lh-1 mb-15">Operating console pricing.</h2>
    <p className="mg-portfolio-dec mb-0">
      Get access to Phoxta's niche-specific tools, automations, AI infrastructure, and industry innovations.
    </p>
  </div>
);

export default function Home1Page() {
  return (
    <>
      <PageMeta
        title="Phoxta — Discover Business Opportunities"
        description="Find opportunities backed by real market signals. Understand the customer, market and evidence. Then launch with Phoxta's industry specific innovations."
        path="/"
      />
      <Section1 />
      <ProductIntroduction />
      <div id="businesses"><Business_Lisiting /></div>
      <AIOpsShowcase />
      <section className="phoxta-home-pricing">
        <div className="phoxta-home-shell">
          <Pricing titleSlot={PricingTitle} />
        </div>
      </section>
      <Section13 />
      <Section11 classList="phoxta-home-faq" />
    </>
  );
}
