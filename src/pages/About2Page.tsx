import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/about-2/Section1";
import Section2 from "@/shared/sections/about-2/Section2";
import Section3 from "@/shared/sections/about-2/Section3";
import Section4 from "@/shared/sections/about-2/Section4";
import Section5 from "@/shared/sections/about-2/Section5";
import Section6 from "@/shared/sections/about-1/Section4";

export default function About2Page() {
  return (
    <>
      <PageMeta
        title="About Phoxta — How owning a ready-to-run business works"
        description="Learn how Phoxta lets you buy a validated, AI-powered business and operate it from day one — the model, the technology, and the team behind it."
        path="/about-2"
      />
                <Section1 />
                <Section2 />
                <Section3 />
                <Section4 />
                <Section5 />
                <Section6 />
            
    </>
  );
}
