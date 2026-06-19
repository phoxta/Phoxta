import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import DishCard from "@/components/DishCard";
import ReservationWidget from "@/components/ReservationWidget";
import Testimonials from "@/components/Testimonials";
import { useMenu } from "@/util/menu";

const GALLERY = [
    "photo-1414235077428-338989a2e8c0", "photo-1504674900247-0877df9cc836", "photo-1517248135467-4c7edcad34c4",
    "photo-1551218808-94e220e084d2", "photo-1565299624946-b28f40a0ae38", "photo-1559339352-11d035aa65de",
];

const EXPERIENCE = [
    ["fa-seedling", "Farm to Table", "Seasonal ingredients sourced from trusted farms and growers within 50 miles."],
    ["fa-wine-glass-alt", "Curated Cellar", "Over 300 labels from celebrated vineyards, paired course by course by our sommelier."],
    ["fa-concierge-bell", "Private Dining", "Intimate rooms for celebrations, milestones and corporate evenings."],
    ["fa-robot", "AI Concierge", "Recommendations, pairings and bookings — answered instantly, day or night."],
];

export default function Home() {
    const { dishes } = useMenu();
    return (
        <Layout>
            {/* HERO */}
            <section className="hero">
                <div className="hero-bg">
                    <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop" alt="Saveur dining room" />
                </div>
                <div className="hero-overlay" />
                <div className="hero-content">
                    <div className="hero-ornament">Est. 2015</div>
                    <h1 className="serif">A culinary journey of <em>flavour</em> &amp; craft</h1>
                    <p>Modern seasonal cuisine rooted in tradition — now with effortless online ordering, instant reservations and an AI concierge at your side.</p>
                    <div className="hero-btns">
                        <Link to="/menu" className="btn-accent"><i className="fas fa-utensils" /> Order Online</Link>
                        <Link to="/reservations" className="btn-light-outline"><i className="fas fa-calendar-alt" /> Reserve a Table</Link>
                    </div>
                </div>
                <div className="hero-scroll"><span>Scroll</span><i className="fas fa-chevron-down" /></div>
            </section>

            {/* INTRO */}
            <section className="intro">
                <div className="container">
                    <div className="intro-inner">
                        <div className="intro-media">
                            <img src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=700&h=500&fit=crop" alt="Chef plating" />
                            <div className="intro-media-badge">
                                <div className="badge-num serif">10+</div>
                                <div className="badge-text">Years of Excellence</div>
                            </div>
                        </div>
                        <div className="intro-text">
                            <div className="intro-label">Our Story</div>
                            <h2 className="serif">Where passion meets the plate</h2>
                            <p>Saveur began with a simple belief: that great food brings people together. Our kitchen marries classical French technique with the best of each season, and our floor team treats every guest like family.</p>
                            <p>Today that same care extends online — order ahead for pickup, book a table in seconds, and let our concierge guide your evening.</p>
                            <div className="intro-divider" />
                            <div className="intro-features">
                                <div className="intro-feature"><i className="fas fa-leaf" /><span>Farm-to-Table</span></div>
                                <div className="intro-feature"><i className="fas fa-award" /><span>Award-Winning</span></div>
                                <div className="intro-feature"><i className="fas fa-wine-glass-alt" /><span>Curated Wines</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURED DISHES */}
            <section className="dishes">
                <div className="container">
                    <div className="section-header">
                        <div className="section-label">Signature Collection</div>
                        <h2 className="section-title">Featured Dishes</h2>
                        <p className="section-subtitle">A curated selection from our seasonal menu — add any dish to your order in a tap.</p>
                    </div>
                    <div className="dishes-grid">
                        {dishes.filter((d) => d.category !== "Cellar").slice(0, 6).map((d) => <DishCard key={d.id} dish={d} />)}
                    </div>
                    <div className="dishes-more">
                        <Link to="/menu" className="btn-dark-outline">View Full Menu <i className="fas fa-arrow-right" /></Link>
                    </div>
                </div>
            </section>

            <ReservationWidget />

            {/* EXPERIENCE */}
            <section className="experience">
                <div className="container">
                    <div className="section-header">
                        <div className="section-label">The Experience</div>
                        <h2 className="section-title">Why Dine With Us</h2>
                    </div>
                    <div className="exp-grid">
                        {EXPERIENCE.map(([icon, title, desc]) => (
                            <div className="exp-item" key={title}>
                                <div className="exp-icon"><i className={`fas ${icon}`} /></div>
                                <h3 className="serif">{title}</h3>
                                <p>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* GALLERY */}
            <section className="gallery">
                <div className="container">
                    <div className="section-header">
                        <div className="section-label">Gallery</div>
                        <h2 className="section-title">Moments at Saveur</h2>
                    </div>
                    <div className="gallery-grid">
                        {GALLERY.map((g, i) => (
                            <div className="gallery-item" key={i}>
                                <img src={`https://images.unsplash.com/${g}?w=${i === 0 ? 800 : 500}&h=${i === 0 ? 800 : 500}&fit=crop`} alt="Saveur" loading="lazy" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Testimonials />

            {/* INFO */}
            <section className="info">
                <div className="container">
                    <div className="info-grid">
                        <div className="info-block"><div className="info-block-icon"><i className="fas fa-clock" /></div><h3 className="serif">Lunch</h3><p>Tuesday – Sunday<br />12:00 PM – 2:30 PM</p></div>
                        <div className="info-block"><div className="info-block-icon"><i className="fas fa-utensils" /></div><h3 className="serif">Dinner</h3><p>Tuesday – Saturday<br />6:00 PM – 10:30 PM</p></div>
                        <div className="info-block"><div className="info-block-icon"><i className="fas fa-map-marker-alt" /></div><h3 className="serif">Find Us</h3><p>24 Gastronomy Lane<br />Downtown · City Centre</p></div>
                    </div>
                </div>
            </section>

            {/* NEWSLETTER */}
            <section className="newsletter">
                <div className="container">
                    <h2 className="serif">Stay Connected</h2>
                    <p>Subscribe for menu previews, events and seasonal specials.</p>
                    <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                        <input type="email" placeholder="Your email address" required />
                        <button type="submit">Subscribe</button>
                    </form>
                </div>
            </section>
        </Layout>
    );
}
