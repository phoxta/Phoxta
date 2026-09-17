import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button, IconButton, LinkButton, Menu, MenuDivider, MenuItem, Progress } from '@/ui'
import {
  BookIcon, ChevronDownIcon, GearIcon, LinkExternalIcon, MoonIcon, SignOutIcon, SunIcon, ThreeBarsIcon, XIcon,
} from '@primer/octicons-react'
import { useColorMode } from '@/app/theme'
import { useSite } from '../context'
import { brandOf, brandVars } from '@/content/brand'
import { deriveProduct } from '../fallback'
import { useAuth } from '../auth'
import { Mark } from '../marketing/BrandArt'
import { domainOf } from '@/content/domain'
import { GROUPS, moduleSpec } from './spec'
import { Loading } from '../ProductSite'
import { useCollection, type ScoredCase } from './shared'

export function AppLayout() {
  const site = useSite()
  const brand = brandOf(site.project.slug)
  const product = site.product ?? deriveProduct(site.project)
  const d = domainOf(site.project.slug)
  const { status, account, signOut, configured } = useAuth()
  const { resolved, toggle } = useColorMode()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const { items: cases } = useCollection<ScoredCase>('cases')

  const modules = useMemo(() => moduleSpec(site.project, site.product), [site.project, site.product])
  const starter = product.pricing.find((p) => p.id === 'starter')
  const allowance = 5000

  useEffect(() => {
    if (status === 'signedOut') navigate('/signin', { replace: true, state: { from: pathname } })
  }, [status, navigate, pathname])

  useEffect(() => { setOpen(false) }, [pathname])

  if (status === 'loading') return <Loading label="Checking your session…" />
  if (status === 'signedOut') return <Loading label="Taking you to sign in…" />

  const current = modules.find((m) => (m.id === '' ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(`/app/${m.id}`)))
  const used = Math.min(100, (cases.length / allowance) * 100)

  return (
    <div
      className="ax" style={brandVars(site.project.slug) as React.CSSProperties}
      data-shape={brand.shape}
      data-serif={brand.display === 'Fraunces' || brand.display === 'Newsreader'}
      data-kicker={brand.uppercaseKicker ? 'caps' : 'sentence'}
    >
      <div className="ax-scrim" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className="ax-side" data-open={open}>
        <div className="ax-side__head">
          <Menu
            label="Workspace"
            align="start"
            trigger={(p) => (
              <button type="button" className="ax-ws" {...p}>
                <Mark size={32} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="ax-ws__name" style={{ display: 'block' }}>{product.name}</span>
                  <span className="ax-ws__sub">{starter?.name ?? 'Starter'} workspace</span>
                </span>
                <ChevronDownIcon size={14} />
              </button>
            )}
          >
            <MenuItem icon={GearIcon} onSelect={() => navigate('/app/settings')}>Workspace settings</MenuItem>
            <MenuItem icon={BookIcon} onSelect={() => navigate('/research')}>How the model works</MenuItem>
            <MenuDivider />
            <MenuItem icon={LinkExternalIcon} onSelect={() => navigate('/')}>Back to the website</MenuItem>
          </Menu>
        </div>

        <nav className="ax-side__nav" aria-label="Application">
          {GROUPS.map((g) => {
            const items = modules.filter((m) => m.group === g)
            if (!items.length) return null
            return (
              <div key={g}>
                <div className="ax-group">{g}</div>
                {items.map((m) => {
                  const Icon = m.icon
                  return (
                    <NavLink key={m.id || 'home'} to={m.id ? `/app/${m.id}` : '/app'} end={m.id === ''} className="ax-link">
                      <Icon size={17} />
                      <span>{m.label}</span>
                      {m.id === '' && cases.length > 0 && <Badge className="ax-link__count">{cases.length}</Badge>}
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="ax-side__foot">
          <div className="ax-usage">
            <div className="ax-usage__row">
              <span>{d.units[0].toUpperCase() + d.units.slice(1)} this month</span>
              <span className="u-num u-strong">{cases.length.toLocaleString()}</span>
            </div>
            <Progress value={used} small label={`${cases.length} of ${allowance} used`} />
            <div className="ax-usage__row">
              <span className="u-quiet">{allowance.toLocaleString()} on {starter?.name ?? 'Starter'}</span>
              <Link to="/app/billing" className="u-text-xs">Upgrade</Link>
            </div>
          </div>
          {!configured && <Badge tone="warning" dot>Local account</Badge>}
        </div>
      </aside>

      <div className="ax-main">
        <header className="ax-top">
          <IconButton
            className="mk-burger"
            icon={open ? XIcon : ThreeBarsIcon}
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            onClick={() => setOpen((o) => !o)}
          />
          <span className="ax-top__title">{current?.title ?? 'Home'}</span>
          <span className="u-spacer" />
          <LinkButton to="/app/sources" size="sm" variant="secondary" className="mk-hide-sm">Add {d.units}</LinkButton>
          <IconButton
            icon={resolved === 'dark' ? SunIcon : MoonIcon}
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            size="sm"
            onClick={toggle}
          />
          <Menu
            label="Account"
            trigger={(p) => (
              <Button variant="tertiary" size="sm" {...p}>
                <span className="u-row u-row--tight" style={{ flexWrap: 'nowrap' }}>
                  <span className="u-avatar u-avatar--sm" aria-hidden="true">
                    {(account?.name ?? account?.email ?? '?').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="mk-hide-sm u-clamp-1" style={{ maxWidth: 160 }}>{account?.email}</span>
                  <ChevronDownIcon size={14} />
                </span>
              </Button>
            )}
          >
            <MenuItem icon={GearIcon} onSelect={() => navigate('/app/settings')}>Settings</MenuItem>
            <MenuItem onSelect={() => navigate('/app/billing')}>Plan and usage</MenuItem>
            <MenuDivider />
            <MenuItem icon={SignOutIcon} danger onSelect={() => { void signOut().then(() => navigate('/')) }}>Sign out</MenuItem>
          </Menu>
        </header>

        <div className="ax-body"><Outlet /></div>
      </div>
    </div>
  )
}
