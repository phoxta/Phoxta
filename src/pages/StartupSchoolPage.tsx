import PageMeta from "@/seo/PageMeta";
import Section2 from "@/shared/sections/index-7/Section2";
import Section4 from "@/shared/sections/index-7/Section4";
import Section5 from "@/shared/sections/index-7/Section5";
import Section6 from "@/shared/sections/index-7/Section6";
import Section7 from "@/shared/sections/index-7/Section7";
import Section8 from "@/shared/sections/index-7/Section8";
import Section10 from "@/shared/sections/index-7/Section10";
import Section11 from "@/shared/sections/index-7/Section11";
import Section12 from "@/shared/sections/index-7/Section12"; // What you'll learn (syllabus)
import Section13 from "@/shared/sections/index-7/Section13"; // Who it's for (audience)
import Section14 from "@/shared/sections/index-7/Section14"; // Student testimonials
import Section15 from "@/shared/sections/index-7/Section15"; // FAQ

// "Startup School" solution page (Solutions dropdown) — Phoxta's founder
// education program. Hero removed; the header here is transparent, so pt-150
// clears it for the first content section. Filler sections (image slider,
// keyword marquee) were dropped. Sections flow as a funnel:
// intro → community → how it works → syllabus → steps → who it's for → CTA →
// instructors → testimonials → resources → FAQ → enroll.
export default function StartupSchoolPage() {
  return (
    <>
      <PageMeta title="Startup School — Phoxta" path="/startup-school" />
      <div className="pt-150">
        <Section2 />
        <Section4 />
        <Section5 />
        <Section12 />
        <Section6 />
        <Section13 />
        <Section7 />
        <Section8 />
        <Section14 />
        <Section10 />
        <Section15 />
        <Section11 />
      </div>
    </>
  );
}
