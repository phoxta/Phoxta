import PageMeta from "@/seo/PageMeta";
import Section2 from "@/shared/sections/index-4/Section2";
import Section3 from "@/shared/sections/index-4/Section3";
import Section5 from "@/shared/sections/index-4/Section5";
import Section7 from "@/shared/sections/index-4/Section7";
import Section8 from "@/shared/sections/index-4/Section8";

// "Phoxta AI & Tech" solution page (Solutions dropdown). Hero section removed;
// top padding keeps the first content section clear of the header.
export default function AiTechPage() {
  return (
    <>
      <PageMeta
        title="AI for existing teams — Phoxta"
        description="Find one workflow worth improving, define safe AI boundaries, and test it against real work."
        path="/ai-tech"
      />
      <div className="pt-100">
        <Section2 />
        <Section3 />
        <Section5 />
        <Section7 />
        <Section8 />
      </div>
    </>
  );
}
