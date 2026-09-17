import { NavLink } from "react-router-dom";
import { MainMenuRootList } from "@/shared/mobile-menu/MobileMenuCloneContext";

type Item = { to: string; label: string };

const SOLUTIONS_LINKS: Item[] = [
  { to: "/ai-tech", label: "Phoxta AI & Tech" },
  { to: "/startup-school", label: "Startup School" },
  { to: "/marketing", label: "Marketing" },
  { to: "/brand-design", label: "Brand Design" },
];

// The free Founder Toolkit gets its own top-level entry rather than a slot in
// Solutions: it is a product people use, not a service we sell, and it is the
// main way a first-time founder meets Phoxta.
const FOUNDER_LINK: Item = { to: "/founder", label: "Founder Toolkit" };

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
        <MenuLink to={FOUNDER_LINK.to}>
          <LinkSwap label={FOUNDER_LINK.label} />
        </MenuLink>
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
        <MenuLink to="/blog">
          <LinkSwap label="Blog" />
        </MenuLink>
      </li>

      <li>
        <MenuLink to="/faqs">
          <LinkSwap label="FAQs" />
        </MenuLink>
      </li>

      <li>
        <MenuLink to="/contact">
          <LinkSwap label="Contact" />
        </MenuLink>
      </li>
    </MainMenuRootList>
  );
}
