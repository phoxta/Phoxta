import { useEffect, useState } from "react"
import BackToTop from '../elements/BackToTop'
import Breadcrumb from './Breadcrumb'
import MobileMenu from './MobileMenu'
import Offcanvas from './Offcanvas'
import Footer1 from './footer/Footer1'
import Footer2 from './footer/Footer2'
import Header1 from "./header/Header1"
import Header2 from './header/Header2'
import Header3 from './header/Header3'

interface LayoutProps {
	headerStyle?: Number
	footerStyle?: Number
	children?: React.ReactNode
	breadcrumbTitle?: string
}


export default function Layout({ headerStyle, footerStyle, breadcrumbTitle, children }: LayoutProps) {
	const [scroll, setScroll] = useState<boolean>(false)
	// MobileMenu
	const [isMobileMenu, setMobileMenu] = useState<boolean>(false)
	const handleMobileMenu = (): void => {
		setMobileMenu(!isMobileMenu)
		!isMobileMenu ? document.body.classList.add("mobile-menu-active") : document.body.classList.remove("mobile-menu-active")
	}
	// Offcanvas
	const [isOffcanvas, setOffcanvas] = useState<boolean>(false)
	const handleOffcanvas = (): void => {
		setOffcanvas(!isOffcanvas)
		!isOffcanvas ? document.body.classList.add("canvas-menu-active") : document.body.classList.remove("canvas-menu-active")
	}


	useEffect(() => {
		let cancelled = false;
		import('wowjs').then((mod: any) => {
			if (cancelled) return;
			const WOW = mod.default ?? mod;
			(window as any).wow = new WOW.WOW({ live: false });
			(window as any).wow.init();
		});

		const handleScroll = (): void => {
			const scrollCheck: boolean = window.scrollY > 100
			if (scrollCheck !== scroll) {
				setScroll(scrollCheck)
			}
		}

		document.addEventListener("scroll", handleScroll)

		return () => {
			cancelled = true;
			document.removeEventListener("scroll", handleScroll)
		}
	}, [scroll])
	return (
		<>
			<div id="top" />
			{!headerStyle && <Header2 scroll={scroll} isMobileMenu={isMobileMenu} handleMobileMenu={handleMobileMenu} isOffcanvas={isOffcanvas} handleOffcanvas={handleOffcanvas} />}
			{headerStyle == 1 ? <Header1 scroll={scroll} isMobileMenu={isMobileMenu} handleMobileMenu={handleMobileMenu} isOffcanvas={isOffcanvas} handleOffcanvas={handleOffcanvas} /> : null}
			{headerStyle == 2 ? <Header2 scroll={scroll} isMobileMenu={isMobileMenu} handleMobileMenu={handleMobileMenu} isOffcanvas={isOffcanvas} handleOffcanvas={handleOffcanvas} /> : null}
			{headerStyle == 3 ? <Header3 scroll={scroll} isMobileMenu={isMobileMenu} handleMobileMenu={handleMobileMenu} isOffcanvas={isOffcanvas} handleOffcanvas={handleOffcanvas} /> : null}
			<MobileMenu isMobileMenu={isMobileMenu} handleMobileMenu={handleMobileMenu} />
			<Offcanvas isOffcanvas={isOffcanvas} handleOffcanvas={handleOffcanvas} />

			<main className="main">
				{breadcrumbTitle && <Breadcrumb breadcrumbTitle={breadcrumbTitle} />}

				{children}
			</main>

			{!footerStyle && < Footer1 />}
			{footerStyle == 1 ? < Footer1 /> : null}
			{footerStyle == 2 ? < Footer2 /> : null}

			<BackToTop target="#top" />
		</>
	)
}
