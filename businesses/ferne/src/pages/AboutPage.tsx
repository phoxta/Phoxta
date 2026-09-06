import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCms } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import { useCatalog } from "@/state/catalog";

const TEAM = [
    { img: "/images/av4.jpg", name: "Elin Hart", role: "Founder & formulator" },
    { img: "/images/av2.jpg", name: "Dr. Maya Chen", role: "Consultant dermatologist" },
    { img: "/images/av5.jpg", name: "Tom Alder", role: "Sourcing & growers" },
    { img: "/images/av8.jpg", name: "Nadia Reyes", role: "Customer care" },
];

export default function AboutPage() {
    const { orgId } = useCatalog();
    const [cms, setCms] = useState<{ title: string; body: string } | null>(null);

    // A shop that has written its own About page in the console wins; the story
    // below is what a brand-new tenant ships with.
    useEffect(() => {
        if (!orgId) return;
        let active = true;
        void fetchCms(orgId, "about").then((page) => {
            if (active && page?.body?.trim()) setCms(page);
        });
        return () => {
            active = false;
        };
    }, [orgId]);

    return (
        <div className="page">
            <PageMeta
                title="Our story"
                description="Every active on the label has a farm we can name — six growers, batch numbers and refillable glass."
            />
            <div className="wrap">
                <div className="page-head">
                    <div className="crumbs">
                        <Link to="/">Home</Link> / <b>Our story</b>
                    </div>
                    <h1 className="serif">
                        Every active on the label has a farm we can <em>name.</em>
                    </h1>
                    <p>
                        Ferne started in a Birmingham kitchen in 2021 with one question: why does &ldquo;natural&rdquo;
                        skincare so rarely say where anything came from?
                    </p>
                </div>

                <div className="post-hero">
                    <img src="/images/story.jpg" alt="" width={1400} height={600} />
                </div>

                <div className="article">
                    {cms ? (
                        cms.body
                            .split(/\n{2,}/)
                            .map((p) => p.trim())
                            .filter(Boolean)
                            .map((p, i) => <p key={i}>{p}</p>)
                    ) : (
                        <>
                            <p>
                                We work with six growers across Devon, Perthshire, Provence and the Douro. Each batch is
                                logged, tested and numbered — scan the base of any bottle to see exactly where it came
                                from and when it was pressed.
                            </p>
                            <h2 id="ingredients">Four actives, nothing else</h2>
                            <p>
                                Rosehip, oat lipid, olive squalane and sea buckthorn. Everything we make is built from
                                those four, plus the minimum needed to keep it stable. No fragrance, no essential oils,
                                no colour.
                            </p>
                            <h2 id="sustainability">Refill first</h2>
                            <p>
                                Every jar and bottle is glass. 92% of repeat customers buy the refill pod instead of a
                                new jar, which is the single biggest reason our packaging footprint fell by half last
                                year.
                            </p>
                        </>
                    )}
                </div>

                <div className="stat-tiles" style={{ maxWidth: 720, margin: "40px auto 0" }}>
                    <div>
                        <b>6</b>
                        <small>Partner farms</small>
                    </div>
                    <div>
                        <b>0</b>
                        <small>Synthetic fragrance</small>
                    </div>
                    <div>
                        <b>92%</b>
                        <small>Refill rate</small>
                    </div>
                </div>

                <section style={{ marginTop: 64 }}>
                    <div className="eyebrow">The people</div>
                    <h2 className="serif" style={{ fontSize: 36, fontWeight: 300, marginTop: 10 }}>
                        Small team, long <em>relationships</em>
                    </h2>
                    <div className="team">
                        {TEAM.map((t) => (
                            <div key={t.name}>
                                <img src={t.img} alt="" width={88} height={88} loading="lazy" />
                                <b>{t.name}</b>
                                <small>{t.role}</small>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="about-grid">
                    <Link className="cat" to="/journal/rosehip-72" style={{ aspectRatio: "4/3" }}>
                        <img src="/images/ing-rosehip.jpg" alt="" width={640} height={480} loading="lazy" />
                        <div className="lbl">
                            <div>
                                <b>Devon rosehip</b>
                                <small>Pressed within 72 hours</small>
                            </div>
                            <span className="arr">→</span>
                        </div>
                    </Link>
                    <Link className="cat" to="/journal/douro-morning" style={{ aspectRatio: "4/3" }}>
                        <img src="/images/ing-seabuckthorn.jpg" alt="" width={640} height={480} loading="lazy" />
                        <div className="lbl">
                            <div>
                                <b>Douro sea buckthorn</b>
                                <small>Harvested frozen, at dawn</small>
                            </div>
                            <span className="arr">→</span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
