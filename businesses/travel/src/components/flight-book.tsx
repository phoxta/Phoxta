'use client'

import { useState } from 'react'
import { getOrgId } from '@/data/live'
import { requestReservation } from '@/lib/phoxta'

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
        setRef(id)
      }
    } catch (e: any) {
      setError(e?.message || 'Could not book this fare.')
    } finally {
      setBusy(false)
    }
  }

  if (ref) {
    return (
      <div className="rounded-xl border border-border p-4 text-sm md:ms-24">
        Booked {pax} seat{pax > 1 ? 's' : ''} on <strong>{flight.name}</strong> departing {depart}. Reference: {ref}
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
