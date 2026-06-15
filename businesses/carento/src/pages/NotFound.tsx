
import Layout from "@/components/layout/Layout"
import Link from "@/components/common/Link"
export default function NotFound() {

	return (
		<>

			<Layout footerStyle={1}>
				<div className="container pt-140 pb-170">
					<div className="row">
						<div className="col-md-5 mx-auto">
							<div className="d-flex justify-content-center align-items-center flex-column">
								<h1>404</h1>
								<h5>Page Not Found</h5>
								<p className="text-md-medium neutral-500 text-center">Page not available. Please search again or <br /> navigate using the menu.</p>
								<Link href="/" className="btn btn-primary mt-30"><img src="/assets/imgs/template/icons/arrow-left.svg" /> Back to Home</Link>
								<img src="/assets/imgs/template/404.png" alt="Carento" />
							</div>
						</div>
					</div>
				</div>

			</Layout>
		</>
	)
}