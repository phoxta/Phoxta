import { useMemo, useState } from 'react'
import { Badge, Card, Checks, FeaturedIcon, LinkButton, Segmented } from '@/ui'
import {
  ArrowRightIcon, CheckIcon, DashIcon, MeterIcon, ServerIcon, ShieldCheckIcon, StopwatchIcon,
} from '@primer/octicons-react'
import { domainOf } from '@/content/domain'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { CtaBand, Section, money, useMeta } from './bits'
import { Vignette } from './Vignette'
import { clause, lede } from './copy'

type Cycle = 'monthly' | 'annual'

export function PricingPage() {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  useMeta(`Pricing — ${product.name}`, `What ${product.name} costs, and what each plan includes.`)
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const annual = cycle === 'annual'

  const plans = product.pricing
  const priceOf = (p: (typeof plans)[number]) => {
    if (p.monthly == null) return null
    if (!annual) return p.monthly
    return p.annual ?? Math.round(p.monthly * 0.8)
  }
  /** Percent saved by paying yearly; `null` when the plan has no published price. */
  const savingOf = (p: (typeof plans)[number]) => {
    if (!p.monthly) return null
    const yearly = p.annual ?? Math.round(p.monthly * 0.8)
    const pct = Math.round((1 - yearly / p.monthly) * 100)
    return pct > 0 ? pct : null
  }
  /** True when no plan publishes its own annual price, so 20% off is our default. */
  const derived = plans.every((p) => p.annual == null)
  const bestSaving = derived ? 20 : Math.max(...plans.map((p) => savingOf(p) ?? 0), 0)

  /** Union of every feature line across plans, so the table shows real inclusion. */
  const rows = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of plans) for (const f of p.features) if (!seen.has(f.toLowerCase())) seen.set(f.toLowerCase(), f)
    return [...seen.values()].filter((f) => !/^everything in /i.test(f))
  }, [plans])

  /** "Everything in X" means the plan inherits every line from the one below it. */
  const includes = (i: number, row: string): boolean => {
    const p = plans[i]
    if (p.features.some((f) => f.toLowerCase() === row.toLowerCase())) return true
    if (i > 0 && p.features.some((f) => /^everything in /i.test(f))) return includes(i - 1, row)
    return false
  }

  const enterprise = plans[plans.length - 1]

  return (
    <>
      <Section
        center
        heading="h1"
        kicker="Pricing"
        title="Priced on the decision, not the seat"
        sub={`Every plan runs the same model. What changes is volume, automation, and how much we operate for you.`}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-10)' }}>
          <Segmented<Cycle>
            label="Billing period"
            value={cycle}
            onChange={setCycle}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: `Annual · save ${bestSaving}%` },
            ]}
          />
        </div>

        <div className="mk-plans">
          {plans.map((p) => {
            const price = priceOf(p)
            const saving = savingOf(p)
            return (
              <div key={p.id} className={`mk-plan${p.highlighted ? ' mk-plan--hi' : ''}`} style={{ textAlign: 'left' }}>
                {p.highlighted && <span className="mk-plan__badge"><Badge tone="brand" size="md">Most popular</Badge></span>}
                <div>
                  <div className="u-strong">{p.name}</div>
                  <p className="u-text-sm u-muted u-clamp-2" style={{ marginTop: 2 }}>{p.tagline}</p>
                </div>
                <div>
                  <div className="mk-plan__price">
                    {money(price)}
                    {price != null && price > 0 && <small> /mo</small>}
                  </div>
                  {price != null && price > 0 && (
                    <p className="u-text-sm u-quiet" style={{ marginTop: 4 }}>
                      {annual ? `Billed yearly${saving ? ` · saves ${saving}%` : ''}` : 'Billed monthly'}
                    </p>
                  )}
                </div>
                <div className="mk-plan__meter u-clamp-3">{p.meter}</div>
                <Checks items={p.features.slice(0, 6).map((f) => <span className="u-clamp-2">{f}</span>)} />
                <LinkButton to={p.monthly == null ? '/contact' : '/signup'} variant={p.highlighted ? 'primary' : 'gray'} block>
                  {p.cta}
                </LinkButton>
              </div>
            )
          })}
        </div>

        <p className="u-text-sm u-quiet" style={{ marginTop: 'var(--space-8)' }}>
          Prices in USD, excluding tax.{' '}
          {derived
            ? `Annual billing takes ${bestSaving}% off the monthly rate.`
            : 'Annual prices are the published yearly rate, shown per month.'}
        </p>
      </Section>

      {/* ── Full comparison ──────────────────────────────────────────────── */}
      <Section tone="tint" kicker="Compare" title="What is in each plan">
        <div className="u-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="u-table">
            <caption className="u-sr">Every capability, and the plans that include it</caption>
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: 280 }}>Capability</th>
                {plans.map((p) => <th key={p.id} scope="col" style={{ textAlign: 'center', minWidth: 120 }}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="mk-cmp__name">Price</th>
                {plans.map((p) => {
                  const price = priceOf(p)
                  return (
                    <td key={p.id} style={{ textAlign: 'center' }} className="u-num u-strong">
                      {money(price)}{price != null && price > 0 && <span className="u-text-xs u-quiet"> /mo</span>}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <th scope="row" className="mk-cmp__name">Metered on</th>
                {plans.map((p) => <td key={p.id} style={{ textAlign: 'center' }} className="u-text-xs">{p.meter}</td>)}
              </tr>
              {rows.map((r) => (
                <tr key={r}>
                  <td>{r}</td>
                  {plans.map((p, i) => (
                    <td key={p.id} style={{ textAlign: 'center' }}>
                      {includes(i, r)
                        ? <span style={{ color: 'var(--text-success)' }} role="img" aria-label="Included"><CheckIcon size={16} /></span>
                        : <span style={{ color: 'var(--text-quaternary)' }} role="img" aria-label="Not included"><DashIcon size={16} /></span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── The metering unit, in the customer's words ───────────────────── */}
      <Section kicker="The unit" title={`You are billed per ${d.unit} scored`}>
        <div className="mk-row">
          <div className="mk-row__copy">
            <div className="mk-list">
              <div className="mk-list__i">
                <FeaturedIcon icon={MeterIcon} size="sm" />
                <div>
                  <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>One {d.unit}, one unit</h3>
                  <p className="u-text-sm u-muted u-clamp-2">
                    A {d.unit} counts once when it is scored, however it arrives: file, API or scheduled run.
                  </p>
                </div>
              </div>
              <div className="mk-list__i">
                <FeaturedIcon icon={StopwatchIcon} tone="success" size="sm" />
                <div>
                  <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>Working the {d.queue} is free</h3>
                  <p className="u-text-sm u-muted u-clamp-2">
                    Reading, overriding and exporting a decision are not metered. Only scoring is.
                  </p>
                </div>
              </div>
              <div className="mk-list__i">
                <FeaturedIcon icon={ShieldCheckIcon} tone="warning" size="sm" />
                <div>
                  <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>A cap you set, not a surprise</h3>
                  <p className="u-text-sm u-muted u-clamp-2">
                    Overage is shown in the app before it is invoiced, and a hard cap queues work instead of spending.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Vignette kind="queue" />
        </div>
      </Section>

      {/* ── Questions ────────────────────────────────────────────────────── */}
      <Section tone="tint" kicker="Questions" title="Before you buy">
        <div className="mk-faq">
          {product.faq.slice(0, 6).map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
          <details>
            <summary>What happens when we go over the allowance?</summary>
            <p>
              Nothing breaks. Overage is billed at the plan&rsquo;s unit rate and shown in the app before it is invoiced,
              and you can set a hard cap that queues {d.units} instead of spending.
            </p>
          </details>
          <details>
            <summary>Can we run it inside our own environment?</summary>
            <p>
              Yes, on {enterprise.name}. The model is a portable artefact and the serving layer is a container, so it runs
              in your own cloud account with no outbound calls.
            </p>
          </details>
        </div>
      </Section>

      {/* ── Enterprise band ──────────────────────────────────────────────── */}
      <Section tone="dark" kicker={enterprise.name} title={clause(enterprise.tagline, 9)}>
        <div className="u-split u-split--wide-left">
          <Checks items={enterprise.features.slice(0, 6).map((f) => <span className="u-clamp-2">{f}</span>)} />
          <Card>
            <FeaturedIcon icon={ServerIcon} size="sm" />
            <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>Metered on your terms</h3>
            <p className="u-card__body u-clamp-3">{enterprise.meter}</p>
            <p className="u-card__note u-clamp-2">
              {lede(product.trust[0]?.body ?? `Nothing is used to train anyone else's model.`, 20)}
            </p>
            <LinkButton to="/contact" variant="inverse" trailingIcon={ArrowRightIcon} block>{enterprise.cta}</LinkButton>
          </Card>
        </div>
      </Section>

      <CtaBand
        title="Start on the free trial"
        body={`Score real ${d.units} in the browser. Upgrade when the volume justifies it, not before.`}
        primary={{ to: '/signup', label: 'Start free' }}
        secondary={{ to: '/contact', label: 'Talk to us' }}
      />
    </>
  )
}
