import { useNavigate } from 'react-router-dom'
import { Banner, Button, LinkButton } from '@primer/react'
import { ArrowRightIcon, MarkGithubIcon } from '@primer/octicons-react'
import { useApp, usePageMeta } from '../context'
import { Prose, Section } from '@/components/Section'
import { ChartGrid } from '@/components/Charts'
import { Buyers, FeatureGrid, Pipeline, StackTokens } from '@/components/Blocks'
import { Gallery, VideoCard } from '@/components/Gallery'

export function OverviewPage() {
  const { app } = useApp()
  const navigate = useNavigate()
  usePageMeta(`${app.name} · Femi Adeyemi`, app.summary)
  const poster = app.screenshots[0]?.file

  return (
    <div className="fa-page">
      <Section id="summary" kicker="What it does" title={app.short}>
        <div className="fa-two">
          <Prose paragraphs={[app.summary]} />
          <div className="fa-card fa-card--muted">
            <div className="fa-card__body" style={{ display: 'grid', gap: 12 }}>
              <div>
                <p className="fa-kicker" style={{ color: 'var(--fgColor-muted)' }}>Built with</p>
                <StackTokens stack={app.stack.slice(0, 8)} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="problem" kicker="Why it exists" title="The problem and the approach">
        <div className="fa-two">
          <div className="fa-card"><div className="fa-card__body">
            <h3 className="fa-card__title" style={{ marginBottom: 8 }}>Business problem</h3>
            <Prose paragraphs={app.problem} />
          </div></div>
          <div className="fa-card"><div className="fa-card__body">
            <h3 className="fa-card__title" style={{ marginBottom: 8 }}>Solution</h3>
            <Prose paragraphs={app.solution} />
          </div></div>
        </div>
      </Section>

      <Section id="features" kicker="Capabilities" title="What the platform delivers" sub="Every capability ships in the dashboard and behind an API endpoint.">
        <FeatureGrid slug={app.slug} features={app.features} />
      </Section>

      {app.charts.overview && app.charts.overview.length > 0 && (
        <Section id="signals" kicker="Signals" title="Headline analytics"
          actions={<Button trailingVisual={ArrowRightIcon} onClick={() => navigate('/dashboard')}>Open the full dashboard</Button>}>
          <ChartGrid charts={app.charts.overview} />
        </Section>
      )}

      {(app.screenshots.length > 0 || app.video) && (
        <Section id="screens" kicker="In the product" title="Dashboard screens"
          sub="Captured from the live Streamlit dashboard that ships with the project."
          actions={app.screenshots.length > 4 ? <Button trailingVisual={ArrowRightIcon} onClick={() => navigate('/dashboard')}>All {app.screenshots.length} screens</Button> : undefined}>
          {app.video && <VideoCard slug={app.slug} file={app.video} poster={poster} caption="Screen recording: full dashboard walkthrough" />}
          <Gallery slug={app.slug} shots={app.screenshots} limit={4} />
        </Section>
      )}

      <Section id="pipeline" kicker="Architecture" title="How the system is built" sub="From raw data to a served decision.">
        <Pipeline steps={app.pipeline} />
      </Section>

      <Section id="buyers" kicker="Who it is for" title="Target customers">
        <Buyers buyers={app.buyers} />
      </Section>

      <Banner
        title="Explore the code"
        description={<span>The full pipeline, API and dashboard are open source under MIT. Run it locally with <code>streamlit run dashboard/app.py --server.port {app.ports.dashboard}</code>.</span>}
        variant="info"
        primaryAction={<LinkButton href={app.links.github} target="_blank" rel="noreferrer" leadingVisual={MarkGithubIcon}>View on GitHub</LinkButton>}
        secondaryAction={<Button onClick={() => navigate('/api')}>API reference</Button>}
      />
    </div>
  )
}
