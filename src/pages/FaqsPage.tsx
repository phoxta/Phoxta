import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/faqs/Section1";
import Section2 from "@/shared/sections/faqs/Section2";
import Section3 from "@/shared/sections/faqs/Section3";
import Section4 from "@/shared/sections/faqs/Section4";

export default function FaqsPage() {
  return (
    <>
      <PageMeta
        title="FAQs — Phoxta"
        description="Answers to common questions about Phoxta: how owning a business works, what's included, pricing, AI features, ownership and support."
        path="/faqs"
      />
                <Section1 />
                <Section2 />
                <Section3 />
                <Section4 />
            
    </>
  );
}
