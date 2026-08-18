import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/faqs/Section1";
import Section2 from "@/shared/sections/faqs/Section2";
import Section3, { FAQ_SECTIONS } from "@/shared/sections/faqs/Section3";
import Section4 from "@/shared/sections/faqs/Section4";

// FAQPage rich-result schema — generated from the same data the page renders.
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_SECTIONS.flatMap((s) => s.items ?? []).map((i) => ({
    "@type": "Question",
    name: i.question,
    acceptedAnswer: { "@type": "Answer", text: i.answer },
  })),
};

export default function FaqsPage() {
  return (
    <>
      <PageMeta
        title="FAQs — Phoxta"
        description="Answers to common questions about Phoxta: how owning a business works, what's included, pricing, AI features, ownership and support."
        path="/faqs"
        jsonLd={FAQ_JSONLD}
      />
                <Section1 />
                <Section2 />
                <Section3 />
                <Section4 />
            
    </>
  );
}
