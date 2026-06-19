import { NavLink } from "react-router-dom";
import { MainMenuRootList } from "@/shared/mobile-menu/MobileMenuCloneContext";

type Item = { to: string; label: string };

const SOLUTIONS_LINKS: Item[] = [
  { to: "/index-4", label: "Phoxta AI & Tech" },
  { to: "/index-7", label: "Startup Accelerator" },
  { to: "/index-3", label: "Marketing" },
  { to: "/index-9", label: "Brand Design" },
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
