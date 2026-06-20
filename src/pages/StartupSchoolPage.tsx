import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/index-7/Section1"; // Hero — hook + promise + CTA
import Section16 from "@/shared/sections/index-7/Section16"; // Why it works — value pillars + proof
import Section12 from "@/shared/sections/index-7/Section12"; // What you'll learn — the offer (syllabus)
import Section6 from "@/shared/sections/index-7/Section6"; // How it works — the steps
import Section13 from "@/shared/sections/index-7/Section13"; // Who it's for — qualify
import Section8 from "@/shared/sections/index-7/Section8"; // Instructors & mentors — authority
import Section14 from "@/shared/sections/index-7/Section14"; // Testimonials — social proof
import Section15 from "@/shared/sections/index-7/Section15"; // FAQ — objection handling
import Section7 from "@/shared/sections/index-7/Section7"; // CTA — the ask
import Section11 from "@/shared/sections/index-7/Section11"; // Enroll form — capture

// "Startup School" solution page (Solutions dropdown) — Phoxta's founder
// education program. Composed from the best-fit studio section templates and
// ordered as a sales funnel:
//   hook (hero) → why it works + proof → the offer (syllabus) → how it works →
//   who it's for → authority (instructors) → social proof (testimonials) →
//   objections (FAQ) → the ask (CTA) → capture (enroll).
export default function StartupSchoolPage() {
  return (
    <>
      <PageMeta title="Startup School — Phoxta" path="/startup-school" />
      <Section1 />
      <Section16 />
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
