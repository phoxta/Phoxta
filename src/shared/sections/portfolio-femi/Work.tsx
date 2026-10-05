import { Link } from "react-router-dom";
import { PROJECTS, responsiveSrcSet } from "@/shared/portfolio/portfolioData";
import { workPath } from "@/shared/portfolio/nav";

const ARROW = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const featured = [
    {
        slug: "phoxta",
        index: "01",
        label: "AI SaaS · Live product",
        title: "Designing one operating system for launching and running a business.",
        summary: "I set the product direction and designed the marketplace, multi-tenant operations console, CRM and agent workflows as one coherent system, then helped ship the front end.",
        role: "Founder & Lead Product Designer",
        scope: "Strategy, research, IA, interaction design, design system, front end",
        evidence: "A production platform with seven launchable business blueprints on a shared operating model.",
        projectSlug: "phoxta",
    },
    {
        slug: "northern-light",
        index: "02",
        label: "Enterprise operations · Client engagement",
        title: "Northern Light: making employee and manager approvals clearer.",
        summary: "I mapped employee and manager journeys, designed role-based dashboards for timesheets, expenses and approvals, and built the secure responsive application from prototype to production.",
        role: "Product Designer & Software Engineer",
        scope: "Journey mapping, workflow design, prototyping, UI, accessibility, delivery",
        evidence: "Designed for an organisation of about 15,000 staff, with Microsoft Entra ID and row-level permissions shaping the experience.",
        projectSlug: null,
    },
    {
        slug: "coir-six",
        index: "03",
        label: "Learning product · Product design",
        title: "Helping self-paced learners understand what to do next at a glance.",
        summary: "I turned progress, lessons, mentors and schedules into one calm learner home, then defined the responsive behaviour and reusable visual system behind it.",
        role: "Product Designer",
        scope: "Product framing, information hierarchy, interaction design, responsive system",
        evidence: "A complete desktop-to-mobile learning system with documented component and data-visualisation patterns.",
        projectSlug: "coir-six",
    },
] as const;

const secondarySlugs = ["ferne", "saveur", "wamwam", "technest"];

function ConfidentialVisual() {
    return (
        <div className="pf2-confidential" aria-label="Abstract representation of a role-based approval workflow">
            <span className="pf2-confidential__tag">Northern Light · Workflow illustration</span>
            <div className="pf2-flow">
                <div><span>Employee</span><strong>Submit expense</strong></div>
                <i aria-hidden="true">→</i>
                <div><span>Manager</span><strong>Review context</strong></div>
                <i aria-hidden="true">→</i>
                <div><span>Finance</span><strong>Approve & audit</strong></div>
            </div>
            <p>Role-based information · Clear status · Secure by design</p>
        </div>
    );
}

export default function Work() {
    const additional = secondarySlugs
        .map((slug) => PROJECTS.find((project) => project.slug === slug))
        .filter((project): project is NonNullable<typeof project> => Boolean(project));

    return (
        <section id="work" className="pf2-work">
            <div className="container-2200 px-3 px-lg-4">
                <div className="pf2-section-head">
                    <div>
                        <p className="pf2-kicker pf2-kicker--dark"><span aria-hidden="true" /> Selected work</p>
                        <h2>Product thinking, decisions and delivery.</h2>
                    </div>
                    <p>Three projects that show how I work across ambiguity, complex systems and the final mile to production.</p>
                </div>

                <div className="pf2-featured-list">
                    {featured.map((item, position) => {
                        const project = item.projectSlug ? PROJECTS.find((entry) => entry.slug === item.projectSlug) : null;
                        const visual = project ? (
                            <Link to={workPath(project.slug)} className="pf2-featured__visual" aria-label={`View ${project.name} case study`}>
                                <img
                                    src={project.image}
                                    srcSet={responsiveSrcSet(project.image)}
                                    sizes="(max-width: 991px) 100vw, 52vw"
                                    alt={`${project.name} product interface`}
                                    width={1600}
                                    height={1000}
                                    loading={position === 0 ? "eager" : "lazy"}
                                />
                            </Link>
                        ) : <ConfidentialVisual />;

                        return (
                            <article key={item.slug} className={`pf2-featured${position % 2 ? " pf2-featured--reverse" : ""}`}>
                                <div className="pf2-featured__content">
                                    <div className="pf2-featured__topline"><span>{item.index}</span><span>{item.label}</span></div>
                                    <h3>{item.title}</h3>
                                    <p className="pf2-featured__summary">{item.summary}</p>
                                    <dl className="pf2-featured__facts">
                                        <div><dt>My role</dt><dd>{item.role}</dd></div>
                                        <div><dt>Scope</dt><dd>{item.scope}</dd></div>
                                        <div><dt>Evidence</dt><dd>{item.evidence}</dd></div>
                                    </dl>
                                    {item.projectSlug ? (
                                        <Link to={workPath(item.projectSlug)} className="pf2-text-link">Read the case study {ARROW}</Link>
                                    ) : (
                                        <a href="mailto:adeyemioluwafemi2018@gmail.com?subject=Northern%20Light%20case%20study" className="pf2-text-link">Request a private walkthrough {ARROW}</a>
                                    )}
                                </div>
                                {visual}
                            </article>
                        );
                    })}
                </div>

                <div className="pf2-more">
                    <div className="pf2-more__head">
                        <h3>Additional work</h3>
                        <p>Explore complete commerce journeys, booking experiences and visual systems.</p>
                    </div>
                    <div className="pf2-more__grid">
                        {additional.map((project) => (
                            <Link key={project.slug} to={workPath(project.slug)} className="pf2-more-card">
                                <div className="pf2-more-card__image">
                                    <img src={project.image} srcSet={responsiveSrcSet(project.image)} sizes="(max-width: 767px) 100vw, 50vw" alt="" width={960} height={600} loading="lazy" />
                                </div>
                                <div className="pf2-more-card__copy">
                                    <span>{project.kicker}</span>
                                    <h4>{project.name}</h4>
                                    <p>{project.blurb}</p>
                                    <strong>View project {ARROW}</strong>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
