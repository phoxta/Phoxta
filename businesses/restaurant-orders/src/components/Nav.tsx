import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useCart } from "@/util/cart";

const LINKS: [string, string][] = [
    ["/", "Home"],
    ["/about", "About"],
    ["/menu", "Menu"],
    ["/reservations", "Reservations"],
    ["/contact", "Contact"],
];

export default function Nav() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { count, setOpen } = useCart();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <>
            <nav className={`nav${scrolled ? " scrolled" : ""}`}>
                <div className="container">
                    <div className="nav-inner">
                        <Link to="/" className="nav-logo" data-brand-name>Saveur</Link>
                        <div className="nav-links">
                            {LINKS.map(([to, label]) => (
                                <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
                                    {label}
                                </NavLink>
                            ))}
                            <Link to="/reservations" className="nav-cta">Reserve a Table</Link>
                            <button className="nav-cart" onClick={() => setOpen(true)} aria-label="Cart">
                                <i className="fas fa-shopping-bag" />
                                {count > 0 && <span className="nav-cart-count">{count}</span>}
                            </button>
                            <button className={`nav-hamburger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
                                <span /><span /><span />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
                {LINKS.map(([to, label]) => (
                    <Link key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>
                ))}
                <Link to="/menu" className="nav-cta" onClick={() => setMenuOpen(false)}>Order Online</Link>
            </div>
        </>
    );
}
