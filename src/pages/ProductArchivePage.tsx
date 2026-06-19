import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/product/Section1";
import Section2 from "@/shared/sections/product/Section2";
import Section3 from "@/shared/sections/product/Section3";
import Section4 from "@/shared/sections/product/Section4"
import Section5 from "@/shared/sections/index-5/Section8";

export default function ProductArchivePage() {
  return (
    <>
      <PageMeta
        title="Marketplace — Browse AI-powered businesses for sale | Phoxta"
        description="Browse Phoxta's marketplace of validated, AI-powered businesses for sale across e-commerce, local services, content, SaaS and more. Find one and make it yours."
        path="/product-archive"
      />
                <Section1 />
                <Section2 />
                <Section3 classList="bg-neutral-50" />
                <Section4 />
                <Section5 />
            
    </>
  );
}
