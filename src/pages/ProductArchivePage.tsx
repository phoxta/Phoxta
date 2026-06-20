import PageMeta from "@/seo/PageMeta";
import MarketplaceMainGrid from "@/shared/sections/marketplace/MainGrid";

export default function ProductArchivePage() {
  return (
    <>
      <PageMeta
        title="Marketplace — Browse AI-powered businesses for sale | Phoxta"
        description="Browse Phoxta's marketplace of validated, AI-powered businesses for sale across e-commerce, local services, content, SaaS and more. Find one and make it yours."
        path="/marketplace"
      />
      {/* Hero removed — top padding clears the transparent header. */}
      <div className="pt-150">
        <MarketplaceMainGrid />
      </div>
    </>
  );
}
