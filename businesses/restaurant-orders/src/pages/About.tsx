import Layout from "@/components/Layout";

const VALUES = [
    ["fa-seedling", "Seasonal & Local", "We build the menu around what's at its peak, sourced from farms and growers we know by name."],
    ["fa-fire", "Classical Technique", "French foundations, executed with precision — then nudged forward with a modern point of view."],
    ["fa-heart", "Genuine Hospitality", "From the first hello to the last course, we treat every guest like a friend at our table."],
];

export default function About() {
    return (
        <Layout>
            <header className="page-header">
                <div className="container inner">
                    <h1 className="serif">Our Story</h1>
                    <p>A neighbourhood kitchen built on seasonal ingredients, classical craft and warm hospitality.</p>
                </div>
            </header>

            <section className="intro" style={{ paddingTop: 90 }}>
                <div className="container">
                    <div className="intro-inner">
                        <div className="intro-media">
                            <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=700&h=500&fit=crop" alt="Saveur kitchen" />
                            <div className="intro-media-badge"><div className="badge-num serif">1</div><div className="badge-text">Michelin Recognised</div></div>
                        </div>
                        <div className="intro-text">
                            <div className="intro-label">Since 2015</div>
                            <h2 className="serif">A kitchen with a point of view</h2>
                            <p>Saveur opened with a small team, a wood-fired oven and a conviction that hospitality is an act of generosity. A decade on, the philosophy hasn't changed — only the number of guests we get to cook for.</p>
                            <p>Every plate is a collaboration between our growers, our kitchen and the season. We write the menu in pencil, because the best ingredients rarely stay still for long.</p>
                            <div className="intro-divider" />
                            <div className="intro-features">
                                <div className="intro-feature"><i className="fas fa-leaf" /><span>50-Mile Sourcing</span></div>
                                <div className="intro-feature"><i className="fas fa-wine-glass-alt" /><span>300+ Wines</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="experience" style={{ background: "var(--white)" }}>
                <div className="container">
                    <div className="section-header"><div className="section-label">What We Believe</div><h2 className="section-title">Our Values</h2></div>
                    <div className="exp-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                        {VALUES.map(([icon, t, d]) => (
                            <div className="exp-item" key={t}>
                                <div className="exp-icon"><i className={`fas ${icon}`} /></div>
                                <h3 className="serif">{t}</h3>
                                <p>{d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
}
