import RevealText from "@/shared/effects/RevealText";

// Home 7 Section 14 (Startup School) — Student testimonials.
// New section; reuses the eyebrow + RevealText + quote-card pattern from the
// catalog (quote / avatar / name / role) for visual consistency.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const QUOTE_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="43" viewBox="0 0 34 43" fill="none" aria-hidden>
        <path d="M12.5 26.66L3.00442 26.66C0.68247 26.66 -0.759179 24.4843 0.420807 22.761L14.986 1.48852C16.7967 -1.15609 21.5 -0.0494029 21.5 3.02127L21.5 16.34L30.9956 16.34C33.3175 16.34 34.7592 18.5157 33.5792 20.239L19.014 41.5115C17.2033 44.1561 12.5 43.0494 12.5 39.9787L12.5 26.66Z" fill="currentColor" />
    </svg>
);

const TESTIMONIALS = [
    {
        quote: "I came in with just an idea. Twelve weeks later I had a live business with paying customers — and I actually understood why it worked.",
        avatar: "/assets/imgs/template/avatar/avatar-15.webp",
        name: "Maya Robins",
        role: "Founder",
    },
    {
        quote: "The classes are taught by people who've actually built companies. Having a mentor check my thinking each week changed everything.",
        avatar: "/assets/imgs/template/avatar/avatar-16.webp",
        name: "Daniel Kael",
        role: "Founder",
    },
    {
        quote: "What sold me was that it's hands-on. I wasn't watching lectures — I was running a real business while I learned.",
        avatar: "/assets/imgs/template/avatar/avatar-17.webp",
        name: "Priya Sharma",
        role: "Founder",
    },
];

export default function Section14() {
    return (
        <section className="pt-120 pb-120 bg-neutral-50">
            <div className="container">
                <div className="row align-items-end mb-50 g-4">
                    <div className="col-lg-7">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">Student stories</span>
                                <span className="text-2">Student stories</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h2 className="reveal-text mb-0">
                            <RevealText>Founders who started right here</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-5">
                        <p className="fz-font-lg neutral-700 mb-0">
                            Thousands of builders have used Startup School to go from idea to a real, running business.
                        </p>
                    </div>
                </div>

                <div className="row g-3">
                    {TESTIMONIALS.map((item) => (
                        <div key={item.name} className="col-lg-4 col-md-6">
                            <div className="h-100 bg-neutral-0 border-100 rounded-4 p-xxl-5 p-4 d-flex flex-column">
                                <div className="mb-3 theme-primary">{QUOTE_SVG}</div>
                                <p className="fz-font-xl neutral-900 fw-400 mb-4">{item.quote}</p>
                                <div className="d-flex align-items-center gap-3 mt-auto">
                                    <div className="size-50 rounded-3 overflow-hidden flex-shrink-0">
                                        <img
                                            src={item.avatar}
                                            alt={item.name}
                                            width={50}
                                            height={50}
                                            className="img-cover w-100 h-100"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div>
                                        <h6 className="fw-600 mb-0">{item.name}</h6>
                                        <p className="neutral-500 fw-500 mb-0 fz-font-label">{item.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
