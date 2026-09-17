import { DataTable, Table } from '@primer/react/experimental'
import { Label } from '@primer/react'
import { useApp, usePageMeta } from '../context'
import { Section } from '@/components/Section'
import { ChartGrid } from '@/components/Charts'
import { Pipeline, Results, StackTokens } from '@/components/Blocks'

export function ModelPage() {
  const { app } = useApp()
  usePageMeta(`Model · ${app.name}`, `Model architecture, evaluation and explainability for ${app.name}.`)
  const rows = app.models.map((m, i) => ({ id: i, ...m }))

  return (
    <div className="fa-page">
      <Section id="architecture" kicker="Model" title="Architecture" sub="Every learned component, what it does and how it scores.">
        <Table.Container>
          <Table.Title as="h3" id="models-title">Model components</Table.Title>
          <Table.Subtitle as="p" id="models-subtitle">{app.models.length} components in the serving graph</Table.Subtitle>
          <DataTable
            aria-labelledby="models-title"
            aria-describedby="models-subtitle"
            data={rows}
            columns={[
              { header: 'Component', field: 'component', rowHeader: true },
              { header: 'Model', field: 'model', renderCell: (r) => <Label variant="accent">{r.model}</Label> },
              { header: 'Purpose', field: 'purpose' },
              { header: 'Metric', field: 'metric', renderCell: (r) => <strong>{r.metric ?? '—'}</strong> },
            ]}
          />
        </Table.Container>
      </Section>

      <Section id="results" kicker="Evaluation" title="Key results" sub="Held-out test set unless stated otherwise.">
        <Results rows={app.results} />
      </Section>

      <Section id="model-charts" kicker="Diagnostics" title="Performance and explainability">
        <ChartGrid charts={app.charts.model} />
      </Section>

      <Section id="training" kicker="Training pipeline" title="From data to weights">
        <Pipeline steps={app.pipeline} />
      </Section>

      <Section id="stack" kicker="Stack" title="Libraries and infrastructure">
        <div className="fa-card"><div className="fa-card__body"><StackTokens stack={app.stack} /></div></div>
      </Section>
    </div>
  )
}
