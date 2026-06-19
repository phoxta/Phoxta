import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/services-1/Section1";
import Section2 from "@/shared/sections/index-3/Section9";
import Section3 from "@/shared/sections/index-5/Section7";

export default function TeamPage() {
  return (
    <>
      <PageMeta
        title="Our Team — Phoxta"
        description="Meet the team building Phoxta — the marketplace for owning validated, AI-powered businesses."
        path="/team"
      />
                <Section1 />
                <Section2 />
                <Section3 />
            
    </>
  );
}
