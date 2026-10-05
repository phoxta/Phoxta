import PageMeta from "@/seo/PageMeta";
import Hero from "@/shared/sections/portfolio-femi/Hero";
import About from "@/shared/sections/portfolio-femi/About";
import Work from "@/shared/sections/portfolio-femi/Work";
import Approach from "@/shared/sections/portfolio-femi/Approach";
import Experience from "@/shared/sections/portfolio-femi/Experience";
import Contact from "@/shared/sections/portfolio-femi/Contact";
import { PROFILE, PORTFOLIO_URL } from "@/shared/portfolio/portfolioData";

const PERSON_JSONLD = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    alternateName: PROFILE.shortName,
    jobTitle: "Senior Product Designer",
    description: PROFILE.lede,
    url: PORTFOLIO_URL,
    email: `mailto:${PROFILE.email}`,
    address: { "@type": "PostalAddress", addressCountry: "GB" },
    knowsAbout: [
        "Product Design",
        "UX Research",
        "Design Systems",
        "Interaction Design",
        "Prototyping",
        "Front-end Development",
    ],
    worksFor: { "@type": "Organization", name: "Phoxta" },
    alumniOf: [
        { "@type": "CollegeOrUniversity", name: "Ulster University" },
        { "@type": "CollegeOrUniversity", name: "University of Ibadan" },
    ],
};

export default function PortfolioPage() {
    return (
        <>
            <PageMeta
                title="Femi Adeyemi — Senior Product Designer"
                description="Femi Adeyemi is a senior product designer working across AI SaaS, enterprise workflows and consumer products, from problem framing to shipped experiences."
                canonicalUrl={PORTFOLIO_URL}
                image={`${PORTFOLIO_URL}assets/imgs/portfolio/og-card.png`}
                siteName={PROFILE.shortName}
                twitterHandle={null}
                jsonLd={PERSON_JSONLD}
            />
            <Hero />
            <Work />
            <Approach />
            <About />
            <Experience />
            <Contact />
        </>
    );
}
