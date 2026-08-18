import { Link } from "react-router-dom";
import { CATEGORY_LABELS, getAdjacent, type Article, type ArticleBlock } from "@/data/articles";

// blog-article section 1 — the individual article layout.
// Same visual structure as the original blog-details/Section1, but driven by an
// Article from src/data/articles.ts instead of hard-coded placeholder copy.

const CHEVRON_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="11" viewBox="0 0 6 11" fill="none">
        <path
            d="M0.666992 0.666672L5.33366 5.33334L0.666992 10"
            stroke="#585959"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const TWITTER_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 15" fill="none" aria-hidden="true">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 0H5.25L8.98421 5.21053L13.5 0H15.5L9.8895 6.47368L16 15H10.75L7.01579 9.7895L2.5 15H0.5L6.11053 8.52632L0 0ZM11.5204 13.5L2.92043 1.5H4.47957L13.0796 13.5H11.5204Z"
            fill="currentColor"
        />
    </svg>
);

const FACEBOOK_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
            d="M12.4024 18V11.0344H14.7347L15.0838 8.3265H12.4024V6.59765C12.4024 5.81364 12.62 5.27934 13.7443 5.27934L15.1783 5.27867V2.85676C14.9302 2.82382 14.0791 2.75006 13.0888 2.75006C11.0213 2.75006 9.606 4.01198 9.606 6.32952V8.3265H7.2677V11.0344H9.606V18H1C0.44772 18 0 17.5523 0 17V1C0 0.44772 0.44772 0 1 0H17C17.5523 0 18 0.44772 18 1V17C18 17.5523 17.5523 18 17 18H12.4024Z"
            fill="currentColor"
        />
    </svg>
);

const LINKEDIN_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
            d="M17 0H1C0.44772 0 0 0.44772 0 1V17C0 17.5523 0.44772 18 1 18H17C17.5523 18 18 17.5523 18 17V1C18 0.44772 17.5523 0 17 0ZM5.34 15.34H2.67V6.96H5.34V15.34ZM4.005 5.79C3.15 5.79 2.46 5.1 2.46 4.245C2.46 3.39 3.15 2.7 4.005 2.7C4.86 2.7 5.55 3.39 5.55 4.245C5.55 5.1 4.86 5.79 4.005 5.79ZM15.34 15.34H12.67V11.26C12.67 10.29 12.65 9.04 11.32 9.04C9.97 9.04 9.76 10.1 9.76 11.19V15.34H7.09V6.96H9.65V8.1H9.69C10.05 7.43 10.92 6.72 12.22 6.72C14.92 6.72 15.34 8.5 15.34 10.81V15.34Z"
            fill="currentColor"
        />
    </svg>
);

const PREV_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none">
        <path
            d="M3.19036 5.64852H13.3333V7.31518H3.19036L7.66033 11.7851L6.48183 12.9636L0 6.48185L6.48183 0L7.66033 1.17851L3.19036 5.64852Z"
            fill="currentColor"
        />
    </svg>
);

const NEXT_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
            d="M12.5 6.5L17.2143 11L12.5 15.5"
            stroke="currentColor"
            strokeWidth="1.28571"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M16.9999 11H4.78564"
            stroke="currentColor"
            strokeWidth="1.28571"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/** Renders one content block. Keys are supplied by the caller. */
