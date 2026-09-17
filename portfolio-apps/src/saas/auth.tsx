/**
 * Authentication for every product in the suite.
 *
 * One account works across all products (a single Supabase project). When
 * Supabase is not configured the provider falls back to a clearly-labelled
 * local account so the app is still explorable, and says so in the UI.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { authConfigured, supabase } from './supabase'

export interface Account {
  id: string
  email: string
  name?: string
  /** true when the session comes from the local fallback, not a real provider. */
  local: boolean
  createdAt: string
}

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn'

interface AuthValue {
  status: AuthStatus
  account: Account | null
  /** Real provider available, versus the local fallback. */
  configured: boolean
  signUp: (email: string, password: string, name?: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signInWithLink: (email: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

const LOCAL_KEY = 'femi-suite-local-account'

function readLocal(): Account | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Account) : null
  } catch {
    return null
  }
}

function toAccount(u: User): Account {
  return {
    id: u.id,
    email: u.email ?? '',
    name: (u.user_metadata?.name as string | undefined) ?? undefined,
    local: false,
    createdAt: u.created_at,
  }
}

/** Local fallback: a real password check, hashed with WebCrypto, kept on this device only. */
async function hash(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [account, setAccount] = useState<Account | null>(null)

  useEffect(() => {
    const sb = supabase()
    if (!sb) {
      const local = readLocal()
      setAccount(local)
      setStatus(local ? 'signedIn' : 'signedOut')
      return
    }
    let alive = true
    sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!alive) return
      const u = data.session?.user
      setAccount(u ? toAccount(u) : readLocal())
      setStatus(u || readLocal() ? 'signedIn' : 'signedOut')
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e: string, session: Session | null) => {
      const u = session?.user
      setAccount(u ? toAccount(u) : null)
      setStatus(u ? 'signedIn' : 'signedOut')
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const sb = supabase()
    if (!sb) {
      const salt = crypto.randomUUID()
      const acct: Account = { id: crypto.randomUUID(), email, name, local: true, createdAt: new Date().toISOString() }
      localStorage.setItem(LOCAL_KEY, JSON.stringify(acct))
      localStorage.setItem(`${LOCAL_KEY}:pw`, `${salt}$${await hash(password, salt)}`)
      setAccount(acct)
      setStatus('signedIn')
      return { needsConfirmation: false }
    }
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: `${window.location.origin}${basePath()}/signin` },
    })
    if (error) throw new Error(friendly(error.message))
    return { needsConfirmation: !data.session }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = supabase()
    if (!sb) {
      const acct = readLocal()
      const stored = localStorage.getItem(`${LOCAL_KEY}:pw`) ?? ''
      const [salt, digest] = stored.split('$')
      if (!acct || acct.email !== email || !salt || (await hash(password, salt)) !== digest) {
        throw new Error('Those details do not match an account on this device.')
      }
      setAccount(acct)
      setStatus('signedIn')
      return
    }
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(friendly(error.message))
  }, [])

  const signInWithLink = useCallback(async (email: string) => {
    const sb = supabase()
    if (!sb) throw new Error('Email sign-in needs the hosted service. Use a password on this device.')
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}${basePath()}/app` } })
    if (error) throw new Error(friendly(error.message))
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const sb = supabase()
    if (!sb) throw new Error('Password reset needs the hosted service.')
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${basePath()}/signin` })
    if (error) throw new Error(friendly(error.message))
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const sb = supabase()
    if (!sb) throw new Error('Password change needs the hosted service.')
    const { error } = await sb.auth.updateUser({ password })
    if (error) throw new Error(friendly(error.message))
  }, [])

  const signOut = useCallback(async () => {
    const sb = supabase()
    if (sb) await sb.auth.signOut()
    localStorage.removeItem(LOCAL_KEY)
    localStorage.removeItem(`${LOCAL_KEY}:pw`)
    setAccount(null)
    setStatus('signedOut')
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ status, account, configured: authConfigured, signUp, signIn, signInWithLink, resetPassword, updatePassword, signOut }),
    [status, account, signUp, signIn, signInWithLink, resetPassword, updatePassword, signOut],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}

/** The router basename, so auth redirects land back inside the right product. */
function basePath() {
  const first = window.location.pathname.split('/').filter(Boolean)[0]
  return first && first.length <= 20 && !first.includes('.') ? `/${first}` : ''
}

function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'That email and password do not match an account.'
  if (m.includes('already registered')) return 'An account already exists for that email. Sign in instead.'
  if (m.includes('password should be')) return 'Password is too short for this workspace policy.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
  if (m.includes('email not confirmed')) return 'Confirm your email address first, then sign in.'
  return message
}
