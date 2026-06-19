import PageMeta from "@/seo/PageMeta";
import Section2 from "@/shared/sections/index-4/Section2";
import Section3 from "@/shared/sections/index-4/Section3";
import Section4 from "@/shared/sections/index-4/Section4";
import Section5 from "@/shared/sections/index-4/Section5";
import Section6 from "@/shared/sections/index-4/Section6";
import Section7 from "@/shared/sections/index-4/Section7";
import Section8 from "@/shared/sections/index-4/Section8";

// "Phoxta AI & Tech" solution page (Solutions dropdown). Hero section removed;
// top padding keeps the first content section clear of the header.
export default function AiTechPage() {
  return (
    <>
      <PageMeta title="AI & Technology — Phoxta" path="/ai-tech" />
      <div className="pt-100">
        <Section2 />
        <Section3 />
        <Section4 />
        <Section5 />
        <Section6 />
        <Section7 />
        <Section8 />
      </div>
    </>
  );
}
