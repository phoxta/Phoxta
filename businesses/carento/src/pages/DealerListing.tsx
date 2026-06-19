import Layout from "@/components/layout/Layout";
import Link from "@/components/common/Link";
import { useOrgContent } from "@/util/content";
import { fetchPartners, type Partner } from "@/lib/phoxta";

const FALLBACK: Partner[] = [
    { id: "1", name: "City Auto Group", role: "Premium dealer", location: "Manchester, UK", rating: 4.8, image_url: null, handle: "city-auto-group" },
    { id: "2", name: "Coastline Motors", role: "Dealer", location: "Sydney, AU", rating: 4.7, image_url: null, handle: "coastline-motors" },
    { id: "3", name: "Alpine Rentals", role: "Partner fleet", location: "Zurich, CH", rating: 4.9, image_url: null, handle: "alpine-rentals" },
];

export default function DealerListing() {
    const partners = useOrgContent(fetchPartners, FALLBACK);
    return (
        <Layout footerStyle={1}>
            <div>
                <section className="section-box pt-80 pb-80 background-body">
                    <div className="container">
                        <div className="text-center mb-50">
                            <h3 className="neutral-1000">Our dealers & partners</h3>
                            <p className="text-xl-medium neutral-500">Trusted partners providing our fleet.</p>
                        </div>
                        <div className="row">
                            {partners.map((p) => (
                                <div className="col-lg-4 col-md-6 mb-4" key={p.id}>
                                    <Link href={`/dealer-details?handle=${p.handle || ""}`} className="card h-100 border rounded-3 p-4 background-card hover-up d-block text-decoration-none">
                                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-gradient-1 mb-3" style={{ width: 64, height: 64, fontSize: 24 }}>
                                            {p.image_url ? <img src={p.image_url} alt={p.name} width={64} height={64} className="rounded-circle" /> : <span className="neutral-1000 fw-bold">{p.name.charAt(0)}</span>}
                                        </div>
                                        <h6 className="neutral-1000 mb-1">{p.name}</h6>
                                        <p className="text-sm-medium neutral-500 mb-1">{p.role} · {p.location}</p>
                                        <p className="text-sm-bold neutral-1000 mb-0">★ {p.rating}</p>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
