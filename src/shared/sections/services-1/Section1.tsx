// Services 1 Section 1 - Hero (Phoxta Studio + contact + banner)

// Editable content + defaults (preserve original copy so existing usages render
// identically). Consumed by the Studio registry.
export type ServicesIntroProps = {
    heading?: string;
    email?: string;
    phone?: string;
    image?: string;
};

export const SERVICES_INTRO_DEFAULTS = {
    heading: "Phoxta Studio®",
    email: "hello@phoxta.com",
    phone: "(212) 555-7398",
    image: "/assets/imgs/pages/img-153.webp",
} satisfies Required<ServicesIntroProps>;

export default function Section1({
    heading = SERVICES_INTRO_DEFAULTS.heading,
    email = SERVICES_INTRO_DEFAULTS.email,
    phone = SERVICES_INTRO_DEFAULTS.phone,
    image = SERVICES_INTRO_DEFAULTS.image,
}: ServicesIntroProps = {}) {
    return (
        <section className="sec-1-services pt-150 border-bottom-100 overflow-hidden">
            <div className="container">
                <div className="row align-items-center mb-20">
                    <div className="col-lg-9">
                        <h1 className="section-title d-flex fw-600 fz-200 reveal-text mb-0">
                            {heading}
                        </h1>
                    </div>
                    <div className="col-lg-3 ms-auto text-lg-end">
                        <h5>
                            <a href={`mailto:${email}`} className="text-decoration-none">
                                {email}
                            </a>
                        </h5>
                        <h6 className="fw-600">
                            <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="text-decoration-none">
                                {phone}
                            </a>
                        </h6>
                    </div>
                </div>
            </div>
            <div className="at-banner-thumb overflow-hidden scale-up-img">
                <img
                    className="img-cover scale-up"
                    data-speed=".4"
                    src={image}
                    alt="phoxta"
                    width={1920}
                    height={800} loading="lazy" />
            </div>
        </section>
    );
}
