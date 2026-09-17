import { useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { CheckIcon, LockIcon } from '@primer/octicons-react'
import { useSite } from '../context'
import { brandOf, brandVars } from '@/content/brand'
import { deriveProduct } from '../fallback'
import { useAuth } from '../auth'
import { BrandMark } from '../marketing/MarketingLayout'

export function AuthLayout() {
  const site = useSite()
  const brand = brandOf(site.project.slug)
  const product = site.product ?? deriveProduct(site.project)
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'signedIn') navigate('/app', { replace: true })
  }, [status, navigate])

  return (
    <div
      className="au-wrap" style={brandVars(site.project.slug) as React.CSSProperties}
      data-shape={brand.shape}
      data-serif={brand.display === 'Fraunces' || brand.display === 'Newsreader'}
      data-kicker={brand.uppercaseKicker ? 'caps' : 'sentence'}
    >
      <aside className="au-side">
        <div className="au-side__glow" aria-hidden="true" />
        <Link to="/" className="mk-brand" style={{ color: '#fff' }}>
          <BrandMark />
          <span>{product.name}</span>
        </Link>
        <div style={{ display: 'grid', gap: 26 }}>
          <blockquote>{product.tagline}</blockquote>
          <ul>
            {product.proof.slice(0, 3).map((p) => (
              <li key={p.claim}><CheckIcon size={16} /><span style={{ color: '#fff' }}>{p.claim}</span></li>
            ))}
          </ul>
        </div>
        <p style={{ margin: 0, color: 'rgba(255,255,255,.6)', fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}>
          <LockIcon size={14} /> Trial data stays in your browser. Nothing is uploaded.
        </p>
      </aside>
      <div className="au-form">
        <Outlet />
      </div>
    </div>
  )
}
