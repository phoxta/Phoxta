// Legal pages — shared content renderer (numbered sections of prose + bullet lists).
// Single-column reading layout: GSAP ScrollSmoother virtualises scrolling, so in-page
// #anchor jump links and position:sticky aren't reliable here — keep it flat and simple.

export type LegalBlock =
    | { type: "p"; text: string }
    | { type: "list"; items: string[] };

export type LegalSection = {
    id: string;
    heading: string;
    blocks: LegalBlock[];
};

type LegalContentProps = {
    sections: LegalSection[];
    contactEmail?: string;
};

function Block({ block }: { block: LegalBlock }) {
    if (block.type === "list") {
        return (
            <ul className="neutral-700 fz-font-md ps-3 mb-30">
                {block.items.map((item, i) => (
                    <li key={i} className="mb-10">
                        {item}
                    </li>
                ))}
            </ul>
        );
    }
    return <p className="neutral-700 fz-font-md mb-20">{block.text}</p>;
}

export default function LegalContent({ sections, contactEmail = "hello@phoxta.com" }: LegalContentProps) {
    return (
        <section className="sec-legal-content pt-120 pb-120 bg-neutral-0 overflow-hidden">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-xl-8 col-lg-9">
                        {sections.map((s, i) => (
                            <div key={s.id} className="legal-block mb-50">
                                <h3 className="fz-font-2xl fw-500 mb-20">
                                    <span className="neutral-500 fw-400 me-2">{String(i + 1).padStart(2, "0")}.</span>
                                    {s.heading}
                                </h3>
                                {s.blocks.map((b, bi) => (
                                    <Block key={bi} block={b} />
                                ))}
                            </div>
                        ))}

                        <div className="legal-contact bg-neutral-50 rounded-3 p-4 p-lg-5 mt-30">
                            <h4 className="fw-500 mb-10">Questions?</h4>
                            <p className="neutral-700 fz-font-md mb-0">
                                If anything here is unclear, reach us at{" "}
                                <a href={`mailto:${contactEmail}`} className="common-black text-decoration-underline">
                                    {contactEmail}
                                </a>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
