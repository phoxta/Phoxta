import RevealText from "@/shared/effects/RevealText";

// Services 2 Section 3 - FAQ + contact

const FAQ_ITEMS = [
    {
        id: "collapseOne",
        num: "1",
        question: "How does your design process work?",
        answer: "Our process includes discovery, strategy, design, feedback, and delivery — ensuring clarity, collaboration, and results at every stage.",
        open: true,
    },
    {
        id: "collapseTwo",
        num: "2",
        question: "How long does a typical project take?",
        answer: "Timelines vary by scope, but most projects take between 2–6 weeks — with clear milestones to keep everything on track.",
        open: false,
    },
    {
        id: "collapseThree",
        num: "3",
        question: "Do you work with startups or only established brands?",
        answer: "We work with both startups and established brands — tailoring our approach to fit each stage of growth.",
        open: false,
    },
    {
        id: "collapseFour",
        num: "4",
        question: "Can you handle custom or complex requests?",
        answer: "Yes — we specialize in custom and complex projects, creating flexible solutions to meet unique needs.",
        open: false,
    },
];

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

export default function Section3() {
    return (
        <section className="sec-3-services pt-120">
            <div className="container pb-150">
                <div className="row">
                    <div className="col-lg-7 mx-lg-auto">
                        <h3 className="reveal-text mb-0 text-center">
                            <RevealText>Frequently Asked Questions</RevealText>
                        </h3>
                        <div className="accordion pt-40 p-relative z-index-3" id="accordionExample">
                            {FAQ_ITEMS.map((item) => (
                                <div
                                    key={item.id}
                                    className="at-faq-item bg-neutral-0 border-100 rounded-4"
                                >
                                    <div className="at-faq-header d-flex gap-2">
                                        <div className="box-number">
                                            <span className="at-faq-number">{item.num}</span>
                                        </div>
                                        <button
                                            className={`at-faq-button${item.open ? "" : " collapsed"}`}
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#${item.id}`}
                                            aria-expanded={item.open}
                                            aria-controls={item.id}
                                        >
                                            {item.question}
                                        </button>
                                    </div>
                                    <div
                                        id={item.id}
                                        className={`at-faq-collapse collapse${item.open ? " show" : ""}`}
                                        data-bs-parent="#accordionExample"
                                    >
                                        <div className="at-faq-body">
                                            <p>{item.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-80">
                            <div className="d-flex justify-content-center align-items-center gap-5">
                                <div className="at-about-svg-wrap d-none d-lg-block translate-middle-y z-1">
                                    {DECO_SVG_1}
                                    {DECO_SVG_2}
                                    {DECO_SVG_3}
                                </div>
                                <div>
                                    <h6 className="fw-600">
                                        <a href="tel:+2125557398" className="text-decoration-none">
                                            +212 - 555-7398
                                        </a>
                                    </h6>
                                    <h4 className="mb-0 fw-medium text-decoration-underline">
                                        <a href="mailto:hello@phoxta.com">hello@phoxta.com</a>
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
