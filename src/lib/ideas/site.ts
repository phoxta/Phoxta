import { PAGE_TEMPLATES } from "@/builder/templates/generated";
import { emptyDocument, type PageDocument } from "@/builder/types";

/**
 * Turn a validated idea into a multipage Studio site.
 *
 * Studio already holds Phoxta's whole section library — 228 generated manifests
 * plus 35 seed ones — so a generated site is assembled from those rather than
 * imported as foreign HTML. It lands as ordinary Studio pages: editable in the
 * builder, publishable through the pipeline that already exists, and in
 * Phoxta's own design system rather than a template pack's.
 *
 * THE CONSTRAINT THAT SHAPES THIS FILE: only five registered sections currently
 * accept content. The rest were registered render-as-is — their copy is
 * hardcoded in the component, and `<Section2 />` takes no props at all. So a
 * page stuffed with those would look convincing and describe somebody else's
 * business, which is worse than a shorter page that is true.
 *
 * Each page therefore LEADS with a section that takes the idea's own words, and
 * only then uses render-as-is sections for texture. Widening this is a matter of
 * parameterising more sections the way about-1/Section1 was — props with
 * defaults preserving the original copy, so existing pages are unaffected.
 */

/** The generated copy the website step produces. */
export type WebsiteCopy = {
  brandName?: string;
  tagline?: string;
  hero?: { headline?: string; subhead?: string; cta?: string };
  sections?: { heading?: string; body?: string }[];
  features?: { title?: string; body?: string }[];
  faqs?: { q?: string; a?: string }[];
  palette?: { primary?: string; accent?: string; ink?: string };
  templateHint?: string;
};

export type PlannedPage = {
  title: string;
  slug: string;
  document: PageDocument;
  /** Sections on this page that carry the business's own words. */
  contentSections: number;
};

const block = (type: string, index: number, props: Record<string, unknown> = {}) => ({
  type,
  props: { id: `${type}-${index}`, ...props },
});

const layout = (title: string) => ({
  props: { title, headerStyle: 2, footerStyle: 2, noHeader: false, noFooter: false, mainClass: "bg-neutral-0" },
});

/**
 * Sections from a starter template, minus its hero.
 *
 * The 50 page templates are complete pages of real Phoxta sections. Borrowing
 * their body gives a generated site the texture of a designed page; dropping the
 * first block leaves room for a hero that speaks about this business rather than
 * the template's.
 */
function bodyFrom(slug: string, take: number): ReturnType<typeof block>[] {
  const tpl = PAGE_TEMPLATES.find((t) => t.slug === slug);
  const content = ((tpl?.document as { content?: { type: string; props?: Record<string, unknown> }[] })?.content ?? []);
  return content.slice(1, 1 + take).map((b, i) => block(b.type, i + 10, b.props ?? {}));
}

/**
 * Plan the site.
 *
 * Pages are dropped rather than padded when the idea has nothing to say on them
 * — no FAQ copy means no FAQ page, instead of a page of invented questions.
 */
export function planSite(copy: WebsiteCopy, ideaSeed: string): PlannedPage[] {
  const brand = (copy.brandName || "").trim() || "Your business";
  const tagline = (copy.tagline || "").trim();
  const hero = copy.hero ?? {};
  const pages: PlannedPage[] = [];

  // ── Home ────────────────────────────────────────────────────────────────
  // ServicesIntro is used as the hero here because it is one of the few
  // sections that accepts a heading, and a home page that opens with the
  // business's own line is the whole point.
  pages.push({
    title: brand,
    slug: "home",
    contentSections: 1,
    document: {
      root: layout(brand),
      content: [
        block("ServicesIntro", 0, {
          heading: hero.headline || tagline || brand,
        }),
        ...bodyFrom("home-1", 4),
      ],
      zones: {},
    } as PageDocument,
  });

  // ── About ───────────────────────────────────────────────────────────────
  const firstSection = copy.sections?.[0];
  pages.push({
    title: "About",
    slug: "about",
    contentSections: 1,
    document: {
      root: layout(`About ${brand}`),
      content: [
        block("AboutHero1", 0, {
          eyebrow: "About us",
          heading: firstSection?.heading || tagline || `About ${brand}`,
          subheading: firstSection?.body || ideaSeed,
        }),
        ...bodyFrom("about-1", 3),
      ],
      zones: {},
    } as PageDocument,
  });

  // ── Services ────────────────────────────────────────────────────────────
  if ((copy.features ?? []).length > 0) {
    pages.push({
      title: "Services",
      slug: "services",
      contentSections: 1,
      document: {
        root: layout(`${brand} — Services`),
        content: [
          block("ServicesIntro", 0, { heading: copy.features?.[0]?.title || "What we do" }),
          ...bodyFrom("services-1", 4),
        ],
        zones: {},
      } as PageDocument,
    });
  }

  // ── FAQ ─────────────────────────────────────────────────────────────────
  // Only when the idea actually produced questions. An FAQ page of invented
  // answers is worse than no FAQ page.
  const faqs = (copy.faqs ?? []).filter((f) => f.q);
  if (faqs.length > 0) {
    pages.push({
      title: "FAQs",
      slug: "faqs",
      contentSections: 2,
      document: {
        root: layout(`${brand} — FAQs`),
        content: [
          block("FaqHero1", 0, {
            eyebrow: "FAQs",
            heading: "Questions people ask",
            subtitle: `The things customers want to know about ${brand}.`,
          }),
          block("FaqTopics1", 1, {
            heading: "Answers",
            topics: faqs.slice(0, 6).map((f, i) => ({
              number: String(i + 1).padStart(2, "0"),
              title: f.q ?? "",
              description: f.a ?? "",
              href: "#",
            })),
          }),
        ],
        zones: {},
      } as PageDocument,
    });
  }

  // ── Contact ─────────────────────────────────────────────────────────────
  pages.push({
    title: "Contact",
    slug: "contact",
    contentSections: 1,
    document: {
      root: layout(`Contact ${brand}`),
      content: [
        block("ServicesIntro", 0, { heading: `Talk to ${brand}` }),
        ...bodyFrom("contact-1", 3),
      ],
      zones: {},
    } as PageDocument,
  });

  return pages;
}

/** A blank page, for when the idea has produced no website copy yet. */
export const blankPage = (title: string): PageDocument => emptyDocument({ title });
