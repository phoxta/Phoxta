import { NavLink } from "react-router-dom";
import { MainMenuRootList } from "@/shared/mobile-menu/MobileMenuCloneContext";

type Item = { to: string; label: string };

const SHOP_LINKS: Item[] = [
    { to: "/shop", label: "All Products" },
    { to: "/shop?c=woman", label: "Women" },
    { to: "/shop?c=man", label: "Men" },
    { to: "/shop?c=new", label: "New Arrivals" },
    { to: "/shop?c=sale", label: "Sale" },
    { to: "/track-order", label: "Track Order" },
];

function MenuLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <NavLink to={to} className={({ isActive }) => (isActive ? "active" : undefined)}>
            {children}
        </NavLink>
    );
}

function LinkSwap({ label }: { label: string }) {
    return (
        <span className="at-link-swap">
            <span className="text-1">{label}</span>
            <span className="text-2">{label}</span>
        </span>
    );
}

export default function MainMenu() {
    return (
        <MainMenuRootList>
            <li>
                <MenuLink to="/"><LinkSwap label="Home" /></MenuLink>
            </li>

            <li className="has-dropdown">
                <a href="#" onClick={(e) => e.preventDefault()}><LinkSwap label="Shop" /></a>
                <ul className="at-submenu submenu">
                    {SHOP_LINKS.map((l) => (
                        <li key={l.label}><MenuLink to={l.to}>{l.label}</MenuLink></li>
                    ))}
                </ul>
            </li>

            <li><MenuLink to="/shop?c=woman"><LinkSwap label="Women" /></MenuLink></li>
            <li><MenuLink to="/shop?c=man"><LinkSwap label="Men" /></MenuLink></li>
            <li><MenuLink to="/about"><LinkSwap label="About" /></MenuLink></li>
            <li><MenuLink to="/contact"><LinkSwap label="Contact" /></MenuLink></li>
        </MainMenuRootList>
    );
}
