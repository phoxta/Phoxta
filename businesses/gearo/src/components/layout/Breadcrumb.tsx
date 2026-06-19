import RLink from "@/components/common/RLink";

export default function Breadcrumb({ title }: { title: string }) {
    return (
        <div className="tf-breadcrumb">
            <div className="container">
                <div className="tf-breadcrumb-wrap d-flex justify-content-center align-items-center flex-wrap" style={{ gap: 8, padding: "24px 0" }}>
                    <RLink to="index.html" className="link text_secondary">Home</RLink>
                    <i className="icon icon-arrow-right" />
                    <span className="text_primary">{title}</span>
                </div>
                <div className="text-center" style={{ paddingBottom: 24 }}>
                    <h3 className="heading">{title}</h3>
                </div>
            </div>
        </div>
    );
}
