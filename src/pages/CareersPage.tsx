import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/careers/Section1";
import Section2 from "@/shared/sections/careers/Section2";

export default function CareersPage() {
  return (
    <>
      <PageMeta
        title="Careers — Build the future of business ownership at Phoxta"
        description="Join Phoxta and help thousands of people own and run AI-powered businesses. Explore open roles across engineering, design, growth and operations."
        path="/careers"
      />
      <Section1 />
      <Section2 />
    </>
  );
}
