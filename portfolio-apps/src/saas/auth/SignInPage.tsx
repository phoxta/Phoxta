import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Banner, Button, Spinner } from '@primer/react'
import { MailIcon } from '@primer/octicons-react'
import { useAuth } from '../auth'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { useMeta } from '../marketing/bits'

export function SignInPage() {
  const { signIn, signInWithLink, configured } = useAuth()
  const site = useSite()
  const product = site.product ?? deriveProduct(site.project)
  useMeta(`Sign in — ${product.name}`, `Sign in to ${product.name}.`)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'link') {
        await signInWithLink(email)
        setSent(true)
      } else {
        await signIn(email, password)
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="au-card">
        <h1>Check your email</h1>
        <p className="au-sub">A sign-in link is on its way to <strong>{email}</strong>. It expires in an hour.</p>
        <Button onClick={() => { setSent(false); setMode('password') }}>Use a password instead</Button>
      </div>
    )
  }

  return (
    <div className="au-card">
      <div>
        <h1>Sign in</h1>
        <p className="au-sub">Welcome back to {product.name}.</p>
      </div>

      {!configured && (
        <Banner
          variant="info"
          title="This device holds your account"
          description="The hosted identity service is not configured here, so the account you create lives in this browser only. Everything else in the product works exactly the same."
        />
      )}
      {error && <Banner variant="critical" title="Could not sign you in" description={error} onDismiss={() => setError(null)} />}

      <form className="au-fields" onSubmit={submit}>
        <div className="au-field">
          <label htmlFor="si-email">Work email</label>
          <input id="si-email" className="au-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        {mode === 'password' && (
          <div className="au-field">
            <label htmlFor="si-pw">Password</label>
            <input id="si-pw" className="au-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        <Button type="submit" variant="primary" block disabled={busy} leadingVisual={mode === 'link' ? MailIcon : undefined}>
          {busy ? <Spinner size="small" /> : mode === 'link' ? 'Email me a sign-in link' : 'Sign in'}
        </Button>
      </form>

      <div className="au-meta">
        <Link to="/forgot">Forgot your password?</Link>
        {configured && (
          <button type="button" onClick={() => setMode(mode === 'password' ? 'link' : 'password')} style={{ background: 'none', border: 0, color: 'var(--fgColor-link)', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            {mode === 'password' ? 'Email me a link instead' : 'Use a password instead'}
          </button>
        )}
      </div>

      <div className="au-divider">New here</div>
      <Button as={Link} to="/signup" block>Create an account</Button>
    </div>
  )
}
