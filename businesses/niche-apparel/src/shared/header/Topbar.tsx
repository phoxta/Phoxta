import { Link } from "react-router-dom";
export default function Topbar() {
    return (
        <div className="topbar container-2200 d-none d-md-block bg-neutral-900 changeless mx-lg-3 mx-2">
            <div className="container">
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="date">
                                <p className="fz-font-label text-white my-0">
                                    66 avenue des Champs, 75008, Paris, France
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-4">
                                <Link to="#" className="fz-font-label fw-500 text-white">
                                    <span>(+01) - 456 789</span>
                                </Link>
                                <Link to="#" className="fz-font-body text-white fw-500">
                                    <span>hello@phoxta.com</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
