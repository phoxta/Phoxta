import { BRAND_COPY } from "@/lib/opportunities/brandCopy";
const LEARN_URL = "https://learn.phoxta.com";

const PATHS = [
    {
        id: "learn",
        number: "01",
        title: "Learn",
        accent: "the essentials",
        body: "Understand opportunity thinking, customers, markets and alternatives.",
        image: "/assets/imgs/pages/startup-school/hero-learn-books-v2.png",
        alt: "A stack of books titled Ideas, Strategy, Validation, Growth and Launch",
    },
    {
        id: "build",
        number: "02",
        title: "Get",
        accent: "real guidance",
        body: "Test critical assumptions through exercises in your live workspace.",
        image: "/assets/imgs/pages/startup-school/hero-guidance-founder-v2.png",
        alt: "Founder considering her next business move at a laptop",
    },
    {
        id: "launch",
        number: "03",
        title: "Launch",
        accent: "with evidence",
        body: "Turn your ideas into real opportunities and build what’s next.",
        image: "/assets/imgs/pages/startup-school/hero-launch-building-v2.png",
        alt: "Modern black and orange building carrying the message Bigger Ideas Brighter Tomorrow",
    },
];

const Arrow = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PathIcon = ({ number }: { number: string }) => {
    if (number === "01") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V11m7 8V5m7 14v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    if (number === "02") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 20c.4-3.6 2.2-5.4 5.5-5.4s5.1 1.8 5.5 5.4M17.5 5.5a3.2 3.2 0 0 1 0 6.1M17.2 14.7c2 .2 3.2 1.8 3.3 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 4c3.7.1 6.3 2.1 7 6.4L14.6 16l-3.2-3.2L17 7.2M9.7 14.3 6 18m2 2-2-2m3.4-7.8 2.4 2.4M6.7 8.4l-2.1-2.1m.1 5.2-2.7.1M12 19.3l.1 2.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

/** The public programme entry point. The learning product itself starts at
 * learn.phoxta.com, while this page gives visitors a concise view of the paths. */
export default function SchoolHero() {
    return (
        <section className="phoxta-school-hero" aria-labelledby="school-hero-title">
            <div className="phoxta-school-hero__frame">
                <div className="phoxta-school-hero__surface">

                    <div className="phoxta-school-hero__intro">
                        <h1 id="school-hero-title">Startup School</h1>
                        <p>{BRAND_COPY.school.hero} {BRAND_COPY.school.subtext}</p>
                    </div>

                    <div className="phoxta-school-hero__paths">
                        {PATHS.map((path) => (
                            <a id={`school-path-${path.id}`} key={path.number} href={LEARN_URL} className="phoxta-school-hero__path">
                                <span className="phoxta-school-hero__number">{path.number}</span>
                                <span className="phoxta-school-hero__icon"><PathIcon number={path.number} /></span>
                                <h2>{path.title} <em>{path.accent}</em></h2>
                                <p>{path.body}</p>
                                <span className="phoxta-school-hero__image">
                                    <img src={path.image} alt={path.alt} loading="eager" />
                                    <i><Arrow /></i>
                                </span>
                            </a>
                        ))}
                    </div>

                    <footer className="phoxta-school-hero__footer">
                        <a href={LEARN_URL}>Start learning <Arrow /></a>
                    </footer>
                </div>
            </div>
        </section>
    );
}