function Block({ block }: { block: ArticleBlock }) {
    switch (block.kind) {
        case "lead":
            return <h6 className="fz-font-2xl fw-400 mb-60">{block.text}</h6>;
        case "p":
            return <p className="fz-font-lg neutral-900">{block.text}</p>;
        case "h":
            return <h5 className="fw-600 mt-50 mb-20">{block.text}</h5>;
        case "list":
            return (
                <ul className="fz-font-lg neutral-900 ps-4 mb-40">
                    {block.items.map((item) => (
                        <li key={item} className="mb-2">
                            {item}
                        </li>
                    ))}
                </ul>
            );
        case "quote":
            return (
                <blockquote className="border-start border-3 ps-4 my-50">
                    <p className="fz-font-xl fw-500 neutral-900 fst-italic mb-2">{block.text}</p>
                    {block.cite ? <cite className="neutral-500 fz-font-sm fst-normal">{block.cite}</cite> : null}
                </blockquote>
            );
        case "figure":
            return (
                <figure className="mt-60 mb-60">
                    <img src={block.img} alt={block.alt} width={1200} height={600} className="img-fluid" loading="lazy" />
                    {block.caption ? (
                        <figcaption className="text-center neutral-700 fst-italic mt-2">{block.caption}</figcaption>
                    ) : null}
                </figure>
            );
        case "duo":
            return (
                <div className="row mb-60 mt-40">
                    <div className="col-md-6">
                        <h6 className="fw-600">{block.left.h}</h6>
                        <p className="fz-font-lg neutral-900">{block.left.p}</p>
                    </div>
                    <div className="col-md-6">
                        <h6 className="fw-600">{block.right.h}</h6>
                        <p className="fz-font-lg neutral-900">{block.right.p}</p>
                    </div>
                </div>
            );
        case "table":
            return (
                <figure className="mt-50 mb-60">
                    <div className="table-responsive">
                        <table className="table align-middle">
                            <thead>
                                <tr>
                                    {block.head.map((h) => (
                                        <th key={h} scope="col" className="fw-600 neutral-900">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {block.rows.map((row) => (
                                    <tr key={row[0]}>
                                        {row.map((cell, i) => (
                                            <td key={`${row[0]}-${i}`} className="neutral-900">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {block.caption ? (
                        <figcaption className="neutral-700 fst-italic mt-2 fz-font-sm">{block.caption}</figcaption>
                    ) : null}
                </figure>
            );
    }
}

export default function Section1({ article }: { article: Article }) {
    const { prev, next } = getAdjacent(article.slug);

    return (
        <section className="sec-1-blog-details overflow-hidden pt-150 pb-100">
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-lg-8 mx-auto">
                        <div className="nav-menu d-flex align-items-center gap-2 pb-2">
                            <Link to="/blog" className="nav-menu__item neutral-900">
                                Blog
                            </Link>
                            <span className="nav-menu__item-separator">{CHEVRON_SVG}</span>
                            <span className="nav-menu__item neutral-500">{CATEGORY_LABELS[article.category]}</span>
                        </div>
                        <h2 className="fw-600 lh-1 mb-0">{article.title}</h2>
                        <div className="d-flex flex-column flex-md-row align-items-md-end gap-2 justify-content-between pt-30">
                            <div className="d-flex align-items-center gap-2">
                                <div>
                                    <h6 className="mb-0">{article.author}</h6>
                                    <span className="nav-menu__item fz-font-sm neutral-500">
                                        {article.date} · {article.readMinutes} min read
                                    </span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-4">
                                <span className="nav-menu__item fz-font-label fw-600 neutral-500">
                                    SHARE THIS ARTICLE
                                </span>
                                <ul className="at-social-list list-unstyled d-flex flex-wrap align-items-end gap-md-4 gap-3">
                                    <li>
                                        <a
                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://www.phoxta.com/blog/${article.slug}`)}`}
                                            className="at-social__link d-flex align-items-center gap-2"
                                            aria-label="Share on X"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {TWITTER_SVG}
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://www.phoxta.com/blog/${article.slug}`)}`}
                                            className="at-social__link d-flex align-items-center gap-2"
                                            aria-label="Share on Facebook"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {FACEBOOK_SVG}
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://www.phoxta.com/blog/${article.slug}`)}`}
                                            className="at-social__link d-flex align-items-center gap-2"
                                            aria-label="Share on LinkedIn"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {LINKEDIN_SVG}
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 py-5 text-center">
                        <img
                            src={article.hero}
                            className="img-fluid"
                            alt={article.title}
                            width={1720}
                            height={789}
                            style={{ width: "auto", height: "auto" }}
                            loading="lazy"
                        />
                    </div>
                    <div className="col-lg-8 mx-auto">
                        <div className="content">
                            {article.body.map((block, i) => (
                                <Block key={`${block.kind}-${i}`} block={block} />
                            ))}

                            <div className="border-top-100 py-5 mt-50">
                                <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
                                    <Link to="/blog" className="at-btn filter-btn btn-sm">
                                        {CATEGORY_LABELS[article.category]}
                                    </Link>
                                    <Link to="/marketplace" className="at-btn filter-btn btn-sm">
                                        Browse businesses
                                    </Link>
                                    <Link to="/pricing" className="at-btn filter-btn btn-sm">
                                        Pricing
                                    </Link>
                                </div>
                            </div>

                            <div className="row">
                                {prev ? (
                                    <div className="col-md-5 me-auto d-flex flex-column gap-2">
                                        <Link to={`/blog/${prev.slug}`} aria-label="Previous article">
                                            {PREV_SVG}
                                            <span className="text-uppercase"> Prev</span>
                                        </Link>
                                        <h6 className="fw-600">
                                            <Link to={`/blog/${prev.slug}`}>{prev.title}</Link>
                                        </h6>
                                    </div>
                                ) : null}
                                {next ? (
                                    <div className="col-md-5 ms-auto d-flex flex-column gap-2 text-end">
                                        <Link to={`/blog/${next.slug}`} aria-label="Next article">
                                            <span className="text-uppercase">Next</span>
                                            {NEXT_SVG}
                                        </Link>
                                        <h6 className="fw-600">
                                            <Link to={`/blog/${next.slug}`}>{next.title}</Link>
                                        </h6>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
