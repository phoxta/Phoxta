import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner, Button, Spinner } from '@primer/react'
import { useAuth } from '../auth'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { useMeta } from '../marketing/bits'

export function ForgotPage() {
  const { resetPassword, configured } = useAuth()
  const site = useSite()
  const product = site.product ?? deriveProduct(site.project)
  useMeta(`Reset your password — ${product.name}`)

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await resetPassword(email)
      setSent(true)
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
        <p className="au-sub">If an account exists for <strong>{email}</strong>, a reset link is on its way. It expires in an hour.</p>
        <Button as={Link} to="/signin" block>Back to sign in</Button>
      </div>
    )
  }

  return (
    <div className="au-card">
      <div>
        <h1>Reset your password</h1>
        <p className="au-sub">Enter the email you signed up with and we will send a link.</p>
      </div>

      {!configured && (
        <Banner variant="warning" title="Not available on this device" description="This account lives in your browser, so there is no email to reset it with. Create a new account instead, or use the hosted service." />
      )}
      {error && <Banner variant="critical" title="Could not send the link" description={error} onDismiss={() => setError(null)} />}

      <form className="au-fields" onSubmit={submit}>
        <div className="au-field">
          <label htmlFor="fg-email">Work email</label>
          <input id="fg-email" className="au-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <Button type="submit" variant="primary" block disabled={busy || !configured}>
          {busy ? <Spinner size="small" /> : 'Send reset link'}
        </Button>
      </form>

      <div className="au-meta">
        <Link to="/signin">Back to sign in</Link>
        <Link to="/signup">Create an account</Link>
      </div>
    </div>
  )
}
