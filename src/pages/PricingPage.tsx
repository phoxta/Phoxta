import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/index-2/Section12";
import Section2 from "@/shared/sections/services-details/Section4";
import Section3 from "@/shared/sections/about-3/Section7";

export default function PricingPage() {
  return (
    <>
      <PageMeta
        title="Pricing — Phoxta"
        description="Simple, transparent pricing for owning an AI-powered business on Phoxta. One monthly subscription per account plus a one-time price per business. No free trial — cancel anytime."
        path="/pricing"
      />
      {/* Top padding clears the transparent, absolutely-positioned header so the
          nav menu sits over a clean band (mirrors the pt-150 hero on other pages). */}
      <div className="pt-150">
        <Section1 showNoise={false} />
        <Section2 />
        <Section3 />
      </div>
    </>
  );
}
