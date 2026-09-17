import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Container, IconButton, LinkButton } from '@/ui'
import { MoonIcon, SunIcon, ThreeBarsIcon, XIcon } from '@primer/octicons-react'
import { useColorMode } from '@/app/theme'
import { hubUrl } from '@/app/resolve'
import { useSite } from '../context'
import { brandOf, brandVars } from '@/content/brand'
import { deriveProduct } from '../fallback'
import { useAuth } from '../auth'
import { Mark } from './BrandArt'

export const NAV = [
  { to: '/product', label: 'Product' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/science', label: 'Evidence' },
  { to: '/docs', label: 'Docs' },
]

export function BrandMark({ size = 30 }: { size?: number }) {
  return <Mark size={size} />
}

export function MarketingLayout() {
  const site = useSite()
  const brand = brandOf(site.project.slug)
  const product = site.product ?? deriveProduct(site.project)
  const { resolved, toggle } = useColorMode()
  const { status } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div
      style={brandVars(site.project.slug) as React.CSSProperties}
      data-shape={brand.shape}
      data-serif={brand.display === 'Fraunces' || brand.display === 'Newsreader'}
      data-kicker={brand.uppercaseKicker ? 'caps' : 'sentence'}
    >
      <a href="#main" className="u-skip">Skip to content</a>

      <header className="mk-header">
        <Container>
          <div className="mk-header__row">
            <Link to="/" className="mk-brand"><BrandMark />{product.name}</Link>
            <nav className="mk-nav" aria-label="Main">
              {NAV.map((n) => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}
            </nav>
            <span className="u-spacer" />
            <IconButton
              className="mk-burger"
              icon={open ? XIcon : ThreeBarsIcon}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
            />
            <div className="u-row u-row--tight mk-hide-sm">
              <IconButton
                icon={resolved === 'dark' ? SunIcon : MoonIcon}
                aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                size="sm"
                onClick={toggle}
              />
              {status === 'signedIn' ? (
                <LinkButton to="/app" variant="primary" size="sm">Open app</LinkButton>
              ) : (
                <>
                  <LinkButton to="/signin" variant="tertiary" size="sm">Sign in</LinkButton>
                  <LinkButton to="/signup" variant="primary" size="sm">Start free</LinkButton>
                </>
              )}
            </div>
          </div>
        </Container>
        <div className="mk-mobile" data-open={open}>
          <Container>
            <nav aria-label="Mobile">
              {NAV.map((n) => <Link key={n.to} to={n.to}>{n.label}</Link>)}
              <Link to="/security">Security</Link>
              <Link to="/signin">Sign in</Link>
            </nav>
            <div className="u-row">
              <LinkButton to="/signup" variant="primary" block>Start free</LinkButton>
            </div>
          </Container>
        </div>
      </header>

      <main id="main"><Outlet /></main>

      <footer className="mk-footer">
        <Container>
          <div className="mk-footer__grid">
            <div>
              <Link to="/" className="mk-brand"><BrandMark size={26} />{product.name}</Link>
              <p className="u-text-sm u-muted" style={{ marginTop: 'var(--space-4)', maxWidth: '32ch' }}>{product.tagline}</p>
            </div>
            <div>
              <h4>Product</h4>
              <ul>
                <li><Link to="/product">Features</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
                <li><Link to="/solutions">Solutions</Link></li>
                <li><Link to="/docs">Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4>Evidence</h4>
              <ul>
                <li><Link to="/science">How it is measured</Link></li>
                <li><Link to="/research/model">Model card</Link></li>
                <li><Link to="/research/data">Training data</Link></li>
                <li><Link to="/research">Full record</Link></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><Link to="/company">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><a href={hubUrl(site.resolution)}>Other products</a></li>
              </ul>
            </div>
            <div>
              <h4>Trust</h4>
              <ul>
                <li><Link to="/security">Security</Link></li>
                <li><Link to="/legal/privacy">Privacy</Link></li>
                <li><Link to="/legal/terms">Terms</Link></li>
                <li><Link to="/legal/dpa">DPA</Link></li>
              </ul>
            </div>
          </div>
          <div className="mk-footer__legal">
            <span>© {new Date().getFullYear()} {product.name}</span>
            <span>Built by Oluwafemi Adeyemi · <a href="mailto:femi@phoxta.com">femi@phoxta.com</a></span>
          </div>
        </Container>
      </footer>
    </div>
  )
}
