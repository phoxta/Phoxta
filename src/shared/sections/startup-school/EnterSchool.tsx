import { Link } from "react-router-dom";

// The way into the actual school.
//
// Everything else on /startup-school sells the programme. This is the one band
// that lets a person who has already joined get straight in, and lets everyone
// else see that the thing being sold genuinely exists. The school is its own
// application on its own subdomain, so this is an external link, not a route.
//
// The free Founder Toolkit sits beside it on purpose: it is the same curriculum
// as self-serve tools, and it is the honest answer for someone who is not ready
// to pay for a cohort.

const SCHOOL_URL = "https://learn.phoxta.com";

const ARROW = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const FACTS = [
    { n: "Choose", label: "whether you will build, use a Phoxta turnkey business or combine both paths" },
    { n: "Test", label: "a customer, offer or operating assumption with a focused proof loop" },
    { n: "Improve", label: "your venture record with the evidence from work that actually happened" },
];

export default function EnterSchool() {
    return (
        <section className="sec-ss-enter pt-120 pb-120 bg-neutral-50 overflow-hidden">
            <div className="container">
                <div className="row align-items-center g-4 g-xxl-5">
                    <div className="col-lg-6 col-12">
                        <span className="d-inline-block mb-20 fz-font-label neutral-500 text-uppercase at_fade_anim">
                            [ ALREADY ENROLLED ]
                        </span>
                        <h2 className="fz-font-3xl fw-500 mb-20 at_fade_anim" data-delay=".1">
                            The school is open
                        </h2>
                        <p className="fz-body neutral-500 mb-30 at_fade_anim" data-delay=".2">
                            Your courses, proof loop, live classroom and mentor support live in the school itself. Sign in to pick up the next decision that moves your venture forward.
                        </p>

                        <div className="d-flex flex-wrap gap-3 at_fade_anim" data-delay=".3">
                            <a
                                href={SCHOOL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="at-btn text-white rounded-0"
                            >
                                <span>
                                    <span className="text-1">ENTER THE SCHOOL</span>
                                    <span className="text-2">ENTER THE SCHOOL</span>
                                </span>
                                <i>{ARROW}{ARROW}</i>
                            </a>
                            <Link to="/founder" className="at-btn at-btn-border-white rounded-0">
                                <span>
                                    <span className="text-1">FREE FOUNDER TOOLKIT</span>
                                    <span className="text-2">FREE FOUNDER TOOLKIT</span>
                                </span>
                                <i>{ARROW}{ARROW}</i>
                            </Link>
                        </div>

                        <p className="fz-font-label neutral-500 mt-20 at_fade_anim" data-delay=".4">
                            Not enrolled yet? The toolkit is free, needs no account, and helps you test whether a venture or a Phoxta package fits your market.
                        </p>
                    </div>

                    <div className="col-lg-6 col-12">
                        <ul className="sec-ss-enter__facts list-unstyled mb-0">
                            {FACTS.map((f, i) => (
                                <li
                                    key={f.label}
                                    className="d-flex align-items-baseline gap-3 py-3 at_fade_anim"
                                    data-delay={`.${i + 2}`}
                                >
                                    <span className="fz-font-2xl fw-500 text-nowrap">{f.n}</span>
                                    <span className="fz-body neutral-500">{f.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
