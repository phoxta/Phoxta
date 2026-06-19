import Layout from "@/components/layout/Layout";
import CarCard1 from "@/components/elements/carcard/CarCard1";
import { useSearchParams } from "react-router-dom";
import { useFleet } from "@/util/fleet";
import { useOrgContent } from "@/util/content";
import { fetchPartners, type Partner } from "@/lib/phoxta";

const FALLBACK: Partner[] = [{ id: "1", name: "City Auto Group", role: "Premium dealer", location: "Manchester, UK", rating: 4.8, image_url: null, handle: "city-auto-group" }];

export default function DealerDetails() {
    const [sp] = useSearchParams();
    const handle = sp.get("handle");
    const partners = useOrgContent(fetchPartners, FALLBACK);
    const { cars } = useFleet();
    const dealer = partners.find((p) => p.handle === handle) ?? partners[0];

    return (
        <Layout footerStyle={1}>
            <div>
                <section className="section-box pt-80 pb-40 background-body">
                    <div className="container">
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <div className="d-flex align-items-center justify-content-center rounded-circle bg-gradient-1" style={{ width: 72, height: 72, fontSize: 28 }}>
                                <span className="neutral-1000 fw-bold">{dealer?.name?.charAt(0)}</span>
                            </div>
                            <div>
                                <h3 className="neutral-1000 mb-1">{dealer?.name}</h3>
                                <p className="text-md-medium neutral-500 mb-0">{dealer?.role} · {dealer?.location} · ★ {dealer?.rating}</p>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="section-box pb-80 background-body">
                    <div className="container">
                        <h5 className="neutral-1000 mb-3">Available vehicles</h5>
                        <div className="row">
                            {cars.slice(0, 8).map((car) => (
                                <div className="col-lg-3 col-md-6 mb-4" key={car.id}><CarCard1 car={car} /></div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
