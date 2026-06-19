import { Link } from "react-router-dom";
import Layout from "@/components/Layout";

export default function NotFound() {
    return (
        <Layout>
            <header className="page-header" style={{ paddingBottom: 140 }}>
                <div className="container inner">
                    <h1 className="serif" style={{ fontSize: 80 }}>404</h1>
                    <p>This page is off the menu. Let's get you back to the table.</p>
                    <Link to="/" className="btn-accent" style={{ marginTop: 24 }}>Back to Home</Link>
                </div>
            </header>
        </Layout>
    );
}
