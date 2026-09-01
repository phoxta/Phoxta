import PageMeta from "@/seo/PageMeta";
import Hero from "@/shared/sections/portfolio-femi/Hero";
import Clients from "@/shared/sections/portfolio-femi/Clients";
import About from "@/shared/sections/portfolio-femi/About";
import Work from "@/shared/sections/portfolio-femi/Work";
import Capabilities from "@/shared/sections/portfolio-femi/Capabilities";
import Experience from "@/shared/sections/portfolio-femi/Experience";
import Skills from "@/shared/sections/portfolio-femi/Skills";
import Credentials from "@/shared/sections/portfolio-femi/Credentials";
import Contact from "@/shared/sections/portfolio-femi/Contact";
import { PROFILE, PORTFOLIO_URL } from "@/shared/portfolio/portfolioData";

const PERSON_JSONLD = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    alternateName: PROFILE.shortName,
    jobTitle: "Product Designer",
    description: PROFILE.lede,
    url: PORTFOLIO_URL,
    email: `mailto:${PROFILE.email}`,
    telephone: PROFILE.phone,
    address: { "@type": "PostalAddress", addressLocality: "Birmingham", addressCountry: "GB" },
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
                title="Femi Adeyemi — Product Designer"
                description="Oluwafemi Adeyemi is a product designer with 7+ years taking software from research and systems to shipped, production-ready interfaces — with hands-on front-end in React, Next.js and TypeScript."
                canonicalUrl={PORTFOLIO_URL}
                image="/assets/imgs/pages/img-101.webp"
                jsonLd={PERSON_JSONLD}
            />
            <Hero />
            <Clients />
            <About />
            <Work />
            <Capabilities />
            <Experience />
            <Skills />
            <Credentials />
            <Contact />
        </>
    );
}
