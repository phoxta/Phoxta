import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div>
                        <div className="footer-brand">Saveur</div>
                        <p className="footer-brand-desc">
                            A celebration of seasonal ingredients, classical technique and modern creativity —
                            now with online ordering and reservations.
                        </p>
                    </div>
                    <div className="footer-col">
                        <h4>Navigate</h4>
                        <Link to="/">Home</Link>
                        <Link to="/about">About</Link>
                        <Link to="/menu">Menu</Link>
                        <Link to="/contact">Contact</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Dining</h4>
                        <Link to="/menu">Order Online</Link>
                        <Link to="/reservations">Reserve a Table</Link>
                        <Link to="/track">Track an Order</Link>
                        <Link to="/contact">Private Events</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Contact</h4>
                        <a><i className="fas fa-phone" style={{ marginRight: 8, fontSize: 12 }} />+1 (555) 123-4567</a>
                        <a><i className="fas fa-envelope" style={{ marginRight: 8, fontSize: 12 }} />hello@saveur.com</a>
                        <a><i className="fas fa-map-marker-alt" style={{ marginRight: 8, fontSize: 12 }} />24 Gastronomy Lane</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <div className="footer-copy">© {new Date().getFullYear()} Saveur. Powered by Phoxta.</div>
                    <div className="footer-social">
                        <a aria-label="Instagram"><i className="fab fa-instagram" /></a>
                        <a aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
                        <a aria-label="TripAdvisor"><i className="fab fa-tripadvisor" /></a>
                        <a aria-label="TikTok"><i className="fab fa-tiktok" /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
