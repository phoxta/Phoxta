// Clean inner-page hero: header sits on a light band, title centred below it
// (no image behind the header → always readable). Optional slim banner image.
export default function PageHero({ eyebrow, title, subtitle, img }: { eyebrow?: string; title: string; subtitle?: string; img?: string }) {
    return (
        <section className="pt-150 pb-40">
            <div className="container">
                <div className="text-center" style={{ maxWidth: 720, margin: "0 auto" }}>
                    {eyebrow && <p className="text-primary fw-600 text-uppercase mb-3" style={{ letterSpacing: 3, fontSize: 13 }}>{eyebrow}</p>}
                    <h1 className="fw-600 lh-1 mb-3" style={{ fontSize: "clamp(40px, 5.5vw, 72px)" }}>{title}</h1>
                    {subtitle && <p className="neutral-500" style={{ fontSize: 17 }}>{subtitle}</p>}
                </div>
                {img && (
                    <div className="rounded-4 overflow-hidden mt-5">
                        <img className="w-100" src={img} alt={title} width={1920} height={520} style={{ height: "clamp(260px, 38vw, 460px)", objectFit: "cover", display: "block" }} loading="lazy" />
                    </div>
                )}
            </div>
        </section>
    );
}
