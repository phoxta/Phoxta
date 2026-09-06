import { useEffect, useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BRAND, STORE } from "@/config/brand";
import { IconBag, IconBurger, IconInstagram, IconLeaf, IconSearch, IconTikTok, IconUser } from "@/lib/icons";
import CookieBanner from "@/components/CookieBanner";
import MenuDrawer, { type NavLink as NavLinkItem } from "@/components/MenuDrawer";
import MiniCart from "@/components/MiniCart";
import Newsletter from "@/components/Newsletter";
import SearchPalette from "@/components/SearchPalette";
import SkinAdvisor from "@/components/SkinAdvisor";
import Toasts from "@/components/Toasts";
import { useAccount } from "@/state/account";
import { useCatalog, useMoney } from "@/state/catalog";
import { useCart } from "@/state/cart";
import { useUi } from "@/state/ui";

/** The store shell: announcement, header, overlays, footer and the advisor.
 *  Rendered once around every route so the bag and the open drawer survive
 *  navigation. */
export default function StoreLayout() {
    const { products, businessName } = useCatalog();
    const { count } = useCart();
    const { overlay, open, close } = useUi();
    const { email } = useAccount();
    const money = useMoney();
    const { pathname, search } = useLocation();

    const name = businessName || BRAND.name;

    // A new route starts at the top, and never behind an open drawer.
    useEffect(() => {
        window.scrollTo({ top: 0 });
        close();
    }, [pathname, search, close]);

    const links = useMemo<NavLinkItem[]>(
        () => [
            { to: "/shop", label: "Shop", count: products.length },
            { to: "/shop?cat=face", label: "Face", count: products.filter((p) => p.category === "face").length },
            { to: "/shop?cat=body", label: "Body", count: products.filter((p) => p.category === "body").length },
            { to: "/journal", label: "Journal" },
            { to: "/about", label: "Our story" },
        ],
        [products],
    );

    const current = pathname + search;

    return (
        <>
            <div className="announce">
                <b>Free UK delivery over {money(STORE.freeShippingThresholdCents)}</b> · Use code <b>WELCOME10</b> for
                10% off your first order
            </div>

            <header className="header">
                <div className="wrap">
                    <button
                        type="button"
                        className="icon-btn burger m-only"
                        onClick={() => open("menu")}
                        aria-label="Menu"
                    >
                        <IconBurger />
                    </button>

                    <Link className="logo" to="/">
                        <span className="mark">
                            <IconLeaf />
                        </span>
                        {name}
                    </Link>

                    <nav className="menu" aria-label="Primary">
                        {links.map((l) => (
                            <Link key={l.to + l.label} to={l.to} className={current === l.to ? "on" : undefined}>
                                {l.label}
                                {l.count ? <sup>{l.count}</sup> : null}
                            </Link>
                        ))}
                    </nav>

                    <div className="right">
                        <button
                            type="button"
                            className="icon-btn search"
                            onClick={() => open("search")}
                            aria-label="Search"
                        >
                            <IconSearch />
                        </button>
                        <NavLink className="icon-btn" to="/account" aria-label="Account" title={email ?? "Sign in"}>
                            <IconUser />
                        </NavLink>
                        <button type="button" className="cart-pill" onClick={() => open("cart")}>
                            Cart
                            <span className="c">
                                <IconBag />
                                <b className="cart-count">{count || ""}</b>
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            <button
                type="button"
                className={`overlay${overlay ? " open" : ""}`}
                onClick={close}
                tabIndex={overlay ? 0 : -1}
                aria-label="Close"
            />
            <MiniCart />
            <MenuDrawer links={links} />
            <SearchPalette />

            <main>
                <Outlet />
            </main>

            <Newsletter />

            <footer className="footer">
                <div className="wrap">
                    <div className="top">
                        <div>
                            <Link className="logo" to="/">
                                <span className="mark">
                                    <IconLeaf />
                                </span>
                                {name}
                            </Link>
                            <p>{BRAND.description}</p>
                        </div>
                        <div>
                            <h5>Shop</h5>
                            <ul>
                                <li>
                                    <Link to="/shop?cat=face">Face</Link>
                                </li>
                                <li>
                                    <Link to="/shop?cat=body">Body</Link>
                                </li>
                                <li>
                                    <Link to="/shop?cat=sets">Sets &amp; gifts</Link>
                                </li>
                                <li>
                                    <Link to="/shop?refill=1">Refills</Link>
                                </li>
                                <li>
                                    <Link to="/shop?sort=new">New in</Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h5>Company</h5>
                            <ul>
                                <li>
                                    <Link to="/about">Our story</Link>
                                </li>
                                <li>
                                    <Link to="/about#ingredients">Ingredients</Link>
                                </li>
                                <li>
                                    <Link to="/about#sustainability">Sustainability</Link>
                                </li>
                                <li>
                                    <Link to="/journal">Journal</Link>
                                </li>
                                <li>
                                    <Link to="/contact">Stockists</Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h5>Help</h5>
                            <ul>
                                <li>
                                    <Link to="/contact#faq">Shipping</Link>
                                </li>
                                <li>
                                    <Link to="/contact#faq">Returns</Link>
                                </li>
                                <li>
                                    <Link to="/track-order">Track order</Link>
                                </li>
                                <li>
                                    <Link to="/contact#faq">FAQ</Link>
                                </li>
                                <li>
                                    <Link to="/contact">Contact</Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="bottom">
                        <div>
                            © {new Date().getFullYear()} {BRAND.legalName} · Registered in England ·{" "}
                            <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
                        </div>
                        <div className="soc">
                            <a href="https://instagram.com" aria-label="Instagram" rel="noreferrer noopener" target="_blank">
                                <IconInstagram />
                            </a>
                            <a href="https://tiktok.com" aria-label="TikTok" rel="noreferrer noopener" target="_blank">
                                <IconTikTok />
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            <CookieBanner />
            <Toasts />
            <SkinAdvisor />
        </>
    );
}
