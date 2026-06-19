import { Link } from "react-router-dom";
import MainMenu from "@/shared/MainMenu";
import ThemeSwitcher from "@/shared/ThemeSwitcher";

// The site's primary nav — the same "homepage menu section" used on every page.
// `light` renders white over dark backgrounds (homepage hero, dark heros);
// otherwise dark text for light pages. Search + menu buttons use the class
// bridge in MainLayout (.at-search-click / .at-header-sidebar-btn).
type HeaderNavProps = { light?: boolean };

const SEARCH_SVG = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M18.7508 18.5233L13.5538 13.392M13.5538 13.392C14.9604 12.0032 15.7506 10.1196 15.7506 8.15551C15.7506 6.19144 14.9604 4.30782 13.5538 2.91902C12.1472 1.53022 10.2395 0.75 8.25028 0.75C6.26108 0.75 4.35336 1.53022 2.94678 2.91902C1.54021 4.30782 0.75 6.19144 0.75 8.15551C0.75 10.1196 1.54021 12.0032 2.94678 13.392C4.35336 14.7808 6.26108 15.561 8.25028 15.561C10.2395 15.561 12.1472 14.7808 13.5538 13.392Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GRID_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path
      d="M1 2C1 1.73478 1.10536 1.48043 1.29289 1.29289C1.48043 1.10536 1.73478 1 2 1H6C6.26522 1 6.51957 1.10536 6.70711 1.29289C6.89464 1.48043 7 1.73478 7 2V6C7 6.26522 6.89464 6.51957 6.70711 6.70711C6.51957 6.89464 6.26522 7 6 7H2C1.73478 7 1.48043 6.89464 1.29289 6.70711C1.10536 6.51957 1 6.26522 1 6V2ZM11 2C11 1.73478 11.1054 1.48043 11.2929 1.29289C11.4804 1.10536 11.7348 1 12 1H16C16.2652 1 16.5196 1.10536 16.7071 1.29289C16.8946 1.48043 17 1.73478 17 2V6C17 6.26522 16.8946 6.51957 16.7071 6.70711C16.5196 6.89464 16.2652 7 16 7H12C11.7348 7 11.4804 6.89464 11.2929 6.70711C11.1054 6.51957 11 6.26522 11 6V2ZM1 12C1 11.7348 1.10536 11.4804 1.29289 11.2929C1.48043 11.1054 1.73478 11 2 11H6C6.26522 11 6.51957 11.1054 6.70711 11.2929C6.89464 11.4804 7 11.7348 7 12V16C7 16.2652 6.89464 16.5196 6.70711 16.7071C6.51957 16.8946 6.26522 17 6 17H2C1.73478 17 1.48043 16.8946 1.29289 16.7071C1.10536 16.5196 1 16.2652 1 16V12ZM11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11H16C16.2652 11 16.5196 11.1054 16.7071 11.2929C16.8946 11.4804 17 11.7348 17 12V16C17 16.2652 16.8946 16.5196 16.7071 16.7071C16.5196 16.8946 16.2652 17 16 17H12C11.7348 17 11.4804 16.8946 11.2929 16.7071C11.1054 16.5196 11 16.2652 11 16V12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function HeaderNav({ light = false }: HeaderNavProps) {
  const textClass = light ? "text-white" : "neutral-900";
  const logo = light ? "favicon-dark.svg" : "favicon.svg";
  return (
    <header className={`header-transparent at-header-spacing pt-30 pt-md-40 ${textClass}`}>
      <div className="container">
        <div className="row align-items-center">
          <div className="col-6 col-xl-2">
            <div className="at-header-logo">
              <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none">
                <img width={30} height={30} src={`/assets/imgs/template/logo/${logo}`} alt="Phoxta" loading="lazy" />
                <h6 className={`fw-700 fz-24 mb-0 ${textClass}`}>Phoxta</h6>
              </Link>
            </div>
          </div>
          <div className="col-xl-8 mx-auto d-none d-xl-flex justify-content-center">
            <div className={`at-main-menu ${light ? "menu-light" : ""} d-inline-flex justify-content-center`}>
              <nav className="at-mobile-menu-active">
                <MainMenu />
              </nav>
            </div>
          </div>
          <div className="col-6 col-xl-2">
            <div className={`at-header-right gap-3 d-flex justify-content-end align-items-center ${textClass}`}>
              <button type="button" className="at-header-search-btn at-search-click" aria-label="Search">
                {SEARCH_SVG}
              </button>
              <div className={`dark-light-mode ${textClass}`}>
                <ThemeSwitcher />
              </div>
              <button type="button" className="at-menu-bar at-header-sidebar-btn" aria-label="Open menu">
                {GRID_SVG}
              </button>
              <Link
                className={`at-btn rounded-0 d-none d-md-block ${light ? "at-btn-border-white text-white" : "at-btn-border-dark text-dark"}`}
                to="/auth"
              >
                <span>
                  <span className="text-1">Login</span>
                  <span className="text-2">Login</span>
                </span>
              </Link>
              <Link
                className={`at-btn rounded-0 d-none d-md-block ${light ? "bg-white text-dark" : "bg-dark text-white"}`}
                to="/auth?mode=signup"
              >
                <span>
                  <span className="text-1">Get started</span>
                  <span className="text-2">Get started</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
