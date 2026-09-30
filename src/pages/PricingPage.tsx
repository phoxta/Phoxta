import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/index-2/Section12";

export default function PricingPage() {
  return (
    <>
      <PageMeta
        title="Pricing — Phoxta"
        description="Operating Console pricing and plans."
        path="/pricing"
      />
      {/* Top padding clears the transparent, absolutely-positioned header so the
          nav menu sits over a clean band (mirrors the pt-150 hero on other pages). */}
      <div className="pt-150">
        <Section1 showNoise={false} />
      </div>
    </>
  );
}
