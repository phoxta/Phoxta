import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/contact-1/Section1";
import Section2 from "@/shared/sections/about-2/Section4";

export default function Contact1Page() {
  return (
    <>
      <PageMeta
        title="Contact Phoxta — Talk to our team"
        description="Questions about owning a Phoxta business? Get in touch with our team about blueprints, onboarding, pricing and partnerships."
        path="/contact-1"
      />
            <Section1 />
            <Section2 />
        
    </>
  );
}
