import { Link } from "react-router-dom";
// Careers Section 2 - Open roles list

const PLUS_ICON = (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

type Role = { title: string; team: string; location: string; type: string };

const ROLES: Role[] = [
    { title: "Senior Frontend Engineer", team: "Product", location: "Remote", type: "Full-time" },
    { title: "ML Engineer, Applied AI", team: "Engineering", location: "Lagos / Remote", type: "Full-time" },
    { title: "Product Designer", team: "Design", location: "Remote", type: "Full-time" },
    { title: "Data Platform Engineer", team: "Engineering", location: "Remote", type: "Contract" },
];

export default function Section2() {
    return (
        <section className="sec-careers-roles pt-120 pb-120 bg-neutral-0">
            <div className="container">
                <div className="row pb-60">
                    <div className="col-lg-7">
                        <h2 className="fz-font-3xl fw-500 mb-0">Open roles</h2>
                    </div>
                </div>
                <div className="row g-4">
                    {ROLES.map((role, i) => (
                        <div key={i} className="col-12">
                            <Link
                                to="/contact-1"
                                className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-4 rounded-3 bg-neutral-50 at-hover-item"
                            >
                                <div>
                                    <h5 className="fw-600 mb-10">{role.title}</h5>
                                    <span className="fz-font-md neutral-700">
                                        {role.team} &middot; {role.location} &middot; {role.type}
                                    </span>
                                </div>
                                <span className="at-btn-circle bg-neutral-900 text-white">{PLUS_ICON}</span>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
