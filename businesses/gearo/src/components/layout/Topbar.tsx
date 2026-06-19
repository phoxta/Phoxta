import RLink from "@/components/common/RLink";

// Top announcement bar (converted from the template topbar).
export default function Topbar() {
    return (
        <div className="tf-topbar">
            <div className="container-full">
                <div className="row">
                    <div className="col-xl-4">
                        <div className="topbar-left d-none d-xl-flex">
                            <div className="tf-languages">
                                <select className="image-select center style-default color-white type-languages" defaultValue="English">
                                    <option>English</option>
                                    <option>Vietnam</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-4">
                        <div className="text-center">
                            <p className="text-caption-1 text_white">
                                Free shipping on all orders over <span className="text_primary">$20.00</span>
                            </p>
                        </div>
                    </div>
                    <div className="col-xl-4">
                        <div className="topbar-right justify-content-end d-none d-xl-flex">
                            <RLink to="about.html" className="text_white text-caption-1 link">About</RLink>
                            <RLink to="contact.html" className="text_white text-caption-1 link">Contact</RLink>
                            <RLink to="store-list.html" className="text_white text-caption-1 link">Location</RLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
