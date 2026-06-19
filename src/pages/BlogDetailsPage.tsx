import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/blog-details/Section1";
import Section2 from "@/shared/sections/blog-details/Section2";

export default function BlogDetailsPage() {
  return (
    <>
      <PageMeta
        title="Insights & Resources — Phoxta Blog"
        description="Guides and insights on owning and operating AI-powered businesses — playbooks, case studies and lessons from the Phoxta marketplace."
        path="/blog-details"
        type="article"
      />
                <Section1 />
                <Section2 />
            
    </>
  );
}
