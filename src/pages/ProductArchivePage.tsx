import PageMeta from "@/seo/PageMeta";
import MarketplaceMainGrid from "@/shared/sections/marketplace/MainGrid";

export default function ProductArchivePage() {
  return (
    <>
      <PageMeta
        title="Marketplace — choose a business system | Phoxta"
        description="Preview ready-to-launch business systems, compare what is included and choose one to tailor for your market."
        path="/marketplace"
      />
      {/* Hero removed — top padding clears the transparent header. */}
      <div className="pt-150">
        <MarketplaceMainGrid />
      </div>
    </>
  );
}
