import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RLink from "@/components/common/RLink";
import { useCart } from "@/util/cart";
import { useWishlist } from "@/util/wishlist";

// Main site header (logo, primary nav, account/cart icons). Converted from the
// template; the mega-menu is represented by top-level dropdowns wired to routes.
const SHOP_LINKS = [
    ["shop-default.html", "Shop Default"],
    ["shop-list.html", "Shop List"],
    ["shop-full-grid.html", "Shop Full Grid"],
    ["shop-sidebar-left.html", "Shop Sidebar Left"],
    ["shop-filter-sidebar.html", "Shop Filter Sidebar"],
];
const PAGE_LINKS = [
    ["about.html", "About Us"],
    ["contact.html", "Contact"],
    ["store-list.html", "Store List"],
    ["faqs.html", "FAQs"],
    ["my-account.html", "My Account"],
    ["term-of-use.html", "Terms of Use"],
];
const BLOG_LINKS = [
    ["blog-grid.html", "Blog Grid"],
    ["blog-list.html", "Blog List"],
    ["blog-details.html", "Blog Details"],
];

function Dropdown({ label, links }: { label: string; links: string[][] }) {
    return (
        <li className="menu-item">
            <a href="#" className="item-link" onClick={(e) => e.preventDefault()}>
                {label}
                <i className="icon icon-down" />
            </a>
            <div className="sub-menu submenu-default">
                <ul className="menu-list">
                    {links.map(([href, text]) => (
                        <li key={href}>
                            <RLink to={href} className="menu-link-text link">{text}</RLink>
                        </li>
                    ))}
                </ul>
            </div>
        </li>
    );
}

export default function Header() {
    const { count } = useCart();
    const { count: wishCount } = useWishlist();
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(q.trim() ? `/search-result?q=${encodeURIComponent(q.trim())}` : "/search-result");
    };
    return (
        <header id="header" className="header-default">
            <div className="main-header">
                <div className="container-full">
                    <div className="row wrapper-header align-items-center">
                        <div className="col-xl-5 d-none d-xl-block">
                            <nav className="box-navigation text-center">
                                <ul className="box-nav-ul justify-content-start">
                                    <li className="menu-item">
                                        <RLink to="index.html" className="item-link">Home</RLink>
                                    </li>
                                    <Dropdown label="Shop" links={SHOP_LINKS} />
                                    <li className="menu-item">
                                        <RLink to="product-detail.html" className="item-link">Products</RLink>
                                    </li>
                                    <Dropdown label="Pages" links={PAGE_LINKS} />
                                    <Dropdown label="Blog" links={BLOG_LINKS} />
                                    <li className="menu-item">
                                        <RLink to="contact.html" className="item-link">Contact</RLink>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                        <div className="col-md-4 col-2 d-xl-none">
                            <a href="#mobileMenu" className="mobile-menu" onClick={(e) => e.preventDefault()}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 256 256">
                                    <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z" />
                                </svg>
                            </a>
                        </div>
                        <div className="col-xl-2 col-md-4 col-8 text-center">
                            <RLink to="index.html" className="logo-header">
                                <img src="/images/logo/logo.svg" alt="Gearo" className="logo" width={142} height={32} data-brand-logo />
                            </RLink>
                        </div>
                        <div className="col-xl-5 col-md-4 col-2">
                            <ul className="nav-icon">
                                <li className="nav-search">
                                    <form onSubmit={onSearch} className="d-flex align-items-center" style={{ border: "1px solid #e5e5e5", borderRadius: 999, padding: "2px 4px 2px 12px" }}>
                                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="d-none d-md-inline-block" style={{ border: 0, outline: "none", background: "transparent", width: 150, fontSize: 14 }} />
                                        <button type="submit" className="nav-icon-item" aria-label="Search" style={{ border: 0, background: "none", cursor: "pointer" }}><span className="icon icon-search" /></button>
                                    </form>
                                </li>
                                <li className="nav-account">
                                    <RLink to="login.html" className="nav-icon-item"><span className="icon icon-user" /></RLink>
                                </li>
                                <li className="nav-wishlist">
                                    <RLink to="wish-list.html" className="nav-icon-item">
                                        <span className="icon icon-heart" />
                                        {wishCount > 0 && <span className="count-box text-button-small">{wishCount}</span>}
                                    </RLink>
                                </li>
                                <li className="nav-cart">
                                    <RLink to="shopping-cart.html" className="nav-icon-item">
                                        <span className="icon icon-cart" />
                                        <span className="count-box text-button-small">{count}</span>
                                    </RLink>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
