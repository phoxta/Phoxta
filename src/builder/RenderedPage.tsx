import MainLayout from "@/layouts/MainLayout";
import PageRenderer from "./PageRenderer";
import type { PageDocument } from "./types";

/**
 * Renders a built page exactly as it ships: the document's sections inside the
 * real MainLayout chrome (header/footer per the document's layout props) with
 * GlobalEffects + ScrollSmoother. Used by the Studio preview and the public
 * storefront route, so "preview" and "live" are the same render path.
 */
export default function RenderedPage({ doc }: { doc: PageDocument }) {
  const p = ((doc as { root?: { props?: Record<string, unknown> } }).root?.props ?? {}) as {
    headerStyle?: number;
    footerStyle?: number;
    noHeader?: boolean;
    noFooter?: boolean;
    mainClass?: string;
  };
  return (
    <MainLayout
      headerStyle={p.headerStyle}
      footerStyle={p.footerStyle}
      noHeader={p.noHeader}
      noFooter={p.noFooter}
      mainClass={p.mainClass}
    >
      <PageRenderer data={doc} />
    </MainLayout>
  );
}
