
import Layout from "@/components/layout/Layout"
import Link from "@/components/common/Link"
export default function Term() {

	return (
		<>

			<Layout footerStyle={1}>
				<div>
					<div className="page-header pt-30 background-body">
						<div className="custom-container position-relative mx-auto">
							<div className="bg-overlay rounded-12 overflow-hidden">
								<img className="w-100 h-100 rounded-12 img-banner" src="/assets/imgs/page-header/banner5.png" alt="Carento" />
							</div>
							<div className="container position-absolute z-1 top-50 start-50 translate-middle">
								<h2 className="text-white">Terms Of Service</h2>
								<span className="text-white text-xl-medium">Last update: 25 August, 2024</span>
							</div>
						</div>
					</div>
					<section className="box-section-term background-body pt-85 pb-85">
						<div className="container">
							<div className="row">
								<div className="col-lg-3 col-md-6 mb-lg-0 mb-4">
									<div className="sidebar rounded-3 border py-5 px-4">
										<div className="sidebar-menu">
											<h6 className="neutral-1000 mb-3">Table of content</h6>
											<ul>
												<li className="mb-2"><Link href="#Acceptance" className="text-md-medium neutral-500">Acceptance of Terms</Link></li>
												<li className="mb-2"><Link href="#Services" className="text-md-medium neutral-500">Services Provided</Link></li>
												<li className="mb-2"><Link href="#User" className="text-md-medium neutral-500 active">User Responsibilities</Link></li>
												<li className="mb-2"><Link href="#Account" className="text-md-medium neutral-500">Account Security</Link></li>
												<li className="mb-2"><Link href="#Payment" className="text-md-medium neutral-500">Payment and Fees</Link></li>
												<li className="mb-2"><Link href="#Cancellation" className="text-md-medium neutral-500">Cancellation and Refunds</Link></li>
												<li className="mb-2"><Link href="#Intellectual" className="text-md-medium neutral-500">Intellectual Property</Link></li>
												<li className="mb-2"><Link href="#Limitation" className="text-md-medium neutral-500">Limitation of Liability</Link></li>
												<li className="mb-2"><Link href="#Privacy" className="text-md-medium neutral-500">Privacy Policy</Link></li>
												<li className="mb-2"><Link href="#changetem" className="text-md-medium neutral-500">Changes to Terms</Link></li>
												<li className="mb-2"><Link href="#Governing" className="text-md-medium neutral-500">Governing Law</Link></li>
												<li className="mb-2"><Link href="#Contact" className="text-md-medium neutral-500">Contact Us</Link></li>
											</ul>
										</div>
									</div>
								</div>
								<div className="col-lg-9 px-lg-5">
									<div className="d-flex flex-column gap-4">
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="Acceptance">Acceptadnce of Terms</h3>
											<p className="text-md-medium neutral-500">
												By accessing and using our website and services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our website or services. Your continued use of our website and services constitutes your acceptance of any changes or updates to these terms.
											</p>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000">Services Provided</h3>
											<p className="text-md-medium neutral-500">We offer a range of services, including car rentals, vehicle sales, and loan options. Detailed descriptions of each service are provided on our website. We reserve the right to modify, suspend, or discontinue any service at our discretion and without prior notice. We are not liable for any consequences resulting from such changes.</p>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="Responsibility">User Responsibilities</h3>
											<ul>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Accuracy of Information: <span className="neutral-500"> You are responsible for providing accurate, current, and complete information when using our services. Any discrepancies or inaccuracies in the information provided may affect the service delivered.</span></p>
												</li>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Lawful Use: <span className="neutral-500"> You agree to use our website and services in compliance with all applicable laws and regulations. You must not use our services for any unlawful or unauthorized purpose.</span></p>
												</li>
											</ul>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="Account">Account Security</h3>
											<ul>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Confidentiality: <span className="neutral-500"> You are responsible for maintaining the confidentiality of your account credentials, including your username and password. You agree to notify us immediately of any unauthorized access to your account.</span></p>
												</li>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Unauthorized Use: <span className="neutral-500"> If you suspect that your account has been compromised or used without authorization, you must contact us immediately to take corrective action.</span></p>
												</li>
											</ul>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="Payment">Payment and Fees</h3>
											<ul>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Payment Terms: <span className="neutral-500"> All payments for services must be made in accordance with the pricing information and payment terms outlined on our website. Payment must be completed before the provision of services.</span></p>
												</li>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Fee Changes: <span className="neutral-500"> We reserve the right to alter our fees and charges at any time. Any changes will be reflected on our website, and you are responsible for reviewing and understanding the updated fees.</span></p>
												</li>
											</ul>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="Cancellations">Cancellation and Refunds</h3>
											<ul>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000"> Cancellation Policy: <span className="neutral-500"> Specific cancellation policies apply to different services. Please refer to our website or contact our customer service team for detailed information on cancellation procedures.</span></p>
												</li>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Refund Policy: <span className="neutral-500"> Refunds are subject to the terms outlined for each service. In general, refunds will be processed according to the terms specified at the time of purchase or rental.</span></p>
												</li>
											</ul>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="Limitation">Limitation of Liability</h3>
											<ul>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">General Limitation: <span className="neutral-500"> Our company is not liable for any indirect, incidental, special, or consequential damages arising out of or related to your use of our website or services. This includes, but is not limited to, loss of profits, data, or other intangible losses.</span></p>
												</li>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Direct Damages: <span className="neutral-500"> In the event of any claim arising from our services, our liability is limited to the amount you paid for the specific service in question. We are not responsible for any indirect or consequential damages.</span></p>
												</li>
											</ul>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="Privacy">Privacy Policy</h3>
											<ul>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Commitment: <span className="neutral-500"> We are committed to protecting your personal information. Our Privacy Policy outlines how we collect, use, and safeguard your data.</span></p>
												</li>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Consent: <span className="neutral-500"> By using our services, you consent to the practices described in our Privacy Policy, which is an integral part of these Terms of Service.</span></p>
												</li>
											</ul>
										</div>
										<div className="content">
											<h3 className="text-xl-bold mb-2 neutral-1000" id="changetem">Changes to Terms</h3>
											<ul>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Updates: <span className="neutral-500">We may update these Terms of Service periodically. Changes will be posted on our website, and the revised terms will take effect immediately upon publication.</span></p>
												</li>
												<li className="mb-2">
													<p className="text-md-medium neutral-1000">Notification: <span className="neutral-500"> We will notify you of significant changes via email or through our website. Continued use of our services after any changes constitutes your acceptance of the revised terms.</span></p>
												</li>
											</ul>
										</div>
										<span className="text-xl-medium border-top pt-4 neutral-1000">Last update: 25 August, 2024</span>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>

			</Layout>
		</>
	)
}