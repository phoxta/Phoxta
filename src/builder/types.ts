import type { Data } from "@measured/puck";

/**
 * Layout chrome for a built page. These live on the Puck document `root.props`
 * and mirror the knobs `MainLayout` already accepts, so a published page renders
 * with the exact same header/footer/scroll system as a hand-built Phoxta page.
 */
export type PageLayoutProps = {
  title: string;
  headerStyle: number;
  footerStyle: number;
  noHeader: boolean;
  noFooter: boolean;
  mainClass: string;
};

export const DEFAULT_LAYOUT: PageLayoutProps = {
  title: "Untitled page",
  headerStyle: 1,
  footerStyle: 1,
  noHeader: false,
  noFooter: false,
  mainClass: "bg-neutral-0",
};

/**
 * The canonical page document. This single JSON shape is the source of truth
 * shared by the four surfaces that touch a page:
 *   - the Puck drag-and-drop editor,
 *   - the runtime <PageRenderer/> (preview + published storefront),
 *   - the AI `page_edit` action,
 *   - the conversational voice agent.
 * It is exactly Puck's `Data` (root props + an ordered `content` array of blocks),
 * which is what gets persisted into `cms_pages.document`.
 */
export type PageDocument = Data;

/** A fresh, empty document with sensible layout defaults. */
export function emptyDocument(layout: Partial<PageLayoutProps> = {}): PageDocument {
  return {
    root: { props: { ...DEFAULT_LAYOUT, ...layout } },
    content: [],
    zones: {},
  } as PageDocument;
}
