// Legal pages — shared hero (eyebrow + title + intro + last-updated).
// Used by /privacy and /terms.

type LegalHeroProps = {
    eyebrow: string;
    title: string;
    intro: string;
    lastUpdated: string;
};

export default function LegalHero({ eyebrow, title, intro, lastUpdated }: LegalHeroProps) {
    return (
        <section className="sec-legal-hero pt-150 pb-120 bg-neutral-900 overflow-hidden">
            <div className="container">
                <div className="row">
                    <div className="col-lg-9">
                        <span className="d-inline-block mb-20 text-uppercase fz-font-label text-white">
                            [ {eyebrow} ]
                        </span>
                        <h1 className="fz-ds-1 fw-500 text-white mb-4 lh-1">{title}</h1>
                        <p className="fz-font-lg neutral-300 mb-4">{intro}</p>
                        <span className="d-inline-block fz-font-md neutral-300 opacity-75">
                            Last updated: {lastUpdated}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
