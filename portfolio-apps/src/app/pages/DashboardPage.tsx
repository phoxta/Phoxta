import { useApp, usePageMeta } from '../context'
import { Section } from '@/components/Section'
import { ChartGrid } from '@/components/Charts'
import { DemoPanel } from '@/components/DemoPanel'
import { Gallery, VideoCard } from '@/components/Gallery'
import { StatTiles } from '@/components/StatTiles'

export function DashboardPage() {
  const { app } = useApp()
  usePageMeta(`Dashboard · ${app.name}`, `Interactive analytics and a live scorer for ${app.name}.`)
  const poster = app.screenshots[0]?.file

  return (
    <div className="fa-page">
      <Section id="kpis" kicker="Dashboard" title="Key indicators">
        <StatTiles metrics={app.metrics} />
      </Section>

      {app.demo && (
        <Section id="demo" kicker="Try it" title="Live scorer" sub="Move the inputs and watch the decision, its confidence and the reason codes update.">
          <DemoPanel spec={app.demo} />
        </Section>
      )}

      <Section id="analytics" kicker="Analytics" title="Every view of the dashboard" sub="The charts below mirror the tabs of the original Streamlit application.">
        <ChartGrid charts={app.charts.dashboard} />
      </Section>

      {(app.screenshots.length > 0 || app.video) && (
        <Section id="screens" kicker="Original dashboard" title="Streamlit screens" sub={`${app.screenshots.length} captures from the running application. Click any screen to enlarge.`}>
          {app.video && <VideoCard slug={app.slug} file={app.video} poster={poster} caption="Screen recording: all tabs, controls and live inference" />}
          <Gallery slug={app.slug} shots={app.screenshots} />
        </Section>
      )}
    </div>
  )
}
