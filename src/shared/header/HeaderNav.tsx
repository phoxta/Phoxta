import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import "@/styles/phoxta-landing.css";

const NAVIGATION_LINKS = [
  { to: "/discover", label: "Opportunities" },
  { to: "/businesses", label: "Ready-to-Launch Businesses" },
  { to: "/startup-school", label: "Startup-School" },
  { to: "/resources", label: "Resources" },
  { to: "/pricing", label: "Pricing" },
] as const;

type HeaderNavProps = {
  /** Retained for compatibility with the layout's shared header interface. */
  light?: boolean;
  /** Existing public-page heroes reserve space for an overlaid header. */
  placement?: "overlay" | "inline";
};

export default function HeaderNav({ placement = "overlay" }: HeaderNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className={`phoxta-navigation phoxta-navigation--${placement}`}>
      <div className="phoxta-navigation__inner">
        <Link to="/" className="phoxta-navigation__brand" aria-label="Phoxta home" onClick={() => setMenuOpen(false)}>
          Phoxta
        </Link>
        <nav id={menuId} className="phoxta-navigation__links" aria-label="Primary navigation" data-open={menuOpen}>
          {NAVIGATION_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="phoxta-navigation__actions">
          <Link to="/auth" className="phoxta-navigation__auth phoxta-navigation__auth--signin" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
          <Link to="/auth?mode=signup" className="phoxta-navigation__auth phoxta-navigation__auth--register" onClick={() => setMenuOpen(false)}>
            Register
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="phoxta-navigation__toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
