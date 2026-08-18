'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getOrgId } from '@/data/live'
import { initReservationPayment, isReservationPaid, lookupReservation, requestReservation, type ReservationPayment } from '@/lib/phoxta'
import { openPaystackPopup } from '@/lib/paystackPopup'

// Compact flight booking inside the flight card's detail panel. A flight is a
// fare (product, stock = seats); booking N seats for a chosen departure date
// writes a 'pending' reservation (units = passengers) to the ops console. The
// listed schedule date is illustrative, so the traveller picks a future date.

const todayPlus = (d: number) => {
  const t = new Date()
  t.setDate(t.getDate() + d)
  return t.toISOString().slice(0, 10)
}

export default function FlightBook({ flight }: { flight: any }) {
  const fare = parseFloat(String(flight?.price ?? '').replace(/[^0-9.]/g, '')) || 0
  const [depart, setDepart] = useState(todayPlus(14))
  const [pax, setPax] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ref, setRef] = useState<string | null>(null)
  // Payment-enabled path: pending until the reservation lookup verifies payment.
  const [payment, setPayment] = useState<ReservationPayment | null>(null)
  const [paid, setPaid] = useState(false)
  const [pollExpired, setPollExpired] = useState(false)
  const checkingRef = useRef(false)
  const autoOpenedRef = useRef(false)

  async function book() {
    setError('')
    if (!name.trim() || !email.trim()) {
      setError('Enter your name and email.')
      return
    }
    setBusy(true)
    try {
      const orgId = getOrgId()
      const end = new Date(depart)
      end.setDate(end.getDate() + 1)
      if (!orgId) {
        setRef('demo-' + Math.random().toString(36).slice(2, 10))
      } else {
        const id = await requestReservation(orgId, String(flight.id), name.trim(), email.trim(), depart, end.toISOString().slice(0, 10), pax)
        // Offer online payment when configured; the booking is already saved,
        // so any failure just keeps the existing pay-later confirmation.
        if (id) {
          const pay = await initReservationPayment(orgId, id, email.trim())
          if (pay) setPayment(pay) // pending-payment state; popup auto-opens below
        }
        setRef(id)
      }
    } catch (e: any) {
      setError(e?.message || 'Could not book this fare.')
    } finally {
      setBusy(false)
    }
  }

  // Verify payment via the same guest lookup manage-booking uses; the Paystack
  // webhook marks the reservation paid server-side, so this works even when
  // the popup callbacks never fire.
  const checkPaid = useCallback(async () => {
    if (checkingRef.current || paid || !ref) return
    const orgId = getOrgId()
    if (!orgId) return
    checkingRef.current = true
    try {
      const r = await lookupReservation(orgId, ref, email.trim())
      if (isReservationPaid(r)) setPaid(true)
    } finally {
      checkingRef.current = false
    }
  }, [ref, email, paid])

  const openPopup = useCallback(() => {
    if (!payment) return
    if (payment.accessCode) {
      void openPaystackPopup(payment.accessCode, payment.url, {
        onSuccess: () => { void checkPaid() },
        onCancel: () => {},
      })
    } else {
      window.location.assign(payment.url)
    }
  }, [payment, checkPaid])

  // Auto-open the popup once the payment is initialised.
  useEffect(() => {
    if (payment && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      openPopup()
    }
  }, [payment, openPopup])

  // Poll the lookup every 3s for up to 2 minutes while payment is outstanding.
  useEffect(() => {
    if (!payment || !ref || paid) return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > 120000) {
        window.clearInterval(timer)
        setPollExpired(true)
        return
      }
      void checkPaid()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [payment, ref, paid, checkPaid])

  // Payment verified — the real success state.
  if (ref && paid) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 text-sm md:ms-24">
        <span>
          Payment received — thank you! {pax} seat{pax > 1 ? 's' : ''} on <strong>{flight.name}</strong> departing {depart} confirmed. Reference: {ref}
        </span>
        <a
          className="self-start rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          href={`/manage-booking?ref=${encodeURIComponent(ref)}&email=${encodeURIComponent(email.trim())}`}
        >
          Manage booking
        </a>
      </div>
    )
  }

  // Payment initialised but not yet verified — no thank-you until it's paid.
  if (ref && payment) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 text-sm md:ms-24">
        <span className="font-medium">Complete your payment</span>
        <span>
          {pax} seat{pax > 1 ? 's' : ''} on <strong>{flight.name}</strong> departing {depart} — reserved. Complete payment of ${(pax * fare).toLocaleString()} to confirm. Reference: {ref}
        </span>
        <button
          onClick={openPopup}
          className="self-start rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Pay now
        </button>
        <span className="text-xs text-muted-foreground">
          Payment opens in a secure Paystack window. This updates automatically once your payment is received.
          {pollExpired && (
            <>
              {' '}Already paid?{' '}
              <a className="underline" href={`/manage-booking?ref=${encodeURIComponent(ref)}&email=${encodeURIComponent(email.trim())}`}>
                Check your booking
              </a>.
            </>
          )}
        </span>
      </div>
    )
  }

  // Pay-later flow (payments not configured for this tenant / demo mode).
  if (ref) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 text-sm md:ms-24">
        <span>
          Booked {pax} seat{pax > 1 ? 's' : ''} on <strong>{flight.name}</strong> departing {depart}. Reference: {ref}
        </span>
      </div>
    )
  }

  const field = 'rounded-lg border border-border bg-transparent px-3 py-2 text-sm'
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 md:ms-24">
      <div className="text-sm font-medium">Book this fare — {flight.price} / seat</div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Departure date
          <input type="date" className={field} value={depart} min={todayPlus(0)} onChange={(e) => setDepart(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Passengers
          <input type="number" min={1} className={`${field} w-24`} value={pax} onChange={(e) => setPax(Math.max(1, Number(e.target.value) || 1))} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Email
          <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total ${(pax * fare).toLocaleString()}</span>
        <button onClick={book} disabled={busy} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy ? 'Booking…' : 'Book seats'}
        </button>
      </div>
    </div>
  )
}
