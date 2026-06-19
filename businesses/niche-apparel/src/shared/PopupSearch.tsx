import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const POPULAR_SEARCHES = [
  "Dress",
  "Coat",
  "Knitwear",
  "Shirt",
  "Trousers",
  "Denim",
  "Accessories",
  "New In",
];

interface PopupSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function PopupSearch({ open, onClose }: PopupSearchProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const go = (term: string) => {
    const t = term.trim();
    navigate(t ? `/shop?q=${encodeURIComponent(t)}` : "/shop");
    setQ("");
    onClose();
  };

  return (
    <>
      <div
        className={`at-search-body-overlay ${open ? "active" : ""}`}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close search"
      />
      <div className={`at-search-form-toggle ${open ? "active" : ""}`}>
        <div className="container">
          <div className="row mb-60">
            <div className="col-lg-12">
              <div className="at-search-top d-flex justify-content-between align-items-center">
                <div className="at-header-logo at-search-logo">
                  <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2">
                    <img data-width="30" src="/assets/imgs/template/logo/favicon.svg" alt="Aurelia" />
                    <h6 className="fw-700 fz-24 mb-0">Aurelia</h6>
                  </Link>
                </div>
                <button type="button" className="at-search-close" onClick={onClose} aria-label="Close search">
                  <i className="fa-light fa-xmark" />
                </button>
              </div>
            </div>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-12">
              <div className="at-search-form">
                <form action="#" onSubmit={(e) => { e.preventDefault(); go(q); }}>
                  <div className="at-search-form-input">
                    <input type="text" placeholder="Search the collection…" value={q} onChange={(e) => setQ(e.target.value)} required />
                    <span className="at-search-focus-border" />
                    <button className="at-search-form-btn at-btn" type="submit">
                      <span>
                        <span className="text-1">Search</span>
                        <span className="text-2">Search</span>
                      </span>
                      <i className="icon-arrow-right">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                          <path
                            d="M8.33333 1L13 5.66667M13 5.66667L8.33333 10.3333M13 5.66667H1"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                          <path
                            d="M8.33333 1L13 5.66667M13 5.66667L8.33333 10.3333M13 5.66667H1"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </i>
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="col-12">
              <div className="at-categories">
                <h3 className="at-categories-title">Popular searches</h3>
                <ul className="at-categories-list">
                  {POPULAR_SEARCHES.map((label) => (
                    <li key={label}>
                      <a href="#" className="at-categories-item" onClick={(e) => { e.preventDefault(); if (label === "New In") { navigate("/shop?c=new"); onClose(); } else go(label); }}>
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

