import Link from "@/components/common/Link";

export default function Offcanvas({ isOffcanvas, handleOffcanvas }: any) {
    return (
        <>
            <div className={`sidebar-canvas-wrapper perfect-scrollbar button-bg-2 ${isOffcanvas ? "sidebar-canvas-visible" : ""}`}>
                <div className="sidebar-canvas-container">
                    <div className="sidebar-canvas-head">
                        <div className="sidebar-canvas-logo">
                            <Link className="d-flex" href="/">
                                <img className="light-mode" alt="Carento" src="/assets/imgs/template/logo-d.svg" />
                                <img className="dark-mode" alt="Carento" src="/assets/imgs/template/logo-w.svg" />
                            </Link>
                        </div>
                        <div className="sidebar-canvas-lang">
                            <div className="d-inline-block box-dropdown-cart align-middle mr-15">
                                <span className="text-14-medium icon-list icon-account icon-lang">
                                    <span className="text-14-medium arrow-down text-dark invert">EN</span>
                                </span>
                                <div className="dropdown-account">
                                    <ul>
                                        <li>
                                            <Link className="text-sm-medium" href="#">
                                                English
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="text-sm-medium" href="#">
                                                French
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="text-sm-medium" href="#">
                                                Chinese
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="d-inline-block box-dropdown-cart align-middle mr-15">
                                <span className="text-14-medium icon-list icon-cart">
                                    <span className="text-14-medium arrow-down text-dark invert">USD</span>
                                </span>
                                <div className="dropdown-cart">
                                    <ul>
                                        <li>
                                            <Link className="text-sm-medium" href="#">
                                                USD
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="text-sm-medium" href="#">
                                                EUR
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="text-sm-medium" href="#">
                                                SGP
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <a className="close-canvas" onClick={handleOffcanvas}>
                                {" "}
                                <img alt="Carento" src="/assets/imgs/template/icons/close.png" />
                            </a>
                        </div>
                    </div>
                    <div className="sidebar-canvas-content">
                        <div className="box-author-profile">
                            <div className="card-author">
                                <div className="card-image">
                                    <img src="/assets/imgs/page/homepage1/author2.png" alt="Carento" />
                                </div>
                                <div className="card-info">
                                    <p className="text-md-bold neutral-1000">Howdy, Steven</p>
                                    <p className="text-xs neutral-1000">25 September 2024</p>
                                </div>
                            </div>
                            <Link className="btn btn-black" href="#">
                                Logout
                            </Link>
                        </div>
                        <div className="sidebar-banner">
                            <div className="position-relative">
                                <p className="text-xl-bold neutral-1000 mb-4">Viewed products</p>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="me-3 border rounded-3 overflow-hidden mw-65">
                                        <Link href="/shop-details">
                                            <img src="/assets/imgs/shop/shop-details/other-item1.png" alt="Carento" />
                                        </Link>
                                    </div>
                                    <div className="position-relative">
                                        <Link href="#" className="text-md-bold neutral-1000">
                                            R1 Concepts® – eLINE Series Plain Brake Rotors
                                        </Link>
                                        <p className="text-md-bold text-success">$20.00</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="me-3 border rounded-3 overflow-hidden mw-65">
                                        <Link href="/shop-details">
                                            <img src="/assets/imgs/shop/shop-details/other-item2.png" alt="Carento" />
                                        </Link>
                                    </div>
                                    <div className="position-relative">
                                        <Link href="#" className="text-md-bold neutral-1000">
                                            PIRELLI TIRES® – P4 FOUR SEASONS PLUS
                                        </Link>
                                        <p className="text-md-bold text-success">$160.00</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="me-3 border rounded-3 overflow-hidden mw-65">
                                        <Link href="/shop-details">
                                            <img src="/assets/imgs/shop/shop-details/other-item3.png" alt="Carento" />
                                        </Link>
                                    </div>
                                    <div className="position-relative">
                                        <Link href="#" className="text-md-bold neutral-1000">
                                            Mobil 1 Extended Performance Full Synthetic Motor Oil
                                        </Link>
                                        <p className="text-md-bold text-success">$33.00</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="me-3 border rounded-3 overflow-hidden mw-65">
                                        <Link href="/shop-details">
                                            <img src="/assets/imgs/shop/shop-details/other-item4.png" alt="Carento" />
                                        </Link>
                                    </div>
                                    <div className="position-relative">
                                        <Link href="#" className="text-md-bold neutral-1000">
                                            HRE FlowForm® – FT01 Tarma Honda 2024
                                        </Link>
                                        <p className="text-md-bold text-success">$250.00</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="me-3 border rounded-3 overflow-hidden mw-65">
                                        <Link href="/shop-details">
                                            <img src="/assets/imgs/shop/shop-details/other-item5.png" alt="Carento" />
                                        </Link>
                                    </div>
                                    <div className="position-relative">
                                        <Link href="#" className="text-md-bold neutral-1000">
                                            Mobil Delvac 1300 Super Heavy Duty Synthetic
                                        </Link>
                                        <p className="text-md-bold text-success">$44.00</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="box-contactus">
                            <h6 className="title-contactus neutral-1000">Contact Us</h6>
                            <div className="contact-info">
                                <p className="address-2 text-md-medium neutral-1000">
                                    4517 Washington Ave. <br />
                                    Manchester, Kentucky 39495
                                </p>
                                <p className="hour-work-2 text-md-medium neutral-1000">Hours: 8:00 - 17:00, Mon - Sat</p>
                                <p className="email-2 text-md-medium neutral-1000">support@carento.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isOffcanvas && <div className="body-overlay-1" onClick={handleOffcanvas} />}
        </>
    );
}
