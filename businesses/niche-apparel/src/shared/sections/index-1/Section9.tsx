import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";
import TeamCard1 from "@/shared/cards/TeamCard1";

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const BTN_CIRCLE_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
        <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
    </svg>
);

const LOCATION_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M20 40V20H0L20 0L40 20V40H20Z" fill="currentColor" />
        <path d="M0 20L20 40H0V20Z" fill="currentColor" />
    </svg>
);

const TEAM_MEMBERS = [
    { linkPost: "/team-details", img: "/assets/imgs/pages/img-17.webp", name: "Founder & CEO", position: "Strategy & growth" },
    { linkPost: "/team-details", img: "/assets/imgs/pages/img-18.webp", name: "Co-founder & CTO", position: "Technology & engineering" },
    { linkPost: "/team-details", img: "/assets/imgs/pages/img-19.webp", name: "Head of Product", position: "Product & experience" },
    { linkPost: "/team-details", img: "/assets/imgs/pages/img-20.webp", name: "Head of AI", position: "AI & automation" },
];

export default function Section9() {
    return (
        <div className="container-2200">
            <section className="at-sec9-area pt-130 pb-130 rounded-5 mx-lg-3 mx-2 border-100 mt-10">
                <div className="container">
                    <div className="row g-5">
                        <div className="col-xxl-7 col-lg-8">
                            <div className="at-about-title-wrap mb-30">
                                <span className="at-btn common-black bg-transparent mb-10 rounded-0 p-0">
                                    <span className="text-uppercase">
                                        <span className="text-1">The team</span>
                                        <span className="text-2">The team</span>
                                    </span>
                                    <i>
                                        {ARROW_SVG}
                                        {ARROW_SVG}
                                    </i>
                                </span>
                                <h3 className="at-section-title reveal-text mb-lg-0 mb-4">
                                    <RevealText>
                                        The people behind Phoxta &mdash; a team that has built and scaled real software,
                                        shipped AI used by millions, and run businesses of their own.
                                    </RevealText>
                                </h3>
                                <div
                                    className="at-btn-group at_fade_anim pt-30"
                                    data-delay=".4"
                                    data-fade-from="bottom"
                                    data-ease="bounce"
                                >
                                    <Link className="at-btn-circle" to="/careers">
                                        {BTN_CIRCLE_ARROW_SVG}
                                    </Link>
                                    <Link className="at-btn z-index-1" to="/careers">
                                        Join our team
                                    </Link>
                                    <Link className="at-btn-circle" to="/careers">
                                        {BTN_CIRCLE_ARROW_SVG}
                                    </Link>
                                </div>
                                <div className="at-about-content pt-120">
                                    <div className="d-flex gap-4 justify-content-center">
                                        {LOCATION_SVG}
                                        <div>
                                            <h6 className="fw-600">We are here</h6>
                                            <div className="d-flex flex-md-row flex-column gap-md-5 gap-4">
                                                <span className="fz-font-md neutral-500">
                                                    Phoxta Holdings Ltd.
                                                    <br className="d-block" />
                                                    London, United Kingdom (HQ)
                                                    <br className="d-block" />
                                                    Remote-first team
                                                    <br className="d-block" />
                                                    Email:{" "}
                                                    <span className="neutral-900">
                                                        <a href="mailto:hello@phoxta.com">hello@phoxta.com</a>
                                                    </span>
                                                </span>
                                                <span className="fz-font-md neutral-500 ps-md-5">
                                                    Satellite hubs
                                                    <br className="d-block" />
                                                    Lisbon &middot; Singapore &middot; NYC
                                                    <br className="d-block" />
                                                    Investor enquiries
                                                    <br className="d-block" />
                                                    Email:{" "}
                                                    <span className="neutral-900">
                                                        <a href="mailto:investors@phoxta.com">investors@phoxta.com</a>
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xxl-4 ms-xxl-auto col-lg-8">
                            <div className="team-grid-wrap">
                                <div className="row g-2">
                                    {TEAM_MEMBERS.map((member) => (
                                        <TeamCard1
                                            key={member.name}
                                            classList="col-lg-6 col-md-6 col-sm-6"
                                            linkPost={member.linkPost}
                                            img={member.img}
                                            name={member.name}
                                            position={member.position}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
