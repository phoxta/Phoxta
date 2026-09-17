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
  // `end` on "/" only: every path is nested under "/", so without it react-router
  // marks Home active on every page. Other entries keep prefix matching on
  // purpose, so /founder/tool/idea-scorecard still lights up "Founder Toolkit".
  return (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
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
      {/* No "Home" entry: the logo to its left already goes home, and at 1440px
          the eight-item menu wrapped onto a second line under the logo. */}

      {/* The trigger stays an <a> so it keeps the menu's link styling and stays
          tab-focusable; it announces itself as a menu via aria-haspopup, and the
          panel opens on :focus-within (main.css) so keyboard users can reach it —
          previously the submenu was hover-only and unreachable without a mouse. */}
      <li className="has-dropdown">
        <a href="#" aria-haspopup="true" onClick={(e) => e.preventDefault()}>
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

      {/* FAQs lives in the footer's Product column rather than the primary nav —
          it is a support destination, not a step in the buying path. */}

      <li>
        <MenuLink to="/contact">
          <LinkSwap label="Contact" />
        </MenuLink>
      </li>
    </MainMenuRootList>
  );
}
