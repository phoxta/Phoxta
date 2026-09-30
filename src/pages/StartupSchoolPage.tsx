import PageMeta from "@/seo/PageMeta";
import Section16 from "@/shared/sections/index-7/Section16";
import Section13 from "@/shared/sections/index-7/Section13";
import Section15 from "@/shared/sections/index-7/Section15";
import Section7 from "@/shared/sections/index-7/Section7";
import Section11 from "@/shared/sections/index-7/Section11";
import LearningCards from "@/shared/sections/startup-school/LearningCards";

export default function StartupSchoolPage() {
  return (
    <>
      <PageMeta
        title="Startup School | Practical business education | Phoxta"
        description="Learn how to find customers, shape an offer, launch well and run an AI-native business with practical work from the first lesson."
        path="/startup-school"
      />
      <div className="phoxta-startup-school">
        <LearningCards />
        <Section16 />
        <Section13 />
        <Section7 />
        <Section15 />
        <Section11 />
      </div>
    </>
  );
}
