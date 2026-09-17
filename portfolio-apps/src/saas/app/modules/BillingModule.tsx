import { useMemo } from 'react'
import { Alert, Badge, Button, Card, EmptyState, Progress } from '@/ui'
import { CheckIcon, CreditCardIcon, FileIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { deriveProduct } from '../../fallback'
import { domainOf } from '@/content/domain'
import { ChartGrid } from '@/components/Charts'
import type { ChartSpec } from '@/content/types'
import type { ModuleDef } from '../spec'
import { Page, useCollection, type ScoredCase } from '../shared'

interface Plan { id: string; chosenAt: string }

const ALLOWANCE = 5000

export function BillingModule({ mod }: { mod: ModuleDef }) {
  const site = useSite()
  const product = site.product ?? deriveProduct(site.project)
  const d = domainOf(site.project.slug)
  const { items: cases } = useCollection<ScoredCase>('cases')
  const { items: chosen, save } = useCollection<Plan>('plan')
  const planId = chosen[0]?.id ?? 'starter'
  const plan = product.pricing.find((p) => p.id === planId) ?? product.pricing[0]

  const period = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return cases.filter((c) => new Date(c.at) >= start)
  }, [cases])

  const usage = useMemo<ChartSpec[]>(() => {
    if (period.length < 2) return []
    const byDay = new Map<string, number>()
    for (const c of period) byDay.set(c.at.slice(0, 10), (byDay.get(c.at.slice(0, 10)) ?? 0) + 1)
    const data = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, n]) => ({ day: day.slice(5), n }))
    return [{
      kind: 'bar', title: `${d.units[0].toUpperCase() + d.units.slice(1)} scored this period`, xKey: 'day', span: 12,
      series: [{ key: 'n', label: d.units }], data,
      note: `${period.length.toLocaleString()} of your ${ALLOWANCE.toLocaleString()} included ${d.units} used.`,
    }]
  }, [period, d.units])

  const pct = Math.min(100, (period.length / ALLOWANCE) * 100)
  const over = Math.max(0, period.length - ALLOWANCE)

  return (
    <Page mod={mod}>
      <Alert tone="info" title="No payment is taken here">
        This is a working demonstration. Choosing a plan records the choice in your workspace so the limits and the invoice
        preview behave correctly; no card is collected and nothing is charged.
      </Alert>

      <div className="u-split">
        <Card>
          <div className="u-row">
            <h2 className="u-card__title">Current plan</h2>
            <span className="u-spacer" />
            <Badge tone="brand" dot>{plan.name}</Badge>
          </div>
          <p className="u-card__body">{plan.tagline}</p>
          <div className="ax-kpi" style={{ border: 0, padding: 0 }}>
            <span className="ax-kpi__l">{plan.meter}</span>
          </div>
          <div className="u-stack" style={{ gap: 'var(--space-2)' }}>
            <div className="u-row" style={{ justifyContent: 'space-between' }}>
              <span className="u-text-sm u-muted">Used this period</span>
              <span className="u-text-sm u-strong u-num">{period.length.toLocaleString()} / {ALLOWANCE.toLocaleString()}</span>
            </div>
            <Progress value={pct} tone={pct > 90 ? 'warning' : undefined} label={`${period.length} of ${ALLOWANCE}`} />
          </div>
        </Card>

        <Card>
          <h2 className="u-card__title">Estimated invoice</h2>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead><tr><th>Line</th><th className="num">Qty</th><th className="num">Amount</th></tr></thead>
              <tbody>
                <tr><td>{plan.name} subscription</td><td className="num">1</td><td className="num">{plan.monthly == null ? 'Custom' : `$${plan.monthly.toLocaleString()}`}</td></tr>
                <tr><td>{d.units[0].toUpperCase() + d.units.slice(1)} included</td><td className="num">{ALLOWANCE.toLocaleString()}</td><td className="num">$0</td></tr>
                <tr><td>Overage</td><td className="num">{over.toLocaleString()}</td><td className="num">{over ? `$${(over * 0.004).toFixed(2)}` : '$0'}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="u-text-xs u-quiet">Preview only. Nothing is billed while the workspace is on a trial.</p>
        </Card>
      </div>

      {usage.length > 0 ? <ChartGrid charts={usage} /> : (
        <EmptyState icon={CreditCardIcon} title="No usage yet">
          Score some {d.units} and the usage for this period will appear here.
        </EmptyState>
      )}

      <section className="u-stack">
        <h2 className="u-card__title">Change plan</h2>
        <div className="u-grid u-grid--3">
          {product.pricing.map((p) => (
            <Card key={p.id} raised={p.id === planId}>
              <div className="u-row">
                <span className="u-strong">{p.name}</span>
                <span className="u-spacer" />
                {p.id === planId && <Badge tone="success" icon={CheckIcon}>Current</Badge>}
              </div>
              <div className="mk-plan__price" style={{ fontSize: '2rem' }}>
                {p.monthly == null ? 'Custom' : p.monthly === 0 ? 'Free' : `$${p.monthly.toLocaleString()}`}
                {p.monthly ? <small> /mo</small> : null}
              </div>
              <p className="u-card__body u-clamp-2">{p.meter}</p>
              <ul className="u-checks" style={{ fontSize: 'var(--text-sm-size)' }}>
                {p.features.slice(0, 4).map((f) => (
                  <li key={f}><span><CheckIcon size={13} /></span><span>{f}</span></li>
                ))}
              </ul>
              <Button
                variant={p.id === planId ? 'gray' : 'primary'}
                disabled={p.id === planId}
                onClick={() => void save('plan', { id: p.id, chosenAt: new Date().toISOString() })}
                block
              >
                {p.id === planId ? 'Current plan' : p.monthly == null ? 'Request a quote' : `Switch to ${p.name}`}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="u-stack">
        <h2 className="u-card__title">Invoices</h2>
        <EmptyState icon={FileIcon} title="No invoices">
          Invoices appear here once the workspace is on a paid plan.
        </EmptyState>
      </section>
    </Page>
  )
}
