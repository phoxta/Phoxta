import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const DECO_SVG_1 = (
    <svg xmlns="http://www.w3.org/2000/svg" width="57" height="91" viewBox="0 0 57 91" fill="none">
        <path opacity="0.1" d="M0 0L56.4024 33.572V90.336L0 56.46V0Z" fill="#515151" />
    </svg>
);

const DECO_SVG_2 = (
    <svg xmlns="http://www.w3.org/2000/svg" width="113" height="68" viewBox="0 0 113 68" fill="none">
        <path opacity="0.3" d="M0 33.876L56.4024 0L112.805 33.876V34.1294L56.4024 68.0054L0 34.1294V33.876Z" fill="#515151" />
    </svg>
);

const DECO_SVG_3 = (
    <svg xmlns="http://www.w3.org/2000/svg" width="57" height="91" viewBox="0 0 57 91" fill="none">
        <path opacity="0.2" d="M56.4009 0L8.7738e-05 33.5367V90.2413L56.4009 56.4008V0Z" fill="#515151" />
    </svg>
);

const STAT_SVG_1 = (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M30 20H20V30L20 40H10L0 30L10 20H0V0H10L20 10V1.90735e-06L30 0L40 10L30 20ZM20 10V20H10L20 10Z" fill="currentColor" />
        <path d="M30 20H40V40H30L20 30L30 20Z" fill="currentColor" />
    </svg>
);

const STAT_SVG_2 = (
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" fill="none">
        <path d="M38 12L31 19L19 7L26 0H38V12Z" fill="currentColor" />
        <path d="M7 19L19 7L12 0H0V12L7 19Z" fill="currentColor" />
        <path d="M19 31L12 38H0V26L7 19V31H19Z" fill="currentColor" />
        <path d="M19 31H31V19L38 26V38H26L19 31Z" fill="currentColor" />
    </svg>
);

export default function Section7() {
    return (
        <div className="container-2200">
            {/* at-sec7-area-start */}
            <section className="at-sec7-area pt-120 pb-120 bg-neutral-50 rounded-5 mx-lg-3 mx-2 mt-10">
                <div className="container">
                    <div className="row align-items-end">
                        <div className="col-xxl-8 col-xl-12">
                            <div className="at-about-title-wrap mb-30">
                                <span className="at-btn common-black bg-transparent mb-10 rounded-0 p-0">
                                    <span className="text-uppercase">
                                        <span className="text-1">Why Phoxta</span>
                                        <span className="text-2">Why Phoxta</span>
                                    </span>
                                    <i>
                                        {ARROW_SVG}
                                        {ARROW_SVG}
                                    </i>
                                </span>
                                <h3 className="at-section-title reveal-text mb-80">
                                    <RevealText>
                                        Everything that makes a business work &mdash; the AI, the automations, the
                                        day-to-day operations &mdash; already built in, and getting better all the time.
                                    </RevealText>
                                </h3>
                            </div>
                        </div>
                        <div className="col-lg-2 col-md-3 align-self-end ms-auto d-none d-md-block">
                            <div className="at-about-svg-wrap">
                                {DECO_SVG_1}
                                {DECO_SVG_2}
                                {DECO_SVG_3}
                            </div>
                        </div>
                    </div>
                    <div className="row align-items-end g-4">
                        <div className="col-lg-4 col-md-9 col-12">
                            <div className="d-flex flex-column gap-2">
                                <div className="at-image-hover p-relative rounded-4 overflow-hidden">
                                    <div className="anim-zoomin">
                                        <img
                                            className="zoom-blur-image img-cover"
                                            src="/assets/imgs/pages/img-15.webp"
                                            alt="phoxta"
                                            width={600}
                                            height={400} loading="lazy" />
                                    </div>
                                    <img
                                        className="p-absolute bottom-0 start-0 m-4"
                                        src="/assets/imgs/template/logo/logo-w-lg.svg"
                                        alt="phoxta"
                                        width={227}
                                        height={70}
                                        style={{ width: "auto", height: "auto" }} loading="lazy" />
                                    <div className="content position-absolute top-0 end-0 m-4">
                                        <Link
                                            className="bg-transparent text-uppercase border px-3 py-1 rounded-pill text-white fz-font-label"
                                            to="#"
                                        >
                                            AI inside
                                        </Link>
                                    </div>
                                </div>
                                <div className="at-image-hover p-relative rounded-4 overflow-hidden">
                                    <div className="anim-zoomin">
                                        <img
                                            className="zoom-blur-image img-cover"
                                            src="/assets/imgs/pages/img-16.webp"
                                            alt="phoxta"
                                            width={600}
                                            height={450} loading="lazy" />
                                    </div>
                                    <div className="content">
                                        <h6 className="common-white position-absolute bottom-0 start-0 m-4">
                                            Every business ships with the AI already inside. Let&apos;s get you started.
                                        </h6>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xxl-6 col-lg-8 ms-auto">
                            <div className="row g-2">
                                <div className="col-lg-7 col-md-8 col-12">
                                    <h6 className="reveal-text neutral-800 mb-60">
                                        <RevealText>
                                            Phoxta™ takes care of the hard parts &mdash; the operations, the AI, the
                                            technology &mdash; so you can put your energy into customers and growth. And it
                                            keeps getting better on its own, without you lifting a finger.
                                        </RevealText>
                                    </h6>
                                </div>
                                <div className="col-md-6 col-12">
                                    <div className="hover-unborder">
                                        <div className="bg-neutral-0 rounded-4 px-5 py-3">
                                            <h4 className="d-flex justify-content-between align-items-center mb-0">
                                                <span>90</span>
                                                <span>%</span>
                                            </h4>
                                        </div>
                                        <div className="bg-neutral-0 rounded-4 p-5 mt-2">
                                            <h6 className="text-end mb-0">
                                                Less than <br />
                                                building it
                                            </h6>
                                            <div className="pt-150">
                                                {STAT_SVG_1}
                                                <p className="fz-font-lg mt-3 mb-0">
                                                    A fraction of the time and money a custom build or agency would take to
                                                    deliver the same business.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6 col-12">
                                    <div className="hover-unborder">
                                        <div className="bg-neutral-0 rounded-4 p-5 mb-2">
                                            <h6 className="text-end mb-0">
                                                Built-in
                                                <br />
                                                AI
                                            </h6>
                                            <div className="pt-150">
                                                {STAT_SVG_2}
                                                <p className="fz-font-lg mt-3 mb-0">
                                                    AI assistants answer customers, write content and handle the busywork
                                                    &mdash; around the clock, so you don&apos;t have to.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-neutral-0 rounded-4 px-5 py-3">
                                            <h4 className="d-flex justify-content-between align-items-center mb-0">
                                                <span>24</span>
                                                <span>/7</span>
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* at-sec7-area-end */}
        </div>
    );
}
