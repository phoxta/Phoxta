'use client'

import ButtonPrimary from '@/components/button-primary'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import Input from '@/components/input'
import { useState } from 'react'
import { getOrgId } from '@/data/live'
import { lookupReservation, type ReservationLookup } from '@/lib/phoxta'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
}

const PageManageBooking = () => {
  const [ref, setRef] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ReservationLookup | null>(null)
  const [err, setErr] = useState('')

  async function lookup(e: any) {
    e.preventDefault()
    setErr('')
    setResult(null)
    if (!ref.trim() || !email.trim()) { setErr('Enter your booking reference and the email you booked with.'); return }
    const orgId = getOrgId()
    if (!orgId) { setErr('Booking lookup works on the live store.'); return }
    setBusy(true)
    const r = await lookupReservation(orgId, ref.trim(), email.trim())
    setBusy(false)
    if (r && r.found) setResult(r)
    else setErr('No booking found with that reference and email.')
  }

  return (
    <div className="pt-10 pb-24 sm:py-24 lg:py-32">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center">
          <Heading level={1} bigger>Manage your booking</Heading>
          <p className="mt-4 text-muted-foreground">Enter your reference and the email you booked with.</p>
        </div>

        <form className="mt-10 grid grid-cols-1 gap-6 rounded-2xl border border-border p-6 sm:p-8" onSubmit={lookup}>
          <Field className="block">
            <Label>Booking reference</Label>
            <Input type="text" className="mt-1" value={ref} onChange={(e: any) => setRef(e.target.value)} />
          </Field>
          <Field className="block">
            <Label>Email</Label>
            <Input type="email" className="mt-1" value={email} onChange={(e: any) => setEmail(e.target.value)} />
          </Field>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div>
            <ButtonPrimary type="submit" disabled={busy}>{busy ? 'Looking up…' : 'Find my booking'}</ButtonPrimary>
          </div>
        </form>

        {result && (
          <div className="mt-8 rounded-2xl border border-border p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{result.product}</h3>
              <span className="text-sm font-medium tracking-wide uppercase text-muted-foreground">{STATUS_LABEL[result.status] || result.status}</span>
            </div>
            <p className="mt-2 text-muted-foreground">{result.customer_name}</p>
            <p className="mt-1 text-muted-foreground">
              {result.start_date} → {result.end_date} · {result.units} {result.units === 1 ? 'guest' : 'guests'}
            </p>
            <p className="mt-3 text-lg font-semibold">Total: ${(result.total_cents / 100).toFixed(0)}</p>
            <p className="mt-4 text-sm text-muted-foreground">Need to change or cancel? Reply to your confirmation email or contact us.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PageManageBooking
