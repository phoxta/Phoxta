
import Layout from "@/components/layout/Layout"
import Link from "@/components/common/Link"
export default function Login() {

	return (
		<>

			<Layout footerStyle={1}>
				<div className="container pt-140 pb-170">
					<div className="row">
						<div className="col-lg-5 mx-auto">
							<div className="border rounded-3 px-md-5 px-3 ptb-50">
								<div className="login-content">
									<div className="text-center">
										<p className="neutral-1000 px-4 py-2 bg-2 text-sm-bold rounded-12 d-inline-flex align-items-center">Sign in</p>
										<h4 className="neutral-1000">Welcome back</h4>
									</div>
									<div className="form-login mt-30">
										<form action="#">
											<div className="form-group">
												<input className="form-control username" type="text" placeholder="Email / Username" />
											</div>
											<div className="form-group">
												<input className="form-control password" type="password" placeholder="****************" />
											</div>
											<div className="form-group">
												<div className="box-remember-forgot">
													<div className="remeber-me">
														<label className="text-xs-medium neutral-500"> <input className="cb-remember" type="checkbox" />Remember me </label>
													</div>
													<div className="forgotpass"><Link className="text-xs-medium neutral-500" href="#">Forgot password?</Link></div>
												</div>
											</div>
											<div className="form-group mb-30">
												<Link className="btn btn-primary w-100" href="#">Sign in
													<svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
														<path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												</Link>
											</div>
											<p className="text-md-medium neutral-500 text-center">Or connect with your social account</p>
											<div className="box-button-logins">
												<Link className="btn btn-login btn-google mr-10" href="#">
													<img src="/assets/imgs/template/popup/google.svg" alt="Carento" />
													<span className="text-sm-bold">Sign up with Google</span>
												</Link>
												<Link className="btn btn-login mr-10" href="#">
													<img src="/assets/imgs/template/popup/facebook.svg" alt="Carento" />
												</Link>
												<Link className="btn btn-login" href="#">
													<img src="/assets/imgs/template/popup/apple.svg" alt="Carento" />
												</Link>
											</div>
											<p className="text-sm-medium neutral-500 text-center mt-70">Don’t have an account? <Link className="neutral-1000" href="/register">Register Here !</Link></p>
										</form>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

			</Layout>
		</>
	)
}