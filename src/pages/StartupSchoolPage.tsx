import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/index-7/Section1"; // Hero
import Section2 from "@/shared/sections/index-7/Section2"; // Why it works (pillars + stats)
import Section6 from "@/shared/sections/index-7/Section6"; // How it works (steps)
import Section7 from "@/shared/sections/index-7/Section7"; // CTA
import Section8 from "@/shared/sections/index-7/Section8"; // Instructors & mentors
import Section11 from "@/shared/sections/index-7/Section11"; // Enroll form
import Section12 from "@/shared/sections/index-7/Section12"; // What you'll learn (syllabus)
import Section13 from "@/shared/sections/index-7/Section13"; // Who it's for (audience)
import Section14 from "@/shared/sections/index-7/Section14"; // Student testimonials
import Section15 from "@/shared/sections/index-7/Section15"; // FAQ

// "Startup School" solution page (Solutions dropdown) — Phoxta's founder
// education program. Rebuilt from the best-fit studio section templates:
// hero (full-bleed under the transparent light header) → why it works → syllabus
// → how it works → who it's for → instructors → testimonials → FAQ → CTA →
// enroll. The image-slider, mission/locations, accordion, keyword-marquee and
// blog sections were dropped for a tighter, conversion-focused page.
export default function StartupSchoolPage() {
  return (
    <>
      <PageMeta title="Startup School — Phoxta" path="/startup-school" />
      <Section1 />
      <Section2 />
      <Section12 />
      <Section6 />
      <Section13 />
      <Section8 />
      <Section14 />
      <Section15 />
      <Section7 />
      <Section11 />
    </>
  );
}
