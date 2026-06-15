// Template: a reusable, typed card. Copy to src/shared/cards/<Name>Card.tsx.
// Keep cards presentational: data comes in via props; the section owns the data.
// Reuse existing cards first (PortfolioCard1..4, ArticleCard1..4, TeamCard1/2, ProductCard).

import { Link } from "react-router-dom";

export type FeatureCardProps = {
  classList?: string;
  link: string;
  img: string;
  title: string;
  desc: string;
  tags?: string[];
};

export default function FeatureCard({
  classList = "",
  link,
  img,
  title,
  desc,
  tags = [],
}: FeatureCardProps) {
  return (
    <div className={`feature-card ${classList}`.trim()}>
      <Link to={link} className="d-block rounded-3 overflow-hidden">
        <img
          src={img}
          alt={title}
          width={600}
          height={400}
          className="img-cover w-100 h-100"
          loading="lazy"
        />
      </Link>
      <h5 className="fw-600 mt-20 mb-10">
        <Link to={link}>{title}</Link>
      </h5>
      <p className="fz-font-md neutral-700 mb-10">{desc}</p>
      {tags.length > 0 && (
        <div className="d-flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="border px-3 py-1 rounded-pill fz-font-label">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
