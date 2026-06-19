'use client'

import ButtonPrimary from '@/components/button-primary'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import Input from '@/components/input'
import NewsletterSection from '@/components/newsletter-section-1'
import SocialsList from '@/components/socials-list'
import Textarea from '@/components/textarea'
import { SentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { getOrgId, getProfile } from '@/data/live'
import { submitContact, submitReview } from '@/lib/phoxta'

const fmtTime = (t?: string) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const PageContact = () => {
  const profile = getProfile()
  const info = [
    { title: 'ADDRESS', description: profile?.address || 'Phra Khanong, Bangkok, Thailand' },
    { title: 'EMAIL', description: profile?.email || 'hello@example.com' },
    { title: 'PHONE', description: profile?.phone || '000-123-456-7890' },
  ]
  const hours = profile?.hours ?? []
  const mapQ = profile?.mapQuery || profile?.address

  const [f, setF] = useState({ name: '', email: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const set = (k: string) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }))

  const [rev, setRev] = useState({ author: '', rating: 5, title: '', body: '' })
  const [revBusy, setRevBusy] = useState(false)
  const [revSent, setRevSent] = useState(false)

  async function submit(e: any) {
    e.preventDefault()
    setBusy(true)
    try {
      const orgId = getOrgId()
      if (orgId) await submitContact(orgId, f.name, f.email, 'Website enquiry', f.message)
    } catch {
      /* fall through */
    } finally {
      setBusy(false)
      setSent(true)
    }
  }

  async function sendReview(e: any) {
    e.preventDefault()
    const orgId = getOrgId()
    if (!orgId || !rev.author.trim() || !rev.body.trim()) return
    setRevBusy(true)
    const ok = await submitReview(orgId, rev)
    setRevBusy(false)
    if (ok) { setRevSent(true); setRev({ author: '', rating: 5, title: '', body: '' }) }
  }

  return (
    <div className="pt-10 pb-24 sm:py-24 lg:py-32">
      <div className="container mx-auto max-w-6xl">
        <div className="grid shrink-0 grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2">
          <div>
            <Heading level={1} bigger>
              Contact <span data-slot="italic">Us</span>
            </Heading>
            <div className="mt-10 flex max-w-sm flex-col gap-y-8 sm:mt-20">
              {info.map((item, index) => (
                <div key={index}>
                  <h3 className="text-sm font-medium tracking-wider uppercase dark:text-neutral-200">{item.title}</h3>
                  <span className="mt-2 block text-muted-foreground">{item.description}</span>
                </div>
              ))}
              {hours.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium tracking-wider uppercase dark:text-neutral-200">OPENING HOURS</h3>
                  <div className="mt-2 max-w-xs text-muted-foreground">
                    {hours.map((h) => (
                      <div key={h.day} className="flex justify-between py-0.5">
                        <span>{h.day}</span>
                        <span>{h.closed ? 'Closed' : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase dark:text-neutral-200">SOCIALS</h3>
                <SocialsList className="mt-2" />
              </div>
            </div>
          </div>
          {sent ? (
            <div className="flex items-center rounded-2xl border border-border p-8 text-muted-foreground">
              Thanks{f.name ? `, ${f.name}` : ''} — we've received your message and will reply{f.email ? ` at ${f.email}` : ''} shortly.
            </div>
          ) : (
            <form className="grid grid-cols-1 gap-6" onSubmit={submit}>
              <Field className="block">
                <Label>Full name</Label>
                <Input placeholder="Example Doe" type="text" className="mt-1" value={f.name} onChange={set('name')} />
              </Field>
              <Field className="block">
                <Label>Email address</Label>
                <Input type="email" placeholder="example@example.com" className="mt-1" value={f.email} onChange={set('email')} />
              </Field>
              <Field className="block">
                <Label>Message</Label>
                <Textarea className="mt-1" rows={6} value={f.message} onChange={set('message')} />
              </Field>
              <div>
                <ButtonPrimary type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Send Message'}
                  <HugeiconsIcon icon={SentIcon} size={16} />
                </ButtonPrimary>
              </div>
            </form>
          )}
        </div>

        {mapQ && (
          <div className="mt-16 overflow-hidden rounded-2xl border border-border">
            <iframe
              title="Map"
              width="100%"
              height="360"
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQ)}&output=embed`}
            />
          </div>
        )}

        {/* Leave a review */}
        <div className="mt-16 max-w-xl">
          <Heading level={2}>Leave a review</Heading>
          {revSent ? (
            <p className="mt-4 text-muted-foreground">Thanks — your review will appear once approved.</p>
          ) : (
            <form className="mt-6 grid grid-cols-1 gap-6" onSubmit={sendReview}>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setRev({ ...rev, rating: n })} aria-label={`${n} stars`} className="text-2xl" style={{ color: n <= rev.rating ? '#f59e0b' : '#cbd5e1' }}>★</button>
                ))}
              </div>
              <Field className="block">
                <Label>Your name</Label>
                <Input type="text" className="mt-1" value={rev.author} onChange={(e: any) => setRev({ ...rev, author: e.target.value })} />
              </Field>
              <Field className="block">
                <Label>Title (optional)</Label>
                <Input type="text" className="mt-1" value={rev.title} onChange={(e: any) => setRev({ ...rev, title: e.target.value })} />
              </Field>
              <Field className="block">
                <Label>Your review</Label>
                <Textarea className="mt-1" rows={4} value={rev.body} onChange={(e: any) => setRev({ ...rev, body: e.target.value })} />
              </Field>
              <div>
                <ButtonPrimary type="submit" disabled={revBusy}>{revBusy ? 'Submitting…' : 'Submit review'}</ButtonPrimary>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="container mt-20 lg:mt-32">
        <NewsletterSection />
      </div>
    </div>
  )
}

export default PageContact
