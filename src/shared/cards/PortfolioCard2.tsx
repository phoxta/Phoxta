import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import SitePreviewModal from "@/shared/elements/SitePreviewModal";

const PLUS_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="11" viewBox="0 0 12 11" fill="none">
    <path d="M4.512 10.8V0H6.984V10.8H4.512ZM0 6.6V4.2H11.52V6.6H0Z" fill="currentColor" />
  </svg>
);

export type PortfolioCard2Props = {
  classList?: string;
  category: string;
  link: string;
  img: string;
  title: string;
  headline: string;
  description: string;
  linkCase: string;
  featuredHtml?: ReactNode;
  /** Original price shown struck-through before `title` (promo display). */
  compareAt?: string;
  /** Small promo pill shown on the image, e.g. "35% OFF". */
  dealLabel?: string;
};

export default function PortfolioCard2({
  classList = "",
  category,
  link,
  img,
  title,
  headline,
  description,
  linkCase,
  featuredHtml,
  compareAt,
  dealLabel,
}: PortfolioCard2Props) {
  // External links are live demo sites — open them in the in-page preview
  // popup instead of navigating away. Internal links keep SPA navigation.
  const external = /^https?:\/\//.test(link);
  const [preview, setPreview] = useState(false);
  const openPreview = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let the browser open a real tab
    e.preventDefault();
    setPreview(true);
  };
  const CardLink = ({ className, children }: { className: string; children: ReactNode }) =>
    external ? (
      <a href={link} onClick={openPreview} className={className}>
        {children}
      </a>
    ) : (
      <Link to={link} className={className}>
        {children}
      </Link>
    );
  return (
    <div
      className={`alt-portfolio-item card-portfolio mb-50 at-hover-item ${classList}`.trim()}
      data-category={category}
    >
      <CardLink className="alt-portfolio-thumb mb-15 p-relative fix d-block">
        <img src={img} alt={title} width={600} height={400} className="w-100 img-cover" />
        <span className="alt-portfolio-btn">
          <div className="content changeless">
            <span className="bg-transparent text-uppercase border px-3 py-2 rounded-pill common-white fz-font-label">
              {category}
            </span>
            <h4 className="fw-400 text-white mb-0 mt-15">{headline}</h4>
            <p className="text-white fz-font-md mb-0 mt-10 text-truncate-3 des pr-250">{description}</p>
          </div>
        </span>
        {dealLabel && (
          <span className="alt-portfolio-tag bg-danger px-3 py-2 rounded-pill p-absolute top-0 start-0 m-4 fz-10 fw-600 text-white">
            {dealLabel}
          </span>
        )}
        {featuredHtml}
      </CardLink>
      <div className="alt-portfolio-content d-flex justify-content-between">
        <h5 className="alt-portfolio-title mb-0 fw-600">
          <CardLink className="common-underline">
            {compareAt && (
              <del className="neutral-500 fw-400 me-2" aria-label={`Was ${compareAt}`}>
                {compareAt}
              </del>
            )}
            {title}
          </CardLink>
        </h5>
        <Link to={linkCase} className="alt-portfolio-plus neutral-950 d-flex align-items-center gap-2">
          <span className="fz-font-label neutral-900 text-uppercase fw-600">View case</span>
          {PLUS_SVG}
        </Link>
      </div>
      {external && (
        <SitePreviewModal url={link} title={headline} open={preview} onClose={() => setPreview(false)} />
      )}
    </div>
  );
}
