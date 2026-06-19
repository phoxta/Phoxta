import RevealText from "@/shared/effects/RevealText";

const EXPERTISE = [
    { img: "sec-5-img-1.webp", title: "01. How it works", tag: "[ MARKETPLACE_LENDING ]", text: "Your capital funds short-term working-capital advances to vetted Phoxta businesses. They repay with interest from real revenue — and that interest is your return." },
    { img: "sec-5-img-2.webp", title: "02. Conserve portfolio", tag: "[ GRADE A–B · ~8% ]", text: "Lower-risk, shorter-duration advances to the most established businesses with the strongest cash flow. Target net yield around 8%." },
    { img: "sec-5-img-3.webp", title: "03. Balanced portfolio", tag: "[ GRADE A–C · ~11% ]", text: "A blend across grades that balances yield and risk — our most popular Credit Invest mix. Target net yield around 11%." },
    { img: "sec-5-img-4.webp", title: "04. Growth portfolio", tag: "[ GRADE A–D · up to 15% ]", text: "Adds newer, faster-growing businesses for the highest target return. Higher expected returns also carry higher expected losses." },
    { img: "sec-5-img-5.webp", title: "05. Built-in protection", tag: "[ ALIGNED + RESERVED ]", text: "Your deposit is auto-spread across dozens of businesses, Phoxta co-invests a first-loss stake in every loan, and a funded reserve absorbs defaults before they reach your principal." },
];

export default function Section5() {
    return (
        <section className="sec-5-home-13" aria-label="Phoxta Credit Invest">
            <div className="sec-5-home-13__inner">
                <header className="sec-5-home-13__header">
                    <h2 className="sec-5-home-13__title mb-0 reveal-text"><RevealText>Phoxta Credit Invest</RevealText></h2>
                    <div className="sec-5-home-13__hint at_fade_anim" data-fade-from="right" data-delay=".05">
                        <span className="sec-5-home-13__hint-dot" aria-hidden="true"></span>
                        <span>Your money funds loans to vetted, revenue-generating businesses — underwritten on live platform data. Up to 15% target.</span>
                    </div>
                </header>

                <div className="sec-5-home-13__list">
                    {EXPERTISE.map((e, i) => (
                        <article key={i} className="sec-5-home-13__card">
                            <div className="sec-5-home-13__card-media anim-zoomin">
                                <img data-speed=".9" src={`/assets/imgs/pages/home-13/${e.img}`} alt="Phoxta" loading="lazy" />
                            </div>
                            <div className="sec-5-home-13__card-body">
                                <header className="sec-5-home-13__card-head">
                                    <h3 className="sec-5-home-13__card-title mb-0 reveal-text"><RevealText>{e.title}</RevealText></h3>
                                    <div className="sec-5-home-13__card-tag">
                                        <span className="sec-5-home-13__card-tag-text">{e.tag}</span>
                                        <button className="sec-5-home-13__card-toggle" type="button" aria-label="Open expertise details">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                                <path d="M9 3.75V14.25M3.75 9H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </header>
                                <p className="sec-5-home-13__card-text mb-0 at_fade_anim">{e.text}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
