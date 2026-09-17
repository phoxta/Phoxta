import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Header, IconButton, Label, LinkButton, UnderlineNav } from '@primer/react'
import {
  ArrowLeftIcon, ArrowRightIcon, BookIcon, CodeIcon, DatabaseIcon, GraphIcon, HomeIcon, MarkGithubIcon,
  MoonIcon, CpuIcon, PlayIcon, SunIcon,
} from '@primer/octicons-react'
import { neighbours } from '@/content/registry'
import { useColorMode } from './theme'
import { appUrl, hubUrl } from './resolve'
import { media, useApp } from './context'
import { StatTiles } from '@/components/StatTiles'

const NAV = [
  { to: '/', label: 'Overview', icon: HomeIcon },
  { to: '/dashboard', label: 'Dashboard', icon: GraphIcon },
  { to: '/model', label: 'Model', icon: CpuIcon },
  { to: '/data', label: 'Data', icon: DatabaseIcon },
  { to: '/api', label: 'API', icon: CodeIcon },
  { to: '/report', label: 'Report', icon: BookIcon },
] as const

export function AppShell() {
  const { app, resolution } = useApp()
  const { resolved, toggle } = useColorMode()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { prev, next } = neighbours(app.slug)
  const Icon = app.icon

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  return (
    <>
      <a href="#main" className="fa-skip">Skip to content</a>
      <Header className="fa-topbar" aria-label="Portfolio">
        <Header.Item>
          <Header.Link href={hubUrl(resolution)} className="fa-topbar__brand">
            <img src="/femi.webp" alt="" width={24} height={24} style={{ borderRadius: 999, width: 24, height: 24 }} />
            <span>Femi Adeyemi</span>
            <span className="fa-topbar__sep" aria-hidden="true">/</span>
            <span style={{ fontWeight: 400, opacity: 0.85 }}>AI/ML apps</span>
          </Header.Link>
        </Header.Item>
        <Header.Item full>
          <span className="fa-topbar__app">
            <Icon size={16} />
            <span>{app.short}</span>
            <Label variant="secondary" size="small">P{String(app.num).padStart(2, '0')}</Label>
          </span>
        </Header.Item>
        <Header.Item>
          <div className="fa-topbar__actions">
            {prev && (
              <IconButton
                as="a"
                href={appUrl(prev.slug, resolution)}
                icon={ArrowLeftIcon}
                aria-label={`Previous app: ${prev.short}`}
                variant="invisible"
                size="small"
              />
            )}
            {next && (
              <IconButton
                as="a"
                href={appUrl(next.slug, resolution)}
                icon={ArrowRightIcon}
                aria-label={`Next app: ${next.short}`}
                variant="invisible"
                size="small"
              />
            )}
            <IconButton
              as="a"
              href={app.links.github}
              target="_blank"
              rel="noreferrer"
              icon={MarkGithubIcon}
              aria-label="Source on GitHub"
              variant="invisible"
              size="small"
            />
            <IconButton
              icon={resolved === 'dark' ? SunIcon : MoonIcon}
              aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggle}
              variant="invisible"
              size="small"
            />
          </div>
        </Header.Item>
      </Header>

      <section className="fa-hero" style={{ '--hero-accent': app.accent } as React.CSSProperties} aria-label={`${app.name} overview`}>
        {app.hero.image && (
          <img
            className="fa-hero__img"
            src={media(app.slug, app.hero.image)}
            alt=""
            width={1600}
            height={640}
            fetchPriority="high"
            decoding="async"
          />
        )}
        <div className="fa-hero__scrim" aria-hidden="true" />
        <div className="fa-container">
          <div className="fa-hero__body">
            <div className="fa-hero__eyebrow">
              <span className="fa-chip"><Icon size={14} /> P{String(app.num).padStart(2, '0')} · {app.category}</span>
              <span className="fa-chip"><DatabaseIcon size={14} /> {app.dataset.name} · {app.dataset.size}</span>
            </div>
            <h1 className="fa-hero__title">{app.name}</h1>
            <p className="fa-hero__tagline">{app.tagline}</p>
            <div className="fa-hero__actions">
              <Button variant="primary" leadingVisual={PlayIcon} onClick={() => navigate('/dashboard')}>
                Open the dashboard
              </Button>
              <LinkButton href={app.links.github} target="_blank" rel="noreferrer" leadingVisual={MarkGithubIcon} variant="default">
                Source
              </LinkButton>
              {app.links.report && (
                <LinkButton href={app.links.report} target="_blank" rel="noreferrer" leadingVisual={BookIcon} variant="default">
                  Full report
                </LinkButton>
              )}
            </div>
          </div>
          <StatTiles metrics={app.metrics} />
          <div style={{ height: 28 }} />
        </div>
        {app.hero.credit && (
          <span className="fa-hero__credit">
            Photo: <a href={app.hero.credit.link} target="_blank" rel="noreferrer">{app.hero.credit.name}</a>
          </span>
        )}
      </section>

      <div className="fa-subnav">
        <div className="fa-container">
          <UnderlineNav aria-label={`${app.short} sections`} variant="flush">
            {NAV.map((n) => (
              <UnderlineNav.Item
                key={n.to}
                href={n.to}
                icon={n.icon}
                aria-current={isActive(n.to) ? 'page' : undefined}
                onSelect={(e) => {
                  e.preventDefault()
                  navigate(n.to)
                }}
              >
                {n.label}
              </UnderlineNav.Item>
            ))}
          </UnderlineNav>
        </div>
      </div>

      <main id="main" className="fa-main">
        <div className="fa-container">
          <Outlet />
          <div className="fa-pager">
            {prev ? (
              <LinkButton href={appUrl(prev.slug, resolution)} leadingVisual={ArrowLeftIcon} variant="invisible">
                {prev.short}
              </LinkButton>
            ) : <span />}
            <span className="fa-pager__count">App {app.num} of 17</span>
            {next ? (
              <LinkButton href={appUrl(next.slug, resolution)} trailingVisual={ArrowRightIcon} variant="invisible">
                {next.short}
              </LinkButton>
            ) : <span />}
          </div>
        </div>
      </main>

      <footer className="fa-footer">
        <div className="fa-container fa-footer__row">
          <span>
            <strong>Oluwafemi Adeyemi</strong> · MIT Applied AI &amp; Data Science · <a href="mailto:femi@phoxta.com">femi@phoxta.com</a>
          </span>
          <nav className="fa-footer__links" aria-label="Footer">
            <a href={hubUrl(resolution)}>All apps</a>
            <a href="https://github.com/oluwafemiadeyemi/Portfolio" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://www.linkedin.com/in/oluwafemiadeyemi" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://primer.style" target="_blank" rel="noreferrer">Built with Primer</a>
          </nav>
        </div>
      </footer>
    </>
  )
}
