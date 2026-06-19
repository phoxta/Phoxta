import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import RLink from "@/components/common/RLink";

export default function Login({ mode = "login" }: { mode?: "login" | "register" }) {
    const isRegister = mode === "register";
    return (
        <Layout>
            <Breadcrumb title={isRegister ? "Register" : "Login"} />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-5">
                            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 28 }}>
                                <h4 className="mb-3 text-center">{isRegister ? "Create an account" : "Welcome back"}</h4>
                                <form className="d-flex flex-column" style={{ gap: 12 }} onSubmit={(e) => e.preventDefault()}>
                                    {isRegister && <input className="form-control" placeholder="Full name" />}
                                    <input className="form-control" type="email" placeholder="Email" />
                                    <input className="form-control" type="password" placeholder="Password" />
                                    {isRegister && <input className="form-control" type="password" placeholder="Confirm password" />}
                                    <button className="tf-btn btn-fill" style={{ height: 48 }}>{isRegister ? "Create account" : "Login"}</button>
                                </form>
                                <p className="text-center text-body-default text_secondary mt-3 mb-0">
                                    {isRegister ? (
                                        <>Already have an account? <RLink to="login.html" className="link text_primary">Login</RLink></>
                                    ) : (
                                        <>New here? <RLink to="register.html" className="link text_primary">Create an account</RLink></>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
