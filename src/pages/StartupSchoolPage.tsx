import PageMeta from "@/seo/PageMeta";
import Section2 from "@/shared/sections/index-7/Section2";
import Section3 from "@/shared/sections/index-7/Section3";
import Section4 from "@/shared/sections/index-7/Section4";
import Section5 from "@/shared/sections/index-7/Section5";
import Section6 from "@/shared/sections/index-7/Section6";
import Section7 from "@/shared/sections/index-7/Section7";
import Section8 from "@/shared/sections/index-7/Section8";
import Section9 from "@/shared/sections/index-7/Section9";
import Section10 from "@/shared/sections/index-7/Section10";
import Section11 from "@/shared/sections/index-7/Section11";

// "Startup School" solution page (Solutions dropdown) — Phoxta's founder
// education program. Hero removed; the header here is transparent, so pt-150
// clears it for the first content section.
export default function StartupSchoolPage() {
  return (
    <>
      <PageMeta title="Startup School — Phoxta" path="/startup-school" />
      <div className="pt-150">
        <Section2 />
        <Section3 />
        <Section4 />
        <Section5 />
        <Section6 />
        <Section7 />
        <Section8 />
        <Section9 />
        <Section10 />
        <Section11 />
      </div>
    </>
  );
}
