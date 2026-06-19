import { NavLink } from "react-router-dom";
import { MainMenuRootList } from "@/shared/mobile-menu/MobileMenuCloneContext";

type Item = { to: string; label: string };

// "Solutions" = the kinds of businesses you can own on Phoxta. They all open the
// marketplace (the public marketplace lists every blueprint).
const SOLUTIONS_LINKS: Item[] = [
  { to: "/marketplace", label: "Retail & eCommerce" },
  { to: "/marketplace", label: "Restaurants & Food" },
  { to: "/marketplace", label: "Bookings & Rentals" },
  { to: "/marketplace", label: "Travel & Experiences" },
  { to: "/marketplace", label: "Browse all businesses" },
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
        <MenuLink to="/">
          <LinkSwap label="Home" />
        </MenuLink>
      </li>

      <li className="has-dropdown">
        <a href="#" onClick={(e) => e.preventDefault()}>
          <LinkSwap label="Solutions" />
        </a>
        <ul className="at-submenu submenu">
          {SOLUTIONS_LINKS.map((l) => (
            <li key={l.label}>
              <MenuLink to={l.to}>{l.label}</MenuLink>
            </li>
          ))}
        </ul>
      </li>

      <li>
        <MenuLink to="/marketplace">
          <LinkSwap label="Marketplace" />
        </MenuLink>
      </li>

      <li>
        <MenuLink to="/pricing">
          <LinkSwap label="Pricing" />
        </MenuLink>
      </li>

      <li>
        <MenuLink to="/about">
          <LinkSwap label="About" />
        </MenuLink>
      </li>

      <li>
        <MenuLink to="/blog">
          <LinkSwap label="Blog" />
        </MenuLink>
      </li>

      <li>
        <MenuLink to="/invest">
          <LinkSwap label="Invest" />
        </MenuLink>
      </li>
    </MainMenuRootList>
  );
}
