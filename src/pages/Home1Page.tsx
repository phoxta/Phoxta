import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/index-1/Section1";
import Section2 from "@/shared/sections/index-1/Section2";
import Section10 from "@/shared/sections/index-1/Section10";
import Section11 from "@/shared/sections/index-1/Section11";
import Section13 from "@/shared/sections/index-1/Section13";
import Pricing from "@/shared/sections/index-2/Section12Pricing";
import AI_Features from "@/shared/sections/index-1/AI_Features";
import Business_Lisiting from "@/shared/sections/index-1/Business_Listing";

const PricingTitle = (
  <div className="mg-portfolio-title-wrap">
    <h2 className="alt-section-title lh-1 mb-15">Operating Console Pricing</h2>
    <p className="mg-portfolio-dec mb-0">
      Billed monthly or yearly.
    </p>
  </div>
);

export default function Home1Page() {
  return (
    <>
      <PageMeta
        title="Phoxta — Own a business that already works."
        description="Pick a validated, AI-powered business, make it your own, and go live in minutes — not days."
        path="/"
      />
                <Section1 />
                <Section2 />
                <Business_Lisiting />
                <Section10 />
                <AI_Features />
                <section className="pt-120 pb-120 bg-neutral-50">
                    <div className="container">
                        <Pricing titleSlot={PricingTitle} />
                    </div>
                </section>
                <Section13 />
                <Section11 />
            
    </>
  );
}
