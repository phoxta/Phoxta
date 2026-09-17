import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banner, Button, Spinner } from '@primer/react'
import { useAuth } from '../auth'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { useMeta } from '../marketing/bits'

function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 14) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}

const LABELS = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong']

export function SignUpPage() {
  const { signUp, configured } = useAuth()
  const site = useSite()
  const product = site.product ?? deriveProduct(site.project)
  useMeta(`Start free — ${product.name}`, `Create a ${product.name} account.`)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  const score = useMemo(() => strength(password), [password])
  const starter = product.pricing.find((p) => p.id === 'starter')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (score < 2) { setError('Choose a longer password: at least 12 characters, mixing cases and a number.'); return }
    setBusy(true)
    try {
      const { needsConfirmation } = await signUp(email, password, name || undefined)
      if (needsConfirmation) setConfirm(true)
      else navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (confirm) {
    return (
      <div className="au-card">
        <h1>Confirm your email</h1>
        <p className="au-sub">We sent a confirmation link to <strong>{email}</strong>. Open it and you will land straight in the app.</p>
        <Button as={Link} to="/signin" block>Back to sign in</Button>
      </div>
    )
  }

  return (
    <div className="au-card">
      <div>
        <h1>Start free</h1>
        <p className="au-sub">{starter ? `${starter.tagline.replace(/\.$/, '')}. ${starter.meter.replace(/\.$/, '')}.` : 'No card required.'}</p>
      </div>

      {!configured && (
        <Banner variant="info" title="Your account will live in this browser" description="The hosted identity service is not configured here, so this account is local to this device. Every other part of the product behaves the same." />
      )}
      {error && <Banner variant="critical" title="Could not create the account" description={error} onDismiss={() => setError(null)} />}

      <form className="au-fields" onSubmit={submit}>
        <div className="au-field">
          <label htmlFor="su-name">Name</label>
          <input id="su-name" className="au-input" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
        </div>
        <div className="au-field">
          <label htmlFor="su-email">Work email</label>
          <input id="su-email" className="au-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="au-field">
          <label htmlFor="su-pw">Password</label>
          <input id="su-pw" className="au-input" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="su-pw-hint" />
          <div className="au-strength" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <i key={i} data-on={password.length > 0 && i < score} />)}
          </div>
          <span className="fa-field__hint" id="su-pw-hint" aria-live="polite">
            {password ? LABELS[score] : 'At least 12 characters. Longer beats complicated.'}
          </span>
        </div>
        <label style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 10, alignItems: 'start', fontSize: 13.5, color: 'var(--fgColor-muted)' }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required style={{ marginTop: 3 }} />
          <span>I agree to the <Link to="/legal/terms">terms</Link> and the <Link to="/legal/privacy">privacy notice</Link>.</span>
        </label>
        <Button type="submit" variant="primary" block disabled={busy || !agreed}>
          {busy ? <Spinner size="small" /> : 'Create account'}
        </Button>
      </form>

      <div className="au-meta">
        <span>Already have an account?</span>
        <Link to="/signin">Sign in</Link>
      </div>
    </div>
  )
}
