import RLink from "@/components/common/RLink";

const CATS = [
    { img: "/images/section/collections-banner.jpg", name: "Storage Solutions" },
    { img: "/images/section/collections-banner-1.jpg", name: "Lighting" },
    { img: "/images/section/collections-banner-2.jpg", name: "Office Chairs" },
    { img: "/images/section/collections-banner-3.jpg", name: "Accessories" },
    { img: "/images/section/collections-banner-4.jpg", name: "Decor Office" },
];

export default function Categories() {
    return (
        <section className="flat-spacing-2">
            <div className="container-full">
                <div className="row">
                    <div className="col-12">
                        <div className="text-center flat-spacing pt-0 line-bottom-container">
                            <div className="wrap-cls-img">
                                {CATS.map((c) => (
                                    <div key={c.name} className="cls-img-item hover-img">
                                        <div className="image img-style">
                                            <img src={c.img} alt={c.name} width={280} height={280} />
                                        </div>
                                        <h3><RLink className="link" to="shop-default.html">{c.name}</RLink></h3>
                                    </div>
                                ))}
                            </div>
                            <RLink to="shop-default.html" className="btn-line"><span>View All Categories</span></RLink>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
