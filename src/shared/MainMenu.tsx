import { NavLink } from "react-router-dom";
import { MainMenuRootList } from "@/shared/mobile-menu/MobileMenuCloneContext";

type Item = { to: string; label: string };

const RESOURCE_LINKS: Item[] = [
  { to: "/founder", label: "Founder Toolkit" },
  { to: "/blog", label: "Insights" },
  { to: "/faqs", label: "FAQs" },
];

function MenuLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
      {children}
    </NavLink>
  );
}

function LinkSwap({ label }: { label: string }) {
  return <span className="at-link-swap"><span className="text-1">{label}</span><span className="text-2">{label}</span></span>;
}

/** Four decisions for a first-time visitor. Deeper services remain available
 * through Resources and contextual pages instead of competing with purchase. */
export default function MainMenu() {
  return (
    <MainMenuRootList>
      <li><MenuLink to="/marketplace"><LinkSwap label="Businesses" /></MenuLink></li>
      <li><MenuLink to="/startup-school"><LinkSwap label="Startup School" /></MenuLink></li>
      <li className="has-dropdown">
        <a href="#" aria-haspopup="true" onClick={(e) => e.preventDefault()}><LinkSwap label="Resources" /></a>
        <ul className="at-submenu submenu">
          {RESOURCE_LINKS.map((link) => <li key={link.label}><MenuLink to={link.to}>{link.label}</MenuLink></li>)}
        </ul>
      </li>
    </MainMenuRootList>
  );
}
