import { Banner, Label, LinkButton, Timeline } from '@primer/react'
import { BookIcon, LightBulbIcon, MarkGithubIcon } from '@primer/octicons-react'
import { useApp, usePageMeta } from '../context'
import { Prose, Section } from '@/components/Section'
import { Buyers, Facts, Results } from '@/components/Blocks'
import { StatTiles } from '@/components/StatTiles'

export function ReportPage() {
  const { app } = useApp()
  usePageMeta(`Report · ${app.name}`, `Executive report for ${app.name}.`)

  return (
    <div className="fa-page">
      <Section id="exec" kicker={`Project report · ${app.report.date}`} title="Executive summary"
        actions={app.links.report ? <LinkButton href={app.links.report} target="_blank" rel="noreferrer" leadingVisual={BookIcon}>Read the full report</LinkButton> : undefined}>
        <div className="fa-two">
          <Prose paragraphs={app.report.executiveSummary} />
          <div style={{ display: 'grid', gap: 12 }}>
            <p className="fa-kicker" style={{ color: 'var(--fgColor-muted)', margin: 0 }}>Business impact at a glance</p>
            <Facts facts={app.report.impact} />
          </div>
        </div>
      </Section>

      <Section id="headline" kicker="Numbers" title="Headline metrics">
        <StatTiles metrics={app.metrics} />
      </Section>

      <Section id="results" kicker="Results" title="Key results">
        <Results rows={app.results} />
      </Section>

      <Section id="recs" kicker="Next steps" title="Strategic recommendations">
        <div className="fa-card"><div className="fa-card__body">
          <Timeline>
            {app.report.recommendations.map((r, i) => (
              <Timeline.Item key={r.title}>
                <Timeline.Badge><LightBulbIcon /></Timeline.Badge>
                <Timeline.Body>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <span><Label variant="accent" size="small">{i + 1}</Label> <strong style={{ color: 'var(--fgColor-default)' }}>{r.title}</strong></span>
                    <span>{r.body}</span>
                  </div>
                </Timeline.Body>
              </Timeline.Item>
            ))}
          </Timeline>
        </div></div>
      </Section>

      <Section id="market" kicker="Market" title="Who buys this">
        <Buyers buyers={app.buyers} />
      </Section>

      <Banner
        title={`P${String(app.num).padStart(2, '0')} of 17 · Enterprise AI/ML Portfolio`}
        variant="info"
        description={<span>Prepared by <strong>Oluwafemi Adeyemi</strong>, MIT Applied AI &amp; Data Science. Source, notebooks and the full report live in the portfolio repository.</span>}
        primaryAction={<LinkButton href={app.links.github} target="_blank" rel="noreferrer" leadingVisual={MarkGithubIcon}>Project on GitHub</LinkButton>}
      />
    </div>
  )
}
