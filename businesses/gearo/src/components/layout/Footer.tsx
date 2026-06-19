import RLink from "@/components/common/RLink";

const INFO = [
    ["about.html", "About Us"],
    ["store-list.html", "Our Stories"],
    ["#", "Size Guide"],
    ["contact.html", "Contact us"],
];
const SERVICES = [
    ["#", "Shipping"],
    ["#", "Return & Refund"],
    ["#", "Privacy Policy"],
    ["term-of-use.html", "Terms & Conditions"],
];
const PAYMENTS = [1, 2, 3, 4, 5, 6];

export default function Footer() {
    return (
        <footer id="footer" className="footer">
            <div className="container">
                <div className="row">
                    <div className="col-12">
                        <div className="footer-body">
                            <div className="footer-left">
                                <div className="footer-infor flex-grow-1">
                                    <div className="footer-menu">
                                        <div className="footer-col-block">
                                            <h5 className="footer-heading text_white footer-heading-mobile">Infomation</h5>
                                            <div className="tf-collapse-content">
                                                <ul className="footer-menu-list">
                                                    {INFO.map(([href, text]) => (
                                                        <li key={text} className="text-body-default">
                                                            <RLink to={href} className="link footer-menu_item">{text}</RLink>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="footer-col-block">
                                            <h5 className="footer-heading text_white footer-heading-mobile">Customer Services</h5>
                                            <div className="tf-collapse-content">
                                                <ul className="footer-menu-list">
                                                    {SERVICES.map(([href, text]) => (
                                                        <li key={text} className="text-body-default">
                                                            <RLink to={href} className="link footer-menu_item">{text}</RLink>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="footer-phone-number">
                                        <h4 className="text_white number">+61 (9) 567 8765 43</h4>
                                        <h4 className="text_white mail">hello@gearo.com</h4>
                                    </div>
                                </div>
                            </div>
                            <div className="footer-col-block footer-newsletter">
                                <h3 className="footer-heading footer-heading-mobile text_white">Stay in the loop with Weekly newsletters</h3>
                                <div className="tf-collapse-content">
                                    <form className="form-newsletter subscribe-form" onSubmit={(e) => e.preventDefault()}>
                                        <div className="subscribe-content">
                                            <fieldset className="email">
                                                <input type="email" name="email-form" className="subscribe-email" placeholder="Enter your e-mail" />
                                            </fieldset>
                                            <div className="button-submit">
                                                <button className="subscribe-button text-body-default" type="submit">Subscribe<i className="icon-arrow-up-right" /></button>
                                            </div>
                                        </div>
                                    </form>
                                    <ul className="tf-social-icon type-2">
                                        <li><a href="#" onClick={(e) => e.preventDefault()} className="social-facebook"><i className="icon icon-facebook" /></a></li>
                                        <li><a href="#" onClick={(e) => e.preventDefault()} className="social-twiter"><i className="icon icon-x" /></a></li>
                                        <li><a href="#" onClick={(e) => e.preventDefault()} className="social-instagram"><i className="icon icon-instagram" /></a></li>
                                        <li><a href="#" onClick={(e) => e.preventDefault()} className="social-amazon"><i className="icon icon-telegram" /></a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="footer-bottom-wrap">
                                <div className="left">
                                    <p className="text-body-default text_white">Copyright ©2025 GearO. All Rights Reserved.</p>
                                </div>
                                <div className="tf-payment">
                                    <ul>
                                        {PAYMENTS.map((n) => (
                                            <li key={n}><img src={`/images/payment/payment-${n}.png`} alt="" width={40} height={24} /></li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
